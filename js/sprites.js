/**
 * Ocean MD — Bibliothèque de sprites SVG 8-bit inline (Pixel Parfait)
 * Zéro dépendance externe, zéro image matricielle, palette système de design Ocean MD.
 */

const C_BG = 'var(--color-deep-blue, #0B1220)';
const C_SURF = 'var(--color-surface, #101B2E)';
const C_MID = 'var(--color-ocean-mid, #0E3B5C)';
const C_BRT = 'var(--color-ocean-bright, #166088)';
const C_PRI = 'var(--color-phosphor-green, #39FF14)';
const C_ACC = 'var(--color-sky-blue, #00E5FF)';
const C_AMB = 'var(--color-warning-yellow, #FFB000)';
const C_RED = 'var(--color-coral-red, #FF3B3B)';
const C_WHT = 'var(--color-off-white, #E6F1FF)';
const C_GRY = 'var(--color-disabled-gray, #3A4A5E)';
const C_PARCH = 'var(--color-parchment, #EFE4C6)';

const PALETTE = Object.freeze({
  k: C_BG,
  s: C_SURF,
  m: C_MID,
  b: C_BRT,
  g: C_PRI,
  c: C_ACC,
  a: C_AMB,
  r: C_RED,
  w: C_WHT,
  y: C_GRY,
  p: C_PARCH,
  u: 'currentColor',
});

function rect(x, y, w, h, fill, op) {
  const opAttr = op !== undefined && op < 1 ? ` fill-opacity="${op}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${opAttr}/>`;
}

function renderGrid(rows, ox = 0, oy = 0, op) {
  const spans = [];
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (!PALETTE[ch]) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) {
        end += 1;
      }
      spans.push({ x: ox + x, y: oy + y, w: end - x, h: 1, ch });
      x = end;
    }
  }

  // Fusion verticale des bandes contiguës de même largeur, abscisse et couleur
  const active = new Map();
  const rects = [];
  for (const s of spans) {
    const key = `${s.x}:${s.w}:${s.ch}`;
    const prev = active.get(key);
    if (prev && prev.y + prev.h === s.y) {
      prev.h += 1;
    } else {
      const entry = { ...s };
      active.set(key, entry);
      rects.push(entry);
    }
  }

  return rects.map((r) => rect(r.x, r.y, r.w, r.h, PALETTE[r.ch], op)).join('');
}

function dottedLine(x1, y1, x2, y2, step = 4) {
  const out = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  const count = Math.max(1, Math.round(dist / step));
  for (let i = 0; i <= count; i += 1) {
    const px = Math.round(x1 + (dx * i) / count) - 1;
    const py = Math.round(y1 + (dy * i) / count) - 1;
    const fill = i % 2 === 0 ? C_WHT : C_ACC;
    out.push(rect(px, py, 2, 2, fill));
  }
  return out.join('');
}

