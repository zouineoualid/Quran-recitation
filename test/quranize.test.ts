import { describe, expect, it } from 'vitest';
import fixture from './fixture.json';
import { Mushaf } from '../src/quran/mushaf';
import { quranize } from '../src/quran/quranize';
import { riwayaById } from '../src/data/riwayat';

const warsh = new Mushaf(riwayaById('warsh'), fixture.warsh, fixture.hafs);
const hafs = new Mushaf(riwayaById('hafs'), fixture.hafs);

describe('passages du Coran dans la conversation', () => {
  it('remplace la récitation par le texte imprimé, et garde le reste', () => {
    const p = quranize('سأقرأ سورة الملك تبارك الذي بيده الملك وهو على كل شيء قدير', hafs);
    expect(p[0]).toEqual({ kind: 'text', text: 'سأقرأ سورة الملك' });
    expect(p[1].kind).toBe('quran');
    const ws = (p[1] as { words: { s: number; a: number; last: boolean; text: string }[] }).words;
    expect(ws).toHaveLength(9);
    expect([ws[0].s, ws[0].a]).toEqual([67, 1]);
    expect(ws[8].last).toBe(true);
    expect(ws[0].text).toContain('تَبَٰرَكَ');
  });

  it('affiche le texte de la riwaya choisie (Warsh)', () => {
    const p = quranize('الحمد لله رب العالمين', warsh);
    const ws = (p[0] as { words: { text: string }[] }).words;
    expect(ws.map((w) => w.text).join(' ')).toBe('اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ');
  });

  it('suit la récitation d’un verset à l’autre et laisse les mots faux en clair', () => {
    const p = quranize('قل هو الله احد الله الصمد لم يلد ولم يولد', hafs);
    expect(p).toHaveLength(1);
    expect((p[0] as { words: unknown[] }).words).toHaveLength(10);
    const q = quranize('الذي خلق الموت والحياة ليبلوكم أيكم أكثر عملا', hafs);
    expect(q.map((x) => x.kind)).toEqual(['quran', 'text']);
    expect((q[1] as { text: string }).text).toBe('أكثر عملا');
  });

  it('ne prend pas deux mots de prose pour du Coran', () => {
    expect(quranize('أحسنت، بارك الله فيك', hafs).every((x) => x.kind === 'text')).toBe(true);
  });
});
