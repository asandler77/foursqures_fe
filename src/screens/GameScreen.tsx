import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Animated, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createInitialState, getValidDestinationsForSelected, reducer } from '../game/engine';
import type { GameAction, GameState } from '../game/types';
import { computeBestAction } from '../game/ai';
import { createGame, placePiece, restartGame, slideSquare } from '../api/gameApi';
import { BoardView } from '../ui/components/BoardView';
import { Header } from '../ui/components/Header';
import { appendCsvRows, getDefaultCsvFilePath } from '../utils/csvLogger';
import { colors, spacing } from '../ui/theme';

type PlayMode = 'local' | 'server' | 'ai';
const SERVER_TURN_DELAY_MS = 2000;
const SERVER_AI_SLIDE_DELAY_MS = 1000;
const LOCAL_AI_MAX_DEPTH = 4;
const AI_MODE_MAX_DEPTH_R = 7;
const AI_MODE_MAX_DEPTH_B = 7;
const AI_MODE_NOISE = 0;
const LOCAL_AI_THINK_MS = 100;
const LOCAL_AI_POST_TURN_DELAY_MS = 1500;
const AI_VS_AI_DELAY_MS = 400;
const GAME_OVER_DELAY_MS = 2000;
const AI_SERIES_GAMES = 100;
const AI_BETWEEN_GAMES_DELAY_MS = 3000;

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
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isGameOverVisible, setIsGameOverVisible] = useState(false);
  const [aiWinsR, setAiWinsR] = useState(0);
  const [aiWinsB, setAiWinsB] = useState(0);
  const [aiDraws, setAiDraws] = useState(0);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSeriesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSeriesRemainingRef = useRef(0);
  const aiCountedGameIdRef = useRef<string | null>(null);
  const gameOverPulseRef = useRef(new Animated.Value(1));
  const gameIdRef = useRef<string>(`game_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`);
  const moveIndexRef = useRef(0);
  const pendingRowsRef = useRef<Array<Array<string | number>>>([]);
  const csvFileRef = useRef<string>(getDefaultCsvFilePath());

  const activeState = mode === 'server' ? serverState : localState;
  const hasWinnerOrDraw = !!activeState?.winner || !!activeState?.drawReason;
  const isGameOver = isGameOverVisible;
  const winnerLabel = activeState?.winner === 'R' ? 'Player 1' : 'Player 2';
  const gameOverText = hasWinnerOrDraw
    ? activeState?.drawReason
      ? 'Draw'
      : activeState?.winner
        ? `Winner: ${winnerLabel}`
        : ''
    : '';
  const validDestinations = useMemo(
    () => (activeState ? getValidDestinationsForSelected(activeState) : []),
    [activeState],
  );

  const resetGameLog = () => {
    if (pendingRowsRef.current.length > 0) {
      void finalizeGameLog('Aborted');
    }
    gameIdRef.current = `game_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    moveIndexRef.current = 0;
    pendingRowsRef.current = [];
    csvFileRef.current =
      mode === 'ai'
        ? `${getDefaultCsvFilePath().replace('games.csv', '')}train10_${gameIdRef.current}.csv`
        : getDefaultCsvFilePath();
  };

  const flattenBoard = (board: GameState['board']) =>
    board.flatMap(cell =>
      cell.map(slot => (slot === 'R' ? 1 : slot === 'B' ? -1 : 0)),
    );

  const finalizeGameLog = async (result: string) => {
    const rows = pendingRowsRef.current
      .map(columns => {
        const next = columns.slice();
        if (next.length === 0) return '';
        next[next.length - 1] = result;
        return next.join(',');
      })
      .filter(row => row.length > 0);
    pendingRowsRef.current = [];
    try {
      await appendCsvRows(csvFileRef.current, rows);
    } catch (err) {
      console.warn('Failed to write CSV rows', err);
    }
    if (mode === 'ai') {
      gameIdRef.current = `game_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
      moveIndexRef.current = 0;
      csvFileRef.current = `${getDefaultCsvFilePath().replace('games.csv', '')}train10_${gameIdRef.current}.csv`;
    }
  };

  const logLocalMove = (prevState: GameState, action: GameAction, nextState: GameState) => {
    if (action.type !== 'pressSlot') return;
    const actionType = prevState.phase === 'placement' ? 'place' : 'slide';
    const actionA = action.squareIndex;
    const actionB = actionType === 'place' ? action.slotIndex : -1;
    const currentPlayerIsB = prevState.currentPlayer === 'B' ? 1 : 0;
    const phasePlacement = prevState.phase === 'placement' ? 1 : 0;
    const phasePlacementSlide = prevState.phase === 'placementSlide' ? 1 : 0;
    const phaseMovement = prevState.phase === 'movement' ? 1 : 0;
    const blockedSlideSquareIndex =
      typeof prevState.blockedSlideSquareIndex === 'number' ? prevState.blockedSlideSquareIndex : -1;
    const actionId = actionType === 'place' ? actionA * 4 + actionB : 36 + actionA;
    const columns = [
      gameIdRef.current,
      moveIndexRef.current,
      currentPlayerIsB,
      phasePlacement,
      phasePlacementSlide,
      phaseMovement,
      prevState.holeSquareIndex,
      blockedSlideSquareIndex,
      ...flattenBoard(prevState.board),
      actionId,
      '',
    ];
    pendingRowsRef.current.push(columns);
    moveIndexRef.current += 1;

    if (nextState.winner || nextState.drawReason) {
      const result = nextState.winner ? nextState.winner : 'Draw';
      void finalizeGameLog(result);
    }
  };

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
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiSeriesTimeoutRef.current) {
        clearTimeout(aiSeriesTimeoutRef.current);
        aiSeriesTimeoutRef.current = null;
      }
      if (gameOverDelayRef.current) {
        clearTimeout(gameOverDelayRef.current);
        gameOverDelayRef.current = null;
      }
      gameOverPulseRef.current.stopAnimation();
    };
  }, []);

  useEffect(() => {
    if (!hasWinnerOrDraw) {
      if (gameOverDelayRef.current) {
        clearTimeout(gameOverDelayRef.current);
        gameOverDelayRef.current = null;
      }
      setIsGameOverVisible(false);
      return;
    }
    if (isGameOverVisible || gameOverDelayRef.current) return;
    gameOverDelayRef.current = setTimeout(() => {
      setIsGameOverVisible(true);
      gameOverDelayRef.current = null;
    }, GAME_OVER_DELAY_MS);
  }, [hasWinnerOrDraw, isGameOverVisible]);

  useEffect(() => {
    if (!isGameOver) {
      gameOverPulseRef.current.setValue(1);
      gameOverPulseRef.current.stopAnimation();
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(gameOverPulseRef.current, {
          toValue: 1.06,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(gameOverPulseRef.current, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [isGameOver]);

  useEffect(() => {
    if (mode !== 'local') return;
    if (localState.currentPlayer !== 'B') return;
    if (localState.winner || localState.drawReason) return;
    if (isAiThinking) return;

    setIsAiThinking(true);
    const startedAt = Date.now();
    const action = computeBestAction(localState, 'B', {
      maxDepth: LOCAL_AI_MAX_DEPTH,
      timeLimitMs: LOCAL_AI_THINK_MS,
    });
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, LOCAL_AI_THINK_MS - elapsed);
    const delay = Math.max(remaining, LOCAL_AI_POST_TURN_DELAY_MS);

    aiTimeoutRef.current = setTimeout(() => {
      if (action) {
        const next = reducer(localState, action);
        if (next !== localState) {
          logLocalMove(localState, action, next);
          dispatch(action);
        }
      }
      setIsAiThinking(false);
      aiTimeoutRef.current = null;
    }, delay);
  }, [mode, localState, isAiThinking]);

  useEffect(() => {
    if (mode === 'ai') {
      aiSeriesRemainingRef.current = AI_SERIES_GAMES;
      aiCountedGameIdRef.current = null;
      setAiWinsR(0);
      setAiWinsB(0);
      setAiDraws(0);
      if (aiSeriesTimeoutRef.current) {
        clearTimeout(aiSeriesTimeoutRef.current);
        aiSeriesTimeoutRef.current = null;
      }
      setLocalError(null);
      resetGameLog();
      dispatch({ type: 'restart' });
    } else {
      aiSeriesRemainingRef.current = 0;
      if (aiSeriesTimeoutRef.current) {
        clearTimeout(aiSeriesTimeoutRef.current);
        aiSeriesTimeoutRef.current = null;
      }
      csvFileRef.current = getDefaultCsvFilePath();
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'ai') return;
    if (!localState.winner && !localState.drawReason) return;
    if (aiSeriesTimeoutRef.current) return;

    const remaining = aiSeriesRemainingRef.current;
    if (remaining <= 0) return;
    aiSeriesRemainingRef.current = remaining - 1;

    if (remaining <= 1) return;
    aiSeriesTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'restart' });
      aiSeriesTimeoutRef.current = null;
    }, AI_BETWEEN_GAMES_DELAY_MS);
  }, [mode, localState]);

  useEffect(() => {
    if (mode !== 'ai') return;
    if (!localState.winner && !localState.drawReason) return;
    const currentGameId = gameIdRef.current;
    if (aiCountedGameIdRef.current === currentGameId) return;
    aiCountedGameIdRef.current = currentGameId;
    if (localState.winner === 'R') {
      setAiWinsR(prev => prev + 1);
      return;
    }
    if (localState.winner === 'B') {
      setAiWinsB(prev => prev + 1);
      return;
    }
    setAiDraws(prev => prev + 1);
  }, [mode, localState]);

  useEffect(() => {
    if (mode !== 'ai') return;
    if (localState.winner || localState.drawReason) return;
    if (isAiThinking) return;

    setIsAiThinking(true);
    const startedAt = Date.now();
    const maxDepth =
      localState.currentPlayer === 'R' ? AI_MODE_MAX_DEPTH_R : AI_MODE_MAX_DEPTH_B;
    const action = computeBestAction(localState, localState.currentPlayer, {
      maxDepth,
      timeLimitMs: LOCAL_AI_THINK_MS,
      noiseAmplitude: AI_MODE_NOISE,
    });
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, LOCAL_AI_THINK_MS - elapsed);
    const delay = Math.max(remaining, AI_VS_AI_DELAY_MS);

    aiTimeoutRef.current = setTimeout(() => {
      if (action) {
        const next = reducer(localState, action);
        if (next !== localState) {
          logLocalMove(localState, action, next);
          dispatch(action);
        }
      }
      setIsAiThinking(false);
      aiTimeoutRef.current = null;
    }, delay);
  }, [mode, localState, isAiThinking]);

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
    if (mode === 'local' || mode === 'ai') {
      setLocalError(null);
      if (mode === 'ai') {
        aiSeriesRemainingRef.current = AI_SERIES_GAMES;
        if (aiSeriesTimeoutRef.current) {
          clearTimeout(aiSeriesTimeoutRef.current);
          aiSeriesTimeoutRef.current = null;
        }
      }
      resetGameLog();
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
    if (activeState?.winner || activeState?.drawReason) return;
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
      if (localState.currentPlayer === 'B') return;
      if (isRepeatMove) {
        setLocalError('You cannot move the same square twice in a row.');
        return;
      }
      if (!isLegalSlide) {
        setLocalError('This square cannot be moved now.');
        return;
      }
      setLocalError(null);
      const action: GameAction = { type: 'pressSlot', squareIndex, slotIndex };
      const next = reducer(localState, action);
      if (next !== localState) {
        logLocalMove(localState, action, next);
        dispatch(action);
      }
      return;
    }
    if (mode === 'ai') return;
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
        <View style={styles.statusArea}>
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
              <Text
                style={[styles.modeButtonText, mode === 'server' && styles.modeButtonTextActive]}>
                Server
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode('ai')}
              style={({ pressed }) => [
                styles.modeButton,
                mode === 'ai' && styles.modeButtonActive,
                pressed && styles.modeButtonPressed,
              ]}>
              <Text style={[styles.modeButtonText, mode === 'ai' && styles.modeButtonTextActive]}>
                AI
              </Text>
            </Pressable>
          </View>
          {mode === 'ai' ? (
            <Text style={styles.aiScoreLabel}>
              AI wins —{' '}
              <Text style={styles.aiScoreRed}>Red: {aiWinsR}</Text>{' '}
              <Text style={styles.aiScoreBlue}>Blue: {aiWinsB}</Text>{' '}
              <Text style={styles.aiScoreDraw}>Draw: {aiDraws}</Text>
            </Text>
          ) : null}
          <Animated.Text
            style={[
              styles.gameOverText,
              { transform: [{ scale: gameOverPulseRef.current }], opacity: isGameOver ? 1 : 0 },
              activeState?.winner
                ? activeState.winner === 'R'
                  ? styles.gameOverTextRed
                  : styles.gameOverTextBlue
                : null,
            ]}>
            {gameOverText || ' '}
          </Animated.Text>
        </View>
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
                (activeState.phase === 'placementSlide' || activeState.phase === 'movement') &&
                !activeState.winner &&
                !activeState.drawReason
              }
            />
          ) : (
            <Text style={styles.loadingText}>
              {serverError ? serverError : 'Connecting to server...'}
            </Text>
          )}
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
  statusArea: { gap: 6, alignItems: 'center', minHeight: 54 },
  modeRow: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' },
  modeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.tabBorder,
    backgroundColor: colors.tabBg,
  },
  modeButtonActive: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  modeButtonPressed: { opacity: 0.85 },
  modeButtonText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  modeButtonTextActive: { color: 'white' },
  errorText: { textAlign: 'center', color: colors.red, fontSize: 14 },
  gameOverText: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  gameOverTextRed: { color: colors.red },
  gameOverTextBlue: { color: colors.blue },
  aiScoreLabel: {
    marginTop: 6,
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
  },
  aiScoreRed: { color: colors.red },
  aiScoreBlue: { color: colors.blue },
  aiScoreDraw: { color: colors.text },
});

