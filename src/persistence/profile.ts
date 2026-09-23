import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGANDS } from '@/game/constants';
import { restoreRun, type RunSave } from '@/game/runSave';
import type { LigandId } from '@/game/types';

/**
 * The only file in the app that touches storage. `src/game/` never imports from here: the engine
 * is handed an equipped ligand and knows nothing about where it came from, which is what keeps it
 * headlessly testable by the simulator.
 */

const KEY = 'element-evolution/profile/v1';
export const SCHEMA_VERSION = 1;

export interface Profile {
  schemaVersion: number;
  quanta: number;
  ownedLigands: LigandId[];
  equippedLigand: LigandId | null;
  runsWon: number;
  runsPlayed: number;
  bestTotalKills: number;
  deepestGrid: number;
}

export function defaultProfile(): Profile {
  return {
    schemaVersion: SCHEMA_VERSION,
    quanta: 0,
    ownedLigands: [],
    equippedLigand: null,
    runsWon: 0,
    runsPlayed: 0,
    bestTotalKills: 0,
    deepestGrid: 0,
  };
}

const isLigandId = (v: unknown): v is LigandId => typeof v === 'string' && v in LIGANDS;
const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/**
 * Rebuilds a profile from whatever was on disk, field by field. Anything missing, mistyped or no
 * longer recognised falls back to its default rather than throwing, so a ligand removed in a later
 * version cannot brick an existing save: unknown ids are simply dropped.
 */
export function migrate(raw: unknown): Profile {
  const base = defaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  // Only version 1 exists so far. A future version migrates forward here; an unrecognised one is
  // treated as unreadable, because guessing at a shape we have never seen loses more than it saves.
  if (r.schemaVersion !== SCHEMA_VERSION) return base;

  const owned = Array.isArray(r.ownedLigands) ? r.ownedLigands.filter(isLigandId) : [];
  const unique = [...new Set(owned)];
  const equipped = isLigandId(r.equippedLigand) && unique.includes(r.equippedLigand) ? r.equippedLigand : null;

  return {
    schemaVersion: SCHEMA_VERSION,
    quanta: count(r.quanta),
    ownedLigands: unique,
    equippedLigand: equipped,
    runsWon: count(r.runsWon),
    runsPlayed: count(r.runsPlayed),
    bestTotalKills: count(r.bestTotalKills),
    deepestGrid: count(r.deepestGrid),
  };
}

/** Profile and active run are one atomic checkpoint: a completed run cannot be rewarded twice. */
const SESSION_KEY = 'element-evolution/session/v1';
export interface SavedSession { version: 1; profile: Profile; active: RunSave | null; }
let current: SavedSession = { version: 1, profile: defaultProfile(), active: null };
let writes: Promise<boolean> = Promise.resolve(true);
let loadPromise: Promise<SavedSession> | null = null;
let failed = false;
export function loadSession(): Promise<SavedSession> {
  if (!loadPromise) loadPromise = (async () => {
    try {
      const saved = await AsyncStorage.getItem(SESSION_KEY);
      if (saved !== null) {
        const value = JSON.parse(saved);
        if (value?.version === 1) current = {
          version: 1, profile: migrate(value.profile), active: restoreRun(value.active) ? value.active : null,
        };
      } else {
        const legacy = await AsyncStorage.getItem(KEY);
        current.profile = legacy === null ? defaultProfile() : migrate(JSON.parse(legacy));
      }
    } catch { /* Defaults preserve a usable app when storage is unavailable or corrupt. */ }
    return current;
  })();
  return loadPromise;
}
export async function loadProfile(): Promise<Profile> { return (await loadSession()).profile; }
/** Called per completed action or menu purchase, never per animation frame. Writes remain ordered. */
export function saveSession(profile: Profile, active: RunSave | null): Promise<boolean> {
  current = { version: 1, profile, active };
  const payload = JSON.stringify(current);
  writes = writes.then(async () => {
    try { await AsyncStorage.setItem(SESSION_KEY, payload); failed = false; return true; }
    catch { failed = true; return false; }
  });
  return writes;
}
export function saveProfile(profile: Profile): void { void saveSession(profile, current.active); }
export async function flushProfile(): Promise<void> {
  await writes;
  if (failed) await saveSession(current.profile, current.active);
}

// ---------------------------------------------------------------------------
// Pure helpers. No storage, no side effects: each returns a new profile.
// ---------------------------------------------------------------------------

export function owns(p: Profile, id: LigandId) { return p.ownedLigands.includes(id); }

export function canAfford(p: Profile, id: LigandId) {
  return !owns(p, id) && p.quanta >= LIGANDS[id].price;
}

/** Buying also equips, since there is one slot and that is always what the player meant. */
export function purchaseLigand(p: Profile, id: LigandId): Profile {
  if (!canAfford(p, id)) return p;
  return {
    ...p,
    quanta: p.quanta - LIGANDS[id].price,
    ownedLigands: [...p.ownedLigands, id],
    equippedLigand: id,
  };
}

/** Passing null, or an id that is not owned, leaves the player running bare. */
export function equipLigand(p: Profile, id: LigandId | null): Profile {
  if (id !== null && !owns(p, id)) return p;
  return { ...p, equippedLigand: id };
}

export function addQuanta(p: Profile, amount: number): Profile {
  return { ...p, quanta: Math.max(0, p.quanta + amount) };
}

/** Called once as a run ends, with the figures the run finished on. */
export function recordRun(p: Profile, r: { won: boolean; totalKills: number; deepestGrid: number }): Profile {
  return {
    ...p,
    runsPlayed: p.runsPlayed + 1,
    runsWon: p.runsWon + (r.won ? 1 : 0),
    bestTotalKills: Math.max(p.bestTotalKills, r.totalKills),
    deepestGrid: Math.max(p.deepestGrid, r.deepestGrid),
  };
}
