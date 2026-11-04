// 만다라트 활동 로그 — 타입 정의 / 변경 비교 / 표시 문구 (순수 함수)
import {
  STATUS_CONFIG, isCenterSectorCell, isCenterOfSector,
  getSectorAvgProgress, getTotalProgress, isAchieved,
  CELL_ROLE_NAMES, getCellRole, getSubGoalNo,
} from './mandalartUtils';

// shared: 그룹 활동 피드 공개 여부
export const LOG_TYPES = {
  progress:        { icon: '📊', category: 'progress', shared: true },
  title:           { icon: '✏️', category: 'edit',     shared: true },
  goal:            { icon: '🎯', category: 'edit',     shared: true },
  status:          { icon: '🚦', category: 'edit',     shared: true },
  note:            { icon: '📝', category: 'edit',     shared: false },
  core:            { icon: '⭐', category: 'edit',     shared: true },
  cell_achieved:   { icon: '🎉', category: 'achieve',  shared: true },
  sector_achieved: { icon: '🎉', category: 'achieve',  shared: true },
  total_milestone: { icon: '📈', category: 'achieve',  shared: true },
  total_achieved:  { icon: '🏆', category: 'achieve',  shared: true },
  target_rate:     { icon: '⚙️', category: 'setting',  shared: true },
  visibility:      { icon: '🌐', category: 'setting',  shared: false },
  group_join:      { icon: '👋', category: 'group',    shared: true },
  group_leave:     { icon: '🚪', category: 'group',    shared: true },
  group_owner:     { icon: '👑', category: 'group',    shared: true },
  group_rename:    { icon: '🏷️', category: 'group',    shared: true },
};

export const LOG_FILTERS = [
  { key: 'all',      label: '전체' },
  { key: 'progress', label: '진행도' },
  { key: 'edit',     label: '수정' },
  { key: 'achieve',  label: '달성' },
];

export function typesOfCategory(category) {
  if (category === 'all') return null;
  return Object.keys(LOG_TYPES).filter(t => LOG_TYPES[t].category === category);
}

// 기록 시점별 비교 대상 필드
export const NUMERIC_FIELDS = ['progress', 'status']; // DB 저장 시점(1초 디바운스)
export const TEXT_FIELDS = ['text', 'goal', 'note'];  // 입력칸 blur / 패널 닫기 시점

const OUTER_SECTORS = [0, 1, 2, 3, 5, 6, 7, 8];

function oneLine(text) {
  return (text || '').replace(/\n/g, ' ').trim();
}

function cellLabel(cell) {
  const role = getCellRole(cell.row, cell.col);
  const fallback = role === 'sub' ? `세부 목표 ${getSubGoalNo(cell.sectorIndex)}` : CELL_ROLE_NAMES[role];
  return oneLine(cell.text) || fallback;
}

function sectorLabel(cells, sectorIndex) {
  const center = cells.find(c => c.sectorIndex === sectorIndex && isCenterOfSector(c.row, c.col));
  return oneLine(center?.text) || `세부 목표 ${getSubGoalNo(sectorIndex)}`;
}

// 'r1c4' → 칸 종류 이름 (핵심 목표 / 세부 목표 / 실천 과제)
function roleNameOf(cellId) {
  const m = /^r(\d)c(\d)$/.exec(cellId || '');
  return m ? CELL_ROLE_NAMES[getCellRole(Number(m[1]), Number(m[2]))] : CELL_ROLE_NAMES.action;
}

/**
 * 비교 기준(prev) ↔ 현재(next) 비교 → 로그 후보 배열
 * options.fields: 비교할 필드 ('text' | 'goal' | 'note' | 'progress' | 'status')
 * options.cellId: 지정 시 해당 셀만 비교
 * options.achievements: 달성 이벤트(셀/섹터/전체) 계산 여부
 */
export function diffCells(prev, next, targetRate, { fields = [...TEXT_FIELDS, ...NUMERIC_FIELDS], cellId = null, achievements = true } = {}) {
  if (!Array.isArray(prev) || !Array.isArray(next)) return [];
  const entries = [];
  const prevById = new Map(prev.map(c => [c.id, c]));
  const has = (f) => fields.includes(f);

  for (const n of next) {
    if (cellId && n.id !== cellId) continue;
    const p = prevById.get(n.id);
    if (!p) continue;
    if (isCenterSectorCell(n.row, n.col)) continue; // 연동(미러) 칸은 원본 칸 기준으로만 기록

    const isCore = n.row === 4 && n.col === 4;
    const isAction = !isCenterOfSector(n.row, n.col);
    const base = { cell_id: n.id, label: cellLabel(n.text ? n : p) };

    if (has('text') && oneLine(p.text) !== oneLine(n.text)) {
      entries.push({ ...base, type: isCore ? 'core' : 'title', before: oneLine(p.text), after: oneLine(n.text) });
    }
    if (has('goal') && oneLine(p.goal) !== oneLine(n.goal)) {
      entries.push({ ...base, type: 'goal', before: oneLine(p.goal), after: oneLine(n.goal) });
    }
    if (has('note') && (p.note || '') !== (n.note || '')) {
      entries.push({ ...base, type: 'note', before: null, after: null }); // 메모 내용은 기록하지 않음
    }
    if (has('status') && (p.status || '') !== (n.status || '')) {
      entries.push({ ...base, type: 'status', before: p.status || '', after: n.status || '' });
    }
    if (has('progress') && isAction && (p.progress ?? 0) !== (n.progress ?? 0)) {
      const before = p.progress ?? 0;
      const after = n.progress ?? 0;
      entries.push({ ...base, type: 'progress', before: String(before), after: String(after) });
      if (achievements && isAchieved(after, targetRate) && !isAchieved(before, targetRate)) {
        entries.push({ ...base, type: 'cell_achieved', before: null, after: String(after) });
      }
    }
  }

  if (!achievements) return entries;

  // 섹터 달성
  for (const s of OUTER_SECTORS) {
    const before = getSectorAvgProgress(prev, s);
    const after = getSectorAvgProgress(next, s);
    if (isAchieved(after, targetRate) && !isAchieved(before, targetRate)) {
      entries.push({ type: 'sector_achieved', cell_id: null, label: sectorLabel(next, s), before: null, after: String(after) });
    }
  }

  // 전체 진행률 10% 단위 돌파 / 전체 목표 달성
  const totalBefore = getTotalProgress(prev);
  const totalAfter = getTotalProgress(next);
  const stepBefore = Math.floor(totalBefore / 10);
  const stepAfter = Math.floor(totalAfter / 10);
  if (stepAfter > stepBefore && stepAfter > 0) {
    entries.push({ type: 'total_milestone', cell_id: null, label: null, before: String(totalBefore), after: String(stepAfter * 10) });
  }
  if (isAchieved(totalAfter, targetRate) && !isAchieved(totalBefore, targetRate)) {
    entries.push({ type: 'total_achieved', cell_id: null, label: null, before: null, after: String(totalAfter) });
  }

  return entries;
}

