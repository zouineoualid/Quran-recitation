/* Entrée micro (PCM 16 bits, 16 kHz) et sortie de la voix du cheikh (PCM 16 bits, 24 kHz). */

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(1024); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('tasmee-capture', Capture);
`;

export function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToInt16(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, bytes.length >> 1);
}

/** Rééchantillonne (interpolation linéaire) et convertit en PCM 16 bits. */
export function toPcm16(input: Float32Array, fromRate: number, toRate = 16000): Int16Array {
  const ratio = fromRate / toRate;
  const n = Math.floor(input.length / ratio);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const v = input[i0] + (input[i1] - input[i0]) * (x - i0);
    out[i] = Math.max(-1, Math.min(1, v)) * 0x7fff;
  }
  return out;
}

export function rms(frame: Float32Array): number {
  let s = 0;
  for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
  return Math.sqrt(s / frame.length);
}

export interface MicFrame {
  pcm: Int16Array;
  rms: number;
  ms: number;
}

/** Capture du micro, avec annulation d'écho (le cheikh parle pendant qu'on récite). */
export class Mic {
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private node?: AudioWorkletNode;
  onFrame: (f: MicFrame) => void = () => {};

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    this.ctx = new AudioContext();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'tasmee-capture');
    const rate = this.ctx.sampleRate;
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      const f = e.data;
      this.onFrame({ pcm: toPcm16(f, rate), rms: rms(f), ms: (f.length / rate) * 1000 });
    };
    src.connect(this.node);
    // Le nœud doit être relié à la sortie pour être cadencé ; il n'émet aucun son.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.node.connect(mute).connect(this.ctx.destination);
  }

  stop() {
    this.node?.port.close();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => {});
    this.ctx = undefined;
    this.stream = undefined;
    this.node = undefined;
  }
}

/** Joue les morceaux de voix reçus, l'un après l'autre, sans trou. */
export class PcmPlayer {
  private ctx?: AudioContext;
  private next = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private since = 0;
  onIdle: () => void = () => {};

  /** À appeler lors d'un geste de l'utilisateur (politique d'autoplay). */
  unlock() {
    this.ctx ??= new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get playing() {
    return !!this.ctx && this.ctx.currentTime < this.next - 0.02;
  }

  /** Depuis combien de ms la réplique en cours est jouée. */
  get playingFor() {
    return this.playing ? (this.ctx!.currentTime - this.since) * 1000 : 0;
  }

  push(pcm: Int16Array, rate = 24000) {
    this.unlock();
    const ctx = this.ctx!;
    if (!pcm.length) return;
    const buf = ctx.createBuffer(1, pcm.length, rate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    if (this.next < now + 0.01) {
      this.next = now + 0.04;
      this.since = this.next;
    }
    src.start(this.next);
    this.next += buf.duration;
    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      if (!this.sources.size) this.onIdle();
    };
  }

  /** Coupe la voix tout de suite (interruption). */
  clear() {
    for (const s of this.sources) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* déjà arrêté */
      }
    }
    this.sources.clear();
    this.next = 0;
    this.onIdle();
  }

  close() {
    this.clear();
    void this.ctx?.close().catch(() => {});
    this.ctx = undefined;
  }
}
