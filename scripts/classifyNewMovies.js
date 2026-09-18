import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = 'https://uustelhozdrsvbgqkmxq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY 없음'); process.exit(1); }
if (!TMDB_API_KEY)     { console.error('TMDB_API_KEY 없음'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// TMDB 장르 ID → 각 차원 투표
// world: R/F, sense: H/M, tone: L/N, rhythm: P/S, suffix: C/X, resolve: K/D
const GENRE_VOTES = {
  28:    { rhythm: 'P', tone: 'N', resolve: 'K' },                           // Action
  12:    { world: 'F', rhythm: 'P', resolve: 'K' },                          // Adventure
  16:    { world: 'F', tone: 'L', suffix: 'C', resolve: 'K' },               // Animation
  35:    { tone: 'L', suffix: 'C', resolve: 'K' },                           // Comedy
  80:    { world: 'R', sense: 'M', tone: 'N', suffix: 'X' },                 // Crime
  99:    { world: 'R', rhythm: 'S', resolve: 'D' },                          // Documentary
  18:    { world: 'R', sense: 'H', resolve: 'D' },                           // Drama
  10751: { tone: 'L', suffix: 'C', rhythm: 'S' },                            // Family
  14:    { world: 'F' },                                                       // Fantasy
  27:    { tone: 'N', suffix: 'X', resolve: 'K' },                           // Horror
  9648:  { sense: 'M', tone: 'N', resolve: 'D' },                            // Mystery
  10749: { sense: 'H', tone: 'L', rhythm: 'S', suffix: 'C', resolve: 'D' }, // Romance
  878:   { world: 'F' },                                                       // Sci-Fi
  53:    { sense: 'M', tone: 'N', rhythm: 'P', suffix: 'X', resolve: 'K' },  // Thriller
  10752: { world: 'R', tone: 'N', suffix: 'X', resolve: 'D' },               // War
  37:    { world: 'R', tone: 'N' },                                           // Western
};

// 동점 기본값
const DEFAULTS = { world: 'R', sense: 'H', tone: 'L', rhythm: 'S' };

function classifyByGenres(genreIds) {
  const v = {
    world:   { R: 0, F: 0 },
    sense:   { H: 0, M: 0 },
    tone:    { L: 0, N: 0 },
    rhythm:  { S: 0, P: 0 },
    suffix:  { C: 0, X: 0 },
    resolve: { K: 0, D: 0 },
  };

  for (const gid of genreIds) {
    const votes = GENRE_VOTES[gid];
    if (!votes) continue;
    for (const [dim, val] of Object.entries(votes)) {
      if (v[dim]) v[dim][val]++;
    }
  }

  const pick = (dim, a, b) => {
    if (v[dim][a] > v[dim][b]) return a;
    if (v[dim][b] > v[dim][a]) return b;
    return DEFAULTS[dim] || a; // 동점이면 기본값
  };

  const world  = pick('world',  'R', 'F');
  const sense  = pick('sense',  'H', 'M');
  const tone   = pick('tone',   'L', 'N');
  const rhythm = pick('rhythm', 'S', 'P');
  const code   = `${world}${sense}${tone}${rhythm}`;

  // suffix: margin > 1이면 명확, 그 이하면 'both'
  const xVotes = v.suffix.X;
  const cVotes = v.suffix.C;
  const suffix = (xVotes - cVotes > 1) ? 'X'
               : (cVotes - xVotes > 1) ? 'C'
               : 'both';

  // resolve: margin > 1이면 명확, 그 이하면 'both'
  const kVotes = v.resolve.K;
  const dVotes = v.resolve.D;
  const resolve = (kVotes - dVotes > 1) ? 'K'
                : (dVotes - kVotes > 1) ? 'D'
                : 'both';

  // 인접 유형: 투표 마진이 ≤1인 차원을 뒤집은 코드 포함
  const dims = [
    { pos: 0, key: 'world',  a: 'R', b: 'F' },
    { pos: 1, key: 'sense',  a: 'H', b: 'M' },
    { pos: 2, key: 'tone',   a: 'L', b: 'N' },
    { pos: 3, key: 'rhythm', a: 'S', b: 'P' },
  ];
  const adjacents = [];
  for (const { pos, key, a, b } of dims) {
    const margin = Math.abs(v[key][a] - v[key][b]);
    if (margin <= 1) {
      const arr = code.split('');
      arr[pos] = arr[pos] === a ? b : a;
      adjacents.push(arr.join(''));
    }
  }

  const typeCodes = [...new Set([code, ...adjacents.slice(0, 2)])];
  return { typeCodes, suffix, resolve };
}

async function fetchTMDBGenres(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=ko-KR`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.genres?.map(g => g.id) ?? [];
}

// 신규 개봉(2025~) 중 type_codes가 비어있는 영화 조회
const { data: movies, error } = await supabase
  .from('movies')
  .select('id, title, tmdb_id')
  .gte('year', 2025)
  .not('release_month', 'is', null)
  .filter('type_codes', 'eq', '{}');

if (error) {
  console.error('DB 조회 실패:', error.message);
  process.exit(1);
}

console.log(`분류 대상: ${movies?.length ?? 0}편\n`);

let classified = 0, skipped = 0;

for (const movie of (movies ?? [])) {
  if (!movie.tmdb_id) {
    console.log(`  skipped (no tmdb_id): ${movie.title}`);
    skipped++;
    continue;
  }

  const genreIds = await fetchTMDBGenres(movie.tmdb_id);
  if (!genreIds || genreIds.length === 0) {
    console.log(`  skipped (no genres):  ${movie.title}`);
    skipped++;
    continue;
  }

  const { typeCodes, suffix, resolve } = classifyByGenres(genreIds);

  const { error: err } = await supabase
    .from('movies')
    .update({ type_codes: typeCodes, suffix, resolve })
    .eq('id', movie.id);

  if (err) {
    console.error(`  error: ${movie.title}`, err.message);
  } else {
    classified++;
    console.log(`  OK: ${movie.title}  → [${typeCodes.join(', ')}]  suffix=${suffix}`);
  }

  // TMDB rate-limit: 40 req/10s
  await new Promise(r => setTimeout(r, 280));
}

console.log(`\n완료: ${classified}편 분류, ${skipped}편 건너뜀`);
