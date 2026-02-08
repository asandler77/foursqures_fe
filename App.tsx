import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/screens/GameScreen';

if (__DEV__ && !process.env.JEST_WORKER_ID) {
  require('./src/devtools/ReactotronConfig');
}

export const App = () => {
  return (
    <SafeAreaProvider>
      <GameScreen />
    </SafeAreaProvider>
  );
};

export default App;
