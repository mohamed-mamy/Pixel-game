/**
 * Ocean MD — Phase 3 : Chargeur de données avec repli automatique file://
 */

const EXPECTED_IDS = ['lungs', 'heart', 'kidneys', 'nervous', 'immune_skin'];

export function validateGameData(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('dataLoader: objet JSON racine invalide');
  }
  if (raw.version !== 1) {
    throw new Error(`dataLoader: version attendue 1, reçue ${raw.version}`);
  }
  if (!raw.story || !Array.isArray(raw.story.introLines) || raw.story.introLines.length !== 3) {
    throw new Error('dataLoader: story.introLines (3 lignes) invalide');
  }
  if (!Array.isArray(raw.story.endingRevealLines) || raw.story.endingRevealLines.length !== 3) {
    throw new Error('dataLoader: story.endingRevealLines (3 lignes) invalide');
  }
  if (!Array.isArray(raw.stages) || raw.stages.length !== 5) {
    throw new Error('dataLoader: exactement 5 niveaux requis');
  }

  const ordered = [...raw.stages].sort((a, b) => a.order - b.order);
  const stageById = Object.create(null);

  ordered.forEach((stage, idx) => {
    if (stage.id !== EXPECTED_IDS[idx] || stage.order !== idx + 1) {
      throw new Error(`dataLoader: ordre/id invalide à l'index ${idx} (${stage.id})`);
    }
    if (!Array.isArray(stage.choices) || stage.choices.length !== 2) {
      throw new Error(`dataLoader: 2 choix requis pour ${stage.id}`);
    }
    const trueCount = stage.choices.filter((c) => c.isCorrect === true).length;
    if (trueCount !== 1) {
      throw new Error(`dataLoader: exactement 1 bonne réponse requise pour ${stage.id}`);
    }
    stageById[stage.id] = stage;
  });

  return {
    version: raw.version,
    story: raw.story,
    stages: ordered,
    stageById,
  };
}

export async function loadGameData({
  fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null,
  doc = typeof globalThis.document !== 'undefined' ? globalThis.document : null,
  url = './data/stages.json',
} = {}) {
  if (fetchFn) {
    try {
      const res = await fetchFn(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return { ...validateGameData(json), source: 'fetch' };
    } catch {
      // Bascule silencieuse sur #stages-fallback (ex. ouverture directe file://)
    }
  }

  const fallbackEl = doc?.getElementById?.('stages-fallback');
  if (!fallbackEl) {
    throw new Error('dataLoader: impossible de charger stages.json et #stages-fallback est introuvable');
  }

  const parsed = JSON.parse(fallbackEl.textContent);
  return { ...validateGameData(parsed), source: 'fallback' };
}
