import { describe, expect, it } from 'vitest';
import { PauseSegmenter } from '../src/live/segmenter';

/** Simule le micro : une suite de [niveau, durée en ms], par trames de 20 ms. */
function run(seg: PauseSegmenter, plan: [number, number][]) {
  const events: { ev: string; at: number }[] = [];
  let t = 0;
  for (const [level, ms] of plan) {
    for (let k = 0; k < ms; k += 20) {
      const ev = seg.push(level, 20);
      t += 20;
      if (ev) events.push({ ev, at: t });
    }
  }
  return events;
}

const NOISE = 0.003;
const VOICE = 0.08;

describe('découpage des tours', () => {
  it('ouvre un tour à la voix et le ferme après une pause', () => {
    const seg = new PauseSegmenter();
    seg.reciting = true;
    const ev = run(seg, [[NOISE, 1000], [VOICE, 2000], [NOISE, 1000]]);
    expect(ev.map((e) => e.ev)).toEqual(['start', 'end']);
    // Fin après ~450 ms de pause en récitation.
    expect(ev[1].at - 3000).toBeGreaterThanOrEqual(440);
    expect(ev[1].at - 3000).toBeLessThan(600);
  });

  it('attend plus longtemps quand on parle au cheikh', () => {
    const seg = new PauseSegmenter();
    seg.reciting = false;
    const ev = run(seg, [[NOISE, 1000], [VOICE, 1500], [NOISE, 700], [VOICE, 800], [NOISE, 1500]]);
    // La pause de 700 ms au milieu d'une question ne coupe pas.
    expect(ev.map((e) => e.ev)).toEqual(['start', 'end']);
  });

  it('coupe une longue récitation à la première respiration', () => {
    const seg = new PauseSegmenter();
    seg.reciting = true;
    const ev = run(seg, [[NOISE, 500], [VOICE, 4000], [NOISE, 220], [VOICE, 1000], [NOISE, 600]]);
    expect(ev.map((e) => e.ev)).toEqual(['start', 'end', 'start', 'end']);
  });

  it('ignore un claquement bref', () => {
    const seg = new PauseSegmenter();
    expect(run(seg, [[NOISE, 500], [VOICE, 60], [NOISE, 500]])).toEqual([]);
  });

  it('reste sourd à l’écho faible quand le cheikh parle', () => {
    const seg = new PauseSegmenter();
    run(seg, [[NOISE, 1000]]);
    seg.deafness = 2.6;
    expect(run(seg, [[0.02, 1000]])).toEqual([]);
    expect(run(seg, [[VOICE, 400]]).map((e) => e.ev)).toEqual(['start']);
  });
});
