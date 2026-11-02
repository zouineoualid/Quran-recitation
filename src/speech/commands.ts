/* Commandes dites à voix haute (« افتح », « اختبرني », « سأقرأ سورة الملك »…). */
import { normalize, skeleton } from '../quran/arabic';
import { SURAHS } from '../data/surahs';

export type Command =
  | { type: 'fath' }
  | { type: 'exam' }
  | { type: 'listen' }
  | { type: 'stop' }
  | { type: 'tafsir' }
  | { type: 'prayer-start' }
  | { type: 'prayer-end' }
  | { type: 'surah'; n: number };

const stripAl = (w: string) => (w.startsWith('ال') && w.length > 3 ? w.slice(2) : w);

const SURAH_KEYS = SURAHS.map((s) => ({
  n: s.n,
  key: skeleton(
    s.name
      .split(/\s+/)
      .map((w) => stripAl(normalize(w)))
      .join(''),
  ),
}));

// Noms courants qui diffèrent du titre imprimé.
const ALIASES: Record<string, number> = {
  [skeleton('تبارك')]: 67,
  [skeleton('الملك')]: 67,
  [skeleton('عم')]: 78,
  [skeleton('ياسين')]: 36,
  [skeleton('يس')]: 36,
  [skeleton('الاخلاص')]: 112,
  [skeleton('اخلاص')]: 112,
  [skeleton('الحمد')]: 1,
  [skeleton('براءه')]: 9,
  [skeleton('بني')]: 17,
  [skeleton('الاسراء')]: 17,
  [skeleton('اسراء')]: 17,
  [skeleton('غافر')]: 40,
  [skeleton('المؤمن')]: 40,
  [skeleton('فصلت')]: 41,
  [skeleton('السجده')]: 32,
  [skeleton('الدهر')]: 76,
  [skeleton('الانسان')]: 76,
};

/** Trouve une sourate à partir des mots qui suivent « سورة ». */
export function findSurah(after: string[]): number | null {
  if (!after.length) return null;
  for (let n = Math.min(3, after.length); n >= 1; n--) {
    const joined = skeleton(after.slice(0, n).map(stripAl).join(''));
    const full = skeleton(after.slice(0, n).join(''));
    if (ALIASES[full]) return ALIASES[full];
    const hit = SURAH_KEYS.find((s) => s.key === joined);
    if (hit) return hit.n;
  }
  return null;
}

const has = (w: string[], ...keys: string[]) => keys.some((k) => w.includes(k));

/**
 * Reconnaît une commande dans un segment (mots normalisés).
 * Les commandes sont courtes : un long segment est une récitation.
 */
export function parseCommand(w: string[], inPrayer: boolean): Command | null {
  if (!w.length || w.length > 6) return null;
  const i = w.findIndex((x) => x === 'سوره' || x === 'بسوره');
  if (i >= 0 && w.length - i <= 4 && (i > 0 || w.length <= 3)) {
    const n = findSurah(w.slice(i + 1));
    if (n) return { type: 'surah', n };
  }
  if (w.length <= 3 && has(w, 'افتح', 'فتح') && !has(w, 'بيننا')) return { type: 'fath' };
  if (w.length <= 3 && has(w, 'اختبرني', 'اختبر', 'امتحني', 'امتحنني')) return { type: 'exam' };
  if (w.length <= 3 && has(w, 'اسمعني', 'سمعني', 'اسمعنا')) return { type: 'listen' };
  if (w.length <= 2 && has(w, 'حسبك', 'توقف', 'كفى', 'كفي', 'قف')) return { type: 'stop' };
  if (w.length <= 4 && (has(w, 'فسر', 'تفسير') || (has(w, 'معنى', 'معني') && has(w, 'ما', 'الايه')))) return { type: 'tafsir' };
  if (w.length <= 2 && w.join(' ') === 'الله اكبر' && !inPrayer) return { type: 'prayer-start' };
  if (w[0] === 'السلام' && w[1] === 'عليكم') return { type: 'prayer-end' };
  return null;
}
