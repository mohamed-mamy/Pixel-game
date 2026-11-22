/**
 * Ocean MD — Phase 6 : Écran de fin, engagement, partage progressif & rejeu
 */

import { formatAutonomyIndicator } from './hints.js';

export function buildShareText(summary, autonomyText = '') {
  const badge = summary?.badge || { emoji: '🐚', title: 'Médecin débutant' };
  const score = summary?.score ?? 0;
  const maxScore = summary?.maxScore ?? 50;
  const balance = summary?.balance ?? 50;
  const pledgeLabel = summary?.pledge === 'yes' ? 'Engagé pour l’océan' : 'Réflexion en cours';
  const autonomyPart = autonomyText ? ` | ${autonomyText}` : '';
  return `Ocean MD — ${badge.emoji} ${badge.title} | Score : ${score}/${maxScore} | Équilibre : ${balance}% | ${pledgeLabel}${autonomyPart}`;
}

export async function shareResult(
  summary,
  {
    autonomyText = '',
    nav = typeof globalThis.navigator !== 'undefined' ? globalThis.navigator : null,
    doc = typeof globalThis.document !== 'undefined' ? globalThis.document : null,
  } = {}
) {
  const text = buildShareText(summary, autonomyText);
  const showToast = (msg) => {
    const toast = doc?.getElementById?.('share-feedback-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
  };

  // Niveau 1 : Web Share API (mobile / navigateurs compatibles)
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title: 'Ocean MD — Médecin de l’Océan', text });
      return { method: 'web-share', ok: true, cancelled: false, text };
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { method: 'web-share', ok: false, cancelled: true, text };
      }
      // Autre erreur (ex. contexte non sécurisé) : bascule sur Clipboard
    }
  }

  // Niveau 2 : Presse-papiers API
  if (nav?.clipboard && typeof nav.clipboard.writeText === 'function') {
    try {
      await nav.clipboard.writeText(text);
      showToast('Résultat copié !');
      return { method: 'clipboard', ok: true, cancelled: false, text };
    } catch {
      // Bascule sur champ texte sélectionnable
    }
  }

  // Niveau 3 : Champ texte readonly sélectionné manuellement
  const fallbackBox = doc?.getElementById?.('ending-share-fallback');
  const input = doc?.getElementById?.('share-fallback-input');
  if (fallbackBox && input) {
    fallbackBox.hidden = false;
    input.value = text;
    input.focus?.({ preventScroll: true });
    input.select?.();
  }
  showToast('Copiez votre résultat ci-dessus');
  return { method: 'fallback', ok: true, cancelled: false, text };
}

export function createEndingController({
  store,
  gameData,
  hooks = {},
  nav = typeof globalThis.navigator !== 'undefined' ? globalThis.navigator : null,
  doc = typeof globalThis.document !== 'undefined' ? globalThis.document : null,
} = {}) {
  function resetShareUi() {
    const fallbackBox = doc?.getElementById?.('ending-share-fallback');
    const input = doc?.getElementById?.('share-fallback-input');
    const toast = doc?.getElementById?.('share-feedback-toast');
    if (fallbackBox) fallbackBox.hidden = true;
    if (input) input.value = '';
    if (toast) toast.hidden = true;
  }

  function handlePledge(pledge) {
    if (pledge !== 'yes' && pledge !== 'later') return false;
    const ok = store.submitPledge(pledge);
    if (ok) hooks.onPledge?.(pledge);
    return ok;
  }

  async function handleShare() {
    const totalStages = gameData?.stages?.length || 5;
    const summary = typeof store.getFinalSummary === 'function'
      ? store.getFinalSummary()
      : (() => {
          const snap = store.getSnapshot();
          return {
            score: snap.score,
            maxScore: totalStages * 10,
            balance: snap.balance,
            badge: snap.badge,
            autonomy: snap.autonomy,
            pledge: snap.ending?.pledge || null,
          };
        })();

    const autonomyText = formatAutonomyIndicator(summary.autonomy, summary.totalStages || totalStages);
    const text = buildShareText(summary, autonomyText);
    hooks.onShare?.(summary, text);
    return shareResult(summary, { autonomyText, nav, doc });
  }

  function handlePlayAgain() {
    resetShareUi();
    store.resetRun();
  }

  return {
    resetShareUi,
    handlePledge,
    handleShare,
    handlePlayAgain,
  };
}
