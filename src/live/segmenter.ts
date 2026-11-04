/**
 * Découpe le flux du micro en tours de parole, aux pauses du récitant.
 *
 * La détection automatique de Gemini est faite pour la parole courante et coupe mal une
 * récitation psalmodiée : l'application décide donc elle-même du début et de la fin de
 * chaque tour (activityStart / activityEnd), à partir de l'énergie du signal :
 * - un plancher de bruit adaptatif ;
 * - un tour commence après ~100 ms au-dessus du seuil ;
 * - il finit après une pause (courte quand on récite, plus longue quand on parle,
 *   pour ne pas couper une question au milieu) ;
 * - une longue récitation sans pause franche est coupée à la première respiration
 *   après quelques secondes, pour que « أعِد » n'arrive pas trop tard.
 */

export interface SegmenterOptions {
  /** Pause qui termine un tour pendant une récitation (ms). */
  recitePauseMs: number;
  /** Pause qui termine un tour quand on parle au cheikh (ms). */
  talkPauseMs: number;
  /** Après cette durée de tour (ms), une respiration courte suffit à couper. */
  longTurnMs: number;
  /** Durée de la respiration qui coupe un long tour (ms). */
  breathMs: number;
  /** Durée au-dessus du seuil pour ouvrir un tour (ms). */
  attackMs: number;
}

export const DEFAULT_SEGMENTER: SegmenterOptions = {
  recitePauseMs: 450,
  talkPauseMs: 1100,
  longTurnMs: 3500,
  breathMs: 200,
  attackMs: 100,
};

export type SegmentEvent = 'start' | 'end' | null;

export class PauseSegmenter {
  active = false;
  /** Plancher de bruit (RMS). */
  floor = 0.004;
  /** Récitation (pauses courtes) ou conversation (pauses longues). */
  reciting = false;
  /** Rend le segmenteur moins sensible (ex. pendant que le cheikh parle, à cause de l'écho). */
  deafness = 1;

  private loudMs = 0;
  private quietMs = 0;
  private activeMs = 0;

  constructor(public opts: SegmenterOptions = DEFAULT_SEGMENTER) {}

  get turnMs() {
    return this.activeMs;
  }

  /** Une trame : son niveau RMS (0–1) et sa durée (ms). */
  push(rms: number, ms: number): SegmentEvent {
    const startThr = Math.max(this.floor * 3.2, 0.012) * this.deafness;
    const keepThr = Math.max(this.floor * 2, 0.008) * this.deafness;

    if (!this.active) {
      // Le plancher suit le bruit ambiant quand personne ne parle.
      if (rms < this.floor * 2.5 || rms < 0.01) this.floor = Math.max(0.0015, this.floor * 0.97 + rms * 0.03);
      if (rms > startThr) {
        this.loudMs += ms;
        if (this.loudMs >= this.opts.attackMs) {
          this.active = true;
          this.activeMs = this.loudMs;
          this.quietMs = 0;
          this.loudMs = 0;
          return 'start';
        }
      } else this.loudMs = 0;
      return null;
    }

    this.activeMs += ms;
    if (rms < keepThr) this.quietMs += ms;
    else this.quietMs = 0;

    const pause = this.reciting ? this.opts.recitePauseMs : this.opts.talkPauseMs;
    const longTurnBreath = this.reciting && this.activeMs > this.opts.longTurnMs && this.quietMs >= this.opts.breathMs;
    if (this.quietMs >= pause || longTurnBreath) {
      this.active = false;
      this.quietMs = 0;
      this.activeMs = 0;
      return 'end';
    }
    return null;
  }

  /** Termine le tour en cours de force (ex. une récitation enregistrée démarre). */
  reset(): boolean {
    const was = this.active;
    this.active = false;
    this.loudMs = this.quietMs = this.activeMs = 0;
    return was;
  }
}
