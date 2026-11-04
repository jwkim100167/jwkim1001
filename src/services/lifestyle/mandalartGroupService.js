import { supabase } from '../../supabaseClient';
import { loadMandalartFromDB, loadMandalartSettings } from './mandalartService';
import { isMandalartPublic } from './mandalartSocialService';
import { writeLogs } from './mandalartLogService';
import { normalizeCells, getTotalProgress, normalizeSettings, isAchieved } from '../../utils/lifestyle/mandalartUtils';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0/O, 1/I 제외

function generateInviteCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function createGroup(userId, name) {
  const trimmed = name.trim();
  if (!trimmed) return { error: '그룹 이름을 입력해주세요.' };

  // 초대코드 중복 시 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('mandalartGroupTable')
      .insert({ name: trimmed, invite_code: generateInviteCode(), owner_id: userId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') continue; // unique violation
      console.error('그룹 생성 실패:', error);
      return { error: '그룹 생성에 실패했습니다.' };
    }

    const { error: memberError } = await supabase
      .from('mandalartGroupMemberTable')
      .insert({ group_id: data.id, user_id: userId });
    if (memberError) {
      console.error('그룹 멤버 등록 실패:', memberError);
      return { error: '그룹 멤버 등록에 실패했습니다.' };
    }
    writeLogs(userId, [{ type: 'group_join', group_id: data.id, label: data.name }]);
    return { group: data };
  }
  return { error: '초대코드 생성에 실패했습니다. 다시 시도해주세요.' };
}

export async function joinGroupByCode(userId, code) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: '초대코드를 입력해주세요.' };

  const { data: group, error } = await supabase
    .from('mandalartGroupTable')
    .select('*')
    .eq('invite_code', normalized)
    .maybeSingle();

  if (error) {
    console.error('그룹 조회 실패:', error);
    return { error: '그룹 조회에 실패했습니다.' };
  }
  if (!group) return { error: '존재하지 않는 초대코드입니다.' };

  const { data: inserted, error: memberError } = await supabase
    .from('mandalartGroupMemberTable')
    .upsert({ group_id: group.id, user_id: userId }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
    .select();
  if (memberError) {
    console.error('그룹 가입 실패:', memberError);
    return { error: '그룹 가입에 실패했습니다.' };
  }
  // 이미 멤버였으면 inserted 가 비어 있음 → 로그 생략
  if (inserted?.length) {
    writeLogs(userId, [{ type: 'group_join', group_id: group.id, label: group.name }]);
  }
  return { group };
}

// 방장은 다른 멤버가 있으면 위임 후에만 나갈 수 있음. 혼자 남은 방장이 나가면 그룹 삭제
export async function leaveGroup(userId, group) {
  if (group.owner_id === userId) {
    if (group.memberCount > 1) {
      return { error: '방장은 다른 멤버에게 방장을 위임한 후 나갈 수 있어요.' };
    }
    const { error } = await supabase
      .from('mandalartGroupTable')
      .delete()
      .eq('id', group.id)
      .eq('owner_id', userId);
    if (error) {
      console.error('그룹 삭제 실패:', error);
      return { error: '그룹 삭제에 실패했습니다.' };
    }
    return { deleted: true };
  }

  const { error } = await supabase
    .from('mandalartGroupMemberTable')
    .delete()
    .eq('group_id', group.id)
    .eq('user_id', userId);

  if (error) {
    console.error('그룹 나가기 실패:', error);
    return { error: '그룹 나가기에 실패했습니다.' };
  }
  writeLogs(userId, [{ type: 'group_leave', group_id: group.id, label: group.name }]);
  return {};
}

