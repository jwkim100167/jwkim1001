/**
 * Performance Index (PI) = 실제 승수 / 기대 승수
 * 기대 승수 = 각 판에서 1/인원수 합산
 *
 * 티어 기준:
 *  언랭   : 판수 < 5
 *  브론즈  : PI < 0.7
 *  실버   : PI 0.7 ~ 1.2
 *  골드   : PI 1.2 ~ 1.7
 *  플래티넘: PI 1.7 ~ 2.5
 *  다이아  : PI > 2.5 AND 판수 >= 20
 */
export function getTier(wins, total_games, expected_wins) {
  if (!total_games || total_games < 5) {
    return { label: '언랭', icon: '❓', color: '#888' };
  }
  const pi = expected_wins > 0 ? wins / expected_wins : 0;
  if (pi > 2.5 && total_games >= 20) return { label: '다이아', icon: '👑', color: '#74b9ff' };
  if (pi >= 1.7) return { label: '플래티넘', icon: '💎', color: '#a29bfe' };
  if (pi >= 1.2) return { label: '골드', icon: '🥇', color: '#f5a623' };
  if (pi >= 0.7) return { label: '실버', icon: '🥈', color: '#b2bec3' };
  return { label: '브론즈', icon: '🥉', color: '#cd7f32' };
}
