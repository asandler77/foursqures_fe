export type Player = 'R' | 'B';
export type Phase = 'placement' | 'placementSlide' | 'movement';
export type SlotValue = Player | null;

// 9 squares (2x2), each has 4 mini slots: [0,1;2,3]
export type Board = ReadonlyArray<ReadonlyArray<SlotValue>>;

export type Pos = Readonly<{ squareIndex: number; slotIndex: number }>;

export type PlacedCount = Readonly<{ R: number; B: number }>;

export type GameState = Readonly<{
  piecesPerPlayer: number;
  board: Board;
  phase: Phase;
  currentPlayer: Player;
  placed: PlacedCount;
  holeSquareIndex: number;
  selectedSquareIndex: number | null;
  winner: Player | null;
  drawReason: string | null;
}>;

export type GameAction =
  | { type: 'restart' }
  | { type: 'pressSlot'; squareIndex: number; slotIndex: number };

