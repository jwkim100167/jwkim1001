// songDatabase.json (타자 게임 1000곡) → musicSeed.json 확장
// 기존 97곡(아티스트·연도 있음) 유지 + 나머지 신규 곡 추가
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 카테고리 → 음악 취향 유형 매핑
const CATEGORY_MAP = {
  '발라드': ['CEIL', 'CEGL', 'CXIL', 'CXGL'],
  '아이돌': ['HEIL', 'HEGL', 'HXIL', 'HXGL', 'HEIS', 'HEGS', 'HXIS', 'HXGS'],
  '인디':   ['CEIS', 'CEGS', 'CXIS', 'CXGS'],
  '힙합':   ['HEIL', 'HXIL', 'HEGL', 'HXGL'],
  'R&B':    ['HEIS', 'HXIS', 'CEIS', 'CXIS'],
  '밴드':   ['HEGS', 'HXGS', 'CEGS', 'CXGS'],
  '트로트': ['HEGL', 'HXGL'],
};

const curatedPath = join(__dirname, '../src/data/lifestyle/musicSeed.json');
const dbPath      = join(__dirname, '../src/data/games/songDatabase.json');

const curated = JSON.parse(readFileSync(curatedPath, 'utf-8'));
const curatedTitles = new Set(curated.map(s => s.title));

const { songs } = JSON.parse(readFileSync(dbPath, 'utf-8'));

const newSongs = songs
  .filter(s => !curatedTitles.has(s.name))
  .map(s => ({
    title: s.name,
    artist: '',
    year: null,
    type_codes: CATEGORY_MAP[s.category] ?? [],
  }));

const merged = [...curated, ...newSongs];

writeFileSync(curatedPath, JSON.stringify(merged, null, 2));
console.log(`큐레이션 ${curated.length}곡 + 신규 ${newSongs.length}곡 = 총 ${merged.length}곡`);
