/* Enveloppe de l'API Web Speech (SpeechRecognition) pour une écoute continue en arabe. */

interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  length: number;
  [i: number]: SRAlternative;
}
interface SREvent {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
interface SRErrorEvent {
  error: string;
}
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRCtor = new () => SR;

function ctor(): SRCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

export const speechSupported =() => typeof window !== 'undefined' && !!ctor();

export interface RecognizerHandlers {
  /** Segment terminé (après une pause du récitant). */
  onFinal(text: string): void;
  /** Transcription provisoire du segment en cours. */
  onInterim(text: string): void;
  onError(message: string): void;
  onListening(on: boolean): void;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'لم يُؤذن باستعمال الميكروفون. اسمح به من إعدادات المتصفح ثم أعد المحاولة.',
  'service-not-allowed': 'خدمة التعرف على الكلام غير متاحة في هذا المتصفح.',
  'audio-capture': 'لا يوجد ميكروفون متاح.',
  network: 'تعذّر الاتصال بخدمة التعرف على الكلام. تحقق من الإنترنت.',
  'language-not-supported': 'المتصفح لا يدعم التعرف على العربية.',
};

/**
 * Écoute continue : la reconnaissance du navigateur s'arrête d'elle-même après un silence
 * ou au bout d'un moment ; on la relance tant que l'utilisateur n'a pas arrêté.
 */
export class Recognizer {
  private rec?: SR;
  private active = false;
  private restarts = 0;
  private lastFinal = '';

  constructor(
    private handlers: RecognizerHandlers,
    private lang = 'ar-SA',
  ) {}

  get listening() {
    return this.active;
  }

  start() {
    const C = ctor();
    if (!C) {
      this.handlers.onError('المتصفح لا يدعم التعرف على الكلام. استعمل Chrome أو Edge أو Safari.');
      return;
    }
    if (this.active) return;
    this.active = true;
    this.restarts = 0;
    this.spawn(C);
  }

  stop() {
    this.active = false;
    const r = this.rec;
    this.rec = undefined;
    if (r) {
      r.onend = null;
      try {
        r.stop();
      } catch {
        /* déjà arrêtée */
      }
    }
    this.handlers.onInterim('');
    this.handlers.onListening(false);
  }

  private spawn(C: SRCtor) {
    const r = new C();
    r.lang = this.lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    this.lastFinal = '';

    r.onstart = () => this.handlers.onListening(true);
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0]?.transcript ?? '';
        if (res.isFinal) {
          this.emitFinal(text);
          this.restarts = 0;
        } else interim += ' ' + text;
      }
      this.handlers.onInterim(interim.trim());
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      const msg = ERRORS[e.error];
      if (msg && e.error !== 'network') {
        this.active = false;
        this.handlers.onError(msg);
      } else if (msg) this.handlers.onError(msg);
    };
    r.onend = () => {
      if (!this.active) {
        this.handlers.onListening(false);
        return;
      }
      // Relance (Chrome coupe après ~60 s ou un long silence).
      this.restarts++;
      if (this.restarts > 8) {
        this.active = false;
        this.handlers.onListening(false);
        this.handlers.onError('توقف الاستماع. اضغط الدائرة للمتابعة.');
        return;
      }
      setTimeout(() => this.active && this.spawn(C), this.restarts > 2 ? 400 : 50);
    };
    this.rec = r;
    try {
      r.start();
    } catch {
      /* start() appelé deux fois : ignoré */
    }
  }

  /** Chrome sur Android renvoie parfois tout le texte depuis le début : on ne garde que la nouveauté. */
  private emitFinal(text: string) {
    let t = text.trim();
    if (!t) return;
    if (ANDROID && this.lastFinal && t.startsWith(this.lastFinal)) t = t.slice(this.lastFinal.length).trim();
    this.lastFinal = text.trim();
    if (t) this.handlers.onFinal(t);
  }
}
