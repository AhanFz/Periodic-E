import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { LevelSelectScreen } from './src/ui/screens/LevelSelectScreen';
import { theme } from './src/ui/theme';
import { useGameStore } from './src/store/gameStore';

export default function App() {
  const screen = useGameStore(s => s.screen);
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      {screen === 'menu' && <LevelSelectScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'over' && <GameOverScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
});
