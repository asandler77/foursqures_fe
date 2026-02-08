import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Player } from '../../game/types';
import { colors } from '../theme';

type Props = Readonly<{
  player: Player;
}>;

export const Piece = ({ player }: Props) => {
  const isRed = player === 'R';
  return (
    <View style={[styles.piece, isRed ? styles.red : styles.blue]}>
      <View style={styles.gloss} />
    </View>
  );
};

const styles = StyleSheet.create({
  piece: {
    width: '70%',
    height: '70%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  red: { backgroundColor: colors.redPiece },
  blue: { backgroundColor: colors.bluePiece },
  gloss: {
    position: 'absolute',
    top: '12%',
    left: '18%',
    width: '35%',
    height: '35%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});

