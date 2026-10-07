import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://uustelhozdrsvbgqkmxq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const songs = JSON.parse(
  readFileSync(join(__dirname, '../src/data/lifestyle/musicSeed.json'), 'utf-8')
);

// 기존 데이터 전체 삭제
const { error: deleteError } = await supabase
  .from('songs')
  .delete()
  .neq('id', 0);

if (deleteError) {
  console.error('삭제 실패:', deleteError.message);
  process.exit(1);
}

console.log('🗑️  기존 데이터 삭제 완료');

const { error } = await supabase
  .from('songs')
  .insert(songs);

if (error) {
  console.error('삽입 실패:', error.message);
  process.exit(1);
}

console.log(`✅ ${songs.length}곡 삽입 완료`);
