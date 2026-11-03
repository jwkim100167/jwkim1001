import { supabase } from '../../supabaseClient';
import { normalizeCells, getTotalProgress, normalizeSettings, isAchieved } from '../../utils/lifestyle/mandalartUtils';

const FEED_SIZE = 10;

// 내 만다라트 소셜 공개 여부 (row 없으면 null)
export async function getMyPublic(userId) {
  const { data, error } = await supabase
    .from('mandalartTable')
    .select('is_public')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('공개 설정 조회 실패:', error);
    return null;
  }
  return data ? !!data.is_public : null;
}

export async function setMyPublic(userId, isPublic) {
  const { data, error } = await supabase
    .from('mandalartTable')
    .update({ is_public: isPublic })
    .eq('user_id', userId)
    .select('is_public');

  if (error) {
    console.error('공개 설정 변경 실패:', error);
    return { error: '공개 설정 변경에 실패했습니다.' };
  }
  if (!data?.length) return { error: '만다라트를 먼저 작성한 후 공개할 수 있어요.' };
  return { isPublic: !!data[0].is_public };
}

export async function isMandalartPublic(userId) {
  return (await getMyPublic(userId)) === true;
}

// 소셜 피드: 공개된 만다라트의 최신순 / 응원순 각 10개
export async function getSocialFeed(viewerId) {
  const { data: rows, error } = await supabase
    .from('mandalartTable')
    .select('user_id, cells, updated_at, settings')
    .eq('is_public', true);

  if (error) {
    console.error('소셜 피드 조회 실패:', error);
    return { latest: [], popular: [] };
  }
  const userIds = (rows || []).map(r => r.user_id);
  if (userIds.length === 0) return { latest: [], popular: [] };

  const [{ data: users }, { data: likes }] = await Promise.all([
    supabase.from('userTable').select('id, login_id, userName').in('id', userIds),
    supabase.from('mandalartLikeTable').select('target_user_id, user_id').in('target_user_id', userIds),
  ]);

  const items = rows.map(r => {
    const u = (users || []).find(x => x.id === r.user_id);
    const cells = Array.isArray(r.cells) ? normalizeCells(r.cells) : null;
    const targetLikes = (likes || []).filter(l => l.target_user_id === r.user_id);
    const totalProgress = cells ? getTotalProgress(cells) : 0;
    const { targetRate } = normalizeSettings(r.settings);
    return {
      userId: r.user_id,
      name: u?.userName || u?.login_id || '알 수 없음',
      coreGoal: cells?.find(c => c.id === 'r4c4')?.text || '',
      totalProgress,
      targetRate,
      achieved: isAchieved(totalProgress, targetRate),
      updatedAt: r.updated_at,
      likeCount: targetLikes.length,
      likedByMe: targetLikes.some(l => l.user_id === viewerId),
    };
  });

  const byUpdated = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);
  return {
    latest: [...items].sort(byUpdated).slice(0, FEED_SIZE),
    popular: [...items].sort((a, b) => b.likeCount - a.likeCount || byUpdated(a, b)).slice(0, FEED_SIZE),
  };
}

// 응원 토글 (liked: 현재 응원한 상태인지)
export async function toggleLike(viewerId, targetId, liked) {
  const query = liked
    ? supabase.from('mandalartLikeTable').delete().eq('target_user_id', targetId).eq('user_id', viewerId)
    : supabase.from('mandalartLikeTable').upsert(
        { target_user_id: targetId, user_id: viewerId },
        { onConflict: 'target_user_id,user_id', ignoreDuplicates: true }
      );
  const { error } = await query;
  if (error) {
    console.error('응원 실패:', error);
    return false;
  }
  return true;
}
