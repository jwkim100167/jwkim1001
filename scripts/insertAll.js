import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = 'https://uustelhozdrsvbgqkmxq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// 현재 DB 영화 수 확인
const { count: before } = await supabase.from('movies').select('*', { count: 'exact', head: true });
console.log(`📊 삽입 전 총 영화 수: ${before}`);

const batches = ['batch6.json', 'batch7.json'];
let totalInserted = 0;

for (const file of batches) {
  const movies = JSON.parse(readFileSync(join(__dirname, file), 'utf-8'));
  const start = Date.now();
  const { error } = await supabase.from('movies').insert(movies);
  const elapsed = Date.now() - start;

  if (error) {
    console.error(`❌ ${file} 삽입 실패:`, error.message);
  } else {
    totalInserted += movies.length;
    console.log(`✅ ${file}: ${movies.length}편 삽입 완료 (${elapsed}ms)`);
  }
}

const { count: after } = await supabase.from('movies').select('*', { count: 'exact', head: true });
console.log(`\n📊 삽입 후 총 영화 수: ${after} (${totalInserted}편 추가)`);
