/* Lecture des récitations enregistrées (everyayah.com : un fichier par verset). */
import type { Reciter } from '../data/riwayat';

export interface AyahRef {
  s: number;
  a: number;
}

const pad = (n: number) => String(n).padStart(3, '0');

export const ayahUrl = (r: Reciter, s: number, a: number) => `https://everyayah.com/data/${r.folder}/${pad(s)}${pad(a)}.mp3`;

export class AyahPlayer {
  private audio = new Audio();
  private queue: AyahRef[] = [];
  private idx = 0;
  private reciter?: Reciter;
  onAyah: (ref: AyahRef | null) => void = () => {};

  constructor() {
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => this.next());
  }

  get playing() {
    return this.queue.length > 0;
  }

  play(reciter: Reciter, ayat: AyahRef[]) {
    this.stop();
    if (!ayat.length) return;
    this.reciter = reciter;
    this.queue = ayat;
    this.idx = -1;
    this.next();
  }

  stop() {
    this.queue = [];
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.onAyah(null);
  }

  private next() {
    if (!this.queue.length || !this.reciter) return;
    this.idx++;
    if (this.idx >= this.queue.length) {
      this.stop();
      return;
    }
    const { s, a } = this.queue[this.idx];
    this.audio.src = ayahUrl(this.reciter, s, a);
    this.onAyah(this.queue[this.idx]);
    void this.audio.play().catch(() => this.stop());
    // Précharge le verset suivant.
    const n = this.queue[this.idx + 1];
    if (n) fetch(ayahUrl(this.reciter, n.s, n.a), { mode: 'no-cors' }).catch(() => {});
  }
}
