import type { GameState } from '../game/types';
import { DEFAULT_PIECES_PER_PLAYER } from '../game/engine';
import { BASE_URL } from './config';

type CreateGameResponse = Readonly<{
  gameId: string;
  playerToken: string;
  state: GameState;
}>;

type MoveResponse = Readonly<{
  state?: GameState;
  error?: string;
}>;

const requestJson = async <T>(url: string, options: RequestInit): Promise<T> => {
  const res = await fetch(url, options);
  const data = (await res.json()) as T;
  if (!res.ok) {
    const error = (data as MoveResponse)?.error ?? `Request failed: ${res.status}`;
    throw new Error(error);
  }
  return data;
};

export const createGame = async (): Promise<CreateGameResponse> =>
  requestJson<CreateGameResponse>(`${BASE_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ piecesPerPlayer: DEFAULT_PIECES_PER_PLAYER }),
  });

export const restartGame = async (gameId: string, playerToken: string): Promise<GameState> => {
  const res = await requestJson<{ state: GameState }>(`${BASE_URL}/games/${gameId}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerToken }),
  });
  return res.state;
};

export const placePiece = async (
  gameId: string,
  playerToken: string,
  squareIndex: number,
  slotIndex: number,
): Promise<GameState> => {
  const res = await requestJson<{ state: GameState }>(`${BASE_URL}/games/${gameId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'place', squareIndex, slotIndex, playerToken }),
  });
  return res.state;
};

export const slideSquare = async (
  gameId: string,
  playerToken: string,
  fromSquareIndex: number,
  toHoleSquareIndex: number,
): Promise<GameState> => {
  const res = await requestJson<{ state: GameState }>(`${BASE_URL}/games/${gameId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'slide',
      fromSquareIndex,
      toHoleSquareIndex,
      playerToken,
    }),
  });
  return res.state;
};
