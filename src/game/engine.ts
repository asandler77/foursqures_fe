import type { GameAction, GameState, Phase, Player, Pos } from './types';
import {
  checkWinner,
  createEmptyBoard,
  otherPlayer,
  HOLE_SQUARE_INDEX,
} from './rules';
import { getNeighborSquareIndices } from './mapping';

export const DEFAULT_PIECES_PER_PLAYER = 16;

export const createInitialState = (
  piecesPerPlayer: number = DEFAULT_PIECES_PER_PLAYER,
): GameState => ({
  piecesPerPlayer,
  board: createEmptyBoard(),
  phase: 'placement',
  currentPlayer: 'R',
  placed: { R: 0, B: 0 },
  holeSquareIndex: HOLE_SQUARE_INDEX,
  selectedSquareIndex: null,
  lastMovedSquareIndex: null,
  winner: null,
  drawReason: null,
});

export const getRemainingPieces = (state: GameState, player: Player): number =>
  state.piecesPerPlayer - state.placed[player];

const allSlotsInSquare = (squareIndex: number): Pos[] => [
  { squareIndex, slotIndex: 0 },
  { squareIndex, slotIndex: 1 },
  { squareIndex, slotIndex: 2 },
  { squareIndex, slotIndex: 3 },
];

const getMovableSquareIndices = (holeSquareIndex: number): number[] =>
  getNeighborSquareIndices(holeSquareIndex);

export const getValidDestinationsForSelected = (state: GameState): Pos[] => {
  if (state.winner || state.drawReason) return [];

  // During sliding steps (placementSlide and movement):
  // Highlight all movable big squares (adjacent to hole).
  if (state.phase === 'placementSlide' || state.phase === 'movement') {
    return getMovableSquareIndices(state.holeSquareIndex)
      .filter(squareIndex => squareIndex !== state.lastMovedSquareIndex)
      .flatMap(allSlotsInSquare);
  }

  return [];
};

export const reducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'restart':
      return createInitialState(state.piecesPerPlayer);

    case 'pressSlot': {
      if (state.winner || state.drawReason) return state;

      const { squareIndex, slotIndex } = action;

      const totalPieces = state.piecesPerPlayer * 2;

      const slideSelectedIntoHole = (s: GameState): GameState => {
        if (s.selectedSquareIndex === null) return s;

        const fromSquareIndex = s.selectedSquareIndex;
        const toSquareIndex = s.holeSquareIndex;

        const nextBoard = s.board.map(cell => cell.slice());
        const temp = nextBoard[toSquareIndex];
        nextBoard[toSquareIndex] = nextBoard[fromSquareIndex];
        nextBoard[fromSquareIndex] = temp;

        const nextHoleSquareIndex = fromSquareIndex;
        const nextLastMovedSquareIndex = toSquareIndex;

        const w = checkWinner(nextBoard);
        if (w) {
          return {
            ...s,
            board: nextBoard,
            holeSquareIndex: nextHoleSquareIndex,
            selectedSquareIndex: null,
            lastMovedSquareIndex: nextLastMovedSquareIndex,
            winner: w,
          };
        }

        const nextPlayer = otherPlayer(s.currentPlayer);

        // After the mandatory slide in placementSlide:
        // - If all pieces are placed, enter movement
        // - Otherwise return to placement
        const totalPlaced = s.placed.R + s.placed.B;
        const nextPhase: Phase =
          s.phase === 'placementSlide'
            ? totalPlaced >= totalPieces
              ? 'movement'
              : 'placement'
            : 'movement';

        return {
          ...s,
          board: nextBoard,
          holeSquareIndex: nextHoleSquareIndex,
          selectedSquareIndex: null,
          lastMovedSquareIndex: nextLastMovedSquareIndex,
          currentPlayer: nextPlayer,
          phase: nextPhase,
        };
      };

      const slideSquareIntoHole = (s: GameState, fromSquareIndex: number): GameState =>
        slideSelectedIntoHole({ ...s, selectedSquareIndex: fromSquareIndex });

      // Placement: place one piece (not in the current hole), then MUST slide a big square.
      if (state.phase === 'placement') {
        if (squareIndex === state.holeSquareIndex) return state;
        if (state.placed[state.currentPlayer] >= state.piecesPerPlayer) return state;
        if (state.board[squareIndex]?.[slotIndex] !== null) return state;

        const nextBoard = state.board.map(cell => cell.slice());
        nextBoard[squareIndex][slotIndex] = state.currentPlayer;

        const nextPlaced = {
          ...state.placed,
          [state.currentPlayer]: state.placed[state.currentPlayer] + 1,
        } as GameState['placed'];

        const w = checkWinner(nextBoard);
        if (w) {
          return {
            ...state,
            board: nextBoard,
            placed: nextPlaced,
            selectedSquareIndex: null,
            winner: w,
          };
        }

        // Same player must slide a big square into the hole.
        return {
          ...state,
          board: nextBoard,
          placed: nextPlaced,
          phase: 'placementSlide',
          selectedSquareIndex: null,
        };
      }

      // PlacementSlide / Movement: slide a whole BIG square into the hole.
      if (state.phase === 'placementSlide' || state.phase === 'movement') {
        const movable = new Set(getMovableSquareIndices(state.holeSquareIndex));

        // One-tap slide: tap any movable big square to immediately slide it into the hole.
        if (
          squareIndex !== state.holeSquareIndex &&
          squareIndex !== state.lastMovedSquareIndex &&
          movable.has(squareIndex)
        ) {
          return slideSquareIntoHole(state, squareIndex);
        }

        return state;
      }

      return state; // should be unreachable
    }
  }
};

