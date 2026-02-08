export const bigIndexFromBigRowCol = (bigRow: number, bigCol: number): number =>
  bigRow * 3 + bigCol;

export const bigIndexToBigRowCol = (
  bigIndex: number,
): { bigRow: number; bigCol: number } => ({
  bigRow: Math.floor(bigIndex / 3),
  bigCol: bigIndex % 3,
});

export const getNeighborBigIndices = (bigIndex: number): number[] => {
  const { bigRow, bigCol } = bigIndexToBigRowCol(bigIndex);
  const neighbors: number[] = [];
  if (bigRow > 0) neighbors.push(bigIndexFromBigRowCol(bigRow - 1, bigCol));
  if (bigRow < 2) neighbors.push(bigIndexFromBigRowCol(bigRow + 1, bigCol));
  if (bigCol > 0) neighbors.push(bigIndexFromBigRowCol(bigRow, bigCol - 1));
  if (bigCol < 2) neighbors.push(bigIndexFromBigRowCol(bigRow, bigCol + 1));
  return neighbors;
};

