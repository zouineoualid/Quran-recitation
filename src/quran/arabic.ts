/**
 * Normalisation de l'arabe pour comparer ce que la reconnaissance vocale entend
 * (orthographe courante, sans voyelles) au texte imprimé du mushaf (rasm uthmani,
 * avec voyelles et signes de lecture).
 */

/** Signes de pause (waqf) : ۖ ۗ ۘ ۙ ۚ ۛ. Le texte de Warsh n'emploie que ۖ (صه). */
const WAQF = /[ۖ-ۛ]/;

/** Diacritiques et signes coraniques supprimés pour la comparaison. */
const MARKS = /[ؐ-ًؚ-ٟۖ-ۭ࣓-ࣿـ‌-‏﻿]/g;

/** Lettre alif « suscrite » (alif khanjariyya) : se prononce comme un alif long. */
const DAGGER_ALEF = /ٰ/g;

const LETTER = /[ء-يٱ-ۓ]/;

/** Vrai si le jeton contient au moins une lettre (et n'est pas un simple signe ۞ ou ۩). */
export function hasLetters(token: string): boolean {
  return LETTER.test(token);
}

/** Vrai si le mot imprimé porte un signe de pause. */
export function hasWaqf(token: string): boolean {
  return WAQF.test(token);
}

function unifyLetters(s: string): string {
  return s
    .replace(/[آأإٱٲٳ]/g, 'ا') // آ أ إ ٱ → ا
    .replace(/ؤ/g, 'و') // ؤ → و
    .replace(/[ئىیےۓ]/g, 'ي') // ئ ى ی ے → ي
    .replace(/ة/g, 'ه') // ة → ه
    .replace(/ء/g, '') // ء
    .replace(/[کڪ]/g, 'ك') // ک → ك
    .replace(/ڢ/g, 'ف') // ڢ (fa maghribine) → ف
    .replace(/[ٯڧڨ]/g, 'ق'); // ٯ ڧ ڨ (qaf maghribin) → ق
}

/** Forme normalisée : lettres seules, sans voyelles, hamza et formes d'alif unifiées. */
export function normalize(word: string, daggerAsAlef = false): string {
  let s = word.normalize('NFC');
  s = daggerAsAlef ? s.replace(DAGGER_ALEF, 'ا') : s.replace(DAGGER_ALEF, '');
  s = s.replace(MARKS, '');
  s = unifyLetters(s);
  return s.replace(/[^ء-ي]/g, '');
}

/**
 * Squelette : forme normalisée sans les lettres de prolongation (ا و ي), sauf en tête de mot.
 * Absorbe les écarts entre rasm uthmani et orthographe courante
 * (ٱلۡعَٰلَمِينَ / العالمين, ٱلصَّلَوٰةَ / الصلاة, إِبۡرَٰهِـۧمَ / إبراهيم…).
 */
export function skeleton(normalized: string): string {
  // La première lettre est gardée : و/ي initiaux sont des radicaux ou des préfixes (و de coordination…).
  return normalized.slice(0, 1) + normalized.slice(1).replace(/[اوي]/g, '');
}

/** Découpe une transcription en mots normalisés non vides. */
export function words(text: string): string[] {
  return text
    .split(/[\s،؛؟.,!?؟،]+/)
    .map((w) => normalize(w))
    .filter((w) => w.length > 0);
}

/** Distance d'édition de Levenshtein, bornée (renvoie max+1 dès qu'elle est dépassée). */
export function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export type Strictness = 'lenient' | 'normal' | 'strict';

/** Ce qu'il faut savoir d'un mot imprimé pour le comparer à un mot entendu. */
export interface WordKey {
  /** Formes normalisées acceptées (alif suscrit ignoré ou lu comme alif, variante Hafs…). */
  forms: string[];
  skel: string;
}

export function makeKey(printed: string, alternatives: string[] = []): WordKey {
  const forms = new Set<string>();
  for (const p of [printed, ...alternatives]) {
    forms.add(normalize(p));
    forms.add(normalize(p, true));
  }
  forms.delete('');
  const list = [...forms];
  return { forms: list, skel: skeleton(list[0] ?? '') };
}

/**
 * Le mot entendu correspond-il au mot imprimé ?
 * - strict : mêmes lettres, aux lettres de prolongation près ;
 * - normal : tolère en plus une lettre de différence dans un mot d'au moins 5 lettres,
 *   sauf sur la première lettre (ي/ت/ن distinguent la personne du verbe) ;
 * - lenient : tolère jusqu'à un quart de lettres différentes.
 */
export function matches(heard: string, key: WordKey, strictness: Strictness = 'normal'): boolean {
  if (!heard) return false;
  if (key.forms.includes(heard)) return true;
  const hs = skeleton(heard);
  if (hs.length > 0 && hs === key.skel) return true;
  if (strictness === 'strict') return false;
  for (const f of key.forms) {
    if (strictness === 'normal') {
      if (f.length >= 5 && heard.length >= 4 && f[0] === heard[0] && levenshtein(f, heard, 1) <= 1) return true;
    } else {
      const max = Math.max(1, Math.floor(Math.max(f.length, heard.length) / 4));
      if (f.length >= 3 && levenshtein(f, heard, max) <= max) return true;
    }
  }
  return false;
}