function buildBodyMap() {
  const layers = [
    // 1. Fond abyssal & contours bathymétriques en paliers 8-bit
    rect(0, 0, 96, 128, C_BG),
    rect(4, 4, 88, 120, C_SURF),
    rect(8, 8, 80, 112, C_MID),
    rect(18, 14, 62, 86, C_BRT),
    rect(24, 22, 50, 68, C_MID),
    rect(30, 32, 38, 48, C_BRT),

    // Grille cartographique discrète (repères 24px)
    rect(24, 4, 1, 120, C_ACC, 0.14),
    rect(48, 4, 1, 120, C_ACC, 0.14),
    rect(72, 4, 1, 120, C_ACC, 0.14),
    rect(4, 32, 88, 1, C_ACC, 0.14),
    rect(4, 64, 88, 1, C_ACC, 0.14),
    rect(4, 96, 88, 1, C_ACC, 0.14),

    // 2. Côtes d'archipel sable doré / végétation le long du bord gauche et bas
    rect(0, 16, 11, 112, C_MID),
    rect(0, 20, 8, 96, C_PARCH),
    rect(0, 24, 5, 42, C_PRI),
    rect(8, 28, 4, 24, C_PARCH),
    rect(12, 34, 2, 14, C_ACC, 0.55),
    rect(5, 34, 3, 12, C_AMB),
    rect(0, 74, 10, 32, C_PRI),
    rect(10, 80, 4, 22, C_PARCH),
    rect(14, 84, 2, 16, C_ACC, 0.55),
    rect(3, 86, 4, 8, C_AMB),
    // Rivage inférieur
    rect(0, 106, 70, 22, C_MID),
    rect(0, 110, 62, 18, C_PARCH),
    rect(4, 114, 46, 14, C_PRI),
    rect(12, 118, 22, 10, C_AMB),
    rect(44, 108, 16, 6, C_PARCH),
    rect(52, 114, 14, 10, C_PARCH),
    rect(60, 107, 10, 3, C_ACC, 0.6),
    rect(16, 104, 30, 3, C_ACC, 0.5),

    // 3. Silhouette anatomique translucide intégrée à la carte marine
    // Tête centrée en (48, 16)
    rect(39, 6, 18, 20, C_ACC, 0.16),
    rect(41, 5, 14, 1, C_ACC, 0.45),
    rect(38, 7, 1, 18, C_ACC, 0.45),
    rect(57, 7, 1, 18, C_ACC, 0.45),
    rect(41, 26, 14, 1, C_ACC, 0.45),
    // Cou & épaules
    rect(44, 27, 8, 5, C_ACC, 0.18),
    rect(26, 32, 44, 6, C_ACC, 0.18),
    rect(25, 31, 46, 1, C_ACC, 0.48),
    // Torse & flancs
    rect(28, 38, 40, 40, C_ACC, 0.16),
    rect(27, 38, 1, 40, C_ACC, 0.45),
    rect(68, 38, 1, 40, C_ACC, 0.45),
    // Bras gauche & bras droit (traverse (72, 72) pour immune_skin)
    rect(18, 34, 8, 40, C_ACC, 0.16),
    rect(17, 34, 1, 38, C_ACC, 0.42),
    rect(70, 34, 8, 42, C_ACC, 0.16),
    rect(78, 34, 1, 40, C_ACC, 0.42),
    // Jambes
    rect(32, 78, 13, 30, C_ACC, 0.16),
    rect(51, 78, 13, 30, C_ACC, 0.16),
    rect(31, 78, 1, 28, C_ACC, 0.42),
    rect(64, 78, 1, 28, C_ACC, 0.42),
    // Repères thoraciques discrets
    rect(47, 34, 2, 40, C_WHT, 0.2),
    rect(34, 38, 28, 1, C_WHT, 0.22),
    rect(33, 46, 30, 1, C_WHT, 0.22),
    rect(34, 54, 28, 1, C_WHT, 0.22),
    rect(36, 62, 24, 1, C_WHT, 0.2),

    // 4. Route d'exploration pointillée entre les 5 ancres
    dottedLine(48, 16, 36, 40, 4),
    dottedLine(36, 40, 60, 48, 4),
    dottedLine(60, 48, 36, 72, 4),
    dottedLine(36, 72, 72, 72, 4),
    // Repères d'ancrage aux 5 coordonnées exactes
    ...[
      [48, 16],
      [36, 40],
      [60, 48],
      [36, 72],
      [72, 72],
    ].map(([ax, ay]) => (
      rect(ax - 3, ay - 3, 6, 6, C_ACC, 0.35) +
      rect(ax - 1, ay - 1, 2, 2, C_WHT)
    )),

    // 5. Îlot rocheux, petit phare & rose des vents en bas à droite
    rect(66, 102, 28, 24, C_MID),
    rect(68, 104, 24, 20, C_SURF),
    // Faisceau du phare
    rect(61, 88, 6, 3, C_AMB, 0.32),
    rect(55, 87, 6, 5, C_AMB, 0.18),
    // Phare pixelisé en (68, 86)
    renderGrid([
      '..aa..',
      '.awwa.',
      '..kk..',
      '.wwww.',
      '.rrrr.',
      '.wwww.',
      '.rrrr.',
      '.wwww.',
      'pppppp',
      'mmmmmm',
    ], 68, 86),
    // Rose des vents pixelisée en (77, 109)
    renderGrid([
      '......a......',
      '......a......',
      '.....awa.....',
      '....ccwcc....',
      '...cckckcc...',
      '..cckwkwkcc..',
      'ccwwwkgkwwwcc',
      '..cckwkwkcc..',
      '...cckckcc...',
      '....ccwcc....',
      '.....cwc.....',
      '......c......',
      '......c......',
    ], 77, 109),
  ];

  return layers.join('');
}

