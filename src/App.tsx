import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadMushaf, loadTafsir, type Mushaf } from './quran/mushaf';
import { Tracker, type TrackEvent } from './quran/tracker';
import { words } from './quran/arabic';
import { Recognizer, speechSupported } from './speech/recognizer';
import { chime, sayFath, sayRepeat, sayText, speakingNow, unlockAudio } from './speech/voice';
import { findSurah, parseCommand, type Command } from './speech/commands';
import { AyahPlayer, type AyahRef } from './audio/player';
import { makeQuestion, ayahLabel, arNum, type Question } from './exam/exam';
import { TAFASIR, recitersFor, riwayaById } from './data/riwayat';
import { JUZ_STARTS, SURAHS } from './data/surahs';
import { saveSession, useSettings, type RangeChoice, type SessionRecord } from './store';
import { RecitationView } from './components/RecitationView';
import { HelpSheet, HistorySheet, RangeSheet, RiwayaSheet, SettingsSheet, TafsirSheet, rangeLabel } from './components/Sheets';
import { Sheet } from './components/Sheet';

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

  const session = useRef<SessionRecord | null>(null);
  const lastActivity = useRef(Date.now());
  const fathAt = useRef(-1);
  const player = useMemo(() => new AyahPlayer(), []);
  const statusTimer = useRef<number | undefined>(undefined);

  // Valeurs courantes lues depuis les callbacks de la reconnaissance vocale.
  const live = useRef({ settings, prayer, exam, mushaf });
  live.current = { settings, prayer, exam, mushaf };

  const say = useCallback((text: string, tone: Tone = 'info', ms = 3500) => {
    setStatus({ text, tone });
    window.clearTimeout(statusTimer.current);
    if (ms) statusTimer.current = window.setTimeout(() => setStatus(null), ms);
  }, []);

  const pulse = useCallback((kind: 'repeat' | 'hint' | 'ok') => {
    setFlash(kind);
    window.setTimeout(() => setFlash(null), 700);
  }, []);

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

  /* ---------- Reconnaissance vocale ---------- */

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

  const startListening = (mode: SessionRecord['mode'] = 'recite') => {
    unlockAudio();
    lastActivity.current = Date.now();
    beginSession(mode);
    if (!typing) recognizer.start();
    else setListening(true);
    void keepAwake(true);
  };

  const stopListening = (show = true) => {
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
    sayFath(next.map((w) => w.text).join(' '), live.current.settings.voice);
    pulse('hint');
    rerender();
  };

  const playFromHere = () => {
    const t = tracker.current;
    const m = live.current.mushaf;
    if (!t || !m) return;
    const { reciters, sameRiwaya } = recitersFor(riwaya);
    const reciter = reciters.find((r) => r.id === settings.reciter) ?? reciters[0];
    const startAyah = t.locating ? m.ayahOfWord(t.start) : m.ayahOfWord(Math.min(t.pos, t.end - 1));
    const list: AyahRef[] = [];
    for (let i = m.ayahs.indexOf(startAyah); i < m.ayahs.length && list.length < 30; i++) {
      const a = m.ayahs[i];
      if (a.first >= t.end) break;
      list.push({ s: a.s, a: a.a });
    }
    player.play(reciter, list);
    say(`${reciter.name}${sameRiwaya ? '' : ' (برواية حفص)'}`, 'info', 3000);
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

  const startPrayer = () => {
    const m = live.current.mushaf;
    if (!m) return;
    stopListening(false);
    exitExam(false);
    const t = new Tracker(m, { strictness: live.current.settings.strictness });
    t.setFree();
    tracker.current = t;
    setPrayer(true);
    live.current.prayer = true;
    startListening('prayer');
    say('تقبّل الله. اقرأ، وسأتبعك', 'info', 3000);
  };

  const endPrayer = () => {
    setPrayer(false);
    live.current.prayer = false;
    stopListening(true);
    if (live.current.mushaf) resetTracker(live.current.mushaf, live.current.settings.range);
  };

  /* ---------- Examen ---------- */

  const askQuestion = (prev?: ExamState) => {
    const m = live.current.mushaf;
    if (!m) return;
    const [start, end] = rangeBounds(m, live.current.settings.range);
    const q = makeQuestion(m, start, end, prev?.q.kind);
    if (!q) return;
    if (q.expect) {
      const t = new Tracker(m, { strictness: live.current.settings.strictness });
      t.setRange(...q.expect);
      tracker.current = t;
      fathAt.current = -1;
    }
    const st: ExamState = { q, asked: (prev?.asked ?? 0) + 1, right: prev?.right ?? 0, phase: 'asking' };
    setExam(st);
    live.current.exam = st;
    sayText(q.prompt, live.current.settings.voice);
    lastActivity.current = Date.now();
    rerender();
  };

  const startExam = () => {
    if (!live.current.mushaf) return;
    stopListening(false);
    setStatus(null);
    askQuestion();
    startListening('exam');
  };

  const finishQuestion = (correctOverride?: boolean, gaveUp = false) => {
    const st = live.current.exam;
    if (!st || st.phase !== 'asking') return;
    const t = tracker.current!;
    const correct = correctOverride ?? (t.stats.mistakes === 0 && t.stats.faths === 0);
    const next: ExamState = { ...st, phase: 'answered', correct, right: st.right + (correct ? 1 : 0), reveal: !correct };
    setExam(next);
    live.current.exam = next;
    if (session.current) session.current.exam = { asked: next.asked, right: next.right };
    if (correct) {
      chime('done');
      pulse('ok');
      say('أحسنت', 'ok', 2500);
    } else {
      pulse('repeat');
      say(gaveUp ? 'هذا هو الجواب' : t.stats.faths ? 'صحيحة بعد الفتح' : 'فيها خطأ', 'warn', 2500);
    }
  };

  const exitExam = (restore = true) => {
    if (!live.current.exam) return;
    setExam(null);
    live.current.exam = null;
    if (restore) {
      stopListening(false);
      if (live.current.mushaf) resetTracker(live.current.mushaf, live.current.settings.range);
    }
  };

  /* ---------- Commandes ---------- */

  const pickRange = (r: RangeChoice) => {
    update({ range: r });
    live.current.settings = { ...live.current.settings, range: r };
    exitExam(false);
    if (session.current) {
      // Une séance en cours continue sur la nouvelle plage.
      endSession(false);
      beginSession('recite');
    }
    if (live.current.mushaf) resetTracker(live.current.mushaf, r);
    setSheet(null);
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

  /* ---------- Ce que l'on entend ---------- */

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

  /* ---------- Rendu ---------- */

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

  return (
    <div className={'app' + (prayer ? ' prayer' : '')}>
      <header className="top">
        <button className="brand" onClick={() => setSheet('help')} aria-label="كيف أستعمله؟">
          تَسْمِيع
        </button>
        <button className="riwaya-badge" onClick={() => setSheet('riwaya')} disabled={listening}>
          <span className="dot-mini" aria-hidden />
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
                <button className="primary" onClick={() => askQuestion(exam)}>
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
                <p className="hint">اضغط الدائرة ثم اقرأ من حفظك. يسكت ما دمتَ مصيباً، ويقول «أعِد» عند الخطأ، ويفتح عليك إذا نسيت.</p>
              </div>
            ) : t.locating ? (
              <div className="intro">
                <p className="hint big">{prayer ? 'اقرأ، وسأتبعك' : 'اقرأ من أي موضع، وسأجد مكانك'}</p>
              </div>
            ) : (
              <RecitationView mushaf={mushaf} tracker={t} previewPos={previewPos} showText={settings.showText} fontClass={fontClass} />
            )}
          </>
        )}
      </main>

      <div className={'status ' + (status?.tone ?? '')} role="status">
        {playing ? `▶ ${ayahLabel(playing.s, playing.a)}` : (status?.text ?? (listening ? (interim ? '…' : 'أستمع') : ''))}
      </div>

      <div className="dock">
        <button
          className={'ink' + (listening ? ' live' : '') + (flash ? ' flash-' + flash : '')}
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
          <button onClick={showTafsir} disabled={!mushaf}>
            المعنى
          </button>
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
          <p>{t?.locating ? 'أستمع' : t && mushaf ? ayahLabel(mushaf.words[Math.min(t.pos, mushaf.words.length - 1)].s, mushaf.words[Math.min(t.pos, mushaf.words.length - 1)].a) : ''}</p>
          <button className="ghost" onClick={endPrayer}>
            إنهاء الصلاة
          </button>
        </div>
      )}

      {sheet === 'riwaya' && (
        <RiwayaSheet
          current={settings.riwaya}
          onPick={(id) => {
            update({ riwaya: id, reciter: '' });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'range' && <RangeSheet current={settings.range} onPick={pickRange} onClose={() => setSheet(null)} />}
      {sheet === 'settings' && (
        <SettingsSheet
          settings={settings}
          update={update}
          typing={typing}
          setTyping={(v) => {
            if (listening) stopListening(false);
            setTyping(v);
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

