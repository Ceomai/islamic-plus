import { useEffect, useRef, useState } from 'react';
import { useActivity } from '../context/AppContext';
import { TESBIHAT_COUNT, TESBIHAT_SEQUENCE } from '../data/dhikr';
import { trackFeatureAction } from '../services/cloudAnalytics';
import { tasbihHaptic, type TasbihHaptic } from '../services/tasbihFeedback';
import { incrementTasbih, loadTasbihData, resetTasbihSession, setTasbihGoal, summarizeTasbih } from '../services/tasbihStorage';

export type TasbihMode = 'tesbihat' | 33 | 99 | 100;

interface Options {
  /** The tap that reaches the daily goal (called with today's count) */
  onGoalReached: (today: number) => void;
  /** A round (or one phrase of the tesbihat) was completed by this tap */
  onRoundComplete: () => void;
}

/**
 * Tasbih counter state and storage: the count, today's total, the tesbihat step and the daily goal.
 * Taps update the screen at once and are stored behind it.
 */
export function useTasbihCounter({ onGoalReached, onRoundComplete }: Options) {
  const { trackActivity } = useActivity();
  const [mode, setMode] = useState<TasbihMode>('tesbihat');
  const [dhikrId, setDhikrId] = useState('subhanallah');
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const [today, setToday] = useState(0);
  const [goal, setGoal] = useState(0);

  const tesbihat = mode === 'tesbihat';
  const target = tesbihat ? TESBIHAT_COUNT : mode;
  const currentId = tesbihat ? TESBIHAT_SEQUENCE[step] : dhikrId;

  // What the counter shows right now. Taps read and change these synchronously, so the number,
  // progress and haptic follow every tap at once and quick taps never act on a stale value
  const live = useRef({ count: 0, today: 0, step: 0 });
  const touched = useRef(false);
  const pending = useRef(0);
  // Bumped by a reset: storage answers for taps before it must not move the counter any more
  const epoch = useRef(0);

  useEffect(() => {
    void loadTasbihData().then((d) => {
      setGoal(d.dailyGoal ?? 0);
      if (touched.current) return; // the answers to those taps bring the stored numbers
      live.current.count = d.count;
      live.current.today = summarizeTasbih(d, 1).today;
      setCount(live.current.count);
      setToday(live.current.today);
    });
  }, []);

  /** Counts one tap; returns the haptic that belongs to it (exactly one per tap) */
  const increment = (): TasbihHaptic => {
    setJustFinished(false);
    touched.current = true;
    const state = live.current;
    const tapDhikrId = tesbihat ? TESBIHAT_SEQUENCE[state.step] : dhikrId;

    state.today += 1;
    setToday(state.today);
    const goalReached = goal > 0 && state.today === goal;
    if (goalReached) {
      void trackFeatureAction('tasbih', 'goal_reached', { goal });
      onGoalReached(state.today);
    }

    // Storage counts the tap and completes the round in one step; the screen doesn't wait for it
    const tapEpoch = epoch.current;
    pending.current += 1;
    void incrementTasbih(target, tapDhikrId)
      .then((result) => {
        // Once every tap is stored, show the stored numbers (they differ only if a tap came before loading)
        if (--pending.current > 0 || tapEpoch !== epoch.current) return;
        state.count = result.count;
        state.today = summarizeTasbih(result.data, 1).today;
        setCount(state.count);
        setToday(state.today);
      })
      .catch(() => {
        pending.current -= 1;
      });
    void trackActivity('tasbih', false);

    const roundComplete = state.count + 1 >= target;
    let setComplete = false;
    if (!roundComplete) {
      state.count += 1;
      setCount(state.count);
    } else {
      // Round complete: move on to the next phrase (tesbihat) or the next round
      void trackFeatureAction('tasbih', 'round_completed', { target, dhikr: tapDhikrId });
      state.count = 0;
      setCount(0);
      if (tesbihat) {
        state.step = (state.step + 1) % TESBIHAT_SEQUENCE.length;
        setStep(state.step);
      }
      setComplete = !tesbihat || state.step === 0;
      if (setComplete) {
        setRounds((r) => r + 1);
        setJustFinished(true);
      }
      onRoundComplete();
    }
    return tasbihHaptic({ tesbihat, roundComplete, setComplete, goalReached });
  };

  /** A started count (or tesbihat already past its first phrase) would be lost by a reset */
  const hasProgress = () => live.current.count !== 0 || live.current.step !== 0;

  const clearSession = async () => {
    epoch.current += 1;
    live.current.count = 0;
    live.current.step = 0;
    setCount(0);
    setStep(0);
    setRounds(0);
    setJustFinished(false);
    await resetTasbihSession(target, currentId);
  };

  const changeGoal = (next: number) => {
    setGoal(next);
    void setTasbihGoal(next);
  };

  return {
    mode,
    setMode,
    dhikrId,
    setDhikrId,
    step,
    count,
    rounds,
    justFinished,
    today,
    goal,
    changeGoal,
    tesbihat,
    target,
    currentId,
    increment,
    hasProgress,
    clearSession,
  };
}
