import { supabase } from '../supabaseClient';

/**
 * 시즌 실제 순위 가져오기
 * @param {number} season - 시즌 연도 (default: 2026)
 * @returns {Promise<number[]|null>} - 팀 ID 배열 (1위~10위), 실패 시 null
 */
export async function getActualRank(season = 2026) {
  const { data, error } = await supabase
    .from('kboActualRankTable')
    .select('rank_order')
    .eq('season', season)
    .single();

  if (error) {
    console.error('❌ 실제 순위 조회 실패:', error);
    return null;
  }
  return data.rank_order; // jsonb → JS 배열로 자동 파싱됨
}

/**
 * 시즌 예측 데이터 전체 가져오기
 * @param {number} season - 시즌 연도 (default: 2026)
 * @returns {Promise<Array|null>}
 */
export async function getPredictions(season = 2026) {
  const { data, error } = await supabase
    .from('kboPredictionTable')
    .select('id, name, data, my_team')
    .eq('season', season)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ 예측 데이터 조회 실패:', error);
    return null;
  }
  // my_team 컬럼을 컴포넌트가 기대하는 myTeam 형식으로 변환
  return data.map((row) => ({
    name: row.name,
    data: row.data,
    myTeam: String(row.my_team),
  }));
}

/**
 * 예측 데이터 추가
 * @param {{ name: string, data: string, myTeam: string|number, season?: number }} prediction
 * @returns {Promise<boolean>}
 */
export async function addPrediction({ name, phone, data, myTeam, season = 2026 }) {
  const { error } = await supabase
    .from('kboPredictionTable')
    .insert({ season, name, phone, data, my_team: parseInt(myTeam, 10) });

  if (error) {
    console.error('❌ 예측 데이터 저장 실패:', error);
    return false;
  }
  return true;
}

/**
 * 이름 + 전화번호로 내 예측 조회
 * @param {{ name: string, phone: string, season?: number }} params
 * @returns {Promise<{name, data, myTeam}|null>} 일치하면 예측 데이터, 없으면 null
 */
export async function findMyPrediction({ name, phone, season = 2026 }) {
  const { data, error } = await supabase
    .from('kboPredictionTable')
    .select('name, data, my_team')
    .eq('season', season)
    .eq('name', name)
    .eq('phone', phone)
    .single();

  if (error || !data) return null;
  return { name: data.name, data: data.data, myTeam: String(data.my_team) };
}

/**
 * 예측 데이터 수정 (이름 + 전화번호로 식별)
 * @param {{ name: string, phone: string, data: string, myTeam: string|number, season?: number }} prediction
 * @returns {Promise<boolean>}
 */
export async function updatePrediction({ name, phone, data, myTeam, season = 2026 }) {
  const { data: updated, error } = await supabase
    .from('kboPredictionTable')
    .update({ data, my_team: parseInt(myTeam, 10), updated_at: new Date().toISOString() })
    .eq('season', season)
    .eq('name', name)
    .eq('phone', phone)
    .select();

  if (error) {
    console.error('❌ 예측 데이터 수정 실패:', error);
    return false;
  }
  if (!updated || updated.length === 0) {
    console.error('❌ 예측 데이터 수정 실패: 업데이트된 행 없음 (RLS 정책 또는 조건 불일치)');
    return false;
  }
  return true;
}

/**
 * 실제 순위 업데이트 (관리자용)
 * @param {number[]} rankOrder - 팀 ID 배열 (1위~10위)
 * @param {number} season
 * @returns {Promise<boolean>}
 */
export async function updateActualRank(rankOrder, season = 2026) {
  const { error } = await supabase
    .from('kboActualRankTable')
    .upsert({ season, rank_order: rankOrder, updated_at: new Date().toISOString() },
             { onConflict: 'season' });

  if (error) {
    console.error('❌ 실제 순위 업데이트 실패:', error);
    return false;
  }
  return true;
}
