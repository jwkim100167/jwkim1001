import { supabase } from '../../supabaseClient';
import { LOG_TYPES, typesOfCategory } from '../../utils/lifestyle/mandalartLog';
import { initEmptyState } from '../../utils/lifestyle/mandalartUtils';
import { loadMandalartSettings, saveMandalartSettings } from './mandalartService';

const GROUP_FEED_SIZE = 200; // 날짜·멤버별 건수 요약용으로 넉넉히
const CALENDAR_FEED_SIZE = 1000; // 달력 한 달치

function toRow(userId, entry) {
  return {
    user_id: userId,
    group_id: entry.group_id ?? null,
    type: entry.type,
    cell_id: entry.cell_id ?? null,
    label: entry.label ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    is_shared: LOG_TYPES[entry.type]?.shared ?? true,
  };
}

// 로그는 합치거나 지우지 않고 계속 쌓음 (insert only)
// 기록 실패는 만다라트 저장에 영향을 주지 않도록 에러만 출력
export async function writeLogs(userId, entries) {
  if (!userId || !entries?.length) return;
  try {
    const { error } = await supabase.from('mandalartLogTable').insert(entries.map(e => toRow(userId, e)));
    if (error) console.error('로그 기록 실패:', error);
  } catch (e) {
    console.error('로그 기록 실패:', e);
  }
}

// 내 로그 초기화 시각 (settings.logClearedAt). 로그 행은 지우지 않으므로 그룹 로그에는 그대로 남음
async function getLogClearedAt(userId) {
  const settings = await loadMandalartSettings(userId);
  return settings?.logClearedAt ?? null;
}

// 내 로그 초기화: 지금 시각을 기록 → 내 로그에서는 이후 로그만 표시
export async function clearMyLogs(userId) {
  const clearedAt = new Date().toISOString();
  const settings = { ...(await loadMandalartSettings(userId) || {}), logClearedAt: clearedAt };

  const { data, error } = await supabase
    .from('mandalartTable')
    .update({ settings })
    .eq('user_id', userId)
    .select('user_id');

  if (error) {
    console.error('내 로그 초기화 실패:', error);
    return { error: '내 로그 초기화에 실패했습니다.' };
  }
  // 만다라트를 아직 저장한 적 없는 사용자 → 빈 만다라트와 함께 설정 행 생성
  if (!data?.length && !(await saveMandalartSettings(userId, settings, initEmptyState()))) {
    return { error: '내 로그 초기화에 실패했습니다.' };
  }
  return { clearedAt };
}

// 내 로그 (최신순, offset 페이지네이션, 초기화 이후 것만)
export async function getMyLogs(userId, { category = 'all', offset = 0, limit = 20 } = {}) {
  const clearedAt = await getLogClearedAt(userId);
  let query = supabase
    .from('mandalartLogTable')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit);

  const types = typesOfCategory(category);
  if (types) query = query.in('type', types);
  if (clearedAt) query = query.gt('updated_at', clearedAt);

  const { data, error } = await query;
  if (error) {
    console.error('로그 조회 실패:', error);
    return { logs: [], hasMore: false };
  }
  // limit+1 건을 받아 다음 페이지 존재 여부 판단
  return { logs: (data || []).slice(0, limit), hasMore: (data || []).length > limit };
}

// 멤버들의 공개 로그(그룹 로그 제외) + 이 그룹의 그룹 로그 (range: { from, to } ISO, to 미포함)
async function fetchGroupFeed(groupId, memberIds, limit, range = null) {
  if (!memberIds?.length) return { logs: [], names: {} };

  const withRange = (q) => (range ? q.gte('updated_at', range.from).lt('updated_at', range.to) : q);
  const [{ data: memberLogs }, { data: groupLogs }] = await Promise.all([
    withRange(supabase.from('mandalartLogTable').select('*')
      .in('user_id', memberIds)
      .eq('is_shared', true)
      .is('group_id', null))
      .order('updated_at', { ascending: false })
      .limit(limit),
    withRange(supabase.from('mandalartLogTable').select('*')
      .eq('group_id', groupId))
      .order('updated_at', { ascending: false })
      .limit(limit),
  ]);

  const logs = [...(memberLogs || []), ...(groupLogs || [])]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, limit);

  // 행동한 사람 + 위임 대상 이름
  const ids = [...new Set(logs.flatMap(l => [l.user_id, l.type === 'group_owner' ? Number(l.after) : null]).filter(Boolean))];
  const names = {};
  if (ids.length) {
    const { data: users } = await supabase.from('userTable').select('id, login_id, userName').in('id', ids);
    (users || []).forEach(u => { names[u.id] = u.userName || u.login_id; });
  }
  return { logs, names };
}

// 그룹 활동 피드 (최신 GROUP_FEED_SIZE 건)
export function getGroupLogs(groupId, memberIds) {
  return fetchGroupFeed(groupId, memberIds, GROUP_FEED_SIZE);
}

// 달력용: 해당 기간의 그룹 활동 (월 단위)
export function getGroupLogsInRange(groupId, memberIds, fromIso, toIso) {
  return fetchGroupFeed(groupId, memberIds, CALENDAR_FEED_SIZE, { from: fromIso, to: toIso });
}
