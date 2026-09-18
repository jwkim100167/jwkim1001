/**
 * 6인자 매칭 점수: (dim_matches + suffix_match + resolve_match) / 6 × 100
 * @returns {number|null} 0~100 정수, 미분류 영화이면 null
 */
export function calcMatchScore(userTypeCode, userSuffix, userResolve, movie) {
  if (!movie.type_codes || movie.type_codes.length === 0) return null;

  const suffixOk = movie.suffix === 'both' || movie.suffix === userSuffix;
  const resolveOk = !userResolve || movie.resolve === 'both' || movie.resolve === userResolve;

  let bestScore = 0;
  for (const code of movie.type_codes) {
    if (!code || code.length < 4) continue;
    let dimMatches = 0;
    for (let i = 0; i < 4; i++) {
      if (userTypeCode[i] === code[i]) dimMatches++;
    }
    const total = dimMatches + (suffixOk ? 1 : 0) + (resolveOk ? 1 : 0);
    const score = Math.round((total / 6) * 100);
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

/**
 * 점수에 따른 배지 레이블 반환 (6인자 기준).
 * @returns {{ label: string, emoji: string }|null}
 */
export function getMatchBadge(score) {
  if (score === 100) return { label: '완벽 취향', emoji: '✅' };
  if (score >= 83)   return { label: '매우 비슷', emoji: '🔶' };
  if (score >= 67)   return { label: '비슷한 취향', emoji: '🔷' };
  if (score >= 50)   return { label: '부분 일치', emoji: '💠' };
  return null;
}

/**
 * 신규 영화 목록을 6인자 매칭 점수 기준으로 정렬.
 * - 매칭 점수 >= 50 인 것 우선, 내림차순
 * - 미분류(score=null) 는 뒤로
 * - 50% 미만 매칭은 결과에서 제외 (userTypeCode가 있을 때)
 */
export function sortMoviesByMatch(movies, userTypeCode, userSuffix, userResolve) {
  if (!userTypeCode) {
    return movies.slice(0, 5);
  }

  return movies
    .map(m => ({
      ...m,
      score: calcMatchScore(userTypeCode, userSuffix, userResolve, m),
    }))
    .filter(m => m.score === null || m.score >= 50)
    .sort((a, b) => {
      if (a.score !== null && b.score !== null) return b.score - a.score;
      if (a.score !== null) return -1;
      return 1;
    })
    .slice(0, 5);
}
