import { squareIndexFromRowCol, squareIndexToRowCol } from './mapping';
import type { Board, Player, Pos, SlotValue } from './types';

export const HOLE_SQUARE_INDEX = 4; // center "empty part"

export const createEmptyBoard = (): Board =>
  Array.from({ length: 9 }, () => [null, null, null, null]);

export const otherPlayer = (p: Player): Player => (p === 'R' ? 'B' : 'R');

const getMiniFromBig = (
  board: Board,
  bigRow: number,
  bigCol: number,
  miniRow: 0 | 1,
  miniCol: 0 | 1,
): SlotValue => {
    const squareIndex = squareIndexFromRowCol(bigRow, bigCol);
  const slotIndex = miniRow * 2 + miniCol;
    return board[squareIndex]?.[slotIndex] ?? null;
};

export const checkWinner = (board: Board): Player | null => {
  const isSolid2x2 = (a: SlotValue, b: SlotValue, c: SlotValue, d: SlotValue) =>
    a !== null && a === b && a === c && a === d;

  // Horizontal adjacent big-square pairs: (bigRow 0..2) x (leftBigCol 0..1)
  // Pair forms a 2x4 mini area; check all 2x2 sub-blocks (startCol 0..2).
  for (let bigRow = 0; bigRow < 3; bigRow++) {
    for (let leftBigCol = 0; leftBigCol < 2; leftBigCol++) {
      const get = (r: 0 | 1, c: 0 | 1 | 2 | 3) => {
        const bigCol = c < 2 ? leftBigCol : leftBigCol + 1;
        const miniCol = (c < 2 ? c : (c - 2)) as 0 | 1;
        return getMiniFromBig(board, bigRow, bigCol, r, miniCol);
      };

      for (let startCol = 0 as 0 | 1 | 2; startCol <= 2; startCol++) {
        const a = get(0, startCol);
        const b = get(0, (startCol + 1) as 0 | 1 | 2 | 3);
        const c = get(1, startCol);
        const d = get(1, (startCol + 1) as 0 | 1 | 2 | 3);
        if (isSolid2x2(a, b, c, d)) return a;
      }
    }
  }

  // Vertical adjacent big-square pairs: (topBigRow 0..1) x (bigCol 0..2)
  // Pair forms a 4x2 mini area; check all 2x2 sub-blocks (startRow 0..2).
  for (let topBigRow = 0; topBigRow < 2; topBigRow++) {
    for (let bigCol = 0; bigCol < 3; bigCol++) {
      const get = (r: 0 | 1 | 2 | 3, c: 0 | 1) => {
        const bigRow = r < 2 ? topBigRow : topBigRow + 1;
        const miniRow = (r < 2 ? r : (r - 2)) as 0 | 1;
        return getMiniFromBig(board, bigRow, bigCol, miniRow, c);
      };

      for (let startRow = 0 as 0 | 1 | 2; startRow <= 2; startRow++) {
        const a = get(startRow, 0);
        const b = get(startRow, 1);
        const c = get((startRow + 1) as 0 | 1 | 2 | 3, 0);
        const d = get((startRow + 1) as 0 | 1 | 2 | 3, 1);
        if (isSolid2x2(a, b, c, d)) return a;
      }
    }
  }

  return null;
};

const slotIndexToMini = (slotIndex: number): { miniRow: 0 | 1; miniCol: 0 | 1 } => {
  switch (slotIndex) {
    case 0:
      return { miniRow: 0, miniCol: 0 };
    case 1:
      return { miniRow: 0, miniCol: 1 };
    case 2:
      return { miniRow: 1, miniCol: 0 };
    default:
      return { miniRow: 1, miniCol: 1 };
  }
};

const miniToSlotIndex = (miniRow: 0 | 1, miniCol: 0 | 1) => miniRow * 2 + miniCol;

// Movement rule:
// A piece may slide only across a BIG-square boundary into a neighboring big square
// (up/down/left/right). No diagonal moves, no jumping, and no moving within the same big square.
export const getValidDestinations = (board: Board, from: Pos): Pos[] => {
  const destinations: Pos[] = [];

  const { squareRow, squareCol } = squareIndexToRowCol(from.squareIndex);
  const { miniRow, miniCol } = slotIndexToMini(from.slotIndex);

  const tryAdd = (
    toSquareRow: number,
    toSquareCol: number,
    toMiniRow: 0 | 1,
    toMiniCol: 0 | 1,
  ) => {
    if (toSquareRow < 0 || toSquareRow > 2 || toSquareCol < 0 || toSquareCol > 2) return;
    const toSquareIndex = squareIndexFromRowCol(toSquareRow, toSquareCol);
    const toSlotIndex = miniToSlotIndex(toMiniRow, toMiniCol);
    if (board[toSquareIndex]?.[toSlotIndex] === null) {
      destinations.push({ squareIndex: toSquareIndex, slotIndex: toSlotIndex });
    }
  };

  // Cross-boundary adjacency (aligned mini-slot across the edge)
  // Right across boundary
  if (miniCol === 1) tryAdd(squareRow, squareCol + 1, miniRow, 0);
  // Left across boundary
  if (miniCol === 0) tryAdd(squareRow, squareCol - 1, miniRow, 1);
  // Down across boundary
  if (miniRow === 1) tryAdd(squareRow + 1, squareCol, 0, miniCol);
  // Up across boundary
  if (miniRow === 0) tryAdd(squareRow - 1, squareCol, 1, miniCol);

  return destinations;
};

export const playerHasAnyMove = (board: Board, player: Player): boolean => {
  for (let squareIndex = 0; squareIndex < 9; squareIndex++) {
    for (let slotIndex = 0; slotIndex < 4; slotIndex++) {
      if (board[squareIndex]?.[slotIndex] !== player) continue;
      if (getValidDestinations(board, { squareIndex, slotIndex }).length > 0) return true;
    }
  }
  return false;
};