function statusText(key) {
  if (!key) return '해제';
  const icon = key === 'good' ? '✅' : key === 'normal' ? '🟡' : '❌';
  return `${icon} ${STATUS_CONFIG[key]?.label ?? key}`;
}

// ( 항목 : 이전 -> 이후 ) 형식 — 사용자 입력값 뒤에 조사를 붙이지 않음
function paren(...parts) {
  return `( ${parts.filter(Boolean).join(' ')} )`;
}

function change(before, after) {
  return before ? `${before} -> ${after}` : after;
}

// 입력 / 수정 / 삭제 구분
function editVerb(before, after) {
  if (!before) return '입력되었습니다.';
  if (!after) return '삭제되었습니다.';
  return '수정되었습니다.';
}

// names: { [userId]: 이름 } — 위임 대상 등 표시용
export function formatLog(log, names = {}) {
  const icon = LOG_TYPES[log.type]?.icon ?? '•';
  const label = log.label || '';
  let text;
  let detail;
  switch (log.type) {
    case 'title':
      text = `${roleNameOf(log.cell_id)}가 ${editVerb(log.before, log.after)}`;
      detail = paren(log.before && log.after ? change(log.before, log.after) : (log.after || log.before));
      break;
    case 'core':
      text = `핵심 목표가 ${editVerb(log.before, log.after)}`;
      detail = paren(log.before && log.after ? change(log.before, log.after) : (log.after || log.before));
      break;
    case 'goal':
      text = `달성 기준이 ${editVerb(log.before, log.after)}`;
      detail = paren(`${label} :`, log.before && log.after ? change(log.before, log.after) : (log.after || log.before));
      break;
    case 'progress':
      text = '진행도가 수정되었습니다.';
      detail = paren(`${label} :`, `${log.before}% -> ${log.after}%`);
      break;
    case 'status':
      text = '상태가 수정되었습니다.';
      detail = paren(`${label} :`, statusText(log.after));
      break;
    case 'note':
      text = '메모가 수정되었습니다.';
      detail = paren(label);
      break;
    case 'cell_achieved':
      text = '실천 과제를 달성했습니다.';
      detail = paren(`${label} :`, `${log.after}%`);
      break;
    case 'sector_achieved':
      text = '세부 목표를 달성했습니다.';
      detail = paren(`${label} :`, `${log.after}%`);
      break;
    case 'total_milestone':
      text = '핵심 목표 진행률이 올랐습니다.';
      detail = paren(`${log.after}% 돌파`);
      break;
    case 'total_achieved':
      text = '핵심 목표를 달성했습니다.';
      detail = paren(`${log.after}%`);
      break;
    case 'target_rate':
      text = '목표 달성률이 수정되었습니다.';
      detail = paren(`${log.before}% -> ${log.after}%`);
      break;
    case 'visibility':
      text = '소셜 공개 설정이 수정되었습니다.';
      detail = paren(log.after === 'true' ? '공개' : '비공개');
      break;
    case 'group_join':
      text = '그룹에 가입했습니다.';
      detail = paren(label);
      break;
    case 'group_leave':
      text = '그룹에서 나갔습니다.';
      detail = paren(label);
      break;
    case 'group_owner':
      text = '방장이 위임되었습니다.';
      detail = paren(`${names[log.before] ?? '이전 방장'} -> ${names[log.after] ?? '새 방장'}`);
      break;
    case 'group_rename':
      text = '그룹 이름이 수정되었습니다.';
      detail = paren(change(log.before, log.after));
      break;
    default:
      text = log.type;
      detail = '';
  }
  return { icon, text, detail };
}

// 14:05
export function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 날짜 묶음 제목: 오늘 (2026.11.4 수) / 어제 (2026.11.3 화) / 2026.11.2 월
export function dateGroupLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86400000);
  const date = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${WEEKDAYS[d.getDay()]}`;
  if (days === 0) return `오늘 (${date})`;
  if (days === 1) return `어제 (${date})`;
  return date;
}
