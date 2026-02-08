import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/screens/GameScreen';

export const App = () => {
  return (
    <SafeAreaProvider>
      <GameScreen />
    </SafeAreaProvider>
  );
};

export default App;
