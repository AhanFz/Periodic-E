import { Game } from './engine';
import { ENEMIES } from './constants';
import type { Orientation } from './types';

export type Action = { kind: 'move'; dx: number; dy: number } | { kind: 'ability'; tier: 1 | 3 }
  | { kind: 'aim'; orientation: Orientation } | { kind: 'pass' } | { kind: 'shatter' };
export function applyAction(g: Game, a: Action) {
  switch (a.kind) {
    case 'move': return g.movePlayer(a.dx, a.dy);
    case 'ability': g.activateAbility(a.tier); break;
    case 'aim': g.confirmAim(a.orientation); break;
    case 'pass': g.passTurn(); break;
    case 'shatter': g.shatter(); break;
  }
}
export function actionPreview(g: Game, action: Action) {
  const next = g.fork(); next.projecting = true; next.projectedDamage = []; next.pendingEffects = [];
  const result = applyAction(next, action);
  const hidden = g.enemies.some(e => e.invisibleTurnsLeft > 0);
  const targets: string[] = [];
  for (const e of g.enemies.filter(e => e.invisibleTurnsLeft <= 0)) {
    const after = next.enemies.find(n => n.id === e.id);
    const dealt = next.projectedDamage.filter(hit => hit.id === e.id).reduce((sum, hit) => sum + hit.amount, 0);
    const changes: string[] = dealt ? [`${dealt} damage`] : [];
    if (!after) changes.push(e.bonded && next.enemies.some(n => n.type === e.type && n.id >= g.nextEnemyId) ? 'bond split' : 'destroyed');
    else {
      if (after.health < e.health && !dealt) changes.push(`${e.health - after.health} damage`);
      if ((e.armed && !after.armed) || (e.telegraph && !after.telegraph)) changes.push('prepared attack cancelled');
      if (after.frozenTurnsLeft > e.frozenTurnsLeft) changes.push(`frozen ${after.frozenTurnsLeft} turns`);
      if (after.paralyzed && !e.paralyzed) changes.push('paralyzed');
      if (after.encasedTurnsLeft > e.encasedTurnsLeft) changes.push('encased');
      if (after.tetherTurnsLeft > e.tetherTurnsLeft) changes.push('tethered');
      if (after.fleeTurnsLeft > e.fleeTurnsLeft) changes.push('fleeing');
    }
    if (changes.length) targets.push(`${ENEMIES[e.type].symbol} (${e.x + 1},${e.y + 1}): ${changes.join(', ')}`);
  }
  const unknown = !!result?.needsConfirm;
  const lines = unknown ? ['Unseen danger. Exact outcome unknown.'] : [
    ...targets,
    `Self: ${Math.max(0, g.elementHealth - next.elementHealth)} HP lost · shield ${next.shieldPoints - g.shieldPoints >= 0 ? '+' : ''}${next.shieldPoints - g.shieldPoints}`,
    ...(hidden ? ['Hidden enemies may change the outcome.'] : [`Photons: ${g.photons} → ${next.photons}`, next.message]),
    ...(next.gameOver ? ['Lethal: this action ends the run.'] : []),
  ];
  return { next, lines, endsTurn: next.projectedTurnEnd, exitsGrid: next.projectedExit,
    title: action.kind === 'move' ? 'Move / ram' : action.kind === 'pass' ? 'End turn' : 'Ability preview' };
}
