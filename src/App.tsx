import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadMushaf, loadTafsir, type Mushaf } from './quran/mushaf';
import { Tracker, type TrackEvent } from './quran/tracker';
import { words } from './quran/arabic';
import { Recognizer, speechSupported } from './speech/recognizer';
import { chime, sayFath, sayRepeat, sayText, speakingNow, unlockAudio } from './speech/voice';
import { findSurah, parseCommand, type Command } from './speech/commands';
import { AyahPlayer, type AyahRef } from './audio/player';
import { makeQuestion, ayahLabel, arNum, type Question } from './exam/exam';
import { RIWAYAT, TAFASIR, recitersFor, riwayaById } from './data/riwayat';
import { JUZ_STARTS, SURAHS } from './data/surahs';
import { liveTestOverrides, loadKey, saveKey, saveSession, useSettings, type RangeChoice, type SessionRecord } from './store';
import { RecitationView } from './components/RecitationView';
import { HelpSheet, HistorySheet, RangeSheet, RiwayaSheet, SettingsSheet, TafsirSheet, rangeLabel } from './components/Sheets';
import { Sheet } from './components/Sheet';
import { DialogueLine } from './components/DialogueLine';
import type { LiveHost, LiveState, LiveTeacher } from './live/session';

type SheetName = 'riwaya' | 'range' | 'settings' | 'history' | 'help' | 'tafsir' | 'summary';
type Tone = 'info' | 'warn' | 'ok' | 'err';

interface ExamState {
  q: Question;
  asked: number;
  right: number;
  phase: 'asking' | 'answered';
  correct?: boolean;
  reveal?: boolean;
}

interface Line {
  role: 'user' | 'model';
  id: number;
  text: string;
  final: boolean;
}

/** Bornes [début, fin) en mots d'un choix de plage. */
function rangeBounds(m: Mushaf, r: RangeChoice): [number, number] {
  if (r.kind === 'surah') return m.range(r.s, r.a1, r.s, r.a2);
  if (r.kind === 'juz') {
    const [s, a] = JUZ_STARTS[r.n - 1];
    const start = m.ayah(s, a)!.first;
    const next = JUZ_STARTS[r.n];
    return [start, next ? m.ayah(next[0], next[1])!.first : m.words.length];
  }
  return [0, m.words.length];
}

const fontFor = (riwaya: string) => (riwaya === 'hafs' || riwaya === 'shuba' ? 'font-hafs' : 'font-maghribi');

const LIVE_LABEL: Record<LiveState, string> = {
  connecting: 'جارٍ الاتصال بالشيخ…',
  listening: 'أستمع',
  hearing: 'صوتك يصلني',
  thinking: '…',
  speaking: 'الشيخ يتكلم',
  reconnecting: 'إعادة الاتصال…',
  closed: '',
  error: '',
};

/** Texte d'un mot imprimé sans les signes ۞ et de pause, pour le donner au cheikh. */
const plain = (t: string) => t.replace(/[ۖ-۞۩]/g, '').replace(/\s+/g, ' ').trim();

