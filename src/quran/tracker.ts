import { matches, skeleton, type Strictness, type WordKey } from './arabic';
import type { Mushaf, QWord } from './mushaf';

export type WordState = 'ok' | 'dropped' | 'mistake' | 'missed' | 'fath';

export type TrackEvent =
  | { type: 'mistake'; at: number; heard: string; kind: 'wrong' | 'skip' }
  | { type: 'ayah'; s: number; a: number }
  | { type: 'located'; g: number }
  | { type: 'jump'; from: number; to: number }
  | { type: 'surah-end'; s: number }
  | { type: 'done' };

/** Formules dites autour de la récitation, qui ne sont pas des erreurs. */
const IGNORABLE: string[][] = [
  ['اعوذ', 'بالله', 'من', 'الشيطان', 'الرجيم'],
  ['بسم', 'الله', 'الرحمن', 'الرحيم'],
  ['صدق', 'الله', 'العظيم'],
  ['الله', 'اكبر'],
  ['سمع', 'الله', 'لمن', 'حمده'],
  ['ربنا', 'ولك', 'الحمد'],
  ['ربنا', 'لك', 'الحمد'],
  ['السلام', 'عليكم', 'ورحمه', 'الله'],
  ['امين'],
  ['اعد'],
  ['افتح'],
].map((p) => p.map(skeleton));

/** Petits mots que la reconnaissance vocale avale souvent. */
const isShort = (w: QWord) => w.key.skel.length <= 2;

export interface TrackerOptions {
  strictness: Strictness;
}

/**
 * Suit le récitant mot à mot dans le texte imprimé.
 * - mode « plage » : on attend les mots de [start, end) dans l'ordre ;
 * - mode « libre » : on cherche d'abord où l'on est dans le mushaf (MushafLocator), puis on suit.
 * Tolère les répétitions (on revient en arrière en silence), les mots avalés par la
 * reconnaissance vocale et les formules (isti'âdha, basmala, takbîr…).
 */
export class Tracker {
  pos = 0;
  start = 0;
  end = 0;
  locating = false;
  readonly state = new Map<number, WordState>();
  stats = { ok: 0, mistakes: 0, faths: 0 };

  private free = false;
  private flaggedAt = -1;
  private locBuffer: string[] = [];

  constructor(
    readonly mushaf: Mushaf,
    public opts: TrackerOptions = { strictness: 'normal' },
  ) {}

  setRange(start: number, end: number) {
    this.free = false;
    this.locating = false;
    this.start = start;
    this.end = end;
    this.pos = start;
    this.flaggedAt = -1;
    this.locBuffer = [];
  }

  /** Mode libre : on trouve la place du récitant dans le mushaf entier. */
  setFree() {
    this.free = true;
    this.locating = true;
    this.start = 0;
    this.end = this.mushaf.words.length;
    this.flaggedAt = -1;
    this.locBuffer = [];
  }

  get isFree() {
    return this.free;
  }

  get done() {
    return !this.locating && this.pos >= this.end;
  }

  /** Les mots du prochain « fath » (jusqu'au prochain signe de pause). */
  nextWords(): QWord[] {
    if (this.locating || this.pos >= this.end) return [];
    return this.mushaf.fathFrom(this.pos).filter((w) => w.g < this.end);
  }

  markFath(words: QWord[]) {
    for (const w of words) if (!this.state.has(w.g)) this.state.set(w.g, 'fath');
    this.stats.faths++;
  }

  private word(g: number): QWord | undefined {
    return g < this.end ? this.mushaf.words[g] : undefined;
  }

  private is(heard: string | undefined, g: number): boolean {
    const w = this.word(g);
    return !!w && heard !== undefined && matches(heard, w.key, this.opts.strictness);
  }

  /** Correspondance au point g : mot pour mot, mot entendu coupé en deux, ou deux mots imprimés fusionnés. */
  private matchHere(heard: string[], j: number, g: number): { dh: number; dg: number } | null {
    if (this.is(heard[j], g)) return { dh: 1, dg: 1 };
    const w = this.word(g);
    if (!w) return null;
    if (j + 1 < heard.length && matches(heard[j] + heard[j + 1], w.key, this.opts.strictness)) return { dh: 2, dg: 1 };
    const w2 = this.word(g + 1);
    if (w2) {
      const merged: WordKey = {
        forms: w.key.forms.flatMap((a) => w2.key.forms.map((b) => a + b)),
        skel: w.key.skel + w2.key.skel,
      };
      if (matches(heard[j], merged, this.opts.strictness)) return { dh: 1, dg: 2 };
    }
    return null;
  }

  private ignorableLen(heard: string[], j: number): number {
    for (const phrase of IGNORABLE) {
      let k = 0;
      while (k < phrase.length && j + k < heard.length && skeleton(heard[j + k]) === phrase[k]) k++;
      if (k >= Math.min(2, phrase.length)) return k;
    }
    return 0;
  }

  /** Où reprendre si les mots entendus ne suivent pas : répétition en arrière, ou saut en avant. */
  private resync(heard: string[], j: number): number | null {
    const need = Math.min(3, heard.length - j);
    if (need < 2) return null;
    const ayah = this.mushaf.ayahOfWord(this.pos);
    const prev = this.mushaf.ayahOfWord(Math.max(this.start, ayah.first - 1));
    const lo = Math.max(this.start, prev.first);
    const hi = Math.min(this.end - need + 1, this.pos + 60);
    let best: number | null = null;
    for (let g = lo; g < hi; g++) {
      if (g === this.pos) continue;
      // En avant, on exige trois mots pour ne pas sauter sur une coïncidence.
      if (g > this.pos && need < 3) continue;
      let ok = true;
      for (let k = 0; k < need && ok; k++) ok = this.is(heard[j + k], g + k);
      if (ok && (best === null || Math.abs(g - this.pos) < Math.abs(best - this.pos))) best = g;
    }
    return best;
  }