// 방장만 그룹 이름 변경 가능
export async function renameGroup(userId, groupId, name) {
  const trimmed = name.trim();
  if (!trimmed) return { error: '그룹 이름을 입력해주세요.' };

  const { data: before } = await supabase
    .from('mandalartGroupTable')
    .select('name')
    .eq('id', groupId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('mandalartGroupTable')
    .update({ name: trimmed })
    .eq('id', groupId)
    .eq('owner_id', userId)
    .select();

  if (error || !data?.length) {
    console.error('그룹 이름 변경 실패:', error);
    return { error: '방장만 그룹 이름을 바꿀 수 있어요.' };
  }
  if (before?.name !== trimmed) {
    writeLogs(userId, [{ type: 'group_rename', group_id: groupId, label: trimmed, before: before?.name ?? '', after: trimmed }]);
  }
  return { group: data[0] };
}

// 방장 위임 (현재 방장만 가능)
export async function transferOwner(userId, groupId, newOwnerId) {
  const { data, error } = await supabase
    .from('mandalartGroupTable')
    .update({ owner_id: newOwnerId })
    .eq('id', groupId)
    .eq('owner_id', userId)
    .select();

  if (error || !data?.length) {
    console.error('방장 위임 실패:', error);
    return { error: '방장만 위임할 수 있어요.' };
  }
  writeLogs(userId, [{ type: 'group_owner', group_id: groupId, label: data[0].name, before: String(userId), after: String(newOwnerId) }]);
  return { group: data[0] };
}

// 내가 속한 그룹 목록 (+ 인원 수)
export async function getMyGroups(userId) {
  const { data: memberships, error } = await supabase
    .from('mandalartGroupMemberTable')
    .select('group_id')
    .eq('user_id', userId);

  if (error) {
    console.error('내 그룹 조회 실패:', error);
    return [];
  }
  const groupIds = (memberships || []).map(m => m.group_id);
  if (groupIds.length === 0) return [];

  const [{ data: groups }, { data: allMembers }] = await Promise.all([
    supabase.from('mandalartGroupTable').select('*').in('id', groupIds).order('created_at'),
    supabase.from('mandalartGroupMemberTable').select('group_id').in('group_id', groupIds),
  ]);

  return (groups || []).map(g => ({
    ...g,
    memberCount: (allMembers || []).filter(m => m.group_id === g.id).length,
  }));
}

// 그룹 멤버 목록 (+ 만다라트 달성률, 핵심목표)
export async function getGroupMembers(groupId) {
  const { data: memberships, error } = await supabase
    .from('mandalartGroupMemberTable')
    .select('user_id, joined_at')
    .eq('group_id', groupId);

  if (error) {
    console.error('그룹 멤버 조회 실패:', error);
    return [];
  }
  const userIds = (memberships || []).map(m => m.user_id);
  if (userIds.length === 0) return [];

  const [{ data: users }, { data: mandalarts }] = await Promise.all([
    supabase.from('userTable').select('id, login_id, userName').in('id', userIds),
    supabase.from('mandalartTable').select('user_id, cells, updated_at, settings').in('user_id', userIds),
  ]);

  return userIds.map(uid => {
    const u = (users || []).find(x => x.id === uid);
    const m = (mandalarts || []).find(x => x.user_id === uid);
    const cells = Array.isArray(m?.cells) ? normalizeCells(m.cells) : null;
    const totalProgress = cells ? getTotalProgress(cells) : 0;
    const { targetRate } = normalizeSettings(m?.settings);
    return {
      userId: uid,
      name: u?.userName || u?.login_id || '알 수 없음',
      coreGoal: cells?.find(c => c.id === 'r4c4')?.text || '',
      totalProgress,
      targetRate,
      achieved: isAchieved(totalProgress, targetRate),
      updatedAt: m?.updated_at ?? null,
    };
  }).sort((a, b) => b.totalProgress - a.totalProgress);
}

// 같은 그룹에 속해 있는지
async function isGroupMate(viewerId, targetId) {
  const { data, error } = await supabase
    .from('mandalartGroupMemberTable')
    .select('group_id, user_id')
    .in('user_id', [viewerId, targetId]);

  if (error || !data) return false;
  const viewerGroups = new Set(data.filter(d => d.user_id === viewerId).map(d => d.group_id));
  return data.some(d => d.user_id === targetId && viewerGroups.has(d.group_id));
}

// 그룹원 또는 소셜 공개된 만다라트 조회 (메모 제외)
export async function loadMemberMandalart(viewerId, targetId) {
  const [mate, isPublic] = await Promise.all([
    isGroupMate(viewerId, targetId),
    isMandalartPublic(targetId),
  ]);
  if (!mate && !isPublic) {
    return { error: '같은 그룹 멤버이거나 소셜에 공개된 만다라트만 볼 수 있습니다.' };
  }

  const [cells, settings, { data: target }] = await Promise.all([
    loadMandalartFromDB(targetId),
    loadMandalartSettings(targetId),
    supabase.from('userTable').select('login_id, userName').eq('id', targetId).maybeSingle(),
  ]);

  return {
    name: target?.userName || target?.login_id || '알 수 없음',
    cells: Array.isArray(cells) ? cells.map(c => ({ ...c, note: '' })) : null,
    settings: normalizeSettings(settings),
  };
}
