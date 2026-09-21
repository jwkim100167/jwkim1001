import { supabase } from '../../supabaseClient';

/**
 * 서비스 활성화 상태 + 순서 전체 조회
 * @returns {Promise<{ enabledMap: Object, sortedIds: string[] }>}
 */
export async function getServiceConfig() {
  const { data, error } = await supabase
    .from('serviceConfigTable')
    .select('service_id, enabled, sort_order, parent_id')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('❌ 서비스 설정 조회 실패:', error);
    return null;
  }

  const enabledMap = {};
  const sortedIds = [];   // 최상위(parent_id = null)만
  const childrenMap = {}; // { parentId: [childId, ...] }

  data.forEach((row) => {
    enabledMap[row.service_id] = row.enabled;
    if (!row.parent_id) {
      sortedIds.push(row.service_id);
    } else {
      if (!childrenMap[row.parent_id]) childrenMap[row.parent_id] = [];
      childrenMap[row.parent_id].push(row.service_id);
    }
  });

  return { enabledMap, sortedIds, childrenMap };
}

/**
 * 서비스 순서 일괄 업데이트
 * @param {string[]} orderedIds - 순서대로 나열된 service_id 배열
 * @returns {Promise<boolean>}
 */
export async function updateServiceOrder(orderedIds) {
  const results = await Promise.all(
    orderedIds.map(async (serviceId, index) => {
      const { data: updated, error: updateError } = await supabase
        .from('serviceConfigTable')
        .update({ sort_order: index + 1 })
        .eq('service_id', serviceId)
        .select();

      if (updateError) return { error: updateError };

      // 레코드가 없으면 새로 삽입 (신규 서비스 대응)
      if (!updated || updated.length === 0) {
        return supabase
          .from('serviceConfigTable')
          .insert({ service_id: serviceId, sort_order: index + 1, enabled: 'on' });
      }

      return { error: null };
    })
  );
  const hasError = results.some(({ error }) => error);
  if (hasError) {
    console.error('❌ 서비스 순서 업데이트 실패');
    return false;
  }
  return true;
}

/**
 * 하위 서비스 순서 일괄 업데이트
 * @param {string} parentId - 부모 service_id
 * @param {string[]} childIds - 순서대로 나열된 하위 service_id 배열
 * @returns {Promise<boolean>}
 */
export async function updateChildOrder(parentId, childIds) {
  const results = await Promise.all(
    childIds.map(async (serviceId, index) => {
      const { data: updated, error: updateError } = await supabase
        .from('serviceConfigTable')
        .update({ sort_order: index + 1, parent_id: parentId })
        .eq('service_id', serviceId)
        .select();

      if (updateError) return { error: updateError };

      if (!updated || updated.length === 0) {
        return supabase
          .from('serviceConfigTable')
          .insert({ service_id: serviceId, sort_order: index + 1, enabled: 'on', parent_id: parentId });
      }

      return { error: null };
    })
  );
  const hasError = results.some(({ error }) => error);
  if (hasError) {
    console.error('❌ 하위 서비스 순서 업데이트 실패');
    return false;
  }
  return true;
}

/**
 * 메뉴 클릭 카운트 1 증가
 * @param {string} serviceId
 * @returns {Promise<void>}
 */
export async function incrementMenuClickCount(serviceId) {
  const { error } = await supabase.rpc('increment_menu_click', { p_service_id: serviceId });
  if (error) {
    console.error('❌ 클릭 카운트 업데이트 실패:', error);
  }
}

/**
 * 특정 서비스 상태 변경
 * @param {string} serviceId
 * @param {'on'|'offline'|'hidden'} status
 * @returns {Promise<boolean>}
 */
export async function updateServiceConfig(serviceId, status) {
  const now = new Date(Date.now() + 9 * 60 * 60000).toISOString().slice(0, 19).replace('T', ' ');

  // 기존 행 업데이트 시도
  const { data: updated, error: updateError } = await supabase
    .from('serviceConfigTable')
    .update({ enabled: status, updated_at: now })
    .eq('service_id', serviceId)
    .select();

  if (updateError) {
    console.error('❌ 서비스 설정 업데이트 실패:', updateError);
    return false;
  }

  // 행이 없었으면 새로 삽입
  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from('serviceConfigTable')
      .insert({ service_id: serviceId, enabled: status, updated_at: now });

    if (insertError) {
      console.error('❌ 서비스 설정 삽입 실패:', insertError);
      return false;
    }
  }

  return true;
}
