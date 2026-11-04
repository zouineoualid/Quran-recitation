/* Réglages et historique, gardés sur le téléphone (localStorage). */
import { useCallback, useState } from 'react';
import type { Strictness } from './quran/arabic';

export type RangeChoice =
  | { kind: 'surah'; s: number; a1: number; a2: number }
  | { kind: 'juz'; n: number }
  | { kind: 'free' };

export interface Settings {
  riwaya: string;
  reciter: string;
  strictness: Strictness;
  /** Secondes de silence avant le fath. */
  fathDelay: number;
  /** Montrer le texte du verset en cours (révision) ou le cacher (récitation de mémoire). */
  showText: boolean;
  /** Le cheikh parle (« أعِد », fath) ; sinon de simples sons. */
  voice: boolean;
  tafsir: string;
  range: RangeChoice;
  /** « live » : le cheikh en direct (Gemini Live, avec une clé) ; « local » : sans clé. */
  engine: 'live' | 'local';
  /** Voix du cheikh en direct. */
  liveVoice: string;
}

export const DEFAULT_SETTINGS: Settings = {
  riwaya: 'warsh',
  reciter: '',
  strictness: 'normal',
  fathDelay: 5,
  showText: false,
  voice: true,
  tafsir: 'muyassar',
  range: { kind: 'surah', s: 67, a1: 1, a2: 30 },
  engine: 'live',
  liveVoice: 'Charon',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return typeof fallback === 'object' && !Array.isArray(fallback) ? { ...fallback, ...v } : v;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou interdit */
  }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [s, set] = useState<Settings>(() => read('tasmee.settings', DEFAULT_SETTINGS));
  const update = useCallback((patch: Partial<Settings>) => {
    set((prev) => {
      const next = { ...prev, ...patch };
      write('tasmee.settings', next);
      return next;
    });
  }, []);
  return [s, update];
}

export interface SlipRecord {
  s: number;
  a: number;
  /** Rang du mot dans le verset. */
  i: number;
  word: string;
  heard?: string;
  kind: 'wrong' | 'skip' | 'fath';
}

export interface SessionRecord {
  id: string;
  started: number;
  ended: number;
  riwaya: string;
  label: string;
  mode: 'recite' | 'prayer' | 'exam';
  words: number;
  ayahs: number;
  slips: SlipRecord[];
  exam?: { asked: number; right: number };
}

const HISTORY = 'tasmee.history';

export const loadHistory = (): SessionRecord[] => read<SessionRecord[]>(HISTORY, []);

export function saveSession(rec: SessionRecord) {
  const all = loadHistory().filter((r) => r.id !== rec.id);
  all.unshift(rec);
  write(HISTORY, all.slice(0, 300));
}

export function clearHistory() {
  write(HISTORY, []);
}

/** Les versets où l'on se trompe le plus souvent. */
export function weakSpots(history: SessionRecord[], riwaya: string, limit = 12) {
  const count = new Map<string, { s: number; a: number; n: number; last: number }>();
  for (const r of history) {
    if (r.riwaya !== riwaya) continue;
    for (const slip of r.slips) {
      const k = `${slip.s}:${slip.a}`;
      const e = count.get(k) ?? { s: slip.s, a: slip.a, n: 0, last: 0 };
      e.n++;
      e.last = Math.max(e.last, r.started);
      count.set(k, e);
    }
  }
  return [...count.values()].sort((x, y) => y.n - x.n || y.last - x.last).slice(0, limit);
}

/* La clé Gemini reste dans ce navigateur ; elle n'est envoyée qu'à Google. */
const KEY = 'tasmee.geminiKey';

export function loadKey(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY, key);
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage interdit */
  }
}

/** Réglages de test (serveur Live simulé), lus seulement s'ils existent. */
export function liveTestOverrides(): { baseUrl?: string; model?: string } {
  try {
    return {
      baseUrl: localStorage.getItem('tasmee.liveBaseUrl') ?? undefined,
      model: localStorage.getItem('tasmee.liveModel') ?? undefined,
    };
  } catch {
    return {};
  }
}
