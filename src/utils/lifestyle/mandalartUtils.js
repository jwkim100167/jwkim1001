// 만다라트 공통 상수 / 순수 계산 로직 (Mandalart, MandalartGroups 공용)

export const SECTOR_COLORS = {
  0: '#E8734A',
  1: '#3DB88A',
  2: '#B85AB0',
  3: '#C9980F',
  4: '#4A6FDC',
  5: '#3AAFD4',
  6: '#7055D4',
  7: '#D44B4B',
  8: '#3FAD50',
};

export const STATUS_CONFIG = {
  good:   { label: '잘됨',   color: '#22C55E', bg: 'rgba(34,197,94,0.18)',  border: '#22C55E' },
  normal: { label: '보통',   color: '#EAB308', bg: 'rgba(234,179,8,0.18)',  border: '#EAB308' },
  bad:    { label: '미비함', color: '#EF4444', bg: 'rgba(239,68,68,0.18)', border: '#EF4444' },
};

// 중앙 섹터(sector 4)의 8칸 ↔ 나머지 8개 섹터의 중앙 셀 연동 매핑
// 중앙 섹터 셀 id → 연동된 섹터 중앙 셀 {row, col}
export const CENTER_TO_SECTOR = {
  'r3c3': { row: 1, col: 1 }, // sector 0
  'r3c4': { row: 1, col: 4 }, // sector 1
  'r3c5': { row: 1, col: 7 }, // sector 2
  'r4c3': { row: 4, col: 1 }, // sector 3
  'r4c5': { row: 4, col: 7 }, // sector 5
  'r5c3': { row: 7, col: 1 }, // sector 6
  'r5c4': { row: 7, col: 4 }, // sector 7
  'r5c5': { row: 7, col: 7 }, // sector 8
};

// 섹터 중앙 셀 id → 연동된 중앙 섹터 셀 {row, col}
export const SECTOR_TO_CENTER = {
  'r1c1': { row: 3, col: 3 },
  'r1c4': { row: 3, col: 4 },
  'r1c7': { row: 3, col: 5 },
  'r4c1': { row: 4, col: 3 },
  'r4c7': { row: 4, col: 5 },
  'r7c1': { row: 5, col: 3 },
  'r7c4': { row: 5, col: 4 },
  'r7c7': { row: 5, col: 5 },
};

export function getLinkedId(cellId) {
  if (CENTER_TO_SECTOR[cellId]) {
    const { row, col } = CENTER_TO_SECTOR[cellId];
    return `r${row}c${col}`;
  }
  if (SECTOR_TO_CENTER[cellId]) {
    const { row, col } = SECTOR_TO_CENTER[cellId];
    return `r${row}c${col}`;
  }
  return null;
}

// 중앙 섹터 셀인지 (core 제외)
export function isCenterSectorCell(row, col) {
  return row >= 3 && row <= 5 && col >= 3 && col <= 5 && !(row === 4 && col === 4);
}

export function getSectorIndex(row, col) {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

export function isCenterOfSector(row, col) {
  return row % 3 === 1 && col % 3 === 1;
}

export function initEmptyState() {
  const cells = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      cells.push({
        id: `r${row}c${col}`,
        row,
        col,
        text: '',
        goal: '',
        status: null,
        note: '',
        progress: 0,
        sectorIndex: getSectorIndex(row, col),
      });
    }
  }
  return cells;
}

export function normalizeCells(raw) {
  return raw.map((c, i) => ({
    ...c,
    row: c.row ?? Math.floor(i / 9),
    col: c.col ?? i % 9,
    goal: c.goal ?? '',
    progress: c.progress ?? 0,
    sectorIndex: c.sectorIndex ?? getSectorIndex(
      c.row ?? Math.floor(i / 9),
      c.col ?? i % 9
    ),
  }));
}

// 섹터 내 8칸의 개인 진행도(progress) 평균
export function getSectorAvgProgress(cells, sectorIndex) {
  const sRow = Math.floor(sectorIndex / 3) * 3 + 1;
  const sCol = (sectorIndex % 3) * 3 + 1;
  const actionCells = cells.filter(
    c => c.sectorIndex === sectorIndex && !(c.row === sRow && c.col === sCol)
  );
  if (actionCells.length === 0) return 0;
  const sum = actionCells.reduce((acc, c) => acc + (c.progress ?? 0), 0);
  return Math.round(sum / actionCells.length);
}

// 전체 진행률 = 외부 8개 섹터 평균 진행도의 평균
export function getTotalProgress(cells) {
  const outerSectors = [0, 1, 2, 3, 5, 6, 7, 8];
  const avgs = outerSectors.map(s => getSectorAvgProgress(cells, s));
  return Math.round(avgs.reduce((a, v) => a + v, 0) / avgs.length);
}

// ── 개인 설정 ──
export const TARGET_OPTIONS = [100, 90, 80, 70, 60, 50];

export const DEFAULT_SETTINGS = { targetRate: 100 };

export function normalizeSettings(raw) {
  const targetRate = TARGET_OPTIONS.includes(raw?.targetRate) ? raw.targetRate : DEFAULT_SETTINGS.targetRate;
  return { ...DEFAULT_SETTINGS, ...(raw || {}), targetRate };
}

// 목표 달성 여부
export function isAchieved(pct, targetRate) {
  return pct >= targetRate;
}
