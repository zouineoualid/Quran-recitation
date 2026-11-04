/* Questions d'examen tirées de la plage choisie (« اختبرني »). */
import type { Mushaf, QAyah } from '../quran/mushaf';
import { SURAHS } from '../data/surahs';

export type QuestionKind = 'continue' | 'next' | 'previous' | 'surah-start' | 'where';

export interface Question {
  kind: QuestionKind;
  /** Consigne affichée et dite. */
  prompt: string;
  /** Texte montré au récitant (début de verset, verset entier…). */
  shown: string;
  /** Mots à réciter [début, fin), pour les questions de récitation. */
  expect?: [number, number];
  /** Pour « où se trouve ce verset ? » : sourates proposées et la bonne réponse. */
  options?: number[];
  answer?: number;
  ayah: QAyah;
}

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

const shuffle = <T,>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const arNum = (n: number) => n.toLocaleString('ar-EG');

/** Crée une question dans les versets dont les mots sont dans [start, end). */
export function makeQuestion(m: Mushaf, start: number, end: number, avoid?: QuestionKind): Question | null {
  const ayahs = m.ayahs.filter((a) => a.first >= start && a.first + a.count <= end);
  if (!ayahs.length) return null;
  const surahs = [...new Set(ayahs.map((a) => a.s))];

  const kinds: QuestionKind[] = ['continue', 'continue', 'next'];
  if (ayahs.length > 2) kinds.push('previous');
  if (surahs.length > 1) kinds.push('surah-start', 'where', 'where');
  const choices = kinds.filter((k) => k !== avoid);
  const kind = pick(choices.length ? choices : kinds);
  const text = (a: QAyah) => m.words.slice(a.first, a.first + a.count).map((w) => w.text).join(' ');
  const idx = (a: QAyah) => ayahs.indexOf(a);

  switch (kind) {
    case 'continue': {
      const long = ayahs.filter((a) => a.count >= 5);
      const a = pick(long.length ? long : ayahs);
      const shownCount = Math.min(Math.max(2, Math.floor(a.count / 3)), 5, a.count - 1);
      const head = m.words.slice(a.first, a.first + Math.max(1, shownCount));
      return {
        kind,
        prompt: 'أكمل الآية',
        shown: head.map((w) => w.text).join(' ') + ' …',
        expect: [a.first + head.length, a.first + a.count],
        ayah: a,
      };
    }
    case 'next': {
      const pool = ayahs.slice(0, -1);
      const a = pick(pool.length ? pool : ayahs);
      const n = ayahs[idx(a) + 1] ?? m.ayahOfWord(a.first + a.count);
      return { kind, prompt: 'اقرأ الآية التي بعدها', shown: text(a), expect: [n.first, n.first + n.count], ayah: a };
    }
    case 'previous': {
      const a = pick(ayahs.slice(1));
      const p = ayahs[idx(a) - 1];
      return { kind, prompt: 'اقرأ الآية التي قبلها', shown: text(a), expect: [p.first, p.first + p.count], ayah: a };
    }
    case 'surah-start': {
      const s = pick(surahs);
      const a = m.ayah(s, 1)!;
      const meta = SURAHS[s - 1];
      return {
        kind,
        prompt: `اقرأ بداية سورة ${meta.name}`,
        shown: '',
        expect: [a.first, a.first + a.count],
        ayah: a,
      };
    }
    case 'where': {
      const a = pick(ayahs);
      const others = shuffle(surahs.filter((s) => s !== a.s)).slice(0, 3);
      // Compléter avec des sourates voisines si la plage en contient peu.
      for (let d = 1; others.length < 3 && d < 114; d++) {
        for (const s of [a.s + d, a.s - d]) if (s >= 1 && s <= 114 && s !== a.s && !others.includes(s) && others.length < 3) others.push(s);
      }
      return {
        kind,
        prompt: 'في أي سورة هذه الآية؟',
        shown: text(a),
        options: shuffle([a.s, ...others]),
        answer: a.s,
        ayah: a,
      };
    }
  }
}

export const ayahLabel = (s: number, a: number) => `سورة ${SURAHS[s - 1].name}، الآية ${arNum(a)}`;
export { arNum };
