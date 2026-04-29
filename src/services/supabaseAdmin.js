import { supabase } from '../supabaseClient';

/**
 * 서비스 활성화 상태 + 순서 전체 조회
 * @returns {Promise<{ enabledMap: Object, sortedIds: string[] }>}
 */
export async function getServiceConfig() {
  const { data, error } = await supabase
    .from('serviceConfigTable')
    .select('service_id, enabled, sort_order')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('❌ 서비스 설정 조회 실패:', error);
    return null;
  }

  const enabledMap = {};
  const sortedIds = [];
  data.forEach((row) => {
    enabledMap[row.service_id] = row.enabled;
    sortedIds.push(row.service_id);
  });
  return { enabledMap, sortedIds };
}

/**
 * 서비스 순서 일괄 업데이트
 * @param {string[]} orderedIds - 순서대로 나열된 service_id 배열
 * @returns {Promise<boolean>}
 */
export async function updateServiceOrder(orderedIds) {
  const results = await Promise.all(
    orderedIds.map((serviceId, index) =>
      supabase
        .from('serviceConfigTable')
        .update({ sort_order: index + 1 })
        .eq('service_id', serviceId)
    )
  );
  const hasError = results.some(({ error }) => error);
  if (hasError) {
    console.error('❌ 서비스 순서 업데이트 실패');
    return false;
  }
  return true;
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
