import { supabase } from '../../supabaseClient';

export async function loadMandalartFromDB(userId) {
  const { data, error } = await supabase
    .from('mandalartTable')
    .select('cells')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('만다라트 로드 실패:', error);
    return null;
  }
  return data?.cells ?? null;
}

export async function loadMandalartSettings(userId) {
  const { data, error } = await supabase
    .from('mandalartTable')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('만다라트 설정 로드 실패:', error);
    return null;
  }
  return data?.settings ?? null;
}

// 행이 없는 사용자도 있으므로 현재 cells 와 함께 upsert
export async function saveMandalartSettings(userId, settings, cells) {
  const { error } = await supabase
    .from('mandalartTable')
    .upsert(
      { user_id: userId, settings, cells },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('만다라트 설정 저장 실패:', error);
    return false;
  }
  return true;
}

export async function saveMandalartToDB(userId, cells) {
  const { error } = await supabase
    .from('mandalartTable')
    .upsert(
      { user_id: userId, cells, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('만다라트 저장 실패:', error);
    return false;
  }
  return true;
}
