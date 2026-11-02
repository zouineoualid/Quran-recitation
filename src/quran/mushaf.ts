import { hasLetters, hasWaqf, makeKey, skeleton, normalize, type WordKey } from './arabic';
import { HAFS, type Riwaya } from '../data/riwayat';
import { SURAHS } from '../data/surahs';

export interface Verse {
  chapter: number;
  verse: number;
  text: string;
}

export interface QWord {
  /** Indice global du mot dans le mushaf. */
  g: number;
  s: number;
  a: number;
  /** Rang du mot dans le verset. */
  i: number;
  /** Texte imprimé (avec les signes qui l'accompagnent : ۞, waqf…). */
  text: string;
  key: WordKey;
  /** Un signe de pause suit ce mot. */
  waqf: boolean;
  /** Dernier mot du verset. */
  last: boolean;
}

export interface QAyah {
  s: number;
  a: number;
  text: string;
  /** Indice global du premier mot. */
  first: number;
  count: number;
}

/** Découpe un verset en mots imprimés ; les signes isolés (۞ ۩ ۖ) s'attachent à un mot voisin. */
export function tokenize(text: string): { text: string; waqf: boolean }[] {
  const out: { text: string; waqf: boolean }[] = [];
  let pending = '';
  for (const raw of text.replace(/‏/g, '').trim().split(/\s+/)) {
    if (!raw) continue;
    if (!hasLetters(raw)) {
      if (hasWaqf(raw) && out.length) {
        out[out.length - 1].waqf = true;
        out[out.length - 1].text += ' ' + raw;
      } else if (out.length && raw.includes('۩')) {
        out[out.length - 1].text += ' ' + raw;
      } else {
        pending += raw + ' ';
      }
      continue;
    }
    out.push({ text: pending + raw, waqf: hasWaqf(raw) });
    pending = '';
  }
  return out;
}

export class Mushaf {
  readonly words: QWord[] = [];
  readonly ayahs: QAyah[] = [];
  private ayahPos = new Map<number, number>();
  private trigramIndex?: Map<string, number[]>;

  constructor(
    readonly riwaya: Riwaya,
    verses: Verse[],
    hafs?: Verse[],
  ) {
    const hafsByKey = new Map<number, Verse>();
    if (hafs) for (const v of hafs) hafsByKey.set(v.chapter * 1000 + v.verse, v);

    for (const v of verses) {
      const tokens = tokenize(v.text);
      const alt = hafsByKey.get(v.chapter * 1000 + v.verse);
      const altTokens = alt ? tokenize(alt.text) : [];
      const sameCount = altTokens.length === tokens.length;
      const first = this.words.length;
      tokens.forEach((t, i) => {
        this.words.push({
          g: this.words.length,
          s: v.chapter,
          a: v.verse,
          i,
          text: t.text,
          key: makeKey(t.text, sameCount ? [altTokens[i].text] : []),
          waqf: t.waqf,
          last: i === tokens.length - 1,
        });
      });
      this.ayahPos.set(v.chapter * 1000 + v.verse, this.ayahs.length);
      this.ayahs.push({ s: v.chapter, a: v.verse, text: v.text.replace(/‏/g, ''), first, count: tokens.length });
    }
  }

  ayah(s: number, a: number): QAyah | undefined {
    const i = this.ayahPos.get(s * 1000 + a);
    return i === undefined ? undefined : this.ayahs[i];
  }

  ayahOfWord(g: number): QAyah {
    const w = this.words[Math.min(g, this.words.length - 1)];
    return this.ayah(w.s, w.a)!;
  }

  /** Indices globaux [début, fin) des mots des versets s:a1 à s:a2. */
  range(s: number, a1: number, s2: number, a2: number): [number, number] {
    const from = this.ayah(s, a1) ?? this.ayah(s, 1)!;
    const to = this.ayah(s2, a2) ?? this.ayah(s2, SURAHS[s2 - 1].ayahs)!;
    return [from.first, to.first + to.count];
  }

  /** Mots qui suivent g jusqu'au prochain signe de pause ou la fin du verset (au moins `min`, au plus `max`). */
  fathFrom(g: number, min = 2, max = 7): QWord[] {
    const out: QWord[] = [];
    for (let k = g; k < this.words.length && out.length < max; k++) {
      const w = this.words[k];
      out.push(w);
      if (out.length >= min && (w.waqf || w.last)) break;
      if (w.last && out.length < min) break;
    }
    return out;
  }

  /**
   * Cherche dans tout le mushaf (ou dans [from, to)) où se trouve une suite de mots entendus.
   * Renvoie les positions candidates du premier mot entendu, les plus probables d'abord.
   */
  locate(heard: string[], from = 0, to = this.words.length): { g: number; votes: number }[] {
    const idx = this.trigrams();
    const votes = new Map<number, number>();
    const sk = heard.map((w) => skeleton(normalize(w)));
    for (let t = 0; t + 3 <= sk.length; t++) {
      const hits = idx.get(sk[t] + '|' + sk[t + 1] + '|' + sk[t + 2]);
      if (!hits) continue;
      for (const g of hits) {
        const anchor = g - t;
        if (anchor < from || anchor >= to) continue;
        votes.set(anchor, (votes.get(anchor) ?? 0) + 1);
      }
    }
    return [...votes.entries()].map(([g, v]) => ({ g, votes: v })).sort((x, y) => y.votes - x.votes || x.g - y.g);
  }

  private trigrams(): Map<string, number[]> {
    if (this.trigramIndex) return this.trigramIndex;
    const idx = new Map<string, number[]>();
    const w = this.words;
    for (let g = 0; g + 2 < w.length; g++) {
      const k = w[g].key.skel + '|' + w[g + 1].key.skel + '|' + w[g + 2].key.skel;
      const list = idx.get(k);
      if (list) list.push(g);
      else idx.set(k, [g]);
    }
    this.trigramIndex = idx;
    return idx;
  }
}

const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions';
const CACHE = 'tasmee-data-v1';

/** Télécharge un JSON en le gardant dans le Cache Storage (pour l'usage hors ligne). */
export async function cachedJson<T>(url: string): Promise<T> {
  let cache: Cache | undefined;
  try {
    cache = await caches.open(CACHE);
    const hit = await cache.match(url);
    if (hit) return (await hit.json()) as T;
  } catch {
    cache = undefined;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  if (cache) {
    try {
      await cache.put(url, res.clone());
    } catch {
      /* quota ou mode privé : tant pis */
    }
  }
  return (await res.json()) as T;
}

async function loadVerses(edition: string): Promise<Verse[]> {
  const data = await cachedJson<{ quran: Verse[] }>(`${CDN}/${edition}.min.json`);
  return data.quran;
}

const loaded = new Map<string, Promise<Mushaf>>();

/** Charge le mushaf d'une riwaya (avec le texte de Hafs en variante pour les autres riwayat). */
export function loadMushaf(riwaya: Riwaya): Promise<Mushaf> {
  let p = loaded.get(riwaya.id);
  if (!p) {
    p = (async () => {
      const [verses, hafs] = await Promise.all([
        loadVerses(riwaya.edition),
        riwaya.id === HAFS.id ? Promise.resolve(undefined) : loadVerses(HAFS.edition).catch(() => undefined),
      ]);
      return new Mushaf(riwaya, verses, hafs);
    })();
    p.catch(() => loaded.delete(riwaya.id));
    loaded.set(riwaya.id, p);
  }
  return p;
}

export async function loadTafsir(edition: string, s: number, a: number): Promise<string> {
  const data = await cachedJson<{ text: string }>(`${CDN}/${edition}/${s}/${a}.json`);
  return data.text;
}
