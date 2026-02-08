import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createInitialState, getValidDestinationsForSelected, reducer } from '../game/engine';
import type { GameState } from '../game/types';
import { createGame, placePiece, restartGame, slideSquare } from '../api/gameApi';
import { BoardView } from '../ui/components/BoardView';
import { Header } from '../ui/components/Header';
import { colors, spacing } from '../ui/theme';

type PlayMode = 'local' | 'server';
const SERVER_TURN_DELAY_MS = 2000;
const SERVER_AI_SLIDE_DELAY_MS = 1000;

export const GameScreen = () => {
  const [localState, dispatch] = useReducer(reducer, undefined, () => createInitialState());
  const [mode, setMode] = useState<PlayMode>('local');
  const [serverState, setServerState] = useState<GameState | null>(null);
  const [serverInfo, setServerInfo] = useState<{ gameId: string; playerToken: string } | null>(
    null,
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnCooldown, setTurnCooldown] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingApplyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeState = mode === 'server' ? serverState : localState;
  const validDestinations = useMemo(
    () => (activeState ? getValidDestinationsForSelected(activeState) : []),
    [activeState],
  );

  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
        cooldownRef.current = null;
      }
      if (pendingApplyRef.current) {
        clearTimeout(pendingApplyRef.current);
        pendingApplyRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setServerError(null);
    setLocalError(null);
    if (mode !== 'server') return;
    if (serverState && serverInfo) return;

    let isMounted = true;
    const init = async () => {
      setIsLoading(true);
      setServerError(null);
      try {
        const res = await createGame();
        if (!isMounted) return;
        setServerInfo({ gameId: res.gameId, playerToken: res.playerToken });
        setServerState(res.state);
      } catch (err) {
        if (!isMounted) return;
        setServerError(err instanceof Error ? err.message : 'Failed to connect to server.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [mode, serverInfo, serverState]);

  const startTurnCooldown = () => {
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    setTurnCooldown(true);
    cooldownRef.current = setTimeout(() => {
      setTurnCooldown(false);
      cooldownRef.current = null;
    }, SERVER_TURN_DELAY_MS);
  };

  const swapSquares = (board: GameState['board'], a: number, b: number) => {
    const nextBoard = board.map(cell => cell.slice());
    const temp = nextBoard[a];
    nextBoard[a] = nextBoard[b];
    nextBoard[b] = temp;
    return nextBoard;
  };

  const applyServerStateWithDelay = (
    next: GameState,
    base: GameState,
    startedAt: number,
  ) => {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, SERVER_TURN_DELAY_MS - elapsed);
    if (pendingApplyRef.current) clearTimeout(pendingApplyRef.current);
    pendingApplyRef.current = setTimeout(() => {
      const preHole = base.holeSquareIndex;
      const finalHole = next.holeSquareIndex;
      const hasSlide = preHole !== finalHole;
      const preSlideBoard = hasSlide ? swapSquares(next.board, preHole, finalHole) : next.board;
      const placementHappened =
        JSON.stringify(preSlideBoard) !== JSON.stringify(base.board);

      if (placementHappened) {
        setServerState({
          ...next,
          board: preSlideBoard,
          holeSquareIndex: preHole,
          currentPlayer: 'B',
          phase: 'placementSlide',
        });
      }

      pendingApplyRef.current = setTimeout(() => {
        setServerState(next);
        pendingApplyRef.current = null;
      }, placementHappened ? SERVER_AI_SLIDE_DELAY_MS : 0);
    }, remaining);
  };

  const handleRestart = async () => {
    if (mode === 'local') {
      setLocalError(null);
      dispatch({ type: 'restart' });
      return;
    }
    if (!serverInfo) return;
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
    if (pendingApplyRef.current) {
      clearTimeout(pendingApplyRef.current);
      pendingApplyRef.current = null;
    }
    setTurnCooldown(false);
    setLocalError(null);
    setIsLoading(true);
    setServerError(null);
    try {
      const next = await restartGame(serverInfo.gameId, serverInfo.playerToken);
      setServerState(next);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to restart game.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePressSlot = async (squareIndex: number, slotIndex: number) => {
    const isRepeatMove =
      activeState &&
      (activeState.phase === 'placementSlide' || activeState.phase === 'movement') &&
      activeState.lastMovedSquareIndex !== null &&
      squareIndex === activeState.lastMovedSquareIndex;
    const hasLegalSlides =
      activeState &&
      (activeState.phase === 'placementSlide' || activeState.phase === 'movement') &&
      Array.isArray(activeState.legalSlides) &&
      activeState.legalSlides.length > 0;
    const isLegalSlide = !hasLegalSlides || activeState?.legalSlides?.includes(squareIndex);

    if (mode === 'local') {
      if (isRepeatMove) {
        setLocalError('You cannot move the same square twice in a row.');
        return;
      }
      if (!isLegalSlide) {
        setLocalError('This square cannot be moved now.');
        return;
      }
      setLocalError(null);
      dispatch({ type: 'pressSlot', squareIndex, slotIndex });
      return;
    }
    if (!serverInfo || !serverState || isLoading || turnCooldown) return;
    if (isRepeatMove) {
      setServerError('You cannot move the same square twice in a row.');
      return;
    }
    if (!isLegalSlide) {
      setServerError('This square cannot be moved now.');
      return;
    }

    setIsLoading(true);
    setServerError(null);
    setLocalError(null);
    let prevState: GameState | null = null;
    try {
      prevState = serverState;
      const optimistic = reducer(serverState, { type: 'pressSlot', squareIndex, slotIndex });
      setServerState(optimistic);

      if (serverState.phase === 'placement') {
        const next = await placePiece(
          serverInfo.gameId,
          serverInfo.playerToken,
          squareIndex,
          slotIndex,
        );
        setServerState(next);
      } else {
        const startedAt = Date.now();
        startTurnCooldown();
        const next = await slideSquare(
          serverInfo.gameId,
          serverInfo.playerToken,
          squareIndex,
          serverState.holeSquareIndex,
        );
        applyServerStateWithDelay(next, optimistic, startedAt);
      }
    } catch (err) {
      if (prevState) setServerState(prevState);
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
        cooldownRef.current = null;
      }
      if (pendingApplyRef.current) {
        clearTimeout(pendingApplyRef.current);
        pendingApplyRef.current = null;
      }
      setTurnCooldown(false);
      setServerError(err instanceof Error ? err.message : 'Move failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {activeState ? <Header state={activeState} onRestart={handleRestart} /> : null}
        <View style={styles.boardArea}>
          {activeState ? (
            <BoardView
              board={activeState.board}
              holeSquareIndex={activeState.holeSquareIndex}
              selectedSquareIndex={activeState.selectedSquareIndex}
              validDestinations={validDestinations}
              onPressSlot={handlePressSlot}
              onPressSquare={squareIndex => handlePressSlot(squareIndex, 0)}
              enableSquarePress={
                activeState.phase === 'placementSlide' || activeState.phase === 'movement'
              }
            />
          ) : (
            <Text style={styles.loadingText}>
              {serverError ? serverError : 'Connecting to server...'}
            </Text>
          )}
        </View>
        <View style={styles.modeRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('local')}
            style={({ pressed }) => [
              styles.modeButton,
              mode === 'local' && styles.modeButtonActive,
              pressed && styles.modeButtonPressed,
            ]}>
            <Text style={[styles.modeButtonText, mode === 'local' && styles.modeButtonTextActive]}>
              Local
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('server')}
            style={({ pressed }) => [
              styles.modeButton,
              mode === 'server' && styles.modeButtonActive,
              pressed && styles.modeButtonPressed,
            ]}>
            <Text style={[styles.modeButtonText, mode === 'server' && styles.modeButtonTextActive]}>
              Server
            </Text>
          </Pressable>
        </View>
        {mode === 'server' && serverError ? (
          <Text style={styles.errorText}>{serverError}</Text>
        ) : mode === 'local' && localError ? (
          <Text style={styles.errorText}>{localError}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  boardArea: { flex: 1, justifyContent: 'center' },
  loadingText: { textAlign: 'center', color: colors.textMuted, fontSize: 16 },
  modeRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.tabBorder,
    backgroundColor: colors.tabBg,
  },
  modeButtonActive: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  modeButtonPressed: { opacity: 0.85 },
  modeButtonText: { color: colors.text, fontWeight: '700' },
  modeButtonTextActive: { color: 'white' },
  errorText: { textAlign: 'center', color: colors.red, fontSize: 14 },
});

