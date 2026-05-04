import { supabase } from '../supabaseClient';

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
