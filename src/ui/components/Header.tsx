import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../../game/types';
import { getRemainingPieces } from '../../game/engine';
import { colors } from '../theme';

type Props = Readonly<{
  state: GameState;
  onRestart: () => void;
}>;

export const Header = ({ state, onRestart }: Props) => {
  const remainingR = getRemainingPieces(state, 'R');
  const remainingB = getRemainingPieces(state, 'B');

  const isP1 = state.currentPlayer === 'R';

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Text style={styles.titleSmall}>Four Squares</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRestart}
          style={({ pressed }) => [styles.restartButton, pressed && styles.restartButtonPressed]}>
          <Text style={styles.restartButtonText}>⟲ New Game</Text>
        </Pressable>
      </View>

      <View style={[styles.turnPill, isP1 ? styles.turnPillP1 : styles.turnPillP2]}>
        <View style={[styles.turnDot, isP1 ? styles.turnDotP1 : styles.turnDotP2]} />
        <Text style={styles.turnText}>{isP1 ? 'Turn: Player 1' : 'Turn: Player 2'}</Text>
      </View>

      <View style={styles.countRow}>
        <View style={styles.countGroup}>
          <View style={[styles.countDot, styles.countDotP1]} />
          <Text style={styles.countText}>{remainingR}</Text>
        </View>
        <View style={styles.countDivider} />
        <View style={styles.countGroup}>
          <View style={[styles.countDot, styles.countDotP2]} />
          <Text style={styles.countText}>{remainingB}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: 8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  titleSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  restartButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  restartButtonPressed: { opacity: 0.85 },
  restartButtonText: { color: colors.text, fontWeight: '700', fontSize: 13 },

  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  turnPillP1: { backgroundColor: colors.tabRed },
  turnPillP2: { backgroundColor: colors.tabBlue },
  turnDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  turnDotP1: { backgroundColor: colors.redPiece },
  turnDotP2: { backgroundColor: colors.bluePiece },
  turnText: { color: 'white', fontWeight: '700', fontSize: 17 },

  countRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  countDotP1: { backgroundColor: colors.redPiece },
  countDotP2: { backgroundColor: colors.bluePiece },
  countText: { fontSize: 18, fontWeight: '700', color: colors.text },
  countDivider: { width: 1, height: 18, backgroundColor: colors.border },
});

