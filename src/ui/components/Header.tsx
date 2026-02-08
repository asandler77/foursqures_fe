import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameState, Player } from '../../game/types';
import { getRemainingPieces } from '../../game/engine';
import { colors } from '../theme';

const playerName = (p: Player) => (p === 'R' ? 'Player 1' : 'Player 2');

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
        <Text style={styles.title}>Four Squares</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRestart}
          style={({ pressed }) => [styles.restartButton, pressed && styles.restartButtonPressed]}>
          <Text style={styles.restartButtonText}>Restart</Text>
        </Pressable>
      </View>

      <View style={styles.turnTabs}>
        <View style={[styles.tab, isP1 && styles.tabActiveP1]}>
          <View style={[styles.dot, styles.dotP1]} />
          <Text style={[styles.tabText, isP1 && styles.tabTextActive]}>
            {isP1 ? "Player 1's Turn" : 'Player 1'}
          </Text>
        </View>
        <View style={[styles.tab, !isP1 && styles.tabActiveP2]}>
          <View style={[styles.dot, styles.dotP2]} />
          <Text style={[styles.tabText, !isP1 && styles.tabTextActive]}>
            {!isP1 ? "Player 2's Turn" : 'Player 2'}
          </Text>
        </View>
      </View>

      {state.winner ? (
        <Text style={styles.meta}>
          Winner:{' '}
          <Text style={[styles.metaStrong, state.winner === 'R' ? styles.redText : styles.blueText]}>
            {playerName(state.winner)}
          </Text>
        </Text>
      ) : state.drawReason ? (
        <Text style={styles.meta}>
          Result: <Text style={styles.metaStrong}>Draw</Text>
        </Text>
      ) : (
        <Text style={styles.meta}>
          Phase:{' '}
          <Text style={styles.metaStrong}>
            {state.phase === 'placement'
              ? 'Placement'
              : state.phase === 'placementSlide'
                ? 'Placement (Slide)'
                : 'Movement'}
          </Text>
        </Text>
      )}

      <Text style={styles.metaSmall}>
        Remaining — Player 1: <Text style={styles.metaStrong}>{remainingR}</Text> • Player 2:{' '}
        <Text style={styles.metaStrong}>{remainingB}</Text>
      </Text>

      {state.drawReason ? <Text style={styles.notice}>{state.drawReason}</Text> : null}
      {state.winner || state.drawReason ? null : state.phase === 'placement' ? (
        <Text style={styles.notice}>Place a piece in any slot (not in the empty square).</Text>
      ) : state.phase === 'placementSlide' ? (
        <Text style={styles.notice}>
          Now slide: tap a highlighted square next to the empty space to move it into the empty
          space.
        </Text>
      ) : (
        <Text style={styles.notice}>
          Slide a square into the empty space: tap a highlighted neighboring square.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: 10 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: '#374151' },
  metaSmall: { fontSize: 12, color: '#374151' },
  metaStrong: { fontWeight: '700', color: colors.text },
  redText: { color: colors.red },
  blueText: { color: colors.blue },
  notice: { marginTop: 2, fontSize: 12, color: colors.textMuted },

  restartButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.black,
  },
  restartButtonPressed: { opacity: 0.85 },
  restartButtonText: { color: 'white', fontWeight: '700' },

  turnTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: colors.tabBg,
    borderWidth: 1,
    borderColor: colors.tabBorder,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActiveP1: { backgroundColor: colors.tabRed },
  tabActiveP2: { backgroundColor: colors.tabBlue },
  tabText: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  tabTextActive: { color: 'white' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  dotP1: { backgroundColor: colors.redPiece },
  dotP2: { backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.15)' },
});

