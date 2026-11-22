/**
 * Ocean MD — Phases 3, 4 & 6 : Store d'état, règles métier & persistance localStorage
 */

export const STORAGE_KEY = 'ocean_md_save_v1';
export const VALID_SCREENS = Object.freeze(['title', 'intro', 'hub', 'stage', 'result', 'ending']);

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export function generateChoiceOrder(stages, rng = Math.random) {
  const order = {};
  for (const stage of stages) {
    const [c0, c1] = stage.choices;
    order[stage.id] = rng() < 0.5 ? [c0.id, c1.id] : [c1.id, c0.id];
  }
  return order;
}

export function computeScore(state, stages) {
  let score = 0;
  for (const stage of stages) {
    const s = state.stages[stage.id];
    if (!s) continue;
    if (s.bestSolved) score += 10;
    if (s.extraHintPaid) score -= 20;
  }
  return clamp(score, 0, 50);
}

export function computeBalance(state, stages) {
  let delta = 0;
  for (const stage of stages) {
    const s = state.stages[stage.id];
    if (!s || s.attempts === 0) continue;
    delta += s.bestSolved ? 10 : -10;
  }
  if (state.ending?.pledge === 'later') {
    delta -= 25;
  }
  return clamp(50 + delta, 0, 100);
}

export function computeBadge(score, balance) {
  if (score >= 46 && balance >= 80) {
    return { id: 'legendary', sprite: 'badge-legendary', emoji: '🐋', title: 'Médecin légendaire' };
  }
  if (score >= 36) {
    return { id: 'expert', sprite: 'badge-expert', emoji: '🐬', title: 'Médecin expert' };
  }
  if (score >= 21) {
    return { id: 'field', sprite: 'badge-field', emoji: '🐠', title: 'Médecin de terrain' };
  }
  return { id: 'beginner', sprite: 'badge-beginner', emoji: '🐚', title: 'Médecin débutant' };
}

export function getFinalSummary(state, stages) {
  const score = computeScore(state, stages);
  const balance = computeBalance(state, stages);
  const badge = computeBadge(score, balance);

  let freeHintsUsed = 0;
  let extraHintsUsed = 0;
  let solvedCount = 0;

  for (const stage of stages) {
    const s = state.stages?.[stage.id];
    if (!s) continue;
    if (s.bestSolved) solvedCount += 1;
    if (s.freeHintUsed) freeHintsUsed += 1;
    if (s.extraHintPaid) extraHintsUsed += 1;
  }

  return {
    score,
    maxScore: stages.length * 10,
    balance,
    badge,
    solvedCount,
    totalStages: stages.length,
    pledge: state.ending?.pledge || null,
    autonomy: {
      freeHintsUsed,
      extraHintsUsed,
      totalHintsUsed: freeHintsUsed + extraHintsUsed,
    },
  };
}

export function isDelayedSymptomActive(state, stage) {
  if (!stage?.delayedSymptom?.dependsOnStageId) return false;
  const prev = state.stages[stage.delayedSymptom.dependsOnStageId];
  return Boolean(prev && prev.attempts > 0 && !prev.bestSolved);
}

export function getStageNodeState(state, stages, index) {
  const stage = stages[index];
  if (!stage) return 'locked';
  if (index === state.currentStageIndex && state.screen !== 'ending') {
    return 'active';
  }
  const s = state.stages[stage.id];
  if (s?.bestSolved) return 'solved';
  if (s && s.attempts > 0) return 'failed';
  if (index <= state.unlockedIndex) return 'active';
  return 'locked';
}

function createEmptyStagesMap(stages) {
  const map = {};
  for (const stage of stages) {
    map[stage.id] = {
      attempts: 0,
      bestSolved: false,
      latestChoiceId: null,
      latestCorrect: false,
      freeHintUsed: false,
      extraHintPaid: false,
    };
  }
  return map;
}

function createFreshState(stages, { muted = false, rng = Math.random } = {}) {
  return {
    version: 1,
    screen: 'title',
    currentStageIndex: 0,
    unlockedIndex: 0,
    hasProgress: false,
    muted: Boolean(muted),
    choiceOrder: generateChoiceOrder(stages, rng),
    stages: createEmptyStagesMap(stages),
    currentAttempt: {
      stageId: stages[0].id,
      answered: false,
      selectedChoiceId: null,
      lastScoreDelta: 0,
      lastBalanceDelta: 0,
      freeHintOpen: false,
      extraHintOpen: false,
      activeHintKind: null,
    },
    ending: { pledge: null },
  };
}

function createSafeStorage(preferredStorage) {
  let memoryStore = null;
  const target = preferredStorage !== undefined
    ? preferredStorage
    : (typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null);

  return {
    read() {
      try {
        if (target) return target.getItem(STORAGE_KEY);
      } catch {
        // Repli mémoire si localStorage bloqué
      }
      return memoryStore;
    },
    write(value) {
      memoryStore = value;
      try {
        if (target) target.setItem(STORAGE_KEY, value);
      } catch {
        // Mode dégradé en mémoire vive uniquement
      }
    },
  };
}

