export const squareIndexFromRowCol = (squareRow: number, squareCol: number): number =>
  squareRow * 3 + squareCol;

export const squareIndexToRowCol = (
  squareIndex: number,
): { squareRow: number; squareCol: number } => ({
  squareRow: Math.floor(squareIndex / 3),
  squareCol: squareIndex % 3,
});

export const getNeighborSquareIndices = (squareIndex: number): number[] => {
  const { squareRow, squareCol } = squareIndexToRowCol(squareIndex);
  const neighbors: number[] = [];
  if (squareRow > 0) neighbors.push(squareIndexFromRowCol(squareRow - 1, squareCol));
  if (squareRow < 2) neighbors.push(squareIndexFromRowCol(squareRow + 1, squareCol));
  if (squareCol > 0) neighbors.push(squareIndexFromRowCol(squareRow, squareCol - 1));
  if (squareCol < 2) neighbors.push(squareIndexFromRowCol(squareRow, squareCol + 1));
  return neighbors;
};

