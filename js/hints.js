/**
 * Ocean MD — Phase 4 : Système d'indices, économie de points & autonomie d'apprentissage
 */

export const EXTRA_HINT_COST = 20;
export const LOCK_MSG_INSUFFICIENT = "Accumulez d'abord des points";
export const LOCK_MSG_ANSWERED = 'Verrouillé après réponse';
export const LOCK_MSG_UNLOCKED = 'Déjà débloqué (gratuit)';
export const LOCK_MSG_AVAILABLE = `Disponible (-${EXTRA_HINT_COST} pts)`;

export function getHintViewModel(snap) {
  const stage = snap?.currentStage;
  if (!stage) {
    return {
      freeDisabled: true,
      extraDisabled: true,
      extraLockMessage: LOCK_MSG_INSUFFICIENT,
      boxOpen: false,
      boxTitle: 'CARNET DE SAVOIR',
      lines: [],
      activeKind: null,
      freeExpanded: false,
      extraExpanded: false,
    };
  }

  const st = snap.stages?.[stage.id] || {};
  const att = snap.currentAttempt || {};
  const answered = Boolean(att.answered);

  let extraDisabled = false;
  let extraLockMessage = LOCK_MSG_AVAILABLE;

  if (answered) {
    extraDisabled = true;
    extraLockMessage = LOCK_MSG_ANSWERED;
  } else if (st.extraHintPaid) {
    extraDisabled = false;
    extraLockMessage = LOCK_MSG_UNLOCKED;
  } else if ((snap.score ?? 0) < EXTRA_HINT_COST) {
    extraDisabled = true;
    extraLockMessage = LOCK_MSG_INSUFFICIENT;
  }

  let activeKind = att.activeHintKind || null;
  if (!activeKind) {
    if (att.extraHintOpen) activeKind = 'extra';
    else if (att.freeHintOpen) activeKind = 'free';
  }

  let lines = [];
  let boxTitle = 'CARNET DE SAVOIR';
  if (activeKind === 'extra') {
    lines = stage.extraHint?.lines || [];
    boxTitle = 'CARNET DE SAVOIR — INDICE +';
  } else if (activeKind === 'free') {
    lines = stage.freeHint?.lines || [];
    boxTitle = 'CARNET DE SAVOIR — CONCEPT';
  }

  const boxOpen = activeKind !== null && lines.length > 0;

  return {
    freeDisabled: answered,
    extraDisabled,
    extraLockMessage,
    boxOpen,
    boxTitle,
    lines,
    activeKind,
    freeExpanded: boxOpen && activeKind === 'free',
    extraExpanded: boxOpen && activeKind === 'extra',
  };
}

export function formatAutonomyIndicator(autonomy, totalStages = 5) {
  const free = Math.max(0, Number(autonomy?.freeHintsUsed) || 0);
  const extra = Math.max(0, Number(autonomy?.extraHintsUsed) || 0);
  const total = Math.max(0, Number(autonomy?.totalHintsUsed) || (free + extra));

  if (total === 0) {
    return `Autonomie : 0/${totalStages} indice utilisé (sans aucune aide)`;
  }
  return `Autonomie — Indices utilisés : gratuit ${free} / supplémentaire ${extra} (total ${total})`;
}

export function createHintController({ store, hooks = {} } = {}) {
  function requestFreeHint(stageId) {
    const snap = store.getSnapshot();
    const targetId = stageId || snap.currentStage?.id;
    if (!targetId) return { ok: false, reason: 'no_stage' };

    if (snap.currentAttempt?.answered) {
      hooks.onHintBlocked?.('answered', targetId);
      return { ok: false, reason: 'answered' };
    }

    const ok = store.markFreeHintUsed(targetId);
    if (!ok) {
      hooks.onHintBlocked?.('answered', targetId);
      return { ok: false, reason: 'answered' };
    }

    hooks.onNotebookFlip?.(targetId);
    hooks.onHintFree?.(targetId);
    return { ok: true, kind: 'free', stageId: targetId };
  }

  function requestExtraHint(stageId) {
    const snap = store.getSnapshot();
    const targetId = stageId || snap.currentStage?.id;
    if (!targetId) return { ok: false, reason: 'no_stage' };

    const res = store.purchaseExtraHint(targetId);
    if (!res.ok) {
      hooks.onHintBlocked?.(res.reason, targetId);
      return res;
    }

    hooks.onNotebookFlip?.(targetId);
    hooks.onHintExtra?.(targetId, res);
    return { ...res, kind: 'extra', stageId: targetId };
  }

  return {
    requestFreeHint,
    requestExtraHint,
    getViewModel: () => getHintViewModel(store.getSnapshot()),
    getAutonomyText: (totalStages = 5) => formatAutonomyIndicator(store.getAutonomyStats(), totalStages),
  };
}
