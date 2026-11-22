/**
 * Ocean MD — Phases 3, 4, 5 & 6 : Bootstrap, audio 8-bit, clavier AZERTY/AR & hooks
 */

import { loadGameData } from './dataLoader.js';
import { createStore } from './state.js';
import { createHintController } from './hints.js';
import { createAudioEngine, SFX_LABELS } from './audio.js';
import { createEndingController } from './share.js';
import { createScreenController } from './screens.js';

export function createHooks() {
  return {
    onClick: () => {},
    onAnswer: () => {},
    onScreen: () => {},
    onNotebookFlip: () => {},
    onMuteToggle: () => {},
    onHintFree: () => {},
    onHintExtra: () => {},
    onHintBlocked: () => {},
    onPledge: () => {},
    onShare: () => {},
  };
}

export function resolveShortcutAction(event, lang = 'fr') {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return null;

  const targetTag = event.target?.tagName?.toLowerCase?.();
  if (targetTag === 'input' || targetTag === 'textarea') return null;

  const keyUpper = typeof event.key === 'string' ? event.key.toUpperCase() : '';
  const isLatinLetter = /^[A-Z]$/.test(keyUpper);

  if (lang === 'fr' && isLatinLetter) {
    if (keyUpper === 'A') return 'choice-0';
    if (keyUpper === 'B') return 'choice-1';
    if (keyUpper === 'M') return 'toggle-mute';
  } else if (lang === 'ar' || !isLatinLetter) {
    if (event.code === 'KeyA') return 'choice-0';
    if (event.code === 'KeyB') return 'choice-1';
    if (event.code === 'KeyM') return 'toggle-mute';
  }

  if (event.code === 'Enter' || event.code === 'Space' || event.key === 'Enter' || event.key === ' ') {
    return 'primary-confirm';
  }
  return null;
}

async function init() {
  const gameData = await loadGameData();
  const store = createStore(gameData);
  const hooks = createHooks();
  const audio = createAudioEngine({ store });

  hooks.onClick = () => audio.playClick();
  hooks.onAnswer = ({ choice }) => (choice.isCorrect ? audio.playSuccess() : audio.playFailure());
  hooks.onScreen = (screen, prev) => {
    if (screen === 'ending' || (screen === 'title' && prev !== null)) {
      audio.playOceanWave();
    }
  };
  hooks.onNotebookFlip = () => audio.playPageFlip();
  hooks.onHintBlocked = () => audio.playFailure({ blocked: true });
  hooks.onMuteToggle = (muted) => {
    if (muted) {
      audio.stopAll();
      audio.announce(SFX_LABELS.mutedOn);
    } else {
      audio.announce(SFX_LABELS.mutedOff);
      audio.playClick();
    }
  };
  hooks.onPledge = (pledge) => (pledge === 'yes' ? audio.playSuccess() : audio.playFailure({ blocked: true }));

  const hintController = createHintController({ store, hooks });
  const endingController = createEndingController({ store, gameData, hooks });
  const controller = createScreenController({ gameData, store, hooks, hintController, endingController });

  controller.mount();

  const unlockOnce = () => audio.unlock();
  document.addEventListener('pointerdown', unlockOnce, { once: true });
  document.addEventListener('keydown', unlockOnce, { once: true });

  document.addEventListener('keydown', (event) => {
    const lang = document.documentElement.lang || 'fr';
    const shortcut = resolveShortcutAction(event, lang);
    if (!shortcut) return;

    if (event.code === 'Space' || event.key === ' ') {
      // Évite le scroll de page et l'activation en double si un bouton a déjà le focus
      event.preventDefault();
      if (document.activeElement?.tagName === 'BUTTON' && !document.activeElement.disabled) {
        document.activeElement.click();
        return;
      }
    }

    if (shortcut === 'primary-confirm' && document.activeElement?.tagName === 'BUTTON') {
      return;
    }

    controller.handleShortcut(shortcut);
  });

  // Exposition optionnelle pour QA DevTools
  globalThis.__oceanMD = { gameData, store, controller, hintController, endingController, audio, hooks };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
