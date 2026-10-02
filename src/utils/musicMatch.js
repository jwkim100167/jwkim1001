/**
 * 4인자 매칭 점수: dim_matches / 4 × 100
 * @returns {number|null} 0~100 정수
 */
export function calcMusicMatchScore(userTypeCode, song) {
  if (!song.type_codes || song.type_codes.length === 0) return null;

  let bestScore = 0;
  for (const code of song.type_codes) {
    if (!code || code.length < 4) continue;
    let dimMatches = 0;
    for (let i = 0; i < 4; i++) {
      if (userTypeCode[i] === code[i]) dimMatches++;
    }
    const score = Math.round((dimMatches / 4) * 100);
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

/**
 * 점수에 따른 배지 레이블 반환.
 * @returns {{ label: string, emoji: string }|null}
 */
export function getMusicMatchBadge(score) {
  if (score === 100) return { label: '완벽 취향', emoji: '✅' };
  if (score >= 75)  return { label: '매우 비슷', emoji: '🔶' };
  if (score >= 50)  return { label: '비슷한 취향', emoji: '🔷' };
  return null;
}

/**
 * 노래 목록을 매칭 점수 기준으로 정렬 후 상위 5개 반환.
 */
export function sortSongsByMatch(songs, userTypeCode) {
  if (!userTypeCode) return songs.slice(0, 5);

  return songs
    .map(s => ({ ...s, score: calcMusicMatchScore(userTypeCode, s) }))
    .filter(s => s.score === null || s.score >= 50)
    .sort((a, b) => {
      if (a.score !== null && b.score !== null) return b.score - a.score;
      if (a.score !== null) return -1;
      return 1;
    })
    .slice(0, 5);
}
