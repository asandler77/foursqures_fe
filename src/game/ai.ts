import type { GameAction, GameState, Player, SlotValue } from './types';
import { reducer } from './engine';
import { getNeighborSquareIndices } from './mapping';

type AIOptions = Readonly<{
  maxDepth: number;
  timeLimitMs: number;
}>;

const otherPlayer = (p: Player): Player => (p === 'R' ? 'B' : 'R');
const RANDOM_MOVE_CHANCE = 0.4;

const getSlotAt = (board: GameState['board'], globalRow: number, globalCol: number): SlotValue => {
  const squareRow = Math.floor(globalRow / 2);
  const squareCol = Math.floor(globalCol / 2);
  const squareIndex = squareRow * 3 + squareCol;
  const miniRow = (globalRow % 2) as 0 | 1;
  const miniCol = (globalCol % 2) as 0 | 1;
  const slotIndex = miniRow * 2 + miniCol;
  return board[squareIndex]?.[slotIndex] ?? null;
};

const evaluateState = (state: GameState, perspective: Player): number => {
  if (state.winner === perspective) return 100000;
  if (state.winner && state.winner !== perspective) return -100000;
  if (state.drawReason) return 0;

  const weights = [0, 1, 5, 25, 200];
  let score = 0;

  for (let r = 0; r <= 4; r++) {
    for (let c = 0; c <= 4; c++) {
      const a = getSlotAt(state.board, r, c);
      const b = getSlotAt(state.board, r, c + 1);
      const c2 = getSlotAt(state.board, r + 1, c);
      const d = getSlotAt(state.board, r + 1, c + 1);
      const cells = [a, b, c2, d];
      const countP = cells.filter(x => x === perspective).length;
      const countO = cells.filter(x => x === otherPlayer(perspective)).length;
      if (countO === 0) score += weights[countP];
      if (countP === 0) score -= weights[countO];
    }
  }

  return score;
};

const getLegalSlideSquares = (state: GameState): number[] => {
  if (state.legalSlides && state.legalSlides.length > 0) {
    return [...state.legalSlides];
  }
  const neighbors = getNeighborSquareIndices(state.holeSquareIndex);
  return neighbors.filter(idx => idx !== state.lastMovedSquareIndex);
};

const getPossibleActions = (state: GameState): GameAction[] => {
  if (state.phase === 'placement') {
    const actions: GameAction[] = [];
    for (let squareIndex = 0; squareIndex < 9; squareIndex++) {
      if (squareIndex === state.holeSquareIndex) continue;
      const cell = state.board[squareIndex];
      for (let slotIndex = 0; slotIndex < 4; slotIndex++) {
        if (cell?.[slotIndex] !== null) continue;
        actions.push({ type: 'pressSlot', squareIndex, slotIndex });
      }
    }
    return actions;
  }

  const legalSquares = getLegalSlideSquares(state);
  return legalSquares.map(squareIndex => ({
    type: 'pressSlot',
    squareIndex,
    slotIndex: 0,
  }));
};

export const computeBestAction = (
  state: GameState,
  aiPlayer: Player,
  options: AIOptions,
): GameAction | null => {
  if (state.currentPlayer !== aiPlayer) return null;

  const deadline = Date.now() + options.timeLimitMs;
  let bestAction: GameAction | null = null;
  let bestScore = -Infinity;

  const minimax = (node: GameState, depth: number, alpha: number, beta: number): number => {
    if (Date.now() >= deadline || depth === 0 || node.winner || node.drawReason) {
      return evaluateState(node, aiPlayer);
    }

    const actions = getPossibleActions(node);
    if (actions.length === 0) return evaluateState(node, aiPlayer);

    const maximizing = node.currentPlayer === aiPlayer;
    let value = maximizing ? -Infinity : Infinity;

    for (const action of actions) {
      if (Date.now() >= deadline) break;
      const next = reducer(node, action);
      if (next === node) continue;
      const score = minimax(next, depth - 1, alpha, beta);
      if (maximizing) {
        value = Math.max(value, score);
        alpha = Math.max(alpha, value);
        if (beta <= alpha) break;
      } else {
        value = Math.min(value, score);
        beta = Math.min(beta, value);
        if (beta <= alpha) break;
      }
    }

    return value;
  };

  const actions = getPossibleActions(state);
  if (actions.length === 0) return null;
  if (Math.random() < RANDOM_MOVE_CHANCE) {
    return actions[Math.floor(Math.random() * actions.length)];
  }
  for (const action of actions) {
    if (Date.now() >= deadline) break;
    const next = reducer(state, action);
    if (next === state) continue;
    const score = minimax(next, options.maxDepth - 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
};
