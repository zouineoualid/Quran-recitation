import { describe, expect, it } from 'vitest';
import fixture from './fixture.json';
import { matches, makeKey, normalize, words } from '../src/quran/arabic';
import { Mushaf, tokenize } from '../src/quran/mushaf';
import { Tracker, type TrackEvent } from '../src/quran/tracker';
import { riwayaById } from '../src/data/riwayat';

const warsh = new Mushaf(riwayaById('warsh'), fixture.warsh, fixture.hafs);
const hafs = new Mushaf(riwayaById('hafs'), fixture.hafs);

/** Ce que renverrait la reconnaissance vocale : orthographe courante, sans voyelles. */
const say = (text: string) => words(text);

function surahTracker(m: Mushaf, s: number, a1 = 1, a2 = 999) {
  const t = new Tracker(m);
  const [start, end] = m.range(s, a1, s, Math.min(a2, m.ayahs.filter((x) => x.s === s).length));
  t.setRange(start, end);
  return t;
}

const kinds = (ev: TrackEvent[]) => ev.map((e) => e.type);

describe('normalisation', () => {
  it('ramène le rasm uthmani à l’orthographe courante', () => {
    expect(normalize('ٱلۡحَمۡدُ')).toBe('الحمد');
    expect(normalize('إِيَّاكَ')).toBe('اياك');
    expect(normalize('ٱلصَّلَوٰةَ', true)).toBe('الصلواه');
    expect(matches(normalize('العالمين'), makeKey('ٱلۡعَٰلَمِينَ'))).toBe(true);
    expect(matches(normalize('الصلاة'), makeKey('ٱلصَّلَوٰةَ'))).toBe(true);
    expect(matches(normalize('الرحمن'), makeKey('ٱلرَّحۡمَٰنِ'))).toBe(true);
    expect(matches(normalize('يؤمنون'), makeKey('يُومِنُونَ'))).toBe(true);
  });

  it('ne confond pas les personnes du verbe', () => {
    expect(matches(normalize('يعملون'), makeKey('تَعۡمَلُونَ'))).toBe(false);
    expect(matches(normalize('تعملون'), makeKey('تَعۡمَلُونَ'))).toBe(true);
  });

  it('attache les signes isolés au mot voisin', () => {
    const t = tokenize('ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدٗى لِّلۡمُتَّقِينَ');
    expect(t.length).toBe(7);
    expect(t.filter((w) => w.waqf).length).toBe(2);
  });
});

describe('suivi de la récitation', () => {
  it('reste silencieux sur une récitation correcte de la Fatiha (Hafs)', () => {
    const t = surahTracker(hafs, 1);
    const ev = [
      ...t.feed(say('بسم الله الرحمن الرحيم الحمد لله رب العالمين')),
      ...t.feed(say('الرحمن الرحيم مالك يوم الدين')),
      ...t.feed(say('اياك نعبد واياك نستعين اهدنا الصراط المستقيم')),
      ...t.feed(say('صراط الذين انعمت عليهم غير المغضوب عليهم ولا الضالين')),
    ];
    expect(ev.filter((e) => e.type === 'mistake')).toEqual([]);
    expect(kinds(ev).filter((k) => k === 'ayah').length).toBe(7);
    expect(kinds(ev)).toContain('done');
  });

  it('accepte la forme de Hafs là où Warsh diffère (مَلِكِ / مالك)', () => {
    const t = surahTracker(warsh, 1, 4, 4);
    expect(t.feed(say('مالك يوم الدين')).filter((e) => e.type === 'mistake')).toEqual([]);
    const t2 = surahTracker(warsh, 1, 4, 4);
    expect(t2.feed(say('ملك يوم الدين')).filter((e) => e.type === 'mistake')).toEqual([]);
  });

  it('dit « أعِد » sur un mot faux, puis suit la reprise', () => {
    const t = surahTracker(hafs, 112);
    const ev = t.feed(say('قل هو الله واحد'));
    const mistakes = ev.filter((e) => e.type === 'mistake');
    expect(mistakes).toHaveLength(1);
    expect(normalize(hafs.words[(mistakes[0] as { at: number }).at].text)).toBe('احد');
    // Le récitant reprend depuis le début du verset.
    const ev2 = t.feed(say('قل هو الله احد الله الصمد'));
    expect(ev2.filter((e) => e.type === 'mistake')).toEqual([]);
    expect(kinds(ev2)).toContain('jump');
    expect(t.pos).toBe(hafs.range(112, 2, 112, 2)[1]);
  });

  it('signale un verset sauté', () => {
    const t = surahTracker(hafs, 112);
    t.feed(say('قل هو الله احد'));
    const ev = t.feed(say('لم يلد ولم يولد'));
    expect(ev.some((e) => e.type === 'mistake' && e.kind === 'skip')).toBe(true);
    expect(t.pos).toBe(hafs.range(112, 3, 112, 3)[1]);
  });

  it('ignore l’isti‘âdha et la basmala avant la sourate', () => {
    const t = surahTracker(hafs, 67, 1, 2);
    const ev = t.feed(say('اعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم تبارك الذي بيده الملك وهو على كل شيء قدير'));
    expect(ev.filter((e) => e.type === 'mistake')).toEqual([]);
    expect(kinds(ev)).toContain('ayah');
  });

  it('tolère un petit mot avalé par la reconnaissance', () => {
    const t = surahTracker(hafs, 67, 1, 1);
    const ev = t.feed(say('تبارك الذي بيده الملك وهو على شيء قدير'));
    expect(ev.filter((e) => e.type === 'mistake')).toEqual([]);
    expect(t.done).toBe(true);
  });

  it('supporte l’écho du fath répété ensuite par le récitant', () => {
    const t = surahTracker(warsh, 67, 1, 2);
    t.feed(say('تبارك الذي بيده الملك وهو على كل شيء قدير'));
    t.markFath(t.nextWords());
    const echo = t.feed(say('الذي خلق الموت والحياة'));
    const user = t.feed(say('الذي خلق الموت والحياة ليبلوكم ايكم احسن عملا وهو العزيز الغفور'));
    expect([...echo, ...user].filter((e) => e.type === 'mistake')).toEqual([]);
    expect(t.done).toBe(true);
  });

  it('donne le fath jusqu’au prochain signe de pause', () => {
    const t = surahTracker(hafs, 2, 2, 2);
    t.feed(say('ذلك الكتاب'));
    const next = t.nextWords().map((w) => normalize(w.text));
    expect(next[0]).toBe('لا');
    expect(next.length).toBeLessThanOrEqual(7);
  });
});

