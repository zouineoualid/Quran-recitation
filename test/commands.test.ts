import { describe, expect, it } from 'vitest';
import { findSurah, parseCommand } from '../src/speech/commands';
import { words } from '../src/quran/arabic';

const cmd = (text: string, prayer = false) => parseCommand(words(text), prayer);

describe('commandes vocales', () => {
  it('reconnaît le nom des sourates', () => {
    expect(findSurah(words('الملك'))).toBe(67);
    expect(findSurah(words('آل عمران'))).toBe(3);
    expect(findSurah(words('البقرة'))).toBe(2);
    expect(findSurah(words('النبأ'))).toBe(78);
    expect(findSurah(words('عم'))).toBe(78);
    expect(findSurah(words('يس'))).toBe(36);
    expect(findSurah(words('الإخلاص'))).toBe(112);
    expect(findSurah(words('الرحمن'))).toBe(55);
  });

  it('comprend « سأقرأ سورة … »', () => {
    expect(cmd('سأقرأ سورة الملك')).toEqual({ type: 'surah', n: 67 });
    expect(cmd('سورة الكهف')).toEqual({ type: 'surah', n: 18 });
  });

  it('distingue les commandes de la récitation', () => {
    expect(cmd('افتح')).toEqual({ type: 'fath' });
    expect(cmd('افتح علي')).toEqual({ type: 'fath' });
    expect(cmd('ربنا افتح بيننا')).toBeNull();
    expect(cmd('اختبرني')).toEqual({ type: 'exam' });
    expect(cmd('أسمعني')).toEqual({ type: 'listen' });
    expect(cmd('حسبك')).toEqual({ type: 'stop' });
    expect(cmd('ما معنى الآية')).toEqual({ type: 'tafsir' });
    expect(cmd('الله أكبر')).toEqual({ type: 'prayer-start' });
    expect(cmd('الله أكبر', true)).toBeNull();
    expect(cmd('السلام عليكم ورحمة الله')).toEqual({ type: 'prayer-end' });
    expect(cmd('تبارك الذي بيده الملك وهو على كل شيء قدير')).toBeNull();
  });
});