export default function App() {
  const [settings, update] = useSettings();
  const riwaya = riwayaById(settings.riwaya);
  const [mushaf, setMushaf] = useState<Mushaf | null>(null);
  const [loadError, setLoadError] = useState('');
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const tracker = useRef<Tracker | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [status, setStatus] = useState<{ text: string; tone: Tone } | null>(null);
  const [flash, setFlash] = useState<'repeat' | 'hint' | 'ok' | null>(null);
  const [prayer, setPrayer] = useState(false);
  const [exam, setExam] = useState<ExamState | null>(null);
  const [playing, setPlaying] = useState<AyahRef | null>(null);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [tafsir, setTafsir] = useState<{ title: string; text: string | null; source: string } | null>(null);
  const [typing, setTyping] = useState(() => !speechSupported());
  const [typed, setTyped] = useState('');
  const [summary, setSummary] = useState<SessionRecord | null>(null);
  const [apiKey, setApiKey] = useState(loadKey);
  const [liveState, setLiveState] = useState<LiveState>('closed');
  const [lines, setLines] = useState<Line[]>([]);

  const session = useRef<SessionRecord | null>(null);
  const lastActivity = useRef(Date.now());
  const fathAt = useRef(-1);
  const player = useMemo(() => new AyahPlayer(), []);
  const statusTimer = useRef<number | undefined>(undefined);
  const teacher = useRef<LiveTeacher | null>(null);

  /** Le cheikh en direct est-il le moteur choisi ? */
  const liveMode = settings.engine === 'live' && !!apiKey && !typing;

  // Valeurs courantes lues depuis les callbacks (reconnaissance vocale, Gemini Live).
  const live = useRef({ settings, prayer, exam, mushaf, liveMode });
  live.current = { settings, prayer, exam, mushaf, liveMode };

  const say = useCallback((text: string, tone: Tone = 'info', ms = 3500) => {
    setStatus({ text, tone });
    window.clearTimeout(statusTimer.current);
    if (ms) statusTimer.current = window.setTimeout(() => setStatus(null), ms);
  }, []);

  const pulse = useCallback((kind: 'repeat' | 'hint' | 'ok') => {
    setFlash(kind);
    window.setTimeout(() => setFlash(null), 700);
  }, []);

  /** Le cheikh en direct est-il connecté ? */
  const liveActive = () => !!teacher.current?.active;

  /* ---------- Chargement du mushaf ---------- */

  const resetTracker = useCallback(
    (m: Mushaf, r: RangeChoice) => {
      const t = new Tracker(m, { strictness: live.current.settings.strictness });
      if (r.kind === 'free') t.setFree();
      else t.setRange(...rangeBounds(m, r));
      tracker.current = t;
      fathAt.current = -1;
      rerender();
    },
    [rerender],
  );

  useEffect(() => {
    let cancelled = false;
    setMushaf(null);
    setLoadError('');
    loadMushaf(riwaya)
      .then((m) => {
        if (cancelled) return;
        setMushaf(m);
        live.current.mushaf = m;
        resetTracker(m, live.current.settings.range);
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [riwaya, resetTracker]);

  useEffect(() => {
    if (tracker.current) tracker.current.opts.strictness = settings.strictness;
  }, [settings.strictness]);

  /* ---------- Séance ---------- */

  const currentLabel = () => {
    const t = tracker.current;
    const m = live.current.mushaf;
    if (live.current.settings.range.kind === 'free' && t && m && !t.locating) {
      const a = m.ayahOfWord(Math.min(t.pos, m.words.length - 1));
      return `سورة ${SURAHS[a.s - 1].name}`;
    }
    return rangeLabel(live.current.settings.range);
  };

  const beginSession = (mode: SessionRecord['mode']) => {
    if (session.current) return;
    session.current = {
      id: String(Date.now()),
      started: Date.now(),
      ended: Date.now(),
      riwaya: live.current.settings.riwaya,
      label: rangeLabel(live.current.settings.range),
      mode,
      words: 0,
      ayahs: 0,
      slips: [],
    };
  };

  const endSession = (show: boolean) => {
    const s = session.current;
    session.current = null;
    if (!s) return;
    s.ended = Date.now();
    if (s.mode !== 'exam') s.label = currentLabel();
    if (s.words > 0 || s.slips.length || s.exam?.asked) {
      saveSession(s);
      if (show && s.mode !== 'exam') {
        setSummary(s);
        setSheet('summary');
      }
    }
  };

  const slip = (g: number, kind: 'wrong' | 'skip' | 'fath', heard?: string) => {
    const m = live.current.mushaf;
    if (!m || !session.current) return;
    const w = m.words[g];
    if (w) session.current.slips.push({ s: w.s, a: w.a, i: w.i, word: w.text, heard, kind });
  };

  /* ---------- Reconnaissance vocale du navigateur (mode sans clé) ---------- */

  const handlers = useRef({ final: (_t: string) => {}, interim: (_t: string) => {} });

  const recognizer = useMemo(
    () =>
      new Recognizer({
        onFinal: (t) => handlers.current.final(t),
        onInterim: (t) => handlers.current.interim(t),
        onError: (msg) => say(msg, 'err', 8000),
        onListening: (on) => setListening(on),
      }),
    [say],
  );

  const wakeLock = useRef<{ release(): Promise<void> } | null>(null);
  const keepAwake = async (on: boolean) => {
    try {
      if (on && !wakeLock.current) {
        const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
        wakeLock.current = (await nav.wakeLock?.request('screen')) ?? null;
      } else if (!on && wakeLock.current) {
        await wakeLock.current.release();
        wakeLock.current = null;
      }
    } catch {
      /* non disponible */
    }
  };

  /* ---------- Cheikh en direct (Gemini Live) ---------- */

  const greetingFor = (intent: 'recite' | 'exam' | 'prayer') => {
    const s = live.current.settings;
    const where = s.range.kind === 'free' ? 'لم يحدد الطالب موضعاً بعد' : `المقطع المختار في التطبيق: ${rangeLabel(s.range)}`;
    const base = `بدأت الجلسة. الرواية: ${riwayaById(s.riwaya).name}. ${where}.`;
    if (intent === 'exam') return `${base} الطالب يريد اختباراً: استدعِ exam_question الآن واطرح السؤال.`;
    if (intent === 'prayer') return `${base} الطالب يصلي الآن: اسكت تماماً إلا «أعِد» عند الخطأ والفتح عند التوقف.`;
    const open = s.range.kind === 'surah' ? ` استدعِ open_mushaf لهذا المقطع (سورة ${s.range.s} من ${s.range.a1} إلى ${s.range.a2}) قبل أن تسمع.` : '';
    return `${base}${open} رحّب بالطالب بكلمة قصيرة جداً مثل «تفضّل، أنا معك» ثم اسكت واستمع.`;
  };

  const startLive = async (intent: 'recite' | 'exam' | 'prayer') => {
    player.stop();
    setLines([]);
    const { LiveTeacher } = await import('./live/session');
    teacher.current?.stop();
    const t = new LiveTeacher(liveHost.current);
    teacher.current = t;
    const o = liveTestOverrides();
    beginSession(intent === 'exam' ? 'exam' : intent === 'prayer' ? 'prayer' : 'recite');
    setListening(true);
    void keepAwake(true);
    lastActivity.current = Date.now();
    await t.start({ apiKey, voice: live.current.settings.liveVoice, greeting: greetingFor(intent), baseUrl: o.baseUrl, model: o.model });
  };

  /** Arrêt voulu par l'application : la fin de séance est gérée par stopListening. */
  const localStop = useRef(false);
  const stopLive = () => {
    localStop.current = true;
    teacher.current?.stop();
    localStop.current = false;
    teacher.current = null;
    setLiveState('closed');
  };

  /** Texte imprimé d'une suite de versets, avec leurs numéros, pour le cheikh. */
  const ayatText = (m: Mushaf, s: number, a1: number, a2: number) => {
    const out: string[] = [];
    for (let a = a1; a <= a2; a++) {
      const ay = m.ayah(s, a);
      if (!ay) break;
      out.push(`${m.words.slice(ay.first, ay.first + ay.count).map((w) => plain(w.text)).join(' ')} (${a})`);
    }
    return out.join(' ');
  };

  const liveTools = async (name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const m = live.current.mushaf;
    const num = (k: string) => (typeof args[k] === 'number' ? (args[k] as number) : Number(args[k]) || undefined);
    if (!m && name !== 'stop_recitation' && name !== 'end_session') return { error: 'المصحف لم يُحمَّل بعد' };
    switch (name) {
      case 'open_mushaf': {
        const s = Math.min(114, Math.max(1, num('surah') ?? 1));
        const meta = SURAHS[s - 1];
        const a1 = Math.min(meta.ayahs, Math.max(1, num('from_ayah') ?? 1));
        const a2 = Math.min(meta.ayahs, Math.max(a1, num('to_ayah') ?? meta.ayahs), a1 + 39);
        pickRange({ kind: 'surah', s, a1, a2 }, true);
        return {
          riwaya: riwayaById(live.current.settings.riwaya).name,
          surah: `سورة ${meta.name}`,
          from_ayah: a1,
          to_ayah: a2,
          last_ayah_of_surah: meta.ayahs,
          text: ayatText(m!, s, a1, a2),
          note: s !== 1 && s !== 9 && a1 === 1 ? 'البسملة تُقرأ قبل السورة وليست من آياتها هنا.' : undefined,
        };
      }
      case 'get_fath': {
        const t = tracker.current;
        if (!t || t.locating) return { error: 'لم يُعرف موضع الطالب بعد. اطلب منه أن يبدأ أو يذكر الموضع.' };
        if (t.done) return { done: true, note: 'أتمّ الطالب المقطع.' };
        const next = t.nextWords();
        t.markFath(next);
        slip(next[0].g, 'fath');
        fathAt.current = t.pos;
        pulse('hint');
        rerender();
        const w = m!.words[t.pos];
        return { position: ayahLabel(w.s, w.a), words: next.map((x) => plain(x.text)).join(' ') };
      }
      case 'exam_question': {
        const q = askQuestion(live.current.exam ?? undefined, true);
        if (!q) return { error: 'لا يمكن إنشاء سؤال من هذا المقطع' };
        const expected = q.expect ? m!.words.slice(q.expect[0], q.expect[1]).map((w) => plain(w.text)).join(' ') : undefined;
        return {
          question: q.prompt,
          shown_to_student: plain(q.shown),
          expected_answer: expected,
          choices: q.options?.map((n) => `سورة ${SURAHS[n - 1].name}`),
          correct_answer: q.answer ? `سورة ${SURAHS[q.answer - 1].name}` : undefined,
          location: ayahLabel(q.ayah.s, q.ayah.a),
        };
      }
      case 'exam_answer':
        finishQuestion(!!args.correct, false, true);
        return { ok: true };
      case 'tafsir': {
        const t = tracker.current;
        let s = num('surah');
        let a = num('ayah');
        if (!s || !a) {
          const g = t && !t.locating ? Math.max(t.start, Math.min(t.pos, t.end) - 1) : 0;
          const ay = m!.ayahOfWord(g);
          s = ay.s;
          a = ay.a;
        }
        const tf = TAFASIR.find((x) => x.id === live.current.settings.tafsir) ?? TAFASIR[0];
        const text = await loadTafsir(tf.edition, s, a);
        return { source: tf.name, ayah: ayahLabel(s, a), text };
      }
      case 'play_recitation': {
        const s = num('surah');
        if (s) {
          const meta = SURAHS[s - 1];
          const a1 = num('from_ayah') ?? 1;
          playRange(s, a1, Math.min(meta.ayahs, num('to_ayah') ?? Math.min(meta.ayahs, a1 + 29)));
        } else playFromHere();
        return { playing: true };
      }
      case 'stop_recitation':
        player.stop();
        return { stopped: true };
      case 'set_riwaya': {
        const r = RIWAYAT.find((x) => x.id === args.riwaya);
        if (!r) return { error: 'رواية غير معروفة' };
        update({ riwaya: r.id, reciter: '' });
        live.current.settings = { ...live.current.settings, riwaya: r.id };
        await loadMushaf(r);
        return { ok: true, riwaya: r.name };
      }
      case 'prayer':
        if (args.on) enterPrayer();
        else leavePrayer();
        return { ok: true };
      case 'end_session':
        window.setTimeout(() => stopListening(true), 2500);
        return { ok: true };
      default:
        return { error: 'أداة غير معروفة' };
    }
  };

  const onLiveUserTurn = (text: string) => {
    const t = tracker.current;
    const m = live.current.mushaf;
    if (!t || !m) return;
    const w = words(text);
    if (!w.length) return;
    if (live.current.prayer && w.join(' ').includes('الله اكبر') && w.length <= 3) {
      t.setFree();
      rerender();
      return;
    }
    if (parseCommand(w, live.current.prayer) || live.current.exam?.q.kind === 'where') return;
    if (live.current.exam?.phase === 'answered') return;
    const before = t.stats.ok;
    const ev = t.feed(w);
    if (session.current) session.current.words += t.stats.ok - before;
    for (const e of ev) {
      // Le cheikh juge et parle lui-même ; l'application garde la trace et l'affichage.
      if (e.type === 'mistake') slip(e.at, e.kind, e.heard);
      if (e.type === 'ayah' && session.current) session.current.ayahs++;
    }
    rerender();
  };

  const liveHost = useRef<LiveHost>(null!);
  liveHost.current = {
    riwayaName: () => riwayaById(live.current.settings.riwaya).name,
    callTool: (name, args) => liveTools(name, args),
    micMuted: () => player.playing,
    reciting: () => {
      if (live.current.prayer) return true;
      const t = tracker.current;
      return !!t && !t.locating && !t.done && t.stats.ok > 0 && live.current.exam?.q.kind !== 'where';
    },
    idleLimitMs: () => (live.current.prayer ? 20 : 3) * 60_000,
    onLine: (role, id, text, final) =>
      setLines((prev) => {
        const i = prev.findIndex((l) => l.role === role && l.id === id);
        const next = i >= 0 ? prev.map((l, k) => (k === i ? { role, id, text, final } : l)) : [...prev, { role, id, text, final }];
        return next.slice(-8);
      }),
    onUserTurn: onLiveUserTurn,
    onState: (s, detail) => {
      setLiveState(s);
      if ((s === 'closed' || s === 'error') && !localStop.current) {
        teacher.current = null;
        setListening(false);
        void keepAwake(false);
        endSession(s === 'closed' && !detail);
        if (live.current.prayer) {
          setPrayer(false);
          live.current.prayer = false;
        }
        if (detail) say(detail, s === 'error' ? 'err' : 'info', 8000);
      }
    },
    onActivity: () => {
      lastActivity.current = Date.now();
    },
  };

  /* ---------- Écoute (les deux moteurs) ---------- */

  const startListening = (mode: SessionRecord['mode'] = 'recite') => {
    player.stop();
    unlockAudio();
    lastActivity.current = Date.now();
    if (live.current.liveMode) {
      void startLive(mode === 'exam' ? 'exam' : mode === 'prayer' ? 'prayer' : 'recite');
      return;
    }
    beginSession(mode);
    if (!typing) recognizer.start();
    else setListening(true);
    void keepAwake(true);
  };

  const stopListening = (show = true) => {
    if (teacher.current) stopLive();
    recognizer.stop();
    setListening(false);
    setInterim('');
    void keepAwake(false);
    endSession(show);
  };

  const handleEvents = (ev: TrackEvent[]) => {
    const m = live.current.mushaf!;
    for (const e of ev) {
      switch (e.type) {
        case 'mistake':
          sayRepeat(live.current.settings.voice);
          pulse('repeat');
          say(e.kind === 'skip' ? 'أعِد · تجاوزتَ كلمات' : 'أعِد', 'warn', 2500);
          slip(e.at, e.kind, e.heard);
          break;
        case 'located': {
          const w = m.words[e.g];
          say(ayahLabel(w.s, w.a), 'info', 3000);
          break;
        }
        case 'ayah':
          if (session.current) session.current.ayahs++;
          break;
        case 'done':
          if (live.current.exam) finishQuestion();
          else {
            chime('done');
            pulse('ok');
            say('أتممتَ ما اخترت، بارك الله فيك', 'ok', 6000);
            stopListening(true);
          }
          break;
        default:
          break;
      }
    }
  };

  const doFath = (manual: boolean) => {
    const t = tracker.current;
    if (!t) return;
    if (t.locating) {
      if (manual) say('ابدأ القراءة أولاً حتى أعرف موضعك', 'info');
      return;
    }
    const next = t.nextWords();
    if (!next.length) return;
    t.markFath(next);
    slip(next[0].g, 'fath');
    fathAt.current = t.pos;
    lastActivity.current = Date.now();
    const text = next.map((w) => plain(w.text)).join(' ');
    if (liveActive()) {
      // Le cheikh souffle lui-même les mots exacts que l'application lui donne.
      teacher.current!.note(`توقف الطالب. افتح عليه بهذه الكلمات فقط، همساً، ثم اسكت: «${text}»`);
    } else sayFath(text, live.current.settings.voice);
    pulse('hint');
    rerender();
  };

  const playRange = (s: number, a1: number, a2: number) => {
    const { reciters, sameRiwaya } = recitersFor(riwayaById(live.current.settings.riwaya));
    const reciter = reciters.find((r) => r.id === live.current.settings.reciter) ?? reciters[0];
    const list: AyahRef[] = [];
    for (let a = a1; a <= a2 && list.length < 40; a++) list.push({ s, a });
    player.play(reciter, list);
    say(`${reciter.name}${sameRiwaya ? '' : ' (برواية حفص)'}`, 'info', 3000);
  };

  const playFromHere = () => {
    const t = tracker.current;
    const m = live.current.mushaf;
    if (!t || !m) return;
    const startAyah = t.locating ? m.ayahOfWord(t.start) : m.ayahOfWord(Math.min(t.pos, t.end - 1));
    const meta = SURAHS[startAyah.s - 1];
    const endAyah = m.ayahOfWord(Math.min(t.end, m.words.length) - 1);
    const last = endAyah.s === startAyah.s ? endAyah.a : meta.ayahs;
    playRange(startAyah.s, startAyah.a, Math.min(last, startAyah.a + 29));
  };

  const showTafsir = () => {
    const t = tracker.current;
    const m = live.current.mushaf;
    if (!t || !m) return;
    const g = t.locating ? t.start : t.pos > t.start && (t.pos >= t.end || m.words[t.pos].i === 0) ? t.pos - 1 : t.pos;
    const a = m.ayahOfWord(Math.min(g, m.words.length - 1));
    const tf = TAFASIR.find((x) => x.id === live.current.settings.tafsir) ?? TAFASIR[0];
    setTafsir({ title: ayahLabel(a.s, a.a), text: null, source: tf.name });
    setSheet('tafsir');
    loadTafsir(tf.edition, a.s, a.a)
      .then((text) => setTafsir({ title: ayahLabel(a.s, a.a), text, source: tf.name }))
      .catch(() => setTafsir({ title: ayahLabel(a.s, a.a), text: 'تعذّر تحميل التفسير. تحقق من الاتصال.', source: tf.name }));
  };

  /* ---------- Prière ---------- */

  /** Passe en prière sans couper l'écoute (le cheikh en direct reste connecté). */
  const enterPrayer = () => {
    const m = live.current.mushaf;
    if (!m) return;
    player.stop();
    exitExam(false);
    const t = new Tracker(m, { strictness: live.current.settings.strictness });
    t.setFree();
    tracker.current = t;
    setPrayer(true);
    live.current.prayer = true;
    if (session.current) session.current.mode = 'prayer';
    rerender();
  };

  const leavePrayer = () => {
    setPrayer(false);
    live.current.prayer = false;
    if (live.current.mushaf) resetTracker(live.current.mushaf, live.current.settings.range);
  };

  const startPrayer = () => {
    if (!live.current.mushaf) return;
    if (liveActive()) {
      enterPrayer();
      teacher.current!.note('بدأ الطالب الصلاة. اسكت تماماً إلا «أعِد» عند الخطأ والفتح عند التوقف.', false);
      return;
    }
    stopListening(false);
    enterPrayer();
    startListening('prayer');
    say('تقبّل الله. اقرأ، وسأتبعك', 'info', 3000);
  };

  const endPrayer = () => {
    leavePrayer();
    stopListening(true);
  };

  /* ---------- Examen ---------- */

  const askQuestion = (prev?: ExamState, silent = false): Question | null => {
    const m = live.current.mushaf;
    if (!m) return null;
    player.stop();
    const [start, end] = rangeBounds(m, live.current.settings.range);
    const q = makeQuestion(m, start, end, prev?.q.kind);
    if (!q) return null;
    if (q.expect) {
      const t = new Tracker(m, { strictness: live.current.settings.strictness });
      t.setRange(...q.expect);
      tracker.current = t;
      fathAt.current = -1;
    }
    const st: ExamState = { q, asked: (prev?.asked ?? 0) + 1, right: prev?.right ?? 0, phase: 'asking' };
    setExam(st);
    live.current.exam = st;
    if (!silent) sayText(q.prompt, live.current.settings.voice);
    lastActivity.current = Date.now();
    rerender();
    return q;
  };

  const startExam = () => {
    if (!live.current.mushaf) return;
    player.stop();
    setStatus(null);
    if (liveActive()) {
      teacher.current!.note('الطالب يريد اختباراً: استدعِ exam_question واطرح السؤال.');
      return;
    }
    stopListening(false);
    if (live.current.liveMode) {
      startListening('exam');
      return;
    }
    askQuestion();
    startListening('exam');
  };

  /** Fin d'une question. `fromTeacher` : le cheikh en direct a jugé et parle lui-même. */
  const finishQuestion = (correctOverride?: boolean, gaveUp = false, fromTeacher = false) => {
    const st = live.current.exam;
    if (!st || st.phase !== 'asking') return;
    const t = tracker.current!;
    const correct = correctOverride ?? (t.stats.mistakes === 0 && t.stats.faths === 0);
    const next: ExamState = { ...st, phase: 'answered', correct, right: st.right + (correct ? 1 : 0), reveal: !correct };
    setExam(next);
    live.current.exam = next;
    if (session.current) session.current.exam = { asked: next.asked, right: next.right };
    pulse(correct ? 'ok' : 'repeat');
    if (fromTeacher) return;
    if (correct) {
      chime('done');
      say('أحسنت', 'ok', 2500);
    } else {
      say(gaveUp ? 'هذا هو الجواب' : t.stats.faths ? 'صحيحة بعد الفتح' : 'فيها خطأ', 'warn', 2500);
    }
    if (liveActive()) {
      const ans = st.q.answer ? `، والجواب الصحيح سورة ${SURAHS[st.q.answer - 1].name}` : '';
      teacher.current!.note(gaveUp ? `الطالب لا يدري${ans}. بيّن له الجواب باختصار.` : `أجاب الطالب بالضغط على الشاشة، وجوابه ${correct ? 'صحيح' : 'خطأ'}${ans}. علّق بكلمة.`);
    }
  };

  const nextQuestion = () => {
    if (liveActive()) teacher.current!.note('الطالب يريد السؤال التالي: استدعِ exam_question.');
    else askQuestion(live.current.exam ?? undefined);
  };

  const exitExam = (restore = true) => {
    if (!live.current.exam) return;
    setExam(null);
    live.current.exam = null;
    if (restore) {
      if (liveActive()) teacher.current!.note('أنهى الطالب الاختبار. اسكت واستمع.', false);
      else stopListening(false);
      if (live.current.mushaf) resetTracker(live.current.mushaf, live.current.settings.range);
    }
  };

  /* ---------- Commandes ---------- */

  const pickRange = (r: RangeChoice, fromTeacher = false) => {
    update({ range: r });
    live.current.settings = { ...live.current.settings, range: r };
    exitExam(false);
    if (!live.current.prayer) player.stop();
    if (session.current) {
      // Une séance en cours continue sur la nouvelle plage.
      const mode = session.current.mode;
      endSession(false);
      beginSession(mode === 'prayer' ? 'prayer' : 'recite');
    }
    if (live.current.mushaf) resetTracker(live.current.mushaf, r);
    setSheet(null);
    if (!fromTeacher && liveActive() && r.kind === 'surah') {
      teacher.current!.note(`اختار الطالب من الشاشة: سورة ${r.s} من الآية ${r.a1} إلى ${r.a2}. استدعِ open_mushaf لها ثم قل «تفضّل».`);
    }
  };

  const runCommand = (c: Command) => {
    switch (c.type) {
      case 'fath':
        return doFath(true);
      case 'exam':
        return startExam();
      case 'listen':
        return playFromHere();
      case 'stop':
        return player.stop();
      case 'tafsir':
        return showTafsir();
      case 'prayer-start':
        return startPrayer();
      case 'prayer-end':
        return live.current.prayer ? endPrayer() : undefined;
      case 'surah': {
        const meta = SURAHS[c.n - 1];
        pickRange({ kind: 'surah', s: c.n, a1: 1, a2: meta.ayahs });
        say(`سورة ${meta.name}، تفضّل`, 'info');
        return;
      }
    }
  };

  /* ---------- Ce que l'on entend (mode sans clé) ---------- */

  handlers.current.final = (text: string) => {
    lastActivity.current = Date.now();
    setInterim('');
    const t = tracker.current;
    const m = live.current.mushaf;
    if (!t || !m) return;
    const w = words(text);
    if (!w.length) return;

    const cmd = parseCommand(w, live.current.prayer);
    if (cmd) return runCommand(cmd);
    if (live.current.prayer && w.join(' ').includes('الله اكبر') && w.length <= 3) {
      // Nouvelle rak'a : la récitation reprendra ailleurs (la Fatiha, puis une sourate).
      t.setFree();
      rerender();
      return;
    }
    if (player.playing || speakingNow()) return;

    const st = live.current.exam;
    if (st) {
      if (st.phase !== 'asking') return;
      if (st.q.kind === 'where') {
        const i = w.findIndex((x) => x === 'سوره');
        const n = findSurah(i >= 0 ? w.slice(i + 1) : w);
        if (n) answerWhere(n);
        return;
      }
    }

    const before = t.stats.ok;
    const ev = t.feed(w);
    if (session.current) session.current.words += t.stats.ok - before;
    handleEvents(ev);
    rerender();
  };

  handlers.current.interim = (text: string) => {
    if (text) lastActivity.current = Date.now();
    setInterim(text);
  };

  const answerWhere = (n: number) => {
    const st = live.current.exam;
    if (!st || st.q.kind !== 'where' || st.phase !== 'asking') return;
    finishQuestion(n === st.q.answer);
  };

  /* ---------- Fath automatique après un silence ---------- */

  useEffect(() => {
    if (!listening) return;
    const id = window.setInterval(() => {
      const t = tracker.current;
      if (!t || t.locating || t.done || player.playing || speakingNow()) return;
      if (teacher.current && (teacher.current.speaking || teacher.current.state !== 'listening')) return;
      if (live.current.exam?.phase === 'answered' || live.current.exam?.q.kind === 'where') return;
      const delay = (live.current.prayer ? 3.5 : live.current.settings.fathDelay) * 1000;
      if (Date.now() - lastActivity.current < delay) return;
      if (fathAt.current === t.pos) return;
      // Pas de fath avant que le récitant ait commencé (sauf en examen, où la question attend une réponse).
      if (t.pos === t.start && !live.current.exam && t.stats.ok === 0) return;
      doFath(false);
    }, 400);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  useEffect(() => {
    player.onAyah = (ref) => setPlaying(ref);
  }, [player]);

  // La récitation enregistrée s'arrête quand on quitte l'application ou change de mode.
  useEffect(() => () => player.stop(), [player]);

  /* ---------- Rendu ---------- */

  const dialogueRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    dialogueRef.current?.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [lines]);

  const t = tracker.current;
  const previewPos = t && interim ? t.preview(words(interim)) : (t?.pos ?? 0);
  const fontClass = fontFor(settings.riwaya);

  const toggleDot = () => {
    if (!mushaf) return;
    if (listening) {
      stopListening(true);
      if (exam) exitExam();
      return;
    }
    if (t?.done && !exam) resetTracker(mushaf, settings.range);
    startListening(exam ? 'exam' : 'recite');
  };

  const submitTyped = () => {
    if (!typed.trim()) return;
    if (!listening) startListening(exam ? 'exam' : 'recite');
    handlers.current.final(typed);
    setTyped('');
  };

  const idle = !listening && t && !t.locating && t.pos === t.start && !exam;
  const liveLines = liveMode ? lines.filter((l) => l.text) : [];
  const statusText = playing
    ? `▶ ${ayahLabel(playing.s, playing.a)}`
    : (status?.text ?? (liveMode && listening ? LIVE_LABEL[liveState] : listening ? (interim ? '…' : 'أستمع') : ''));

  return (
    <div className={'app' + (prayer ? ' prayer' : '')}>
      <header className="top">
        <button className="brand" onClick={() => setSheet('help')} aria-label="كيف أستعمله؟">
          تَسْمِيع
        </button>
        <button className="riwaya-badge" onClick={() => setSheet('riwaya')} disabled={listening}>
          <span className={'dot-mini' + (liveMode ? ' live' : '')} aria-hidden />
          {riwaya.short}
        </button>
      </header>

      <main className="stage">
        {loadError && (
          <div className="card error">
            <p>تعذّر تحميل نص المصحف: {loadError}</p>
            <button className="primary" onClick={() => update({ riwaya: settings.riwaya })}>
              إعادة المحاولة
            </button>
          </div>
        )}
        {!mushaf && !loadError && <p className="loading">جارٍ تحميل مصحف {riwaya.name}…</p>}

        {liveLines.length > 0 && (
          <ol className={'dialogue ' + fontClass} aria-live="polite" ref={dialogueRef}>
            {liveLines.slice(exam ? -3 : -8).map((l) => (
              <li key={l.role + l.id} className={l.role + (l.final ? '' : ' partial')}>
                <DialogueLine text={l.text} mushaf={mushaf} hint={t?.pos} />
              </li>
            ))}
          </ol>
        )}

        {mushaf && t && exam && (
          <section className="exam card">
            <div className="exam-head">
              <span>{exam.q.prompt}</span>
              <span className="score">
                {arNum(exam.right)} / {arNum(exam.asked - (exam.phase === 'asking' ? 1 : 0))}
              </span>
            </div>
            {exam.q.shown && exam.q.kind !== 'continue' && <p className={'ayah shown ' + fontClass}>{exam.q.shown}</p>}
            {exam.q.kind === 'where' ? (
              <div className="options">
                {exam.q.options!.map((n) => (
                  <button
                    key={n}
                    disabled={exam.phase === 'answered'}
                    className={exam.phase === 'answered' ? (n === exam.q.answer ? 'right' : '') : ''}
                    onClick={() => answerWhere(n)}
                  >
                    {SURAHS[n - 1].name}
                  </button>
                ))}
              </div>
            ) : (
              <RecitationView mushaf={mushaf} tracker={t} previewPos={previewPos} showText={exam.phase === 'answered'} fontClass={fontClass} />
            )}
            {exam.phase === 'answered' && (
              <p className={'verdict ' + (exam.correct ? 'ok' : 'warn')}>
                {exam.correct ? 'أحسنت' : 'راجع هذا الموضع'} · {ayahLabel(exam.q.ayah.s, exam.q.ayah.a)}
              </p>
            )}
            <div className="exam-actions">
              {exam.phase === 'asking' ? (
                <>
                  {exam.q.expect && (
                    <button className="ghost" onClick={() => doFath(true)}>
                      افتح عليّ
                    </button>
                  )}
                  <button className="ghost" onClick={() => finishQuestion(false, true)}>
                    لا أدري
                  </button>
                </>
              ) : (
                <button className="primary" onClick={nextQuestion}>
                  السؤال التالي
                </button>
              )}
              <button className="ghost" onClick={() => exitExam()}>
                إنهاء الاختبار
              </button>
            </div>
          </section>
        )}

        {mushaf && t && !exam && (
          <>
            {idle ? (
              <div className="intro">
                <button className="range-pill" onClick={() => setSheet('range')}>
                  {rangeLabel(settings.range)} <span aria-hidden>▾</span>
                </button>
                <p className="hint">
                  {liveMode
                    ? 'اضغط الدائرة وكلّم الشيخ: قل ما ستقرأ ثم اقرأ، أو «اختبرني»، أو اسأله عن معنى آية.'
                    : 'اضغط الدائرة ثم اقرأ من حفظك. يسكت ما دمتَ مصيباً، ويقول «أعِد» عند الخطأ، ويفتح عليك إذا نسيت.'}
                </p>
                {!apiKey && (
                  <button className="key-cta" onClick={() => setSheet('settings')}>
                    أدخل مفتاح Gemini المجاني ليحادثك الشيخ بصوته
                  </button>
                )}
              </div>
            ) : liveMode && listening ? null : t.locating ? (
              <div className="intro">
                <p className="hint big">{prayer ? 'اقرأ، وسأتبعك' : liveMode ? 'قل ما ستقرأ، أو ابدأ القراءة' : 'اقرأ من أي موضع، وسأجد مكانك'}</p>
              </div>
            ) : (
              <RecitationView mushaf={mushaf} tracker={t} previewPos={previewPos} showText={settings.showText} fontClass={fontClass} />
            )}
          </>
        )}

      </main>

      <div className={'status ' + (status?.tone ?? '')} role="status">
        {statusText}
      </div>

      <div className="dock">
        <button
          className={'ink' + (listening ? ' live' : '') + (liveMode && liveState === 'speaking' ? ' speaking' : '') + (flash ? ' flash-' + flash : '')}
          onClick={toggleDot}
          disabled={!mushaf}
          aria-pressed={listening}
          aria-label={listening ? 'إيقاف الاستماع' : 'ابدأ التسميع'}
        >
          <svg viewBox="0 0 24 24" aria-hidden width="34" height="34">
            {listening ? (
              <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" />
            ) : (
              <path
                fill="currentColor"
                d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Zm6-3.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.59a6 6 0 0 0 5-5.91Z"
              />
            )}
          </svg>
        </button>

        {typing && (
          <form
            className="typing"
            onSubmit={(e) => {
              e.preventDefault();
              submitTyped();
            }}
          >
            <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="اكتب ما تقرأ ثم أرسل…" dir="rtl" />
            <button className="primary" type="submit">
              أرسل
            </button>
          </form>
        )}

        <nav className="tools">
          {!exam && (
            <button onClick={() => (listening ? doFath(true) : setSheet('range'))}>{listening ? 'افتح' : 'المقطع'}</button>
          )}
          <button onClick={exam ? () => exitExam() : startExam} disabled={!mushaf}>
            {exam ? 'إنهاء' : 'اختبرني'}
          </button>
          <button onClick={playing ? () => player.stop() : playFromHere} disabled={!mushaf}>
            {playing ? 'حسبك' : 'أسمعني'}
          </button>
          {liveMode && liveState === 'speaking' ? (
            <button onClick={() => teacher.current?.hush()}>اسكت</button>
          ) : (
            <button onClick={showTafsir} disabled={!mushaf}>
              المعنى
            </button>
          )}
          <button onClick={startPrayer} disabled={!mushaf}>
            الصلاة
          </button>
          <button onClick={() => setSheet('history')}>السجل</button>
          <button onClick={() => setSheet('settings')} aria-label="الإعدادات">
            ⚙
          </button>
        </nav>
      </div>

      {prayer && (
        <div className="prayer-veil" onDoubleClick={endPrayer}>
          <div className={'prayer-dot' + (flash ? ' flash-' + flash : '')} />
          <p>
            {t?.locating
              ? 'أستمع'
              : t && mushaf
                ? ayahLabel(mushaf.words[Math.min(t.pos, mushaf.words.length - 1)].s, mushaf.words[Math.min(t.pos, mushaf.words.length - 1)].a)
                : ''}
          </p>
          <button className="ghost" onClick={endPrayer}>
            إنهاء الصلاة
          </button>
        </div>
      )}

      {sheet === 'riwaya' && (
        <RiwayaSheet
          current={settings.riwaya}
          onPick={(id) => {
            player.stop();
            update({ riwaya: id, reciter: '' });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'range' && <RangeSheet current={settings.range} onPick={(r) => pickRange(r)} onClose={() => setSheet(null)} />}
      {sheet === 'settings' && (
        <SettingsSheet
          settings={settings}
          update={update}
          typing={typing}
          setTyping={(v) => {
            if (listening) stopListening(false);
            setTyping(v);
          }}
          apiKey={apiKey}
          setApiKey={(k) => {
            if (listening) stopListening(false);
            saveKey(k);
            setApiKey(k);
            if (k) update({ engine: 'live' });
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'history' && (
        <HistorySheet
          riwaya={settings.riwaya}
          onReview={(s, a) => pickRange({ kind: 'surah', s, a1: a, a2: a })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'help' && <HelpSheet onClose={() => setSheet(null)} />}
      {sheet === 'tafsir' && tafsir && <TafsirSheet {...tafsir} onClose={() => setSheet(null)} />}
      {sheet === 'summary' && summary && (
        <Sheet title="انتهت الجلسة" onClose={() => setSheet(null)}>
          <p className="summary-label">{summary.label}</p>
          <div className="stats">
            <div>
              <b>{arNum(summary.words)}</b>
              <span>كلمة</span>
            </div>
            <div>
              <b>{arNum(summary.slips.filter((s) => s.kind !== 'fath').length)}</b>
              <span>خطأ</span>
            </div>
            <div>
              <b>{arNum(summary.slips.filter((s) => s.kind === 'fath').length)}</b>
              <span>فتح</span>
            </div>
          </div>
          {summary.slips.length > 0 && (
            <ul className="slips">
              {summary.slips.slice(0, 20).map((s, i) => (
                <li key={i}>
                  <span className={'tag ' + s.kind}>{s.kind === 'fath' ? 'فتح' : s.kind === 'skip' ? 'تجاوز' : 'خطأ'}</span>
                  <span className={fontClass}>{s.word}</span>
                  <small>{ayahLabel(s.s, s.a)}</small>
                </li>
              ))}
            </ul>
          )}
          <button className="primary" onClick={() => setSheet(null)}>
            حسناً
          </button>
        </Sheet>
      )}
    </div>
  );
}
