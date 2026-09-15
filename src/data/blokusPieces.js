// Blokus piece definitions: 21 polyomino pieces (1~5 cells)
// Each cell is [row, col] relative to (0,0) top-left.

function normalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  return cells.map(([r, c]) => [r - minR, c - minC]);
}

export function rotateCells(cells) {
  // 90° clockwise: [r, c] → [c, -r]
  return normalize(cells.map(([r, c]) => [c, -r]));
}

export function flipCells(cells) {
  // Horizontal flip: [r, c] → [r, -c]
  return normalize(cells.map(([r, c]) => [r, -c]));
}

function cellKey(cells) {
  return cells
    .map(([r, c]) => `${r},${c}`)
    .sort()
    .join('|');
}

export function getTransforms(cells) {
  const seen = new Set();
  const results = [];
  let cur = normalize(cells);
  for (let f = 0; f < 2; f++) {
    for (let r = 0; r < 4; r++) {
      const key = cellKey(cur);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(cur.map(([rr, cc]) => [rr, cc]));
      }
      cur = rotateCells(cur);
    }
    cur = flipCells(cur);
  }
  return results;
}

export const PIECES = [
  // ── 1칸 ──
  { id: 0,  name: '1',   cells: [[0, 0]] },
  // ── 2칸 ──
  { id: 1,  name: '2',   cells: [[0, 0], [0, 1]] },
  // ── 3칸 ──
  { id: 2,  name: '3I',  cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 3,  name: '3L',  cells: [[0, 0], [1, 0], [1, 1]] },
  // ── 4칸 ──
  { id: 4,  name: '4I',  cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 5,  name: '4O',  cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 6,  name: '4T',  cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 7,  name: '4S',  cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: 8,  name: '4L',  cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  // ── 5칸 (펜토미노 12종) ──
  { id: 9,  name: 'F',   cells: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]] },
  { id: 10, name: 'I5',  cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 11, name: 'L5',  cells: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]] },
  { id: 12, name: 'N',   cells: [[0, 1], [1, 0], [1, 1], [2, 0], [3, 0]] },
  { id: 13, name: 'P',   cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]] },
  { id: 14, name: 'T5',  cells: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },
  { id: 15, name: 'U',   cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: 16, name: 'V',   cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
  { id: 17, name: 'W',   cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },
  { id: 18, name: 'X',   cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { id: 19, name: 'Y',   cells: [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]] },
  { id: 20, name: 'Z',   cells: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]] },
];

// Color hex for each player color name
export const COLOR_HEX = {
  blue:   '#3b82f6',
  yellow: '#eab308',
  red:    '#ef4444',
  green:  '#22c55e',
};

// 4 corner starting cells per color
export const COLOR_CORNERS = {
  blue:   [0, 0],
  yellow: [0, 19],
  red:    [19, 19],
  green:  [19, 0],
};

// Diagonal corner pairs for 2-player games
export const TWO_PLAYER_PAIRS = [
  ['blue', 'red'],
  ['yellow', 'green'],
];
