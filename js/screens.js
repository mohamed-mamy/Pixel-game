/**
 * Ocean MD — Phases 3, 4, 5 & 6 : Contrôleur DOM FSM des 6 écrans
 */

import { BODY_MAP_ANCHORS, getSprite } from './sprites.js';
import { getStageNodeState } from './state.js';
import { createHintController, formatAutonomyIndicator, getHintViewModel } from './hints.js';
import { createEndingController } from './share.js';

const TRANSITION_LOCK_MS = 80;

function setSpriteMarkup(el, key, opts = {}) {
  if (el) el.innerHTML = getSprite(key, opts);
}

function renderLines(container, lines) {
  if (!container) return;
  container.textContent = '';
  const list = Array.isArray(lines) ? lines : [];
  for (const line of list) {
    const p = document.createElement('p');
    p.className = 'story-line';
    p.textContent = String(line);
    container.appendChild(p);
  }
}

function triggerPixelAnim(el, className) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

export function createScreenController({ gameData, store, hooks, hintController, endingController }) {
  const hints = hintController || createHintController({ store, hooks });
  const ending = endingController || createEndingController({ store, gameData, hooks });
  const byId = (id) => document.getElementById(id);
  let isTransitioning = false;
  let lastScreen = null;
  let lastMuteSpriteKey = null;
  let lastHintAnimKey = null;
  let lastStageAnimKey = null;
  let lastSummaryVisible = false;

  const els = {
    app: byId('app'),
    hudScore: byId('hud-score'),
    hudHeartIcon: byId('hud-heart-icon'),
    hudBalance: byId('hud-balance'),
    btnMute: byId('btn-mute'),
    muteIcon: byId('mute-icon'),
    muteLabel: byId('mute-label'),
    screens: Array.from(document.querySelectorAll('section[data-screen]')),
    btnStart: byId('btn-start'),
    btnResume: byId('btn-resume'),
    btnNewGame: byId('btn-new-game'),
    introNotebookCard: document.querySelector('#screen-intro .notebook-card'),
    introLines: byId('intro-lines'),
    btnOpenNotebook: byId('btn-open-notebook'),
    hubStatus: byId('hub-status'),
    hubBodySilhouette: byId('hub-body-silhouette'),
    organNodes: Array.from(document.querySelectorAll('#hub-organ-nodes .organ-node')),
    btnNextStage: byId('btn-next-stage'),
    stageOrganIcon: byId('stage-organ-icon'),
    stageProgress: byId('stage-progress'),
    stageOrganName: byId('stage-organ-name'),
    stageOrganEq: byId('stage-organ-eq'),
    stageDelayedBanner: byId('stage-delayed-banner'),
    stageDelayedText: byId('stage-delayed-text'),
    stageSymptom: byId('stage-symptom'),
    btnFreeHint: byId('btn-free-hint'),
    btnExtraHint: byId('btn-extra-hint'),
    extraHintLockMsg: byId('extra-hint-lock-msg'),
    stageHintBox: byId('stage-hint-box'),
    stageHintTitle: byId('stage-hint-box')?.querySelector('.notebook-title'),
    stageHintLines: byId('stage-hint-lines'),
    choiceBtnA: byId('choice-btn-a'),
    choiceTextA: byId('choice-text-a'),
    choiceBtnB: byId('choice-btn-b'),
    choiceTextB: byId('choice-text-b'),
    resultStatusBadge: byId('result-status-badge'),
    resultHeading: byId('result-heading'),
    resultFeedback: byId('result-feedback'),
    resultScoreDelta: byId('result-score-delta'),
    resultBalanceDelta: byId('result-balance-delta'),
    resultNotebookLine: byId('result-notebook-line'),
    btnResultNext: byId('btn-result-next'),
    endingOceanBackdrop: byId('ending-ocean-backdrop'),
    endingHeading: byId('ending-heading'),
    endingRevealLines: byId('ending-reveal-lines'),
    endingPledgeBlock: byId('ending-pledge-block'),
    endingPledgeQuestion: byId('ending-pledge-question'),
    endingSummary: byId('ending-summary'),
    endingBadgeIcon: byId('ending-badge-icon'),
    endingBadgeTitle: byId('ending-badge-title'),
    endingFinalScore: byId('ending-final-score'),
    endingFinalBalance: byId('ending-final-balance'),
    endingAutonomy: byId('ending-autonomy'),
    btnShareResult: byId('btn-share-result'),
    btnPlayAgain: byId('btn-play-again'),
    hudMirrorsScore: Array.from(document.querySelectorAll('[data-hud-mirror="score"]')),
    hudMirrorsBalance: Array.from(document.querySelectorAll('[data-hud-mirror="balance"]')),
  };

  function runGuarded(action) {
    if (isTransitioning) return;
    isTransitioning = true;
    try {
      action();
    } finally {
      setTimeout(() => {
        isTransitioning = false;
      }, TRANSITION_LOCK_MS);
    }
  }

  function hydrateStaticSprites() {
    const staticNodes = document.querySelectorAll('[data-sprite]');
    staticNodes.forEach((node) => {
      const key = node.dataset.sprite;
      if (!key) return;
      if (key === 'human-body-map') {
        setSpriteMarkup(node, key, { className: 'body-map__svg' });
      } else {
        setSpriteMarkup(node, key);
      }
    });

    els.organNodes.forEach((btn) => {
      const anchor = BODY_MAP_ANCHORS[btn.dataset.stageId];
      if (!anchor) return;
      btn.style.setProperty('--node-x', `${anchor.x}%`);
      btn.style.setProperty('--node-y', `${anchor.y}%`);
    });
  }

  function focusScreenTarget(snap) {
    let target = null;
    if (snap.screen === 'title') {
      target = snap.hasProgress ? els.btnResume : els.btnStart;
    } else if (snap.screen === 'intro') {
      target = els.btnOpenNotebook;
    } else if (snap.screen === 'hub') {
      target = els.btnNextStage;
    } else if (snap.screen === 'stage') {
      target = els.stageOrganName;
    } else if (snap.screen === 'result') {
      target = els.btnResultNext;
    } else if (snap.screen === 'ending') {
      target = snap.ending?.pledge ? els.btnPlayAgain : els.endingHeading;
    }

    if (!target) return;
    if (!target.matches('button, [href], input, select, textarea') && !target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
    });
  }

  function renderHud(snap) {
    const scoreText = `${snap.score}/50`;
    const balanceText = `${snap.balance}%`;

    if (els.hudScore) els.hudScore.textContent = scoreText;
    if (els.hudBalance) {
      els.hudBalance.textContent = balanceText;
      els.hudBalance.dataset.balanceState = snap.balance < 40 ? 'low' : 'ok';
    }
    els.hudMirrorsScore.forEach((el) => { el.textContent = scoreText; });
    els.hudMirrorsBalance.forEach((el) => { el.textContent = balanceText; });

    if (els.btnMute) {
      els.btnMute.setAttribute('aria-pressed', String(snap.muted));
      els.btnMute.setAttribute('aria-label', snap.muted ? 'Activer le son' : 'Couper le son');
    }
    const muteKey = snap.muted ? 'sound-off' : 'sound-on';
    if (muteKey !== lastMuteSpriteKey) {
      lastMuteSpriteKey = muteKey;
      setSpriteMarkup(els.muteIcon, muteKey);
    }
    if (els.muteLabel) {
      els.muteLabel.textContent = snap.muted ? 'MUET' : 'SON';
    }
  }

  function renderTitle(snap) {
    if (els.btnStart) els.btnStart.hidden = snap.hasProgress;
    if (els.btnResume) els.btnResume.hidden = !snap.hasProgress;
    if (els.btnNewGame) els.btnNewGame.hidden = !snap.hasProgress;
  }

  function renderIntro(screenChanged) {
    renderLines(els.introLines, gameData.story.introLines);
    if (screenChanged) {
      triggerPixelAnim(els.introNotebookCard, 'anim-page-flip');
    }
  }

  function renderHub(snap) {
    const current = snap.currentStage;
    if (els.hubStatus && current) {
      els.hubStatus.textContent = `Organe ${current.order}/5 : ${current.organNameAr} prêt.`;
    }
    els.organNodes.forEach((btn, idx) => {
      const nodeState = getStageNodeState(snap, gameData.stages, idx);
      btn.dataset.state = nodeState;
      btn.disabled = nodeState === 'locked';
    });
    if (els.btnNextStage && current) {
      els.btnNextStage.textContent = `Diagnostiquer : ${current.organNameAr}`;
    }
  }

  function renderStage(snap, screenChanged) {
    const stage = snap.currentStage;
    const att = snap.currentAttempt;
    const stageKey = `${stage.id}:${att.answered}`;

    setSpriteMarkup(els.stageOrganIcon, stage.iconKey, { size: 64, label: stage.organNameAr });
    if (els.stageProgress) els.stageProgress.textContent = `ORGANE ${stage.order} / 5`;
    if (els.stageOrganName) els.stageOrganName.textContent = stage.organNameAr;
    if (els.stageOrganEq) els.stageOrganEq.textContent = stage.organEquivalent;

    if (els.stageDelayedBanner) {
      els.stageDelayedBanner.hidden = !snap.delayedActive;
      if (snap.delayedActive && (screenChanged || stageKey !== lastStageAnimKey)) {
        triggerPixelAnim(els.stageDelayedBanner, 'anim-shake');
      }
    }
    if (els.stageDelayedText) {
      els.stageDelayedText.textContent = snap.delayedActive ? stage.delayedSymptom.warningText : '';
    }
    lastStageAnimKey = stageKey;

    renderLines(els.stageSymptom, stage.symptomLines);

    const orderIds = snap.choiceOrder[stage.id] || stage.choices.map((c) => c.id);
    const choiceA = stage.choices.find((c) => c.id === orderIds[0]) || stage.choices[0];
    const choiceB = stage.choices.find((c) => c.id === orderIds[1]) || stage.choices[1];

    if (els.choiceBtnA && els.choiceTextA) {
      els.choiceBtnA.dataset.choiceId = choiceA.id;
      els.choiceBtnA.disabled = att.answered;
      els.choiceTextA.textContent = choiceA.text;
    }
    if (els.choiceBtnB && els.choiceTextB) {
      els.choiceBtnB.dataset.choiceId = choiceB.id;
      els.choiceBtnB.disabled = att.answered;
      els.choiceTextB.textContent = choiceB.text;
    }

    const hintVm = getHintViewModel(snap);
    if (els.btnFreeHint) {
      els.btnFreeHint.disabled = hintVm.freeDisabled;
      els.btnFreeHint.setAttribute('aria-expanded', String(hintVm.freeExpanded));
    }
    if (els.btnExtraHint && els.extraHintLockMsg) {
      els.btnExtraHint.disabled = hintVm.extraDisabled;
      els.btnExtraHint.setAttribute('aria-disabled', String(hintVm.extraDisabled));
      els.btnExtraHint.setAttribute('aria-expanded', String(hintVm.extraExpanded));
      els.extraHintLockMsg.textContent = hintVm.extraLockMessage;
    }
    if (els.stageHintBox && els.stageHintLines) {
      els.stageHintBox.hidden = !hintVm.boxOpen;
      if (els.stageHintTitle) els.stageHintTitle.textContent = hintVm.boxTitle;
      const hintAnimKey = hintVm.boxOpen ? `${stage.id}:${hintVm.activeKind}` : null;
      if (hintVm.boxOpen) {
        renderLines(els.stageHintLines, hintVm.lines);
        if (hintAnimKey !== lastHintAnimKey) {
          triggerPixelAnim(els.stageHintBox, 'anim-page-flip');
        }
      } else {
        els.stageHintLines.textContent = '';
      }
      lastHintAnimKey = hintAnimKey;
    }
  }

  function renderResult(snap, screenChanged) {
    const stage = snap.currentStage;
    const st = snap.stages[stage.id];
    const choiceId = snap.currentAttempt.selectedChoiceId || st?.latestChoiceId;
    const choice = stage.choices.find((c) => c.id === choiceId) || stage.choices[0];

    if (els.resultStatusBadge) {
      els.resultStatusBadge.dataset.outcome = choice.isCorrect ? 'success' : 'error';
      if (screenChanged) {
        triggerPixelAnim(els.resultStatusBadge, choice.isCorrect ? 'anim-flicker' : 'anim-shake');
      }
    }
    if (els.resultHeading) {
      els.resultHeading.textContent = choice.isCorrect ? 'Intervention réussie !' : 'Choix inadapté';
    }
    renderLines(els.resultFeedback, choice.feedbackLines);

    const scoreDelta = snap.currentAttempt.lastScoreDelta || 0;
    const balDelta = snap.currentAttempt.lastBalanceDelta || 0;
    if (els.resultScoreDelta) {
      els.resultScoreDelta.textContent = scoreDelta > 0 ? `+${scoreDelta} PTS` : '0 PTS';
    }
    if (els.resultBalanceDelta) {
      const sign = balDelta > 0 ? '+' : '';
      els.resultBalanceDelta.textContent = `ÉQUILIBRE ${sign}${balDelta}%`;
    }
    if (els.resultNotebookLine) {
      els.resultNotebookLine.textContent = stage.notebookLine;
    }
    if (els.btnResultNext) {
      els.btnResultNext.textContent = snap.currentStageIndex >= gameData.stages.length - 1
        ? 'Voir le diagnostic final'
        : 'Suivant';
    }
    if (screenChanged) {
      triggerPixelAnim(els.hudHeartIcon, 'anim-heartbeat-pulse');
    }
  }

  function renderEnding(snap, screenChanged) {
    renderLines(els.endingRevealLines, gameData.story.endingRevealLines);
    if (els.endingPledgeQuestion) {
      els.endingPledgeQuestion.textContent = gameData.story.pledgeQuestion;
    }

    const summary = typeof store.getFinalSummary === 'function'
      ? store.getFinalSummary()
      : snap;
    const pledge = summary.pledge ?? snap.ending?.pledge;

    if (els.endingOceanBackdrop) {
      els.endingOceanBackdrop.dataset.recovered = pledge === 'yes' ? 'true' : 'false';
    }
    if (els.endingPledgeBlock) {
      els.endingPledgeBlock.hidden = Boolean(pledge);
    }
    if (els.endingSummary) {
      els.endingSummary.hidden = !pledge;
    }

    if (pledge) {
      setSpriteMarkup(els.endingBadgeIcon, summary.badge.sprite, { size: 48, label: summary.badge.title });
      if (els.endingBadgeTitle) {
        els.endingBadgeTitle.textContent = `${summary.badge.emoji} ${summary.badge.title}`;
      }
      if (els.endingFinalScore) {
        els.endingFinalScore.textContent = `${summary.score}/${summary.maxScore || 50}`;
      }
      if (els.endingFinalBalance) {
        els.endingFinalBalance.textContent = `${summary.balance}%`;
      }
      if (els.endingAutonomy) {
        els.endingAutonomy.textContent = formatAutonomyIndicator(summary.autonomy, gameData.stages.length);
      }
      if (!lastSummaryVisible) {
        triggerPixelAnim(els.endingSummary, 'anim-page-flip');
        triggerPixelAnim(els.hudHeartIcon, 'anim-heartbeat-pulse');
      }
    } else {
      ending.resetShareUi();
      if (screenChanged) {
        triggerPixelAnim(els.hudHeartIcon, 'anim-heartbeat-pulse');
      }
    }
    lastSummaryVisible = Boolean(pledge);
  }

  function render(snap) {
    const screenChanged = snap.screen !== lastScreen;
    if (els.app) {
      els.app.dataset.currentScreen = snap.screen;
    }
    for (const section of els.screens) {
      section.hidden = section.dataset.screen !== snap.screen;
    }

    if (snap.screen !== 'stage') {
      lastHintAnimKey = null;
      lastStageAnimKey = null;
    }
    if (snap.screen !== 'ending') {
      lastSummaryVisible = false;
    }

    renderHud(snap);

    if (snap.screen === 'title') renderTitle(snap);
    else if (snap.screen === 'intro') renderIntro(screenChanged);
    else if (snap.screen === 'hub') renderHub(snap);
    else if (snap.screen === 'stage') renderStage(snap, screenChanged);
    else if (snap.screen === 'result') renderResult(snap, screenChanged);
    else if (snap.screen === 'ending') renderEnding(snap, screenChanged);

    if (screenChanged) {
      const prev = lastScreen;
      lastScreen = snap.screen;
      hooks.onScreen?.(snap.screen, prev);
      focusScreenTarget(snap);
    }
  }

  function handleActionClick(target) {
    const action = target.dataset.action;
    if (action === 'toggle-mute') {
      const muted = store.toggleMute();
      hooks.onMuteToggle?.(muted);
      return;
    }

    hooks.onClick?.(action || target.id);

    if (action === 'start') {
      runGuarded(() => store.startNewRun());
      return;
    }
    if (action === 'resume') {
      runGuarded(() => store.resumeRun());
      return;
    }
    if (action === 'new-game') {
      runGuarded(() => store.startNewRun());
      return;
    }
    if (action === 'open-notebook' || action === 'skip-intro') {
      if (action === 'open-notebook') hooks.onNotebookFlip?.('intro');
      runGuarded(() => store.goToScreen('hub'));
      return;
    }
    if (action === 'next-stage') {
      runGuarded(() => store.openStage(store.getSnapshot().currentStageIndex));
      return;
    }
    if (action === 'back-hub') {
      runGuarded(() => store.goToScreen('hub'));
      return;
    }
    if (action === 'free-hint') {
      hints.requestFreeHint(store.getSnapshot().currentStage.id);
      return;
    }
    if (action === 'extra-hint') {
      const res = hints.requestExtraHint(store.getSnapshot().currentStage.id);
      if (!res.ok) {
        triggerPixelAnim(els.btnExtraHint, 'anim-shake');
      }
      return;
    }
    if (action === 'replay-stage') {
      runGuarded(() => store.replayCurrentStage());
      return;
    }
    if (action === 'result-next') {
      runGuarded(() => store.goToNextFromResult());
      return;
    }
    if (action === 'play-again') {
      runGuarded(() => ending.handlePlayAgain());
      return;
    }
    if (action === 'share') {
      ending.handleShare();
    }
  }

  function handleDelegatedClick(event) {
    const choiceBtn = event.target.closest('.arcade-btn--choice');
    if (choiceBtn && !choiceBtn.disabled) {
      const choiceId = choiceBtn.dataset.choiceId;
      if (!choiceId) return;
      hooks.onClick?.('choice');
      runGuarded(() => {
        const res = store.submitAnswer(choiceId);
        if (res) hooks.onAnswer?.(res);
      });
      return;
    }

    const organBtn = event.target.closest('.organ-node');
    if (organBtn && !organBtn.disabled) {
      const stageId = organBtn.dataset.stageId;
      hooks.onClick?.(`organ:${stageId}`);
      runGuarded(() => store.openStage(stageId));
      return;
    }

    const pledgeBtn = event.target.closest('[data-pledge]');
    if (pledgeBtn && !pledgeBtn.disabled) {
      const pledge = pledgeBtn.dataset.pledge;
      hooks.onClick?.(`pledge:${pledge}`);
      // ending.handlePledge déclenche hooks.onPledge(pledge)
      runGuarded(() => ending.handlePledge(pledge));
      return;
    }

    const actionBtn = event.target.closest('[data-action]');
    if (actionBtn && !actionBtn.disabled) {
      handleActionClick(actionBtn);
    }
  }

  function handleShortcut(shortcut) {
    if (shortcut === 'toggle-mute') {
      els.btnMute?.click();
      return;
    }

    const snap = store.getSnapshot();
    if (snap.screen === 'stage' && !snap.currentAttempt.answered) {
      if (shortcut === 'choice-0') {
        els.choiceBtnA?.click();
        return;
      }
      if (shortcut === 'choice-1') {
        els.choiceBtnB?.click();
        return;
      }
    }

    if (shortcut === 'primary-confirm') {
      if (snap.screen === 'title') {
        const target = snap.hasProgress ? els.btnResume : els.btnStart;
        target?.click();
      } else if (snap.screen === 'intro') {
        els.btnOpenNotebook?.click();
      } else if (snap.screen === 'hub') {
        els.btnNextStage?.click();
      } else if (snap.screen === 'result') {
        els.btnResultNext?.click();
      } else if (snap.screen === 'ending' && snap.ending?.pledge) {
        els.btnPlayAgain?.click();
      }
    }
  }

  function mount() {
    hydrateStaticSprites();
    els.app?.addEventListener('click', handleDelegatedClick);
    store.subscribe(render);
    render(store.getSnapshot());
  }

  return {
    mount,
    render,
    handleShortcut,
  };
}