describe('localisation dans le mushaf', () => {
  it('trouve la sourate récitée sans qu’on la nomme', () => {
    const t = new Tracker(warsh);
    t.setFree();
    const ev = t.feed(say('الذي خلق الموت والحياة ليبلوكم ايكم احسن عملا'));
    expect(kinds(ev)).toContain('located');
    const w = warsh.words[t.pos];
    expect([w.s, w.a]).toEqual([67, 2]);
  });

  it('attend la suite tant que plusieurs endroits sont possibles (فبأي آلاء ربكما تكذبان)', () => {
    const t = new Tracker(hafs);
    t.setFree();
    const ev = t.feed(say('فباي الاء ربكما تكذبان'));
    expect(kinds(ev)).not.toContain('located');
    const ev2 = t.feed(say('خلق الانسان من صلصال كالفخار'));
    expect(kinds(ev2)).toContain('located');
    expect(hafs.words[t.pos - 1].a).toBe(14);
  });

  it('passe de la Fatiha à une autre sourate (prière)', () => {
    const t = new Tracker(hafs);
    t.setFree();
    t.feed(say('الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين'));
    t.feed(say('اياك نعبد واياك نستعين اهدنا الصراط المستقيم صراط الذين انعمت عليهم غير المغضوب عليهم ولا الضالين'));
    expect(t.locating).toBe(true);
    const ev = t.feed(say('امين قل اعوذ برب الفلق من شر ما خلق'));
    expect(ev.filter((e) => e.type === 'mistake')).toEqual([]);
    expect(hafs.words[t.pos - 1].s).toBe(113);
  });
});

describe('récitations complètes', () => {
  // Ce que la reconnaissance renverrait pour une récitation correcte : le texte de Hafs, sans voyelles.
  const heardSurah = (s: number) => fixture.hafs.filter((v) => v.chapter === s).flatMap((v) => say(v.text));

  for (const s of [1, 67, 78, 112, 113, 114]) {
    for (const m of [hafs, warsh]) {
      it(`sourate ${s} en ${m.riwaya.short} : aucun faux « أعِد »`, () => {
        const t = surahTracker(m, s);
        const heard = heardSurah(s);
        const ev: TrackEvent[] = [];
        for (let i = 0; i < heard.length; i += 6) ev.push(...t.feed(heard.slice(i, i + 6)));
        const mistakes = ev.filter((e) => e.type === 'mistake');
        expect(mistakes.map((e) => e.type === 'mistake' && m.words[e.at].text + ' ← ' + e.heard)).toEqual([]);
        expect(t.done).toBe(true);
      });
    }
  }
});
