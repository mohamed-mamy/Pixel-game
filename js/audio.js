/**
 * Ocean MD — Phase 5 : Moteur audio 8-bit Web Audio API (zéro fichier audio externe)
 */

export const SFX_LABELS = Object.freeze({
  click: '[♪ Clic 8-bit]',
  pageFlip: '[♪ Page du carnet tournée]',
  success: '[♪ Réussite 8-bit — action bénéfique]',
  failure: '[♪ Alerte — choix inadapté]',
  blocked: '[♪ Action bloquée ou reportée]',
  oceanWave: '[♪ Vague océanique 8-bit]',
  mutedOn: '[♪ Son coupé]',
  mutedOff: '[♪ Son activé]',
});

function getDefaultAudioContextCtor() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

export function createAudioEngine({
  store = null,
  doc = typeof globalThis.document !== 'undefined' ? globalThis.document : null,
  AudioContextCtor = getDefaultAudioContextCtor(),
} = {}) {
  let ctx = null;
  let noiseBuffer = null;
  let activeNodes = new Set();

  function isMuted() {
    return Boolean(store?.getSnapshot?.().muted);
  }

  function announce(text) {
    if (!doc || !text) return;
    const el = doc.getElementById?.('sfx-announcer');
    if (!el) return;
    el.textContent = '';
    el.textContent = String(text);
  }

  function ensureContext() {
    if (ctx) return ctx;
    if (!AudioContextCtor) return null;
    try {
      ctx = new AudioContextCtor();
      return ctx;
    } catch {
      return null;
    }
  }

  function unlock() {
    const audioCtx = ensureContext();
    if (!audioCtx) return false;
    try {
      if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        Promise.resolve(audioCtx.resume()).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  function trackNode(node) {
    if (!node) return;
    activeNodes.add(node);
    const cleanup = () => activeNodes.delete(node);
    if ('onended' in node) {
      node.onended = cleanup;
    }
  }

  function stopAll() {
    for (const node of activeNodes) {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch {
        // Ignore les nœuds déjà arrêtés
      }
    }
    activeNodes.clear();
  }

  function getNoiseBuffer(audioCtx, durationSec = 1.5) {
    if (noiseBuffer && noiseBuffer.sampleRate === audioCtx.sampleRate) {
      return noiseBuffer;
    }
    const sampleRate = audioCtx.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buffer;
    return buffer;
  }

  function playTone({ type = 'square', freqStart = 440, freqEnd = null, duration = 0.08, gain = 0.08, delay = 0 } = {}) {
    if (isMuted()) return false;
    const audioCtx = ensureContext();
    if (!audioCtx) return false;
    try {
      if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        Promise.resolve(audioCtx.resume()).catch(() => {});
      }
      const now = (audioCtx.currentTime || 0) + delay;
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== null && freqEnd !== freqStart) {
        osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);
      }
      gainNode.gain.setValueAtTime(gain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      trackNode(osc);
      osc.start(now);
      osc.stop(now + duration + 0.01);
      return true;
    } catch {
      return false;
    }
  }

  function playClick() {
    return playTone({ type: 'square', freqStart: 880, freqEnd: 440, duration: 0.055, gain: 0.08 });
  }

  function playPageFlip() {
    announce(SFX_LABELS.pageFlip);
    if (isMuted()) return false;
    const audioCtx = ensureContext();
    if (!audioCtx) return false;
    try {
      if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        Promise.resolve(audioCtx.resume()).catch(() => {});
      }
      const now = audioCtx.currentTime || 0;
      const src = audioCtx.createBufferSource();
      src.buffer = getNoiseBuffer(audioCtx, 0.2);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.linearRampToValueAtTime(2600, now + 0.14);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      trackNode(src);
      src.start(now);
      src.stop(now + 0.15);

      playTone({ type: 'triangle', freqStart: 520, freqEnd: 680, duration: 0.09, gain: 0.05, delay: 0.02 });
      return true;
    } catch {
      return false;
    }
  }

  function playSuccess() {
    announce(SFX_LABELS.success);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    let ok = false;
    notes.forEach((freq, idx) => {
      const stepDelay = idx * 0.075;
      if (playTone({ type: 'square', freqStart: freq, duration: 0.09, gain: 0.07, delay: stepDelay })) {
        ok = true;
      }
      playTone({ type: 'triangle', freqStart: freq * 0.5, duration: 0.1, gain: 0.05, delay: stepDelay });
    });
    return ok;
  }

  function playFailure({ blocked = false } = {}) {
    announce(blocked ? SFX_LABELS.blocked : SFX_LABELS.failure);
    if (blocked) {
      return playTone({ type: 'sawtooth', freqStart: 180, freqEnd: 140, duration: 0.08, gain: 0.09 });
    }
    const notes = [311.13, 233.08, 185.0];
    let ok = false;
    notes.forEach((freq, idx) => {
      if (playTone({ type: 'sawtooth', freqStart: freq, duration: 0.13, gain: 0.08, delay: idx * 0.13 })) {
        ok = true;
      }
    });
    return ok;
  }

  function playOceanWave() {
    announce(SFX_LABELS.oceanWave);
    if (isMuted()) return false;
    const audioCtx = ensureContext();
    if (!audioCtx) return false;
    try {
      if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        Promise.resolve(audioCtx.resume()).catch(() => {});
      }
      const now = audioCtx.currentTime || 0;
      const src = audioCtx.createBufferSource();
      src.buffer = getNoiseBuffer(audioCtx, 1.5);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      const steppedCutoffs = [160, 260, 420, 680, 620, 440, 280, 140];
      steppedCutoffs.forEach((hz, idx) => {
        filter.frequency.setValueAtTime(hz, now + idx * 0.18);
      });

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.48);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      trackNode(src);
      src.start(now);
      src.stop(now + 1.5);

      playTone({ type: 'triangle', freqStart: 110, freqEnd: 147, duration: 0.9, gain: 0.035 });
      return true;
    } catch {
      return false;
    }
  }

  return {
    unlock,
    stopAll,
    announce,
    isMuted,
    playClick,
    playPageFlip,
    playSuccess,
    playFailure,
    playOceanWave,
  };
}
