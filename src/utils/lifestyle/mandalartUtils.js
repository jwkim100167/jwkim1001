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

// 제목이 입력된 칸인지
export function hasText(cell) {
  return !!(cell?.text || '').trim();
}

// 세부 목표 진행률 = 제목이 있는 실천 과제만 평균 (세부 목표가 없거나 과제가 0개면 null = 미정)
export function getSectorAvgProgress(cells, sectorIndex) {
  const sRow = Math.floor(sectorIndex / 3) * 3 + 1;
  const sCol = (sectorIndex % 3) * 3 + 1;
  const subGoal = cells.find(c => c.row === sRow && c.col === sCol);
  if (!hasText(subGoal)) return null;
  const actionCells = cells.filter(
    c => c.sectorIndex === sectorIndex && !(c.row === sRow && c.col === sCol) && hasText(c)
  );
  if (actionCells.length === 0) return null;
  const sum = actionCells.reduce((acc, c) => acc + (c.progress ?? 0), 0);
  return Math.round(sum / actionCells.length);
}

// 전체(핵심 목표) 진행률 = 진행률이 있는 세부 목표만 평균 (하나도 없으면 0)
export function getTotalProgress(cells) {
  const outerSectors = [0, 1, 2, 3, 5, 6, 7, 8];
  const avgs = outerSectors.map(s => getSectorAvgProgress(cells, s)).filter(v => v !== null);
  if (avgs.length === 0) return 0;
  return Math.round(avgs.reduce((a, v) => a + v, 0) / avgs.length);
}

// ── 개인 설정 ──
export const TARGET_OPTIONS = [100, 90, 80, 70, 60, 50];

export const DEFAULT_SETTINGS = { targetRate: 100 };

export function normalizeSettings(raw) {
  const targetRate = TARGET_OPTIONS.includes(raw?.targetRate) ? raw.targetRate : DEFAULT_SETTINGS.targetRate;
  return { ...DEFAULT_SETTINGS, ...(raw || {}), targetRate };
}

// 목표 달성 여부 (null = 미정 → 미달성)
export function isAchieved(pct, targetRate) {
  return pct !== null && pct !== undefined && pct >= targetRate;
}

// ── 칸 종류 (용어) ──
// 가운데 1칸: 핵심 목표 / 둘레 8칸(+각 영역 중앙): 세부 목표 / 나머지 64칸: 실천 과제
export const CELL_ROLE_NAMES = {
  core: '핵심 목표',
  sub: '세부 목표',
  action: '실천 과제',
};

export function getCellRole(row, col) {
  if (row === 4 && col === 4) return 'core';
  if (isCenterOfSector(row, col) || isCenterSectorCell(row, col)) return 'sub';
  return 'action';
}

// 세부 목표 번호 1~8 (중앙 영역은 0)
export function getSubGoalNo(sectorIndex) {
  return [0, 1, 2, 3, 5, 6, 7, 8].indexOf(sectorIndex) + 1;
}

// 영역(섹터) 가운데 칸 = 그 영역의 세부 목표
export function getSubGoalCell(cells, sectorIndex) {
  const row = Math.floor(sectorIndex / 3) * 3 + 1;
  const col = (sectorIndex % 3) * 3 + 1;
  return cells.find(c => c.row === row && c.col === col);
}

// 입력 순서 잠금: 실천 과제는 그 영역의 세부 목표가 있어야 입력 가능
// (핵심 목표·세부 목표는 언제든 입력 가능 — 핵심 목표는 나중에 적어도 됨)
// 반환값 null(열림) | 'sub'(세부 목표 먼저)
export function getLockReason(cells, row, col) {
  if (getCellRole(row, col) !== 'action') return null;
  return hasText(getSubGoalCell(cells, getSectorIndex(row, col))) ? null : 'sub';
}

// ── 그룹 멤버 색깔 (그룹 안 1색 1명 → 최대 7명) ──
// 이웃한 색끼리 밝기 차이를 크게 둬서 작은 원에서도 구분되게 함 (빨=진하게, 주=밝게 …)
export const MEMBER_COLORS = [
  // ink: 칩 위 글자색 (밝은 색은 어두운 글자)
  { key: 'red',    label: '빨', hex: '#DC2626', ink: '#fff' },
  { key: 'orange', label: '주', hex: '#FB923C', ink: '#1F2937' },
  { key: 'yellow', label: '노', hex: '#FACC15', ink: '#1F2937' },
  { key: 'green',  label: '초', hex: '#16A34A', ink: '#fff' },
  { key: 'blue',   label: '파', hex: '#38BDF8', ink: '#1F2937' },
  { key: 'navy',   label: '남', hex: '#1E3A8A', ink: '#fff' },
  { key: 'purple', label: '보', hex: '#C084FC', ink: '#1F2937' },
];
export const GROUP_MAX_MEMBERS = MEMBER_COLORS.length;

export function memberColorHex(key) {
  return MEMBER_COLORS.find(c => c.key === key)?.hex ?? '#9CA3AF'; // 미배정 = 회색
}

// 사용 중이지 않은 첫 번째 색 (빨→보 순)
export function firstFreeColor(usedKeys) {
  return MEMBER_COLORS.find(c => !usedKeys.includes(c.key))?.key ?? null;
}

// 색 n개를 원에 n등분: conic-gradient 문자열 (0개 → null)
// 조각 사이에 흰 틈을 넣어, 비슷한 색끼리도 몇 명으로 나뉘었는지 보이게 함
const PIE_GAP = 1.5; // % (≈ 5.4°)
export function pieGradient(hexes) {
  if (!hexes.length) return null;
  if (hexes.length === 1) return hexes[0];
  const step = 100 / hexes.length;
  const stops = hexes.flatMap((h, i) => {
    const start = i * step;
    const end = (i + 1) * step;
    return [
      `#fff ${start.toFixed(2)}% ${(start + PIE_GAP / 2).toFixed(2)}%`,
      `${h} ${(start + PIE_GAP / 2).toFixed(2)}% ${(end - PIE_GAP / 2).toFixed(2)}%`,
      `#fff ${(end - PIE_GAP / 2).toFixed(2)}% ${end.toFixed(2)}%`,
    ];
  });
  return `conic-gradient(${stops.join(', ')})`;
}
