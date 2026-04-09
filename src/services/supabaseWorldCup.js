import { supabase } from '../supabaseClient';

/**
 * 실제 1~3위 가져오기
 * @param {number} season
 * @returns {Promise<{rankOrder: number[]}|null>} rankOrder: [1위teamId, 2위teamId, 3위teamId]
 */
export async function getActualRank(season = 2026) {
  const { data, error } = await supabase
    .from('worldCupActualRankTable')
    .select('rank_order')
    .eq('season', season)
    .single();

  if (error) {
    console.error('❌ 월드컵 실제 순위 조회 실패:', error);
    return null;
  }
  return { rankOrder: data.rank_order };
}

/**
 * 시즌 전체 예측 가져오기
 * @param {number} season
 * @returns {Promise<Array|null>}
 */
export async function getPredictions(season = 2026) {
  const { data, error } = await supabase
    .from('worldCupPredictionTable')
    .select('id, name, student_id, picks, is_alumni, created_at, updated_at')
    .eq('season', season)
    .eq('isYN', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ 월드컵 예측 데이터 조회 실패:', error);
    return null;
  }
  return data.map((row) => ({
    name: row.name,
    studentId: row.student_id,
    picks: row.picks, // "1,23,48" 형태
    isAlumni: row.is_alumni,
    submittedAt: row.updated_at ?? row.created_at,
  }));
}

/**
 * 예측 데이터 추가
 * @param {{ name, studentId, phone, picks, isAlumni, season }} param
 * @returns {Promise<true | 'duplicate_phone' | false>}
 */
export async function addPrediction({ name, studentId, phone, picks, isAlumni, season = 2026 }) {
  const { error } = await supabase
    .from('worldCupPredictionTable')
    .insert({ season, name, student_id: studentId, phone, picks, is_alumni: isAlumni });

  if (error) {
    console.error('❌ 월드컵 예측 저장 실패:', error);
    if (error.code === '23505') return 'duplicate_phone';
    return false;
  }
  return true;
}

/**
 * 이름 + 전화번호로 내 예측 조회
 * @param {{ name, phone, season }} params
 * @returns {Promise<{name, studentId, picks, isAlumni}|null>}
 */
export async function findMyPrediction({ name, phone, season = 2026 }) {
  const { data, error } = await supabase
    .from('worldCupPredictionTable')
    .select('name, student_id, picks, is_alumni')
    .eq('season', season)
    .eq('name', name)
    .eq('phone', phone)
    .single();

  if (error || !data) return null;
  return {
    name: data.name,
    studentId: data.student_id,
    picks: data.picks,
    isAlumni: data.is_alumni,
  };
}

/**
 * 실제 순위 업데이트 (관리자용)
 * @param {number[]} rankOrder - [1위teamId, 2위teamId, 3위teamId]
 * @param {number} season
 * @returns {Promise<boolean>}
 */
export async function updateActualRank(rankOrder, season = 2026) {
  const { error } = await supabase
    .from('worldCupActualRankTable')
    .upsert({ season, rank_order: rankOrder, updated_at: new Date().toISOString() },
             { onConflict: 'season' });

  if (error) {
    console.error('❌ 월드컵 실제 순위 업데이트 실패:', error);
    return false;
  }
  return true;
}
