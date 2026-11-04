/**
 * Le cheikh en direct : micro → Gemini Live → haut-parleur, avec les tours de parole
 * découpés aux pauses du récitant, les appels d'outils vers l'application (texte du mushaf,
 * fath, examen, tafsir…) et la reprise automatique quand la connexion est coupée.
 */
import {
  ActivityHandling,
  FunctionResponseScheduling,
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from '@google/genai';
import { Mic, PcmPlayer, base64ToInt16, int16ToBase64 } from './audio-io';
import { PauseSegmenter } from './segmenter';
import { LIVE_MODEL, TOOLS, systemPrompt } from './prompt';

export type LiveState = 'connecting' | 'listening' | 'hearing' | 'thinking' | 'speaking' | 'reconnecting' | 'closed' | 'error';

export interface LiveHost {
  riwayaName(): string;
  callTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** Ne rien envoyer du micro (ex. une récitation enregistrée est jouée). */
  micMuted(): boolean;
  /** Le récitant récite (pauses courtes) ou parle (pauses longues). */
  reciting(): boolean;
  /** Durée sans activité après laquelle la séance s'arrête d'elle-même (quota). */
  idleLimitMs(): number;
  /** Une ligne de la conversation (mise à jour au fil de la transcription). */
  onLine(role: 'user' | 'model', id: number, text: string, final: boolean): void;
  /** Texte entendu d'un tour du récitant, une fois complet (pour suivre sa position). */
  onUserTurn(text: string): void;
  onState(s: LiveState, detail?: string): void;
  /** Le récitant parle (pour le minuteur du fath). */
  onActivity(): void;
}

export interface LiveOptions {
  apiKey: string;
  voice: string;
  model?: string;
  /** Pour les tests : serveur Live simulé. */
  baseUrl?: string;
  /** Première consigne envoyée au cheikh à l'ouverture. */
  greeting: string;
}

const NON_BLOCKING = new Set(TOOLS.filter((t) => t.behavior === 'NON_BLOCKING').map((t) => t.name));
const PREROLL_MS = 300;
const BATCH_SAMPLES = 1600; // 100 ms à 16 kHz

export class LiveTeacher {
  private session?: Session;
  private gen = 0;
  private ready = false;
  private closing = false;
  private handle?: string;
  private opts?: LiveOptions;
  private mic = new Mic();
  readonly player = new PcmPlayer();
  private seg = new PauseSegmenter();
  private preroll: { pcm: Int16Array; ms: number }[] = [];
  private batch: Int16Array[] = [];
  private batchLen = 0;
  private userId = 0;
  private modelId = 0;
  private userText = '';
  private modelText = '';
  private pendingUser = false;
  private dropModelAudio = false;
  private lastActivity = Date.now();
  private drops: number[] = [];
  private idleTimer?: number;
  private greeted = false;
  state: LiveState = 'closed';

  constructor(private host: LiveHost) {
    this.player.onIdle = () => {
      if (this.state === 'speaking') this.setState('listening');
    };
  }

  get active() {
    return !this.closing && this.state !== 'closed' && this.state !== 'error';
  }

  get speaking() {
    return this.player.playing;
  }

  async start(opts: LiveOptions) {
    this.opts = opts;
    this.closing = false;
    this.greeted = false;
    this.handle = undefined;
    this.drops = [];
    this.player.unlock();
    this.setState('connecting');
    try {
      await this.mic.start();
    } catch {
      this.setState('error', 'لم يُؤذن باستعمال الميكروفون. اسمح به من إعدادات المتصفح.');
      return;
    }
    this.mic.onFrame = (f) => this.onFrame(f.pcm, f.rms, f.ms);
    await this.connect();
    this.lastActivity = Date.now();
    window.clearInterval(this.idleTimer);
    this.idleTimer = window.setInterval(() => {
      if (this.active && Date.now() - this.lastActivity > this.host.idleLimitMs()) this.stop('انتهت الجلسة لطول السكوت.');
    }, 5000);
  }

  stop(reason?: string) {
    this.closing = true;
    this.ready = false;
    window.clearInterval(this.idleTimer);
    this.finalizeUser();
    this.mic.stop();
    this.player.clear();
    try {
      this.session?.close();
    } catch {
      /* déjà fermée */
    }
    this.session = undefined;
    this.setState('closed', reason);
  }

  /** Message de l'application au cheikh (fath, consigne, changement de contexte). */
  note(text: string, turnComplete = true) {
    if (!this.session || !this.ready) return;
    this.lastActivity = Date.now();
    this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: `[التطبيق] ${text}` }] }], turnComplete });
    if (turnComplete) this.setState('thinking');
  }

  /** Fait taire la voix du cheikh localement (bouton, ou « حسبك »). */
  hush() {
    this.player.clear();
    this.dropModelAudio = true;
  }

  /* ---------- Connexion ---------- */

  private async connect() {
    const opts = this.opts!;
    const gen = ++this.gen;
    this.ready = false;
    const ai = new GoogleGenAI({ apiKey: opts.apiKey, httpOptions: opts.baseUrl ? { baseUrl: opts.baseUrl } : undefined });
    try {
      const session = await ai.live.connect({
        model: opts.model ?? LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice } } },
          systemInstruction: systemPrompt(this.host.riwayaName()),
          tools: [{ functionDeclarations: TOOLS }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          realtimeInputConfig: {
            // Les tours sont découpés par l'application, aux pauses du récitant.
            automaticActivityDetection: { disabled: true },
            // « أعِد » doit pouvoir être dit par-dessus la récitation qui continue.
            activityHandling: ActivityHandling.NO_INTERRUPTION,
          },
          sessionResumption: { handle: this.handle },
          contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
          onmessage: (m) => gen === this.gen && this.onMessage(m),
          onerror: () => gen === this.gen && this.onDrop('error'),
          onclose: (e: CloseEvent) => gen === this.gen && this.onDrop(e.reason || String(e.code)),
        },
      });
      if (gen !== this.gen || this.closing) {
        session.close();
        return;
      }
      this.session = session;
      // setupComplete peut arriver avant que connect() rende la session.
      this.maybeGreet();
    } catch (e) {
      if (gen === this.gen) this.onDrop((e as Error).message);
    }
  }

  private onDrop(reason: string) {
    if (this.closing) return;
    this.ready = false;
    this.session = undefined;
    if (/API key|PERMISSION|permission|invalid|401|403|1008/i.test(reason) && !this.greeted) {
      this.stop();
      this.setState('error', 'المفتاح غير صالح أو لا يسمح باستعمال Gemini Live. تحقق منه في الإعدادات.');
      return;
    }
    const now = Date.now();
    this.drops = this.drops.filter((t) => now - t < 120_000);
    this.drops.push(now);
    if (this.drops.length > 4) {
      this.stop();
      this.setState('error', 'انقطع الاتصال مرات عدة. تحقق من الإنترنت ثم أعد المحاولة.');
      return;
    }
    this.setState('reconnecting');
    const wait = 500 * 2 ** (this.drops.length - 1);
    window.setTimeout(() => !this.closing && void this.connect(), wait);
  }

  /** Reprise volontaire (GoAway) à un moment calme. */
  private handover() {
    const go = () => {
      if (this.closing) return;
      if (this.seg.active || this.player.playing) {
        window.setTimeout(go, 300);
        return;
      }
      const old = this.session;
      this.gen++;
      try {
        old?.close();
      } catch {
        /* rien */
      }
      void this.connect();
    };
    go();
  }

  /* ---------- Messages du serveur ---------- */

  private onMessage(m: LiveServerMessage) {
    if (m.setupComplete) {
      this.ready = true;
      this.setState('listening');
      this.maybeGreet();
    }
    if (m.sessionResumptionUpdate?.resumable && m.sessionResumptionUpdate.newHandle) this.handle = m.sessionResumptionUpdate.newHandle;
    if (m.goAway) this.handover();

    for (const fc of m.toolCall?.functionCalls ?? []) {
      const name = fc.name ?? '';
      void this.host
        .callTool(name, (fc.args ?? {}) as Record<string, unknown>)
        .catch((e: Error) => ({ error: e.message }))
        .then((response) => {
          if (!this.session || !this.ready) return;
          if (NON_BLOCKING.has(name)) response = { ...response, scheduling: FunctionResponseScheduling.SILENT };
          this.session.sendToolResponse({ functionResponses: [{ id: fc.id, name, response }] });
        });
    }

    const sc = m.serverContent;
    if (!sc) return;
    if (sc.interrupted) this.player.clear();
    if (sc.inputTranscription?.text) {
      this.userText += sc.inputTranscription.text;
      this.host.onLine('user', this.userId, this.userText.trim(), false);
    }
    for (const part of sc.modelTurn?.parts ?? []) {
      const data = part.inlineData?.data;
      if (data && part.inlineData?.mimeType?.startsWith('audio') && !this.dropModelAudio) {
        this.lastActivity = Date.now();
        this.player.push(base64ToInt16(data));
        this.setState('speaking');
      }
    }
    if (sc.outputTranscription?.text) {
      this.modelText += sc.outputTranscription.text;
      this.host.onLine('model', this.modelId, this.modelText.trim(), false);
    }
    if (sc.turnComplete || sc.generationComplete) {
      this.finalizeUser();
      if (this.modelText.trim()) this.host.onLine('model', this.modelId, this.modelText.trim(), true);
      this.modelText = '';
      this.modelId++;
    }
    if (sc.turnComplete) {
      this.dropModelAudio = false;
      if (!this.player.playing && this.state !== 'hearing') this.setState('listening');
    }
  }

  /** Première consigne au cheikh, une fois la session prête (pas après une reprise). */
  private maybeGreet() {
    if (this.greeted || !this.ready || !this.session) return;
    this.greeted = true;
    this.note(this.opts!.greeting);
  }

  private finalizeUser() {
    if (!this.pendingUser && !this.userText) return;
    const text = this.userText.trim();
    this.pendingUser = false;
    this.userText = '';
    if (text) {
      this.host.onLine('user', this.userId, text, true);
      this.host.onUserTurn(text);
    }
  }

  /* ---------- Micro ---------- */

  private send(pcm: Int16Array) {
    this.batch.push(pcm);
    this.batchLen += pcm.length;
    if (this.batchLen >= BATCH_SAMPLES) this.flush();
  }

  private flush() {
    if (!this.batchLen || !this.session) {
      this.batch = [];
      this.batchLen = 0;
      return;
    }
    const all = new Int16Array(this.batchLen);
    let o = 0;
    for (const b of this.batch) {
      all.set(b, o);
      o += b.length;
    }
    this.batch = [];
    this.batchLen = 0;
    this.session.sendRealtimeInput({ audio: { data: int16ToBase64(all), mimeType: 'audio/pcm;rate=16000' } });
  }

  private onFrame(pcm: Int16Array, rms: number, ms: number) {
    if (!this.session || !this.ready) return;
    if (this.host.micMuted()) {
      if (this.seg.reset()) {
        this.flush();
        this.session.sendRealtimeInput({ activityEnd: {} });
        this.pendingUser = true;
      }
      this.preroll = [];
      return;
    }
    this.seg.reciting = this.host.reciting();
    // Pendant que le cheikh parle, l'écho résiduel ne doit pas ouvrir un tour.
    this.seg.deafness = this.player.playing ? (this.player.playingFor > 1200 ? 2.6 : 1.6) : 1;
    const ev = this.seg.push(rms, ms);

    if (ev === 'start') {
      this.finalizeUser();
      this.userId++;
      this.session.sendRealtimeInput({ activityStart: {} });
      for (const p of this.preroll) this.send(p.pcm);
      this.preroll = [];
      // Le récitant coupe une longue explication : on la fait taire.
      if (this.player.playing && this.player.playingFor > 1500) this.hush();
      this.setState('hearing');
    }

    if (ev === 'start' || ev === 'end' || this.seg.active) {
      this.send(pcm);
      this.lastActivity = Date.now();
      this.host.onActivity();
    } else {
      this.preroll.push({ pcm, ms });
      let total = this.preroll.reduce((s, p) => s + p.ms, 0);
      while (total > PREROLL_MS && this.preroll.length > 1) total -= this.preroll.shift()!.ms;
    }

    if (ev === 'end') {
      this.flush();
      this.session.sendRealtimeInput({ activityEnd: {} });
      this.pendingUser = true;
      this.setState('thinking');
    }
  }

  private setState(s: LiveState, detail?: string) {
    if (this.state === s && !detail) return;
    this.state = s;
    this.host.onState(s, detail);
  }
}