function hydrateState(rawJson, stages, rng) {
  if (!rawJson) return createFreshState(stages, { rng });
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || parsed.version !== 1) return createFreshState(stages, { rng });

    const base = createFreshState(stages, { muted: Boolean(parsed.muted), rng });
    base.screen = VALID_SCREENS.includes(parsed.screen) ? parsed.screen : 'title';
    base.currentStageIndex = clamp(Number(parsed.currentStageIndex) || 0, 0, stages.length - 1);
    base.unlockedIndex = clamp(Number(parsed.unlockedIndex) || 0, 0, stages.length - 1);
    base.hasProgress = Boolean(parsed.hasProgress);

    for (const stage of stages) {
      const validIds = new Set(stage.choices.map((c) => c.id));
      const savedOrder = parsed.choiceOrder?.[stage.id];
      if (
        Array.isArray(savedOrder) &&
        savedOrder.length === 2 &&
        savedOrder[0] !== savedOrder[1] &&
        validIds.has(savedOrder[0]) &&
        validIds.has(savedOrder[1])
      ) {
        base.choiceOrder[stage.id] = [...savedOrder];
      }

      const savedStage = parsed.stages?.[stage.id];
      if (savedStage && typeof savedStage === 'object') {
        base.stages[stage.id] = {
          attempts: Math.max(0, Number(savedStage.attempts) || 0),
          bestSolved: Boolean(savedStage.bestSolved),
          latestChoiceId: validIds.has(savedStage.latestChoiceId) ? savedStage.latestChoiceId : null,
          latestCorrect: Boolean(savedStage.latestCorrect),
          freeHintUsed: Boolean(savedStage.freeHintUsed),
          extraHintPaid: Boolean(savedStage.extraHintPaid),
        };
      }
    }

    const att = parsed.currentAttempt;
    if (att && stages.some((s) => s.id === att.stageId)) {
      base.currentAttempt = {
        stageId: att.stageId,
        answered: Boolean(att.answered),
        selectedChoiceId: att.selectedChoiceId || null,
        lastScoreDelta: Number(att.lastScoreDelta) || 0,
        lastBalanceDelta: Number(att.lastBalanceDelta) || 0,
        freeHintOpen: Boolean(att.freeHintOpen),
        extraHintOpen: Boolean(att.extraHintOpen),
        activeHintKind: att.activeHintKind === 'free' || att.activeHintKind === 'extra'
          ? att.activeHintKind
          : (att.extraHintOpen ? 'extra' : (att.freeHintOpen ? 'free' : null)),
      };
    }

    const pledge = parsed.ending?.pledge;
    base.ending = { pledge: pledge === 'yes' || pledge === 'later' ? pledge : null };
    return base;
  } catch {
    return createFreshState(stages, { rng });
  }
}

