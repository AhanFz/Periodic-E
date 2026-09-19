import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { HapticCue } from '@/game/types';

/**
 * Physical feedback for the turn that just resolved.
 *
 * An action can produce several cues at once — a ram that hurts you and kills the halogen
 * raises 'ram', 'damage' and 'kill' — so we play only the most significant one. Buzzing three
 * times for one tap reads as a rattle rather than as feedback.
 *
 * Every call is fire-and-forget: the promise rejects on hardware that has no haptic engine, and
 * a missing buzz must never interrupt a turn.
 */

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';
let muted = false;

/** Player-facing switch, for testing or for anyone who does not want their phone moving. */
export function setHapticsEnabled(on: boolean) { muted = !on; }
export function hapticsEnabled() { return enabled && !muted; }

/** Most significant first; the winner of an action is the one nearest the front. */
const PRIORITY: HapticCue[] = [
  'death', 'win', 'evolve', 'damage', 'kill', 'ram', 'shielded', 'hit', 'buy', 'blocked', 'photon',
];

const impact = (style: Haptics.ImpactFeedbackStyle) => { Haptics.impactAsync(style).catch(() => {}); };
const notify = (type: Haptics.NotificationFeedbackType) => { Haptics.notificationAsync(type).catch(() => {}); };

function playOne(cue: HapticCue) {
  switch (cue) {
    case 'death': return notify(Haptics.NotificationFeedbackType.Error);
    case 'win': return notify(Haptics.NotificationFeedbackType.Success);
    // Evolution is the one moment worth a flourish: a rising three-beat.
    case 'evolve':
      impact(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Medium), 90);
      setTimeout(() => notify(Haptics.NotificationFeedbackType.Success), 200);
      return;
    case 'damage': return impact(Haptics.ImpactFeedbackStyle.Heavy);
    case 'kill': return impact(Haptics.ImpactFeedbackStyle.Medium);
    case 'ram': return impact(Haptics.ImpactFeedbackStyle.Medium);
    case 'shielded': return impact(Haptics.ImpactFeedbackStyle.Rigid);
    case 'hit': return impact(Haptics.ImpactFeedbackStyle.Light);
    case 'buy': return notify(Haptics.NotificationFeedbackType.Success);
    case 'blocked': return notify(Haptics.NotificationFeedbackType.Warning);
    case 'photon': return Haptics.selectionAsync().catch(() => {});
  }
}

/** Plays the most significant cue of a batch and discards the rest. */
export function playCues(cues: HapticCue[]) {
  if (!hapticsEnabled() || cues.length === 0) return;
  for (const c of PRIORITY) if (cues.includes(c)) return playOne(c);
}

/** A button press or a long press: the lightest tick the platform has. */
export function tapFeedback() {
  if (!hapticsEnabled()) return;
  Haptics.selectionAsync().catch(() => {});
}