function buildTitleOceanScene() {
  const layers = [
    // Ciel nocturne étoilé (#0B1220 -> bande d'horizon #101B2E)
    rect(0, 0, 96, 36, C_BG),
    rect(0, 31, 96, 5, C_SURF),
    // Étoiles scintillantes
    ...[
      [7, 5, C_WHT], [14, 12, C_ACC], [22, 4, C_PARCH], [31, 9, C_WHT],
      [42, 6, C_ACC], [50, 14, C_WHT], [56, 4, C_PARCH], [86, 6, C_WHT],
      [90, 18, C_ACC], [10, 24, C_WHT], [27, 20, C_ACC], [38, 25, C_WHT],
      [53, 27, C_PARCH], [84, 26, C_WHT],
    ].map(([x, y, c]) => rect(x, y, 1, 1, c)),
    // Étoiles en croix
    renderGrid([
      '.p.',
      'pwp',
      '.p.',
    ], 17, 7),
    renderGrid([
      '.c.',
      'cwc',
      '.c.',
    ], 44, 16),

    // Pleine lune lumineuse (#EFE4C6 / #FFB000 / #E6F1FF)
    rect(61, 4, 19, 19, C_AMB, 0.16),
    renderGrid([
      '....aaaaaaa....',
      '..aapppppppaa..',
      '.apwwppppppppa.',
      '.apwppppppappa.',
      'apwppppppaaappa',
      'apppppppppppppa',
      'apppaappppppppa',
      'apppaappppppppa',
      'appppppppappppa',
      'appppppppaapppa',
      'apppppppppppppa',
      '.apppppppppppa.',
      '.aapppppppppaa.',
      '..aapppppppaa..',
      '....aaaaaaa....',
    ], 63, 6),

    // Vagues océaniques en couches (#166088 -> #0E3B5C -> #101B2E -> #0B1220)
    rect(0, 36, 96, 6, C_BRT),
    rect(0, 42, 96, 10, C_MID),
    rect(0, 52, 96, 7, C_SURF),
    rect(0, 59, 96, 5, C_BG),

    // Crêtes de vagues pixelisées (#00E5FF / #E6F1FF)
    renderGrid([
      'cccc..wwcccc....ccccww..cccc....cccc..wwcccc....ccccww..cccc..wwcccc..ccccww..cccc....cccc..wwcc',
      '.bbccccbb..ccccccbb..ccccbbccccccbbccccbb..ccccccbb..ccccbb..ccccbbccccbb..ccccccccccbb..ccccbb.',
    ], 0, 36),
    renderGrid([
      '..bbbb....cccc....bbbb....cccc....bbbb....cccc....bbbb....cccc....bbbb....cccc....bbbb....cccc..',
      'cc....bbbb....cccc....bbbb....cccc....bbbb....cccc....bbbb....cccc....bbbb....cccc....bbbb....cc',
    ], 0, 42),
    renderGrid([
      '..mmmm....bbbb....mmmm....bbbb....mmmm....bbbb....mmmm....bbbb....mmmm....bbbb....mmmm....bbbb..',
      'mm....bbbb....mmmm....bbbb....mmmm....bbbb....mmmm....bbbb....mmmm....bbbb....mmmm....bbbb....mm',
    ], 0, 52),

    // Reflets scintillants de la lune sur les vagues
    rect(65, 37, 11, 1, C_WHT),
    rect(64, 39, 13, 1, C_PARCH),
    rect(66, 41, 9, 1, C_AMB),
    rect(63, 44, 14, 1, C_PARCH),
    rect(66, 47, 8, 1, C_AMB),
    rect(68, 50, 5, 1, C_PARCH),
    rect(65, 53, 10, 1, C_ACC),
    rect(68, 56, 5, 1, C_AMB),
    rect(69, 60, 3, 1, C_PARCH),

    // Petits poissons pixelisés (#39FF14 et #FFB000) + bulles
    renderGrid([
      'c.......',
      '.w.ggg.g',
      '..ggkggg',
      '...ggg.g',
    ], 16, 45),
    renderGrid([
      '....a..c',
      'a.aaakaa',
      'aaaaawaa',
      'a.aa..a.',
    ], 33, 54),
    renderGrid([
      '..c.....',
      'g.gggg.w',
      'ggkgggg.',
      'g.gggg..',
    ], 79, 47),
  ];

  return layers.join('');
}

