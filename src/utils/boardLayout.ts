type BoardLayoutInput = Readonly<{
  windowWidth: number;
  windowHeight: number;
  containerHorizontalPadding: number;
  innerTilePadding: number;
}>;

export type BoardLayout = Readonly<{
  isTablet: boolean;
  boardSize: number;
  bigGap: number;
  bigCellSize: number;
  bigCellPadding: number;
  innerGap: number;
  slotSize: number;
}>;

export const getBoardLayout = ({
  windowWidth,
  windowHeight,
  containerHorizontalPadding,
  innerTilePadding,
}: BoardLayoutInput): BoardLayout => {
  const shortSide = Math.min(windowWidth, windowHeight);
  const isTablet = shortSide >= 900;
  const maxByWidth = windowWidth - containerHorizontalPadding;
  const maxByHeight = windowHeight - (isTablet ? 120 : 0);
  const boardMax = isTablet ? Math.min(maxByWidth, maxByHeight) : 420;
  const boardSize = Math.min(boardMax, maxByWidth);

  const bigGap = 10;
  const bigCellSize = (boardSize - bigGap * 2) / 3;
  const bigCellPadding = 10;

  const innerGap = 8;
  const innerSize = bigCellSize - bigCellPadding * 2;
  const innerContentSize = innerSize - innerTilePadding * 2;
  const slotSize = (innerContentSize - innerGap) / 2;

  return {
    isTablet,
    boardSize,
    bigGap,
    bigCellSize,
    bigCellPadding,
    innerGap,
    slotSize,
  };
};
