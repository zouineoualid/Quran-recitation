// Génère src/data/surahs.ts à partir des métadonnées d'api.alquran.cloud.
// Usage : npm run gen:surahs
import { writeFileSync } from 'node:fs';

const res = await fetch('https://api.alquran.cloud/v1/meta');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const { data } = await res.json();

const surahs = data.surahs.references.map((s) => ({
  n: s.number,
  // Nom sans voyelles ni signes coraniques, pour l'interface.
  name: s.name
    .normalize('NFC')
    .replace(/^سُورَةُ\s+/, '')
    .replace(/\u0640/g, '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0671/g, 'ا')
    .trim(),
  en: s.englishName,
  ayahs: s.numberOfAyahs,
  mecca: s.revelationType === 'Meccan',
}));
const juz = data.juzs.references.map((j) => [j.surah, j.ayah]);
const hizbQuarters = data.hizbQuarters.references.map((h) => [h.surah, h.ayah]);

const out = `// Fichier généré par scripts/gen-surahs.mjs — ne pas modifier à la main.
export interface SurahMeta {
  n: number;
  name: string;
  en: string;
  ayahs: number;
  mecca: boolean;
}

export const SURAHS: SurahMeta[] = ${JSON.stringify(surahs)};

/** Début de chaque juz' : [sourate, verset]. */
export const JUZ_STARTS: [number, number][] = ${JSON.stringify(juz)};

/** Début de chaque quart de hizb (240) : [sourate, verset]. */
export const HIZB_QUARTER_STARTS: [number, number][] = ${JSON.stringify(hizbQuarters)};
`;
writeFileSync(new URL('../src/data/surahs.ts', import.meta.url), out);
console.log(`${surahs.length} sourates, ${juz.length} ajzā', ${hizbQuarters.length} arbāʿ`);