export function createStore(gameData, { storage, rng = Math.random } = {}) {
  const { stages, stageById } = gameData;
  const safeStorage = createSafeStorage(storage);
  let state = hydrateState(safeStorage.read(), stages, rng);
  const listeners = new Set();

  const persist = () => safeStorage.write(JSON.stringify(state));
  const notify = () => {
    const snap = getSnapshot();
    listeners.forEach((fn) => fn(snap));
  };
  const commit = () => {
    persist();
    notify();
  };

  function getAutonomyStats() {
    let freeHintsUsed = 0;
    let extraHintsUsed = 0;
    for (const stage of stages) {
      const s = state.stages[stage.id];
      if (s?.freeHintUsed) freeHintsUsed += 1;
      if (s?.extraHintPaid) extraHintsUsed += 1;
    }
    return {
      freeHintsUsed,
      extraHintsUsed,
      totalHintsUsed: freeHintsUsed + extraHintsUsed,
    };
  }

  function getSnapshot() {
    const score = computeScore(state, stages);
    const balance = computeBalance(state, stages);
    const currentStage = stages[state.currentStageIndex] || stages[0];
    return {
      ...state,
      score,
      balance,
      badge: computeBadge(score, balance),
      autonomy: getAutonomyStats(),
      currentStage,
      delayedActive: isDelayedSymptomActive(state, currentStage),
    };
  }

  function goToScreen(screen) {
    if (!VALID_SCREENS.includes(screen)) return;
    state.screen = screen;
    if (screen !== 'title') state.hasProgress = true;
    commit();
  }

  function startNewRun() {
    if (!state.hasProgress) {
      state.screen = 'intro';
      state.hasProgress = true;
      commit();
      return;
    }
    state = createFreshState(stages, { muted: state.muted, rng });
    state.screen = 'intro';
    state.hasProgress = true;
    commit();
  }

  function resumeRun() {
    if (!state.hasProgress) {
      startNewRun();
      return;
    }
    if (state.screen === 'title') {
      state.screen = 'hub';
    }
    commit();
  }

  function openStage(stageIdOrIndex) {
    const idx = typeof stageIdOrIndex === 'number'
      ? stageIdOrIndex
      : stages.findIndex((s) => s.id === stageIdOrIndex);
    if (idx < 0 || idx > state.unlockedIndex) return false;
    const stage = stages[idx];
    const st = state.stages[stage.id];
    state.currentStageIndex = idx;
    state.screen = 'stage';
    state.hasProgress = true;
    state.currentAttempt = {
      stageId: stage.id,
      answered: false,
      selectedChoiceId: null,
      lastScoreDelta: 0,
      lastBalanceDelta: 0,
      freeHintOpen: st.freeHintUsed,
      extraHintOpen: st.extraHintPaid,
      activeHintKind: st.extraHintPaid ? 'extra' : (st.freeHintUsed ? 'free' : null),
    };
    commit();
    return true;
  }

  function submitAnswer(choiceId) {
    if (state.currentAttempt.answered) return null;
    const stage = stages[state.currentStageIndex];
    const choice = stage?.choices.find((c) => c.id === choiceId);
    if (!stage || !choice) return null;

    const prevScore = computeScore(state, stages);
    const prevBalance = computeBalance(state, stages);
    const st = state.stages[stage.id];

    st.attempts += 1;
    st.latestChoiceId = choice.id;
    st.latestCorrect = Boolean(choice.isCorrect);
    if (choice.isCorrect && !st.bestSolved) {
      st.bestSolved = true;
    }

    if (state.currentStageIndex >= state.unlockedIndex && state.unlockedIndex < stages.length - 1) {
      state.unlockedIndex = state.currentStageIndex + 1;
    }

    const nextScore = computeScore(state, stages);
    const nextBalance = computeBalance(state, stages);

    state.currentAttempt = {
      ...state.currentAttempt,
      stageId: stage.id,
      answered: true,
      selectedChoiceId: choice.id,
      lastScoreDelta: nextScore - prevScore,
      lastBalanceDelta: nextBalance - prevBalance,
    };
    state.screen = 'result';
    state.hasProgress = true;
    commit();

    return { stage, choice, scoreDelta: nextScore - prevScore, balanceDelta: nextBalance - prevBalance };
  }

  function replayCurrentStage() {
    return openStage(state.currentStageIndex);
  }

  function goToNextFromResult() {
    const nextIdx = state.currentStageIndex + 1;
    if (nextIdx >= stages.length) {
      state.screen = 'ending';
      commit();
      return 'ending';
    }
    state.currentStageIndex = nextIdx;
    state.unlockedIndex = Math.max(state.unlockedIndex, nextIdx);
    state.screen = 'hub';
    commit();
    return 'hub';
  }

  function toggleMute() {
    state.muted = !state.muted;
    commit();
    return state.muted;
  }

  function submitPledge(pledge) {
    if (pledge !== 'yes' && pledge !== 'later') return false;
    state.ending = { pledge };
    commit();
    return true;
  }

  function resetRun() {
    state = createFreshState(stages, { muted: state.muted, rng });
    commit();
  }

  function markFreeHintUsed(stageId = stages[state.currentStageIndex]?.id) {
    const st = state.stages[stageId];
    if (!st || state.currentAttempt.answered) return false;
    st.freeHintUsed = true;
    state.currentAttempt.freeHintOpen = true;
    state.currentAttempt.activeHintKind = 'free';
    commit();
    return true;
  }

  function purchaseExtraHint(stageId = stages[state.currentStageIndex]?.id) {
    const st = state.stages[stageId];
    if (!st || state.currentAttempt.answered) return { ok: false, reason: 'answered' };
    if (st.extraHintPaid) {
      state.currentAttempt.extraHintOpen = true;
      state.currentAttempt.activeHintKind = 'extra';
      commit();
      return { ok: true, alreadyPaid: true };
    }
    if (computeScore(state, stages) < 20) {
      return { ok: false, reason: 'insufficient_score' };
    }
    st.extraHintPaid = true;
    state.currentAttempt.extraHintOpen = true;
    state.currentAttempt.activeHintKind = 'extra';
    commit();
    return { ok: true, alreadyPaid: false };
  }

  return {
    getState: () => state,
    getSnapshot,
    getFinalSummary: () => getFinalSummary(state, stages),
    getStage: (id) => stageById[id],
    getAutonomyStats,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    goToScreen,
    startNewRun,
    resumeRun,
    openStage,
    submitAnswer,
    replayCurrentStage,
    goToNextFromResult,
    toggleMute,
    submitPledge,
    resetRun,
    markFreeHintUsed,
    purchaseExtraHint,
  };
}
