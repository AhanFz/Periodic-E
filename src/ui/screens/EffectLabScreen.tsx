import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { tutorialGame } from '@/game/tutorial';
import { Board } from '../components/Board';
import { PaperButton } from '../components/Print';
import { theme } from '../theme';
import { useGameStore } from '@/store/gameStore';
export function EffectLabScreen() {
  const [tick, setTick] = useState(0);
  const [aim, setAim] = useState(false);
  const reduced = useGameStore(s => s.reducedMotion);
  const g = useMemo(() => {
    const game = tutorialGame({ element: 'helium', ligand: null, lesson: 'first', complete: false });
    game.enemies[0].frozenTurnsLeft = 2;
    game.scorchedTiles = [{ x: 0, y: 2, turnsLeft: 3 }, { x: 0, y: 3, turnsLeft: 3 }];
    game.poisonZones = [{ x: 1, y: 2, sourceId: 1 }, { x: 1, y: 3, sourceId: 1 }];
    game.telegraphTiles = [{ x: 2, y: 3 }];
    game.layout.passable[1][2] = false;
    game.showStartMarker = false;
    return game;
  }, []);
  g.aiming = aim; g.aimLine = aim ? [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }] : [];
  g.pendingEffects = tick ? [0, 1, 2, 3, 4].map(x => ({ type: 'shock' as const, x, y: 1, angle: 90 })) : [];
  return <View style={{ flex: 1, justifyContent: 'center', padding: 10, backgroundColor: theme.bg, gap: 10 }}>
    <Text>Effect lab · production tiles + atoms</Text>
    <Board game={g} tick={tick + Number(aim)} compact maxHeight={360} />
    <Text>Lava / poison / frozen chlorine. Dashed poison is a warning. Lightning crosses the black void.</Text>
    <PaperButton label="Replay lightning" onPress={() => setTick(t => t + 1)} />
    <PaperButton label="Toggle targeting over effects" onPress={() => setAim(a => !a)} />
    <PaperButton label={reduced ? 'Enable motion' : 'Reduce motion'} onPress={() => useGameStore.getState().setReducedMotion(!reduced)} />
  </View>;
}
