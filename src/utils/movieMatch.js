/**
 * 사용자의 type_code(4자)와 영화의 type_codes 배열을 비교해 매칭 점수를 반환.
 * 4개 차원(세계관/감성/분위기/리듬) 중 일치하는 개수 / 4 × 100 (%).
 * @returns {number|null} 0~100 정수, 미분류 영화이면 null
 */
export function calcMatchScore(userTypeCode, movie) {
  if (!movie.type_codes || movie.type_codes.length === 0) return null;

  let bestScore = 0;
  for (const code of movie.type_codes) {
    if (!code || code.length < 4) continue;
    let matches = 0;
    for (let i = 0; i < 4; i++) {
      if (userTypeCode[i] === code[i]) matches++;
    }
    const score = Math.round((matches / 4) * 100);
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

/**
 * 영화의 suffix가 사용자의 suffix에 맞는지 확인.
 */
export function suffixMatches(userSuffix, movie) {
  return movie.suffix === 'both' || movie.suffix === userSuffix;
}

/**
 * 점수에 따른 배지 레이블 반환.
 * @returns {{ label: string, emoji: string }|null}
 */
export function getMatchBadge(score, suffixOk) {
  if (score === 100) return { label: suffixOk ? '완벽 취향' : '취향 일치', emoji: '✅' };
  if (score >= 75)   return { label: '비슷한 취향', emoji: '🔶' };
  if (score >= 50)   return { label: '부분 일치', emoji: '🔷' };
  return null;
}

/**
 * 신규 영화 목록을 매칭 점수 기준으로 정렬.
 * - 매칭 점수 >= 50 인 것 우선, 내림차순
 * - 미분류(score=null) 는 뒤로
 * - 50% 미만 매칭은 결과에서 제외 (userTypeCode가 있을 때)
 */
export function sortMoviesByMatch(movies, userTypeCode, userSuffix) {
  if (!userTypeCode) {
    // 로그인 없거나 결과 없음: 그냥 순서 유지
    return movies.slice(0, 5);
  }

  return movies
    .map(m => ({
      ...m,
      score: calcMatchScore(userTypeCode, m),
      suffixOk: suffixMatches(userSuffix, m),
    }))
    .filter(m => m.score === null || m.score >= 50)
    .sort((a, b) => {
      if (a.score !== null && b.score !== null) return b.score - a.score;
      if (a.score !== null) return -1; // 분류된 것 먼저
      return 1;
    })
    .slice(0, 5);
}
