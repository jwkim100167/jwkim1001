import { supabase } from '../supabaseClient';

/**
 * 서비스 활성화 상태 전체 조회
 * @returns {Promise<Object>} { kbo: true, lotto: false, ... } 형태의 맵
 */
export async function getServiceConfig() {
  const { data, error } = await supabase
    .from('serviceConfigTable')
    .select('service_id, enabled')
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ 서비스 설정 조회 실패:', error);
    return null;
  }

  const map = {};
  data.forEach((row) => { map[row.service_id] = row.enabled; });
  return map;
}

/**
 * 특정 서비스 활성화 상태 변경
 * @param {string} serviceId
 * @param {boolean} enabled
 * @returns {Promise<boolean>}
 */
export async function updateServiceConfig(serviceId, enabled) {
  const now = new Date(Date.now() + 9 * 60 * 60000).toISOString().slice(0, 19).replace('T', ' ');

  const { error } = await supabase
    .from('serviceConfigTable')
    .update({ enabled, updated_at: now })
    .eq('service_id', serviceId);

  if (error) {
    console.error('❌ 서비스 설정 업데이트 실패:', error);
    return false;
  }
  return true;
}
