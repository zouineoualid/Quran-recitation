/**
 * Retrouve, dans une phrase transcrite (récitation du récitant ou paroles du cheikh),
 * les passages du Coran, pour les afficher tels qu'imprimés dans le mushaf de la riwaya
 * (voyelles, rasm uthmani, numéros de versets) ; le reste reste en texte simple.
 */
import { matches, normalize, skeleton } from './arabic';
import type { Mushaf, QWord } from './mushaf';

export type Piece = { kind: 'text'; text: string } | { kind: 'quran'; words: QWord[] };

export interface QuranizeOptions {
  /** Position probable (celle du récitant) pour départager les passages qui se répètent. */
  hint?: number;
  /** Nombre minimal de mots consécutifs pour reconnaître un passage. */
  minRun?: number;
}

export function quranize(text: string, m: Mushaf, opts: QuranizeOptions = {}): Piece[] {
  const minRun = opts.minRun ?? 3;
  const raw = text.split(/\s+/).filter(Boolean);
  const norm = raw.map((w) => normalize(w));
  const sk = norm.map(skeleton);
  const pieces: Piece[] = [];
  const pushText = (w: string) => {
    const last = pieces[pieces.length - 1];
    if (last?.kind === 'text') last.text += ' ' + w;
    else pieces.push({ kind: 'text', text: w });
  };
  /** Longueur de la suite de mots entendus à partir de i qui suit le mushaf à partir de g. */
  const runAt = (i: number, g: number) => {
    let k = 0;
    while (i + k < norm.length && g + k < m.words.length && norm[i + k] && matches(norm[i + k], m.words[g + k].key, 'normal')) k++;
    return k;
  };

  let i = 0;
  let next = -1; // mot du mushaf attendu juste après le dernier passage reconnu
  while (i < raw.length) {
    if (!norm[i]) {
      pushText(raw[i++]);
      continue;
    }
    // Suite directe du passage précédent (même un ou deux mots).
    if (next >= 0 && next < m.words.length) {
      const k = runAt(i, next);
      if (k > 0) {
        (pieces[pieces.length - 1] as { words: QWord[] }).words.push(...m.words.slice(next, next + k));
        i += k;
        next += k;
        continue;
      }
    }
    let best = { g: -1, len: 0 };
    if (i + 2 < raw.length) {
      for (const g of m.trigramHits(sk[i], sk[i + 1], sk[i + 2])) {
        const len = runAt(i, g);
        const closer = opts.hint !== undefined && best.g >= 0 && Math.abs(g - opts.hint) < Math.abs(best.g - opts.hint);
        if (len > best.len || (len === best.len && closer)) best = { g, len };
      }
    }
    if (best.len >= minRun) {
      pieces.push({ kind: 'quran', words: m.words.slice(best.g, best.g + best.len) });
      i += best.len;
      next = best.g + best.len;
    } else {
      pushText(raw[i++]);
      next = -1;
    }
  }
  return pieces;
}
