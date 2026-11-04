// 만다라트 활동 로그 — 타입 정의 / 변경 비교 / 표시 문구 (순수 함수)
import {
  STATUS_CONFIG, isCenterSectorCell, isCenterOfSector,
  getSectorAvgProgress, getTotalProgress, isAchieved,
} from './mandalartUtils';

// shared: 그룹 활동 피드 공개 여부 / mergeable: 5분 내 같은 셀·타입 변경은 1건으로 합침
export const LOG_TYPES = {
  progress:        { icon: '📊', category: 'progress', shared: true,  mergeable: true },
  title:           { icon: '✏️', category: 'edit',     shared: true,  mergeable: true },
  goal:            { icon: '🎯', category: 'edit',     shared: true,  mergeable: true },
  status:          { icon: '🚦', category: 'edit',     shared: true,  mergeable: true },
  note:            { icon: '📝', category: 'edit',     shared: false, mergeable: true },
  core:            { icon: '⭐', category: 'edit',     shared: true,  mergeable: true },
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

const OUTER_SECTORS = [0, 1, 2, 3, 5, 6, 7, 8];

function cellLabel(cell) {
  return (cell.text || '').replace(/\n/g, ' ').trim() || `섹터${cell.sectorIndex + 1} 항목`;
}

function sectorLabel(cells, sectorIndex) {
  const center = cells.find(c => c.sectorIndex === sectorIndex && isCenterOfSector(c.row, c.col));
  return (center?.text || '').replace(/\n/g, ' ').trim() || `섹터${sectorIndex + 1}`;
}

// 마지막 저장본(prev) ↔ 새 저장본(next) 비교 → 로그 후보 배열
export function diffCells(prev, next, targetRate) {
  if (!Array.isArray(prev) || !Array.isArray(next)) return [];
  const entries = [];
  const prevById = new Map(prev.map(c => [c.id, c]));

  for (const n of next) {
    const p = prevById.get(n.id);
    if (!p) continue;
    if (isCenterSectorCell(n.row, n.col)) continue; // 연동(미러) 칸은 원본 칸 기준으로만 기록

    const isCore = n.row === 4 && n.col === 4;
    const isAction = !isCenterOfSector(n.row, n.col);
    const label = cellLabel(n.text ? n : p);
    const base = { cell_id: n.id, label };

    if ((p.text || '') !== (n.text || '')) {
      entries.push({ ...base, type: isCore ? 'core' : 'title', before: p.text || '', after: n.text || '' });
    }
    if ((p.goal || '') !== (n.goal || '')) {
      entries.push({ ...base, type: 'goal', before: p.goal || '', after: n.goal || '' });
    }
    if ((p.status || '') !== (n.status || '')) {
      entries.push({ ...base, type: 'status', before: p.status || '', after: n.status || '' });
    }
    if ((p.note || '') !== (n.note || '')) {
      entries.push({ ...base, type: 'note', before: null, after: null }); // 메모 내용은 기록하지 않음
    }
    if (isAction && (p.progress ?? 0) !== (n.progress ?? 0)) {
      const before = p.progress ?? 0;
      const after = n.progress ?? 0;
      entries.push({ ...base, type: 'progress', before: String(before), after: String(after) });
      if (isAchieved(after, targetRate) && !isAchieved(before, targetRate)) {
        entries.push({ ...base, type: 'cell_achieved', before: null, after: String(after) });
      }
    }
  }

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

function q(text) {
  return `‘${(text || '').replace(/\n/g, ' ')}’`;
}

function statusText(key) {
  if (!key) return '해제';
  const icon = key === 'good' ? '✅' : key === 'normal' ? '🟡' : '❌';
  return `${icon} ${STATUS_CONFIG[key]?.label ?? key}`;
}

// names: { [userId]: 이름 } — 그룹 로그의 위임 대상 등 표시용
export function formatLog(log, names = {}) {
  const icon = LOG_TYPES[log.type]?.icon ?? '•';
  const L = q(log.label);
  let text;
  switch (log.type) {
    case 'progress':        text = `${L} 진행도 ${log.before}% → ${log.after}%`; break;
    case 'title':           text = log.before ? `항목 ${q(log.before)} → ${q(log.after)}` : `항목 ${q(log.after)} 작성`; break;
    case 'goal':            text = `${L} 목표 ${log.before ? `${q(log.before)} → ` : ''}${q(log.after)}`; break;
    case 'status':          text = `${L} 상태 → ${statusText(log.after)}`; break;
    case 'note':            text = `${L} 메모 수정`; break;
    case 'core':            text = `핵심 목표 → ${q(log.after)}`; break;
    case 'cell_achieved':   text = `${L} 목표 달성 (${log.after}%)`; break;
    case 'sector_achieved': text = `${L} 섹터 목표 달성! (${log.after}%)`; break;
    case 'total_milestone': text = `전체 진행률 ${log.after}% 돌파`; break;
    case 'total_achieved':  text = `만다라트 전체 목표 달성! (${log.after}%)`; break;
    case 'target_rate':     text = `목표 달성률 ${log.before}% → ${log.after}%`; break;
    case 'visibility':      text = log.after === 'true' ? '소셜에 공개함' : '소셜 비공개로 전환'; break;
    case 'group_join':      text = `그룹 ${q(log.label)}에 들어왔어요`; break;
    case 'group_leave':     text = `그룹 ${q(log.label)}을(를) 나갔어요`; break;
    case 'group_owner':     text = `${names[log.after] ?? '멤버'}님에게 방장 위임`; break;
    case 'group_rename':    text = `그룹 이름 ${q(log.before)} → ${q(log.after)}`; break;
    default:                text = log.type;
  }
  return { icon, text };
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

// 날짜 묶음 제목 (오늘 / 어제 / 11.2)
export function dateGroupLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  return `${d.getMonth() + 1}.${d.getDate()}`;
}
