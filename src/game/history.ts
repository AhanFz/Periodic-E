import type { DamageSource, LigandId } from './types';
export interface DamageRecord {
  turn: number; grid: number; source: DamageSource; amount: number;
  healthBefore: number; healthAfter: number; absorbed: number; saved: boolean;
}
export interface Milestone { turn: number; grid: number; kind: 'evolution' | 'purchase' | 'ligand'; text: string; }
export interface RunHistory {
  damage: DamageRecord[];
  milestones: Milestone[];
  ligandCounts: Record<LigandId, number>;
  omittedMilestones: number;
}
export function freshHistory(): RunHistory {
  return { damage: [], milestones: [], ligandCounts: { passivation: 0, supercooled: 0, fractional: 0, exothermic: 0 }, omittedMilestones: 0 };
}
export const DAMAGE_NAMES: Record<DamageSource, string> = {
  contact: 'Enemy contact', explosion: 'Fluorine explosion', poison: 'Poison', trail: 'Br₂ corrosive trail',
  polarity: 'Polarity crush', collapse: 'Collapsing bridge', ram: 'Ram self-damage', destabilise: 'Noble-gas destabilisation',
};
