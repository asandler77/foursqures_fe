import React, { useEffect, useMemo, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Board, Pos } from '../../game/types';
import { colors } from '../theme';
import { getBoardLayout } from '../../utils/boardLayout';
import { Slot } from './Slot';

const INNER_TILE_PADDING = 6;
const SLIDE_DURATION_MS = 800;

type Props = Readonly<{
  board: Board;
  holeSquareIndex: number;
  selectedSquareIndex: number | null;
  validDestinations: ReadonlyArray<Pos>;
  onPressSlot: (squareIndex: number, slotIndex: number) => void;
  onPressSquare?: (squareIndex: number) => void;
  enableSquarePress?: boolean;
}>;

const keyOf = (p: Pos) => `${p.squareIndex}:${p.slotIndex}`;

export const BoardView = ({
  board,
  holeSquareIndex,
  selectedSquareIndex,
  validDestinations,
  onPressSlot,
  onPressSquare,
  enableSquarePress = false,
}: Props) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const validSet = useMemo(() => new Set(validDestinations.map(keyOf)), [validDestinations]);

  const containerHorizontalPadding = 32; // GameScreen uses padding 16 left/right
  const { boardSize, bigGap, bigCellSize, bigCellPadding, innerGap, slotSize } = getBoardLayout({
    windowWidth,
    windowHeight,
    containerHorizontalPadding,
    innerTilePadding: INNER_TILE_PADDING,
  });

  const prevHoleRef = useRef<number>(holeSquareIndex);
  const animMapRef = useRef<Map<number, Animated.ValueXY>>(new Map());

  const getAnimForSquare = (squareIndex: number) => {
    const map = animMapRef.current;
    const existing = map.get(squareIndex);
    if (existing) return existing;
    const created = new Animated.ValueXY({ x: 0, y: 0 });
    map.set(squareIndex, created);
    return created;
  };

  useEffect(() => {
    const prevHole = prevHoleRef.current;
    if (prevHole === holeSquareIndex) return;

    const fromIndex = holeSquareIndex;
    const toIndex = prevHole;
    const fromRow = Math.floor(fromIndex / 3);
    const fromCol = fromIndex % 3;
    const toRow = Math.floor(toIndex / 3);
    const toCol = toIndex % 3;
    const dx = (fromCol - toCol) * (bigCellSize + bigGap);
    const dy = (fromRow - toRow) * (bigCellSize + bigGap);

    const anim = getAnimForSquare(toIndex);
    anim.setValue({ x: dx, y: dy });
    Animated.timing(anim, {
      toValue: { x: 0, y: 0 },
      duration: SLIDE_DURATION_MS,
      useNativeDriver: true,
    }).start();

    prevHoleRef.current = holeSquareIndex;
  }, [holeSquareIndex, bigCellSize, bigGap]);

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
            {rowIndices.map(squareIndex => {
              const isHole = squareIndex === holeSquareIndex;
              const isBigHighlighted =
                validSet.has(`${squareIndex}:0`) ||
                validSet.has(`${squareIndex}:1`) ||
                validSet.has(`${squareIndex}:2`) ||
                validSet.has(`${squareIndex}:3`);
              const isBigSelected = selectedSquareIndex === squareIndex;

              const cell = board[squareIndex] ?? [null, null, null, null];
              const anim = getAnimForSquare(squareIndex);

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
                // We highlight only the square (2x2), not individual slots.
                const isValidDestination = false;

                return (
                  <Slot
                    key={slotIndex}
                    value={value}
                    isSelected={isSelected}
                    isValidDestination={isValidDestination}
                    onPress={() => onPressSlot(squareIndex, slotIndex)}
                    accessibilityLabel={`Square ${squareIndex + 1}, slot ${slotIndex + 1}`}
                    containerStyle={{ width: slotSize, height: slotSize }}
                  />
                );
              };

              return (
                <Animated.View
                  key={squareIndex}
                  style={[
                    bigCellStyle,
                    { transform: [{ translateX: anim.x }, { translateY: anim.y }] },
                  ]}>
                  <View
                    style={[
                      styles.innerTile,
                      isHole && styles.holeInnerTile,
                      isBigSelected && styles.innerTileSelected,
                    ]}>
                    <View style={styles.miniGrid}>
                      <View style={[styles.miniRow, { marginBottom: innerGap }]}>
                        {topRowSlots.map(renderSlot)}
                      </View>
                      <View style={styles.miniRow}>{bottomRowSlots.map(renderSlot)}</View>
                    </View>
                  </View>
                  {enableSquarePress && onPressSquare ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onPressSquare(squareIndex)}
                      style={styles.squarePressOverlay}
                    />
                  ) : null}
                </Animated.View>
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
    borderStyle: 'dashed',
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
  squarePressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});

