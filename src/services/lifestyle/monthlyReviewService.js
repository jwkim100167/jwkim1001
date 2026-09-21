import { supabase } from '../../supabaseClient';

export async function loadMonthlyReview(userId, yearMonth) {
  const { data, error } = await supabase
    .from('monthly_review')
    .select('answers')
    .eq('user_id', userId)
    .eq('year_month', yearMonth)
    .maybeSingle();
  if (error) {
    console.error('먼슬리뷰 로드 실패:', error);
    return null;
  }
  return data?.answers ?? {};
}

export async function saveMonthlyReview(userId, yearMonth, answers) {
  const { error } = await supabase
    .from('monthly_review')
    .upsert(
      { user_id: userId, year_month: yearMonth, answers, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,year_month' }
    );
  if (error) {
    console.error('먼슬리뷰 저장 실패:', error);
    return false;
  }
  return true;
}
