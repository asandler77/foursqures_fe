import { squareIndexFromRowCol, squareIndexToRowCol } from './mapping';
import type { Board, Player, Pos, SlotValue } from './types';

export const HOLE_SQUARE_INDEX = 4; // center "empty part"

export const createEmptyBoard = (): Board =>
  Array.from({ length: 9 }, () => [null, null, null, null]);

export const otherPlayer = (p: Player): Player => (p === 'R' ? 'B' : 'R');

export const checkWinner = (board: Board): Player | null => {
  // Win rule:
  // If anywhere on the overall 6x6 mini-grid there is a solid 2x2 block
  // of the same color, that player wins (including across 4 squares).
  const at = (globalRow: number, globalCol: number): SlotValue => {
    const squareRow = Math.floor(globalRow / 2);
    const squareCol = Math.floor(globalCol / 2);
    const miniRow = (globalRow % 2) as 0 | 1;
    const miniCol = (globalCol % 2) as 0 | 1;
    const squareIndex = squareIndexFromRowCol(squareRow, squareCol);
    const slotIndex = miniRow * 2 + miniCol;
    return board[squareIndex]?.[slotIndex] ?? null;
  };

  for (let r = 0; r <= 4; r++) {
    for (let c = 0; c <= 4; c++) {
      const a = at(r, c);
      if (a === null) continue;
      const b = at(r, c + 1);
      const c2 = at(r + 1, c);
      const d = at(r + 1, c + 1);
      if (a === b && a === c2 && a === d) return a;
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

