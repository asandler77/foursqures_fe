import type { GameAction, GameState, Phase, Player, Pos } from './types';
import {
  checkWinner,
  createEmptyBoard,
  otherPlayer,
  HOLE_BIG_INDEX,
} from './rules';
import { getNeighborBigIndices } from './mapping';

export const DEFAULT_PIECES_PER_PLAYER = 4;

export const createInitialState = (
  piecesPerPlayer: number = DEFAULT_PIECES_PER_PLAYER,
): GameState => ({
  piecesPerPlayer,
  board: createEmptyBoard(),
  phase: 'placement',
  currentPlayer: 'R',
  placed: { R: 0, B: 0 },
  holeBigIndex: HOLE_BIG_INDEX,
  selectedBigIndex: null,
  winner: null,
  drawReason: null,
});

export const getRemainingPieces = (state: GameState, player: Player): number =>
  state.piecesPerPlayer - state.placed[player];

const allSlotsInBig = (bigIndex: number): Pos[] => [
  { bigIndex, slotIndex: 0 },
  { bigIndex, slotIndex: 1 },
  { bigIndex, slotIndex: 2 },
  { bigIndex, slotIndex: 3 },
];

const getMovableBigIndices = (holeBigIndex: number): number[] =>
  getNeighborBigIndices(holeBigIndex);

export const getValidDestinationsForSelected = (state: GameState): Pos[] => {
  if (state.winner || state.drawReason) return [];

  // During sliding steps (placementSlide and movement):
  // Highlight all movable big squares (adjacent to hole).
  if (state.phase === 'placementSlide' || state.phase === 'movement') {
    return getMovableBigIndices(state.holeBigIndex).flatMap(allSlotsInBig);
  }

  return [];
};

export const reducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'restart':
      return createInitialState(state.piecesPerPlayer);

    case 'pressSlot': {
      if (state.winner || state.drawReason) return state;

      const { bigIndex, slotIndex } = action;

      const totalPieces = state.piecesPerPlayer * 2;

      const slideSelectedIntoHole = (s: GameState): GameState => {
        if (s.selectedBigIndex === null) return s;

        const fromBigIndex = s.selectedBigIndex;
        const toBigIndex = s.holeBigIndex;

        const nextBoard = s.board.map(cell => cell.slice());
        const temp = nextBoard[toBigIndex];
        nextBoard[toBigIndex] = nextBoard[fromBigIndex];
        nextBoard[fromBigIndex] = temp;

        const nextHoleBigIndex = fromBigIndex;

        const w = checkWinner(nextBoard);
        if (w) {
          return {
            ...s,
            board: nextBoard,
            holeBigIndex: nextHoleBigIndex,
            selectedBigIndex: null,
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
          holeBigIndex: nextHoleBigIndex,
          selectedBigIndex: null,
          currentPlayer: nextPlayer,
          phase: nextPhase,
        };
      };

      const slideBigIntoHole = (s: GameState, fromBigIndex: number): GameState =>
        slideSelectedIntoHole({ ...s, selectedBigIndex: fromBigIndex });

      // Placement: place one piece (not in the current hole), then MUST slide a big square.
      if (state.phase === 'placement') {
        if (bigIndex === state.holeBigIndex) return state;
        if (state.placed[state.currentPlayer] >= state.piecesPerPlayer) return state;
        if (state.board[bigIndex]?.[slotIndex] !== null) return state;

        const nextBoard = state.board.map(cell => cell.slice());
        nextBoard[bigIndex][slotIndex] = state.currentPlayer;

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
            selectedBigIndex: null,
            winner: w,
          };
        }

        // Same player must slide a big square into the hole.
        return {
          ...state,
          board: nextBoard,
          placed: nextPlaced,
          phase: 'placementSlide',
          selectedBigIndex: null,
        };
      }

      // PlacementSlide / Movement: slide a whole BIG square into the hole.
      if (state.phase === 'placementSlide' || state.phase === 'movement') {
        const movable = new Set(getMovableBigIndices(state.holeBigIndex));

        // One-tap slide: tap any movable big square to immediately slide it into the hole.
        if (bigIndex !== state.holeBigIndex && movable.has(bigIndex)) {
          return slideBigIntoHole(state, bigIndex);
        }

        return state;
      }

      return state; // should be unreachable
    }
  }
};