  private advance(to: number, as: WordState, events: TrackEvent[]) {
    for (let g = this.pos; g < to; g++) {
      const prevState = this.state.get(g);
      if (as === 'ok') {
        if (prevState !== 'mistake' && prevState !== 'fath') this.state.set(g, 'ok');
        this.stats.ok++;
      } else if (!prevState || prevState === 'fath') {
        this.state.set(g, as);
      }
      const w = this.mushaf.words[g];
      if (w.last) {
        events.push({ type: 'ayah', s: w.s, a: w.a });
        const next = this.mushaf.words[g + 1];
        if (!next || next.s !== w.s) events.push({ type: 'surah-end', s: w.s });
      }
    }
    if (to > this.pos) this.flaggedAt = -1;
    this.pos = to;
  }

  /** Essaie de trouver la place du récitant à partir des mots accumulés. */
  private tryLocate(events: TrackEvent[]): string[] | null {
    const buf = this.locBuffer;
    if (buf.length < 3) return null;
    const hits = this.mushaf.locate(buf, this.start, this.end);
    if (!hits.length) {
      if (buf.length > 12) this.locBuffer = buf.slice(-8);
      return null;
    }
    const [top, second] = hits;
    const sure = (!second || top.votes > second.votes) && (top.votes >= 2 || buf.length <= 4);
    if (!sure) {
      // Plusieurs endroits possibles (mutashâbihât) : on attend d'entendre la suite.
      if (buf.length > 16) this.locBuffer = buf.slice(-12);
      return null;
    }
    this.locating = false;
    this.pos = top.g;
    this.flaggedAt = -1;
    this.locBuffer = [];
    events.push({ type: 'located', g: top.g });
    return buf;
  }

  /** Traite un segment de récitation transcrit (mots normalisés). */
  feed(input: string[]): TrackEvent[] {
    const events: TrackEvent[] = [];
    const wasDone = this.done;
    let heard = input.filter((w) => w.length > 0);

    if (this.locating) {
      // On retire les formules avant de chercher.
      const kept: string[] = [];
      for (let j = 0; j < heard.length; ) {
        const k = this.ignorableLen(heard, j);
        if (k) j += k;
        else kept.push(heard[j++]);
      }
      this.locBuffer.push(...kept);
      const found = this.tryLocate(events);
      if (!found) return events;
      heard = found;
    }

    let j = 0;
    while (j < heard.length) {
      if (this.pos >= this.end) {
        if (this.free) {
          this.locating = true;
          this.start = 0;
          this.end = this.mushaf.words.length;
          this.locBuffer = [];
          return events.concat(this.feed(heard.slice(j)));
        }
        break;
      }

      const m = this.matchHere(heard, j, this.pos);
      if (m) {
        const before = events.length;
        this.advance(this.pos + m.dg, 'ok', events);
        j += m.dh;
        if (this.free && events.slice(before).some((e) => e.type === 'surah-end')) {
          // Fin de sourate en mode libre (ex. la Fatiha dans la prière) : la suite peut être n'importe où.
          this.locating = true;
          this.locBuffer = [];
          return events.concat(this.feed(heard.slice(j)));
        }
        continue;
      }

      const ign = this.ignorableLen(heard, j);
      if (ign) {
        j += ign;
        continue;
      }

      // Mot(s) avalé(s) par la reconnaissance vocale.
      const cur = this.word(this.pos)!;
      if (this.is(heard[j], this.pos + 1) && (isShort(cur) || this.is(heard[j + 1], this.pos + 2) || j + 1 === heard.length)) {
        this.advance(this.pos + 1, 'dropped', events);
        continue;
      }
      if (
        this.is(heard[j], this.pos + 2) &&
        this.is(heard[j + 1], this.pos + 3) &&
        (isShort(cur) || isShort(this.word(this.pos + 1)!))
      ) {
        this.advance(this.pos + 2, 'dropped', events);
        continue;
      }

      const r = this.resync(heard, j);
      if (r !== null) {
        if (r < this.pos) {
          // Le récitant reprend en arrière (après « أعِد » ou par habitude) : on le suit.
          events.push({ type: 'jump', from: this.pos, to: r });
          this.pos = r;
          this.flaggedAt = -1;
        } else {
          // Il a sauté des mots ou un verset.
          if (this.flaggedAt !== this.pos) {
            events.push({ type: 'mistake', at: this.pos, heard: heard[j], kind: 'skip' });
            this.stats.mistakes++;
          }
          this.advance(r, 'missed', events);
        }
        continue;
      }

      // Lettre isolée : morceau de mot mal découpé, on ne la compte pas.
      if (heard[j].length < 2) {
        j++;
        continue;
      }

      if (this.flaggedAt !== this.pos) {
        events.push({ type: 'mistake', at: this.pos, heard: heard[j], kind: 'wrong' });
        this.state.set(this.pos, 'mistake');
        this.stats.mistakes++;
        this.flaggedAt = this.pos;
      }
      j++;
    }

    if (!this.free && !wasDone && this.done) events.push({ type: 'done' });
    return events;
  }

  /** Position provisoire d'après une transcription intermédiaire (sans rien juger ni modifier). */
  preview(heard: string[]): number {
    if (this.locating) return this.pos;
    let g = this.pos;
    let j = 0;
    while (j < heard.length && g < this.end) {
      const m = this.matchHere(heard, j, g);
      if (m) {
        g += m.dg;
        j += m.dh;
      } else if (this.is(heard[j], g + 1)) {
        g += 1;
      } else {
        j++;
      }
    }
    return g;
  }
}
