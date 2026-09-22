/**
 * 터이네키아 게임 Supabase 서비스
 *
 * 필요한 SQL (SQL Editor에서 실행):
 *
 * CREATE TABLE turneyia_rooms (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   code TEXT UNIQUE NOT NULL,
 *   status TEXT DEFAULT 'waiting',
 *   game_state JSONB DEFAULT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE turneyia_players (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   room_id uuid REFERENCES turneyia_rooms(id) ON DELETE CASCADE,
 *   player_name TEXT NOT NULL,
 *   is_host BOOLEAN DEFAULT FALSE,
 *   joined_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ALTER TABLE turneyia_rooms DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE turneyia_players DISABLE ROW LEVEL SECURITY;
 * ALTER PUBLICATION supabase_realtime ADD TABLE turneyia_players;
 * ALTER PUBLICATION supabase_realtime ADD TABLE turneyia_rooms;
 *
 * -- 동시 제출 충돌 방지 RPC (FOR UPDATE 락으로 atomic 처리)
 * -- !! Supabase SQL Editor에서 실행 필요 !!
 * CREATE OR REPLACE FUNCTION submit_turneyia_answer(
 *   p_room_id uuid, p_player_id text, p_answer text
 * ) RETURNS text AS $$
 * DECLARE
 *   v_gs jsonb; v_name text; v_correct boolean; v_is_pass boolean;
 *   v_submissions jsonb; v_hints_revealed int; v_max_hints int;
 *   v_score_gain int; v_all_ids text[]; v_all_submitted boolean := true; v_k text;
 * BEGIN
 *   SELECT game_state INTO v_gs FROM turneyia_rooms WHERE id = p_room_id FOR UPDATE;
 *   IF v_gs IS NULL OR v_gs->>'phase' != 'hinting' THEN RETURN 'wrong'; END IF;
 *
 *   v_submissions := COALESCE(v_gs->'current_hint_submissions', '{}'::jsonb);
 *   IF v_submissions ? p_player_id THEN RETURN 'already'; END IF;
 *
 *   v_is_pass := p_answer = '__PASS__';
 *   v_name := lower(replace(v_gs->'current_person'->>'name', ' ', ''));
 *   v_correct := (NOT v_is_pass) AND lower(replace(p_answer, ' ', '')) LIKE '%' || v_name || '%';
 *
 *   v_submissions := v_submissions || jsonb_build_object(
 *     p_player_id, CASE WHEN v_correct THEN 'correct' WHEN v_is_pass THEN 'pass' ELSE 'wrong' END
 *   );
 *   v_gs := jsonb_set(v_gs, '{current_hint_submissions}', v_submissions);
 *
 *   -- 정답: 첫 번째 정답자에게 점수 + reveal 전환
 *   IF v_correct AND (v_gs->>'correct_player_id' IS NULL) THEN
 *     v_hints_revealed := (v_gs->>'hints_revealed')::int;
 *     v_max_hints := jsonb_array_length(v_gs->'current_person'->'hints');
 *     v_score_gain := GREATEST(1, v_max_hints - v_hints_revealed + 1);
 *     v_gs := jsonb_set(v_gs, '{phase}', '"reveal"');
 *     v_gs := jsonb_set(v_gs, '{correct_player_id}', to_jsonb(p_player_id));
 *     v_gs := jsonb_set(v_gs, '{correct_at_hint}', to_jsonb(v_hints_revealed));
 *     v_gs := jsonb_set(v_gs, '{scores}',
 *       jsonb_set(COALESCE(v_gs->'scores', '{}'::jsonb), ARRAY[p_player_id],
 *         to_jsonb(COALESCE((v_gs->'scores'->>p_player_id)::int, 0) + v_score_gain)));
 *   END IF;
 *
 *   -- 오답 + 정답자 없음: 전원 제출 완료 여부 확인 → 자동 다음 힌트 or reveal
 *   IF NOT v_correct AND v_gs->>'correct_player_id' IS NULL THEN
 *     SELECT array_agg(k) INTO v_all_ids
 *       FROM jsonb_object_keys(COALESCE(v_gs->'scores', '{}'::jsonb)) k;
 *     IF v_all_ids IS NOT NULL THEN
 *       FOREACH v_k IN ARRAY v_all_ids LOOP
 *         IF NOT (v_submissions ? v_k) THEN v_all_submitted := false; EXIT; END IF;
 *       END LOOP;
 *       IF v_all_submitted THEN
 *         v_hints_revealed := (v_gs->>'hints_revealed')::int;
 *         v_max_hints := jsonb_array_length(v_gs->'current_person'->'hints');
 *         IF v_hints_revealed < v_max_hints THEN
 *           v_gs := jsonb_set(v_gs, '{hints_revealed}', to_jsonb(v_hints_revealed + 1));
 *           v_gs := jsonb_set(v_gs, '{hint_started_at}',
 *             to_jsonb((EXTRACT(EPOCH FROM NOW()) * 1000)::bigint));
 *           v_gs := jsonb_set(v_gs, '{current_hint_submissions}', '{}'::jsonb);
 *         ELSE
 *           v_gs := jsonb_set(v_gs, '{phase}', '"reveal"');
 *         END IF;
 *       END IF;
 *     END IF;
 *   END IF;
 *
 *   UPDATE turneyia_rooms SET game_state = v_gs WHERE id = p_room_id;
 *   IF v_correct THEN RETURN 'correct'; ELSE RETURN 'wrong'; END IF;
 * END;
 * $$ LANGUAGE plpgsql;
 */

