import { supabase } from '../../supabaseClient';
import { LOG_TYPES, typesOfCategory } from '../../utils/lifestyle/mandalartLog';

const MERGE_WINDOW_MS = 5 * 60 * 1000;
const GROUP_FEED_SIZE = 30;

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

// 같은 셀·타입이 5분 내 다시 바뀌면 직전 로그의 after 만 갱신 (before 는 최초값 유지)
async function mergeOrInsert(userId, entry) {
  const since = new Date(Date.now() - MERGE_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from('mandalartLogTable')
    .select('id, before')
    .eq('user_id', userId)
    .eq('type', entry.type)
    .eq('cell_id', entry.cell_id)
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(1);

  const last = recent?.[0];
  if (!last) {
    return supabase.from('mandalartLogTable').insert(toRow(userId, entry));
  }
  // 되돌려서 원래 값이 되면 로그 삭제 (예: 40 → 60 → 40)
  if (entry.type !== 'note' && (last.before ?? '') === (entry.after ?? '')) {
    return supabase.from('mandalartLogTable').delete().eq('id', last.id);
  }
  return supabase
    .from('mandalartLogTable')
    .update({ after: entry.after ?? null, label: entry.label ?? null, updated_at: new Date().toISOString() })
    .eq('id', last.id);
}

// 로그 기록 실패는 만다라트 저장에 영향을 주지 않도록 에러만 출력
export async function writeLogs(userId, entries) {
  if (!userId || !entries?.length) return;
  try {
    const mergeable = entries.filter(e => LOG_TYPES[e.type]?.mergeable && e.cell_id);
    const plain = entries.filter(e => !(LOG_TYPES[e.type]?.mergeable && e.cell_id));

    for (const entry of mergeable) {
      const { error } = await mergeOrInsert(userId, entry);
      if (error) console.error('로그 기록 실패:', error);
    }
    if (plain.length) {
      const { error } = await supabase.from('mandalartLogTable').insert(plain.map(e => toRow(userId, e)));
      if (error) console.error('로그 기록 실패:', error);
    }
  } catch (e) {
    console.error('로그 기록 실패:', e);
  }
}

// 내 로그 (최신순, offset 페이지네이션)
export async function getMyLogs(userId, { category = 'all', offset = 0, limit = 20 } = {}) {
  let query = supabase
    .from('mandalartLogTable')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit);

  const types = typesOfCategory(category);
  if (types) query = query.in('type', types);

  const { data, error } = await query;
  if (error) {
    console.error('로그 조회 실패:', error);
    return { logs: [], hasMore: false };
  }
  // limit+1 건을 받아 다음 페이지 존재 여부 판단
  return { logs: (data || []).slice(0, limit), hasMore: (data || []).length > limit };
}

// 그룹 활동 피드: 멤버들의 공개 로그(그룹 로그 제외) + 이 그룹의 그룹 로그
export async function getGroupLogs(groupId, memberIds) {
  if (!memberIds?.length) return { logs: [], names: {} };

  const [{ data: memberLogs }, { data: groupLogs }] = await Promise.all([
    supabase.from('mandalartLogTable').select('*')
      .in('user_id', memberIds)
      .eq('is_shared', true)
      .is('group_id', null)
      .order('updated_at', { ascending: false })
      .limit(GROUP_FEED_SIZE),
    supabase.from('mandalartLogTable').select('*')
      .eq('group_id', groupId)
      .order('updated_at', { ascending: false })
      .limit(GROUP_FEED_SIZE),
  ]);

  const logs = [...(memberLogs || []), ...(groupLogs || [])]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, GROUP_FEED_SIZE);

  // 행동한 사람 + 위임 대상 이름
  const ids = [...new Set(logs.flatMap(l => [l.user_id, l.type === 'group_owner' ? Number(l.after) : null]).filter(Boolean))];
  const names = {};
  if (ids.length) {
    const { data: users } = await supabase.from('userTable').select('id, login_id, userName').in('id', ids);
    (users || []).forEach(u => { names[u.id] = u.userName || u.login_id; });
  }
  return { logs, names };
}
