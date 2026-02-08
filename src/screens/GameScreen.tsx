import React, { useMemo, useReducer } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createInitialState, getValidDestinationsForSelected, reducer } from '../game/engine';
import { BoardView } from '../ui/components/BoardView';
import { Header } from '../ui/components/Header';
import { colors, spacing } from '../ui/theme';

export const GameScreen = () => {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState());

  const validDestinations = useMemo(() => getValidDestinationsForSelected(state), [state]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Header state={state} onRestart={() => dispatch({ type: 'restart' })} />
        <BoardView
          board={state.board}
          holeBigIndex={state.holeBigIndex}
          selectedBigIndex={state.selectedBigIndex}
          validDestinations={validDestinations}
          onPressSlot={(bigIndex, slotIndex) =>
            dispatch({ type: 'pressSlot', bigIndex, slotIndex })
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
});