import { supabase } from '../../supabaseClient';
import { generatePersonWithHints, buildNamePattern } from './turneyKiaAI';

const REAL_CATEGORIES = ['celebrity', 'athlete', 'character'];
function resolveCategory(cat) {
  return cat === 'random'
    ? REAL_CATEGORIES[Math.floor(Math.random() * REAL_CATEGORIES.length)]
    : cat;
}

// ─────────────────────────────────────────
// 코드 생성
// ─────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++)
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

async function getUniqueCode() {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = generateCode();
    const { data } = await supabase.from('turneyia_rooms').select('id').eq('code', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('코드 생성에 실패했습니다. 다시 시도해주세요.');
}

// ─────────────────────────────────────────
// 방 관리
// ─────────────────────────────────────────

export async function createRoom(hostName) {
  const code = await getUniqueCode();

  const { data: room, error: roomError } = await supabase
    .from('turneyia_rooms')
    .insert({ code, status: 'waiting' })
    .select()
    .single();
  if (roomError) throw new Error('방 생성에 실패했습니다.');

  const { data: player, error: playerError } = await supabase
    .from('turneyia_players')
    .insert({ room_id: room.id, player_name: hostName, is_host: true })
    .select()
    .single();
  if (playerError) throw new Error('플레이어 등록에 실패했습니다.');

  return { room, player };
}

export async function joinRoom(code, playerName) {
  const { data: room, error: roomError } = await supabase
    .from('turneyia_rooms')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('status', 'waiting')
    .single();
  if (roomError || !room) throw new Error('방을 찾을 수 없습니다. 코드를 확인해주세요.');

  const { count } = await supabase
    .from('turneyia_players')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id);
  if (count >= 8) throw new Error('방이 가득 찼습니다. (최대 8명)');

  const { data: player, error: playerError } = await supabase
    .from('turneyia_players')
    .insert({ room_id: room.id, player_name: playerName, is_host: false })
    .select()
    .single();
  if (playerError) throw new Error('입장에 실패했습니다.');

  return { room, player };
}

