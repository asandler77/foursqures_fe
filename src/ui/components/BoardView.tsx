import React, { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Board, Pos } from '../../game/types';
import { colors } from '../theme';
import { Slot } from './Slot';

const INNER_TILE_PADDING = 6;

type Props = Readonly<{
  board: Board;
  holeBigIndex: number;
  selectedBigIndex: number | null;
  validDestinations: ReadonlyArray<Pos>;
  onPressSlot: (bigIndex: number, slotIndex: number) => void;
}>;

const keyOf = (p: Pos) => `${p.bigIndex}:${p.slotIndex}`;

export const BoardView = ({
  board,
  holeBigIndex,
  selectedBigIndex,
  validDestinations,
  onPressSlot,
}: Props) => {
  const { width: windowWidth } = useWindowDimensions();
  const validSet = useMemo(() => new Set(validDestinations.map(keyOf)), [validDestinations]);

  const containerHorizontalPadding = 32; // GameScreen uses padding 16 left/right
  const boardMax = 420;
  const boardSize = Math.min(boardMax, windowWidth - containerHorizontalPadding);

  const bigGap = 10;
  const bigCellSize = (boardSize - bigGap * 2) / 3;
  const bigCellPadding = 10;

  const innerGap = 8;
  const innerSize = bigCellSize - bigCellPadding * 2;
  const innerContentSize = innerSize - INNER_TILE_PADDING * 2;
  const slotSize = (innerContentSize - innerGap) / 2;

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {[0, 1, 2].map(row => {
        const rowIndices = [row * 3 + 0, row * 3 + 1, row * 3 + 2];

        return (
          <View
            key={row}
            style={[
              styles.bigRow,
              {
                height: bigCellSize,
                marginBottom: row === 2 ? 0 : bigGap,
              },
            ]}>
            {rowIndices.map(bigIndex => {
              const isHole = bigIndex === holeBigIndex;
              const isBigHighlighted =
                validSet.has(`${bigIndex}:0`) ||
                validSet.has(`${bigIndex}:1`) ||
                validSet.has(`${bigIndex}:2`) ||
                validSet.has(`${bigIndex}:3`);
              const isBigSelected = selectedBigIndex === bigIndex;

              const cell = board[bigIndex] ?? [null, null, null, null];

              const bigCellStyle: StyleProp<ViewStyle> = [
                styles.bigCell,
                isHole && styles.holeCell,
                isBigHighlighted && styles.bigCellHighlighted,
                isBigSelected && styles.bigCellSelected,
                {
                  width: bigCellSize,
                  height: bigCellSize,
                  padding: bigCellPadding,
                },
              ];

              const topRowSlots = [0, 1] as const;
              const bottomRowSlots = [2, 3] as const;

              const renderSlot = (slotIndex: 0 | 1 | 2 | 3) => {
                const value = cell[slotIndex] ?? null;
                const isSelected = isBigSelected;
                // We highlight only the BIG square (2x2), not individual slots.
                const isValidDestination = false;

                return (
                  <Slot
                    key={slotIndex}
                    value={value}
                    isSelected={isSelected}
                    isValidDestination={isValidDestination}
                    onPress={() => onPressSlot(bigIndex, slotIndex)}
                    accessibilityLabel={`Big cell ${bigIndex + 1}, slot ${slotIndex + 1}`}
                    containerStyle={{ width: slotSize, height: slotSize }}
                  />
                );
              };

              return (
                <View key={bigIndex} style={bigCellStyle}>
                  <View
                    style={[
                      styles.innerTile,
                      isHole && styles.holeInnerTile,
                      isBigHighlighted && styles.innerTileHighlighted,
                      isBigSelected && styles.innerTileSelected,
                    ]}>
                    <View style={styles.miniGrid}>
                      <View style={[styles.miniRow, { marginBottom: innerGap }]}>
                        {topRowSlots.map(renderSlot)}
                      </View>
                      <View style={styles.miniRow}>{bottomRowSlots.map(renderSlot)}</View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    alignSelf: 'center',
    flexDirection: 'column',
  },
  bigRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bigCell: {
    borderRadius: 14,
    backgroundColor: colors.tileOuter,
    borderWidth: 1,
    borderColor: colors.tileOuterBorder,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  holeCell: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed',
  },
  bigCellHighlighted: {
    borderColor: colors.validBorder,
    borderWidth: 3,
  },
  bigCellSelected: {
    borderColor: 'rgba(255,255,255,0.85)',
    borderWidth: 3,
  },
  innerTile: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.tileInner,
    borderWidth: 1,
    borderColor: colors.tileInnerBorder,
    padding: INNER_TILE_PADDING,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  holeInnerTile: {
    backgroundColor: 'rgba(72, 98, 161, 0.25)',
    borderColor: 'rgba(61, 86, 142, 0.35)',
  },
  innerTileHighlighted: {
    borderColor: colors.validBorder,
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  innerTileSelected: {
    borderColor: 'rgba(255,255,255,0.65)',
  },
  miniGrid: {
    flex: 1,
    justifyContent: 'space-between',
  },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