function buildEndingReefScene() {
  const layers = [
    // Couches d'eau (#166088 -> #0E3B5C -> #101B2E -> #0B1220)
    rect(0, 0, 96, 12, C_BRT),
    rect(0, 12, 96, 14, C_MID),
    rect(0, 26, 96, 12, C_SURF),
    rect(0, 38, 96, 6, C_BG),

    // Ondulations de surface (#00E5FF / #E6F1FF)
    renderGrid([
      'wwcccc..ccccww..cccc..wwcccc..ccccww..cccc..wwcccc..ccccww..cccc..wwcccc..ccccww..cccc..wwcccc..',
      '..bbbbcccc..bbbb..ccccbb..bbbbcccc..bbbb..ccccbb..bbbbcccc..bbbb..ccccbb..bbbbcccc..bbbb..ccccbb',
    ], 0, 0),

    // Rayons de soleil diagonaux (#00E5FF / #E6F1FF)
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => (
      rect(14 + i * 2, 2 + i * 4, 6, 4, C_ACC, 0.22) +
      rect(40 + i * 2, 2 + i * 4, 8, 4, C_WHT, 0.16) +
      rect(66 + i * 2, 2 + i * 4, 5, 4, C_ACC, 0.2)
    )),

    // Fond marin sablonneux (#EFE4C6 / #FFB000 / #0E3B5C)
    rect(0, 38, 96, 6, C_PARCH),
    rect(0, 41, 96, 3, C_AMB, 0.45),
    rect(6, 36, 22, 2, C_PARCH),
    rect(36, 37, 26, 1, C_PARCH),
    rect(68, 36, 24, 2, C_PARCH),
    rect(12, 39, 10, 2, C_MID),
    rect(48, 40, 14, 2, C_MID),

    // Algues kelp ondoyantes (#39FF14)
    renderGrid([
      '..g....g..',
      '.gg...gg..',
      '.gb...gb..',
      '..gg...gg.',
      '..bg...bg.',
      '.gg...gg..',
      '.gb...gb..',
      '..gg...gg.',
      '..bg...bg.',
      '.gg...gg..',
      '.gb...gb..',
      '..g....g..',
      '..g....g..',
      '.gg...gg..',
      '.gb...gb..',
      '..g....g..',
      '..g....g..',
      '..m....m..',
      '..m....m..',
    ], 5, 19),
    renderGrid([
      '.g....g..',
      'gg...gg..',
      'gb...gb..',
      '.gg...gg.',
      '.bg...bg.',
      'gg...gg..',
      'gb...gb..',
      '.gg...gg.',
      '.bg...bg.',
      'gg...gg..',
      'gb...gb..',
      '.g....g..',
      '.g....g..',
      'gg...gg..',
      '.m....m..',
      '.m....m..',
    ], 76, 22),

    // Coraux ramifiés corail-rouge (#FF3B3B) & pointes lumineuses
    renderGrid([
      '..w......w....',
      '..r..a...r..w.',
      '.rr..r..rr..r.',
      '..r.rr...r.rr.',
      '..rrr....rrr..',
      '...rr.a...rr..',
      '...rr.r...rr..',
      'a...rrr..rr...',
      'rr..rrr.rr....',
      '.rrrrrrr......',
      '..rrrrr.......',
      '...rrr........',
      '...rrr........',
    ], 19, 25),
    renderGrid([
      '.w.....a....',
      '.r..w..r..w.',
      'rr..r.rr..r.',
      '.r.rr..r.rr.',
      '.rrr...rrr..',
      '..rr.w..rr..',
      '..rrrr..rr..',
      '...rrrrrr...',
      '....rrrr....',
      '....rrrr....',
    ], 58, 28),

    // Corail cerveau ambre (#FFB000) & éponges cyan (#00E5FF)
    renderGrid([
      '..aaaaaa..',
      '.aawaawwa.',
      'aaarraaraa',
      'aarraarraa',
      'aaaaaaaaaa',
      '.aaaaaaaa.',
    ], 40, 32),
    renderGrid([
      '..cc..cc.',
      '.cwc.cwc.',
      '.ccc.ccc.',
      '.cbc.cbc.',
      '.cbc.cbc.',
      '.mmm.mmm.',
    ], 86, 32),

    // Poissons récifaux (#FFB000, #FF3B3B, #00E5FF, #E6F1FF) & bulles
    renderGrid([
      'c.......',
      '.w.rrr..',
      '..aaaar.',
      '.akaaarr',
      '..aaaarr',
      '...aa..r',
    ], 25, 11),
    renderGrid([
      '.....c..',
      'cccw..w.',
      'cckcccc.',
      'cccw.cc.',
    ], 46, 17),
    renderGrid([
      '.......w',
      'rrraaa..',
      'r.akaa..',
      'rrraaa..',
    ], 60, 12),
    // Bulles montantes
    ...[
      [16, 20, C_WHT], [17, 15, C_ACC], [16, 10, C_WHT],
      [54, 14, C_ACC], [55, 9, C_WHT], [73, 19, C_WHT], [72, 13, C_ACC],
    ].map(([x, y, c]) => rect(x, y, 1, 1, c)),
  ];

  return layers.join('');
}