export async function getRoomPlayers(roomId) {
  const { data, error } = await supabase
    .from('turneyia_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRoomData(roomId) {
  const { data, error } = await supabase
    .from('turneyia_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data;
}

export async function leaveRoom(playerId) {
  const { error } = await supabase.from('turneyia_players').delete().eq('id', playerId);
  if (error) console.error('leaveRoom error:', error);
}

export async function deleteRoom(roomId) {
  await supabase.from('turneyia_rooms').delete().eq('id', roomId);
}

export async function promoteToHost(playerId) {
  const { error } = await supabase.from('turneyia_players').update({ is_host: true }).eq('id', playerId);
  if (error) console.error('promoteToHost error:', error);
}

export function subscribeToRoom(roomId, onUpdate) {
  return supabase
    .channel(`turneyia-room-${roomId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'turneyia_players', filter: `room_id=eq.${roomId}` },
      onUpdate
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'turneyia_rooms', filter: `id=eq.${roomId}` },
      onUpdate
    )
    .subscribe();
}

export function unsubscribeFromRoom(channel) {
  if (channel) supabase.removeChannel(channel);
}

// ─────────────────────────────────────────
// 게임 상태 관리
// ─────────────────────────────────────────

async function updateGameState(roomId, gameState) {
  const { error } = await supabase
    .from('turneyia_rooms')
    .update({ game_state: gameState })
    .eq('id', roomId);
  if (error) throw error;
}

/**
 * 게임 시작
 * Claude API로 인물+힌트 생성 후 game_state 초기화
 */
export async function startGame(roomId, players, category, totalRounds, mode = 'static') {
  const resolvedCategory = resolveCategory(category);
  const person = await generatePersonWithHints(resolvedCategory, [], mode);
  const namePattern = buildNamePattern(person.name);

  const scores = {};
  players.forEach((p) => { scores[p.id] = 0; });

  const gameState = {
    phase: 'hinting',
    category: resolvedCategory,
    random_mode: category === 'random',
    mode,
    current_person: person,
    name_pattern: namePattern,
    hints_revealed: 1,
    hint_started_at: Date.now(),
    answers: {},
    correct_player_id: null,
    correct_at_hint: null,
    scores,
    round: 1,
    total_rounds: totalRounds,
    used_persons: [person.name],
  };

  const { error: updateError } = await supabase
    .from('turneyia_rooms')
    .update({ game_state: gameState, status: 'playing' })
    .eq('id', roomId);
  if (updateError) throw new Error('게임 시작에 실패했습니다.');
}

/**
 * 힌트 1개 추가 공개
 * - 힌트 소진 시 아무도 못 맞춘 것으로 reveal 전환
 * - 힌트 공개 시 current_hint_submissions 초기화 (힌트당 1회 제출)
 */
export async function revealNextHint(roomId, gameState) {
  const next = gameState.hints_revealed + 1;
  const maxHints = gameState.current_person.hints.length;

  if (next > maxHints) {
    // 모든 힌트 소진 + 아무도 못 맞춤 → reveal (no winner)
    await updateGameState(roomId, {
      ...gameState,
      phase: 'reveal',
      correct_player_id: null,
    });
  } else {
    await updateGameState(roomId, {
      ...gameState,
      hints_revealed: next,
      hint_started_at: Date.now(),
      current_hint_submissions: {}, // 힌트 바뀌면 제출 기록 초기화
    });
  }
}

async function fetchLatestState(roomId) {
  const { data } = await supabase
    .from('turneyia_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  return data?.game_state ?? null;
}

/**
 * 답변 제출 — DB RPC로 atomic 처리 (동시 제출 race condition 방지)
 * 반환값: 'correct' | 'wrong' | 'already'
 *
 * !! Supabase SQL Editor에서 아래 RPC를 먼저 실행해야 합니다 !!
 * (파일 상단 주석의 submit_turneyia_answer 함수 교체)
 */
export async function submitAnswer(roomId, playerId, answer) {
  const { data, error } = await supabase.rpc('submit_turneyia_answer', {
    p_room_id: roomId,
    p_player_id: playerId,
    p_answer: answer,
  });
  if (error) {
    console.error('submit_turneyia_answer RPC 실패:', error);
    return 'wrong';
  }
  return data; // 'correct' | 'wrong' | 'already'
}

/**
 * 아무도 못 맞췄을 때 정답 공개 (시간 초과 / 마지막 힌트 후 전원 패스)
 * 점수 변동 없음
 */
export async function revealAnswer(roomId, gameState) {
  await updateGameState(roomId, {
    ...gameState,
    phase: 'reveal',
    correct_player_id: null,
  });
}

/**
 * 다음 라운드 시작 (호스트 전용)
 * Claude API로 새 인물 생성
 */
export async function nextRound(roomId, gameState) {
  const usedPersons = gameState.used_persons || [];
  const category = gameState.random_mode ? resolveCategory('random') : gameState.category;
  const person = await generatePersonWithHints(category, usedPersons, gameState.mode || 'static');
  const namePattern = buildNamePattern(person.name);

  const newState = {
    ...gameState,
    phase: 'hinting',
    category,
    current_person: person,
    name_pattern: namePattern,
    hints_revealed: 1,
    hint_started_at: Date.now(),
    current_hint_submissions: {},
    answers: {},
    correct_player_id: null,
    correct_at_hint: null,
    round: gameState.round + 1,
    used_persons: [...usedPersons, person.name],
  };

  await updateGameState(roomId, newState);
}

/**
 * 게임 종료 처리 (마지막 라운드 reveal에서 호출)
 */
export async function endGame(roomId, gameState) {
  await updateGameState(roomId, { ...gameState, phase: 'ended' });
}

/**
 * 게임 리셋 → 대기실 복귀
 */
export async function resetGame(roomId) {
  await supabase
    .from('turneyia_rooms')
    .update({ game_state: null, status: 'waiting' })
    .eq('id', roomId);
}
