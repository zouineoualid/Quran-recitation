/* Ce que le « cheikh » dit : « أعِد » à voix basse, et le fath (les mots suivants). */

let ctx: AudioContext | undefined;
let busyUntil = 0;

function audioCtx(): AudioContext | undefined {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

/** À appeler lors d'un geste de l'utilisateur (iOS n'autorise le son qu'après un toucher). */
export function unlockAudio() {
  audioCtx();
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    /* pas de synthèse vocale */
  }
}

/** Petit son doux (deux notes) quand aucune voix arabe n'est disponible. */
export function chime(kind: 'repeat' | 'hint' | 'done' = 'repeat') {
  const c = audioCtx();
  if (!c) return;
  const notes = kind === 'repeat' ? [523, 392] : kind === 'hint' ? [440, 523] : [392, 523, 659];
  notes.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const t = c.currentTime + i * 0.16;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.35);
  });
}

function arabicVoice(): SpeechSynthesisVoice | undefined {
  try {
    const voices = speechSynthesis.getVoices();
    return voices.find((v) => v.lang.toLowerCase().startsWith('ar-sa')) ?? voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
  } catch {
    return undefined;
  }
}

if (typeof speechSynthesis !== 'undefined') {
  // Chrome charge les voix de façon asynchrone.
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

export const hasArabicVoice = () => !!arabicVoice();

/**
 * `block` : ignorer ce que le micro entend pendant que la voix parle (consignes d'examen,
 * qui seraient sinon prises pour une récitation fausse). « أعِد » et le fath ne bloquent pas :
 * le récitant se reprend souvent par-dessus ; « أعِد » est ignoré par le suivi, et si l'écho
 * du fath est entendu, le suivi revient en arrière en silence quand le récitant le répète.
 */
function speak(text: string, opts: { rate?: number; volume?: number; block?: boolean } = {}): boolean {
  const v = arabicVoice();
  if (!v) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v;
    u.lang = v.lang;
    u.rate = opts.rate ?? 0.9;
    u.volume = opts.volume ?? 0.7;
    if (opts.block) {
      busyUntil = Date.now() + 600 + text.length * 90;
      u.onend = () => (busyUntil = Date.now() + 250);
    }
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

/** La voix de l'application est-elle en train de parler (pour ne pas la prendre pour une récitation) ? */
export const speakingNow = () => Date.now() < busyUntil;

export function vibrate(ms = 60) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* non disponible */
  }
}

export function sayRepeat(voiceOn: boolean) {
  vibrate(70);
  if (!voiceOn || !speak('أَعِدْ', { rate: 0.95, volume: 0.65 })) chime('repeat');
}

export function sayFath(text: string, voiceOn: boolean) {
  if (!voiceOn || !speak(text, { rate: 0.8, volume: 0.55 })) chime('hint');
}

export function sayText(text: string, voiceOn: boolean) {
  if (voiceOn) speak(text, { rate: 0.95, volume: 0.8, block: true });
}
