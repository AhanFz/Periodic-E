import {SoundEffects} from './src/ui/components/SoundEffects';
import React, { useEffect } from 'react';
import { AccessibilityInfo, AppState, Platform, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EffectLabScreen } from './src/ui/screens/EffectLabScreen';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { LevelSelectScreen } from './src/ui/screens/LevelSelectScreen';
import { TutorialSetupScreen } from './src/ui/screens/TutorialSetupScreen';
import { CatalogueScreen } from './src/ui/screens/CatalogueScreen';
import { StoreScreen } from './src/ui/screens/StoreScreen';
import { theme } from './src/ui/theme';
import { useGameStore } from './src/store/gameStore';

export default function App() {
  const screen = useGameStore(s => s.screen);
  const hydrate = useGameStore(s => s.hydrate);

  // The saved profile arrives after the first paint. Until it does the store shows defaults,
  // which is why nothing here blocks on it.
  useEffect(() => { void hydrate(); }, [hydrate]);

  useEffect(() => {
    let active = true;
    const update = (value: boolean) => useGameStore.getState().setReducedMotion(value);
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) update(value); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    const app = AppState.addEventListener('change', value => { if (value !== 'active') void useGameStore.getState().flushSave(); });
    return () => { active = false; motion.remove(); app.remove(); };
  }, []);

  if (__DEV__ && Platform.OS === 'web' && typeof location !== 'undefined' && location.search === '?effects') return <EffectLabScreen />;
  return (
    <SafeAreaProvider>
    <SoundEffects/>
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      {screen === 'menu' && <LevelSelectScreen />}
      {screen === 'tutorialSetup' && <TutorialSetupScreen />}
      {screen === 'catalogue' && <CatalogueScreen />}
      {screen === 'store' && <StoreScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'over' && <GameOverScreen />}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
});