export const BODY_MAP_ANCHORS = Object.freeze({
  lungs:       { x: 37.5, y: 31.25, iconKey: 'organ-lungs' },
  heart:       { x: 62.5, y: 37.5,  iconKey: 'organ-heart' },
  kidneys:     { x: 37.5, y: 56.25, iconKey: 'organ-kidneys' },
  nervous:     { x: 50,   y: 12.5,  iconKey: 'organ-nervous' },
  immune_skin: { x: 75,   y: 56.25, iconKey: 'organ-immune_skin' },
});

export const SPRITES = Object.freeze({
  'organ-lungs': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '..w....cc....w..',
      '.c.....wc.....c.',
      '...gg..cc..gg...',
      '..gwgk.cc.kgwg..',
      '.ggggcckkccgggg.',
      'gggkggcbmcggkggg',
      'gggcggk..kggcggg',
      'ggwgggk..kgggwgg',
      'ggkgggm..mgggkgg',
      'gggcggm..mggcggg',
      'gggkgg....ggkggg',
      '.ggkgg....ggkgg.',
      '.mmmgm....mgmmm.',
      '..mmm......mmm..',
      '...w........w...',
      '................',
    ]),
  },
  'organ-heart': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '......cc..m.....',
      '......cbm.rr....',
      '..rrrrccrrrrrr..',
      '.rwaaarkrrrrrrr.',
      'rrwrrrrkrrrrrrrr',
      'rwrrrrrkrrrrrrrr',
      'rrrrcrrcccrrcrrr',
      'rrrccwkrkrrccrrr',
      'rrrkrrkrrrrrkrrr',
      '.rrrrrkrrrrkrrr.',
      '..rrrrkrrrrrrr..',
      '...rrrrrrrrrr...',
      '....rrrrrrrr....',
      '.....rrrrrr.....',
      '......rrrr......',
      '.......rr.......',
    ]),
  },
  'organ-kidneys': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '.......gg.......',
      '..cccc.gg.cccc..',
      '.cwwbccggccbwwc.',
      'ccbmmmcggcmmmbbc',
      'ccmkkmcggcmkkmcc',
      'ccmkmggggggmkmcc',
      'ccmkggcggcggkmcc',
      'ccbmggkggkggmbcc',
      '.ccmm.kggk.mmcc.',
      '.ccmc..gg..cmcc.',
      '..ccc..gg..ccc..',
      '.......gg.......',
      '....w..gg..w....',
      '...wc..gg..cw...',
      '...cc.wggw.cc...',
      '......cccc......',
    ]),
  },
  'organ-nervous': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '.a...r....a...r.',
      '..c..g.a..c..g..',
      '.rc.cg.c.cg.cr..',
      '..ccgg.g.ggcc...',
      'a..cggcgcggc...a',
      '.c.rggckcggc.rc.',
      '..ccggaaaggcc...',
      '...ggggwgggg....',
      '.r..cggkggc..r..',
      '..c.cggcggc.c...',
      '...cc.ggg.cc....',
      '.a....ggg....a..',
      '......gmg.......',
      '....mmgggmm.....',
      '..bbbmcccmmbbb..',
      '.mmmmccccccmmmm.',
    ]),
  },
  'organ-immune_skin': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '....aaa..aaa....',
      '...waaaaaaaaw...',
      '.cccccccccccccc.',
      'cwmmmmmmmmmmmmmc',
      'cmmmmmmggmmmmmmc',
      'cmmmmmmgwmmmmmmc',
      'cmmbbggggggbbmmc',
      'cmmbbggggggbbmmc',
      'cbbbbbbggbbbbbbc',
      '.cbbbbmggmbbbbc.',
      '.cmbbmmmmmmbbmc.',
      '..cmmmmmmmmmmc..',
      '...ccmmmmmmcc...',
      '....ccmmmmcc....',
      '......cccc......',
      '................',
    ]),
  },
  'human-body-map': {
    viewBox: '0 0 96 128', width: 96, height: 128,
    body: buildBodyMap(),
  },
  'notebook': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '.........aa.....',
      '.ccccccm.aacccc.',
      'cppppppcmpappppc',
      'cpkpkppcmppkkpkc',
      'cppppppcmppppppc',
      'cpkppkpcmppkpkpc',
      'cppppppcmppppppc',
      'cpggpppcmpkkppkc',
      'cppppppcmppppppc',
      'cpkpkppcmppkpkpc',
      'cppppppcmppppppc',
      'cppppppcmpppppcc',
      'cmmmmmmccmmmaamc',
      '.cccccccccaaaac.',
      '...........aa...',
      '................',
    ]),
  },
  'heart-meter': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '................',
      '..uuuu....uuuu..',
      '.uwwuuu..uuuuuu.',
      'uwuuuuuuuuuuuuuk',
      'uwuuuuuuuuuuuuuk',
      'uuuuuuuuuuuuuuuk',
      'uuuuuuuuuuuuuuk.',
      '.uuuuuuuuuuuuk..',
      '.uuuuuuuuuuuk...',
      '..uuuuuuuuuk....',
      '...uuuuuuuk.....',
      '....uuuuuk......',
      '.....uuuk.......',
      '......uk........',
      '.......k........',
      '................',
    ]),
  },
  'sound-on': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '................',
      '................',
      '......uu........',
      '.....uuu....u...',
      '....uuuu.....u..',
      '.uuuuuuu.u...u..',
      '.uuuuuuu..u...u.',
      '.uuuuuuu..u...u.',
      '.uuuuuuu..u...u.',
      '.uuuuuuu..u...u.',
      '.uuuuuuu.u...u..',
      '....uuuu.....u..',
      '.....uuu....u...',
      '......uu........',
      '................',
      '................',
    ]),
  },
  'sound-off': {
    viewBox: '0 0 16 16', width: 16, height: 16,
    body: renderGrid([
      '................',
      '................',
      '......uu........',
      '.....uuu........',
      '....uuuu........',
      '.uuuuuuu.a....a.',
      '.uuuuuuu.rr..rr.',
      '.uuuuuuu..rrrr..',
      '.uuuuuuu..rrrr..',
      '.uuuuuuu.rr..rr.',
      '.uuuuuuu.r....r.',
      '....uuuu........',
      '.....uuu........',
      '......uu........',
      '................',
      '................',
    ]),
  },
  'badge-beginner': {
    viewBox: '0 0 24 24', width: 24, height: 24,
    body: renderGrid([
      '........................',
      '.........aaaaaa.........',
      '......aaapwwwwpaaa......',
      '....aapwwppkkppwwpaa....',
      '...apwppkppwwppkppwpa...',
      '..apwpkpppkppkpppkpwpa..',
      '.apppkppwppkkppwppkpppa.',
      '.appkpppwppppppwpppkppa.',
      'appkppwppkppppkppwppkppa',
      'apppkpwppkppppkppwpkpppa',
      'appkppwppkppppkppwppkppa',
      '.appkppwppccccppwppkppa.',
      '.aappkpppcwccwcpppkppaa.',
      '..apppkppcwwwwcppkpppa..',
      '...aappkppccccppkppaa...',
      '....aappkpkkkkpkppaa....',
      '.....aaappkppkppaaa.....',
      '.......aappkkppaa.......',
      '......aaapaaaapaaa......',
      '.....aaawwwwwwwwaaa.....',
      '......aaaaaaaaaaaa......',
      '........c......c........',
      '.......w................',
      '........................',
    ]),
  },
  'badge-field': {
    viewBox: '0 0 24 24', width: 24, height: 24,
    body: renderGrid([
      '.....c..................',
      '....wc..................',
      '.............c..........',
      '............wc..........',
      '........rrrrrr..........',
      '.......raaaaaarr........',
      '.....aaakwwkrrarra......',
      '....aaaakwwkrrarrra.....',
      '...awwwakwwkrrrrrra..rr.',
      '..aawkwakwwkrrrrrrrarrrr',
      '.aaawwwakwwkrrrrrrr.rrr.',
      '.aaaaaaakwwkrrrrrr......',
      '..aaakkkkwwkrrrrrr......',
      '...aaarrrwwkrrrrrr..rrr.',
      '....aaaarwwkrrrrrraarrrr',
      '.....aaakwwkrrarra...rr.',
      '.......rraaaaaarr.......',
      '........rrraaar.........',
      '.........rrr............',
      '..........r.............',
      '..c.....................',
      '.wc.....................',
      '........................',
      '........................',
    ]),
  },
  'badge-expert': {
    viewBox: '0 0 24 24', width: 24, height: 24,
    body: renderGrid([
      '........................',
      '..........cc............',
      '.........cccc...........',
      '.......cccccccc.........',
      '.....ccwwwccccccc.......',
      '....ccwccccccccccb......',
      '...cckccccwwccccccb.....',
      '..ccccccccwwcccccccb....',
      '.cccwwwwcwwbccccccccb...',
      'ccc..wwwwb..bccccccccb..',
      '.....ww......bbccccccbb.',
      '...............bccccccb.',
      '...............bbcccccbb',
      '................bccccb..',
      '...gg..........bbb..ccb.',
      '..gwcg..w.....bb.....c..',
      '.gcbbbg..c....c..wbbbbb.',
      'gcbmmbbcbbbbbbbbbbbmmbbc',
      'cmmmmmbbbbbbbbbbmmmmmmbb',
      '.mmmmmmmmmmmmmmmmmmmmmm.',
      '..cccccccccccccccccccc..',
      '...bbbbbbbbbbbbbbbbbb...',
      '....mmmmmmmmmmmmmmmm....',
      '........................',
    ]),
  },
  'badge-legendary': {
    viewBox: '0 0 24 24', width: 24, height: 24,
    body: renderGrid([
      '............g....g......',
      '...........gw....wg.....',
      '....a..a..a..g..g.......',
      '....awaaawa...gg........',
      '....aaaaaaa...gc........',
      '....waaaaaw...g.........',
      '....cccccccccccc........',
      '..ccwwwwccccccccc.......',
      '.ccwccccccccccccccb.....',
      '.ccccccccccccccccccb..cc',
      'ccccwkccccccccccccccbccc',
      'cccckkccccccccccccccbbcc',
      'cccccccccccccccccccbbbb.',
      'ccmwwwwwwwwwcccccccbbb..',
      '.cmwbwbwbwbwccccccbb....',
      '..mwwwwwwwwwcccccbb.....',
      '...mbbbbbbbbbccccb......',
      '.bbbbbbbbbbbbbbbbbbbbbb.',
      'cccccccccccccccccccccccc',
      '.mmmmbbbbbbbbbbbbbbmmmm.',
      '..mmmmmmmmmmmmmmmmmmmm..',
      '....cccccccccccccccc....',
      '........................',
      '........................',
    ]),
  },
  'title-ocean-scene': {
    viewBox: '0 0 96 64', width: 96, height: 64,
    body: buildTitleOceanScene(),
  },
  'ending-reef-scene': {
    viewBox: '0 0 96 44', width: 96, height: 44,
    body: buildEndingReefScene(),
  },
});

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getSprite(key, opts = {}) {
  const entry = SPRITES[key];
  if (!entry) {
    console.warn(`[sprites.js] Sprite inconnu : "${key}"`);
    return '';
  }

  const label = typeof opts.label === 'string' ? opts.label.trim() : '';
  const extraClass = typeof opts.className === 'string' && opts.className.trim()
    ? ` ${escapeAttr(opts.className.trim())}`
    : '';

  const numericSize = Number(opts.size);
  const hasSize = Number.isFinite(numericSize) && numericSize > 0;
  const width = opts.width ?? (hasSize ? Math.round(numericSize) : entry.width);
  const height = opts.height ?? (hasSize ? Math.round(numericSize * (entry.height / entry.width)) : entry.height);

  const a11yAttrs = label
    ? `role="img" aria-label="${escapeAttr(label)}"`
    : 'aria-hidden="true"';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${entry.viewBox}" ` +
    `width="${escapeAttr(width)}" height="${escapeAttr(height)}" shape-rendering="crispEdges" ` +
    `class="pixel-sprite pixel-sprite--${escapeAttr(key)}${extraClass}" ` +
    `focusable="false" ${a11yAttrs}>${entry.body}</svg>`
  );
}
