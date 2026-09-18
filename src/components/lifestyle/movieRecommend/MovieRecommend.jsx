import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../supabaseClient';
import { QUESTIONS, MOVIE_TYPES, SUFFIX_LABELS, RESOLVE_LABELS, GROUP_ICONS, findType } from '../../../data/lifestyle/movieTypes';
import './MovieRecommend.css';

// 그룹 순서
const GROUP_ORDER = ['world', 'sense', 'tone', 'rhythm', 'suffix', 'resolve', 'subtag', 'movie_vs'];

const SESSION_KEY = 'movie_quiz_pending';

// 연도 필터 옵션
const ERA_OPTIONS = [
  { key: 'all',     label: '전체' },
  { key: 'classic', label: '~1989', min: 0,    max: 1989 },
  { key: '1990s',   label: '1990s', min: 1990, max: 1999 },
  { key: '2000s',   label: '2000s', min: 2000, max: 2009 },
  { key: '2010s',   label: '2010s', min: 2010, max: 2019 },
  { key: '2020s',   label: '2020~2024', min: 2020, max: 2024 },
  { key: 'recent',  label: '2025~', min: 2025, max: 9999 },
];

// 개봉일 표시: 12개월 미만이면 "YYYY년 MM월", 이상이면 "YYYY"
function formatReleaseDate(year, releaseMonth) {
  if (!releaseMonth) return `${year}`;
  const now = new Date();
  const monthsDiff =
    (now.getFullYear() - year) * 12 + (now.getMonth() - (releaseMonth - 1));
  if (monthsDiff < 12) return `${year}년 ${releaseMonth}월`;
  return `${year}`;
}

// 질문 텍스트 " vs " 기준 분리 렌더링 (꼬리 질문도 별도 줄)
function renderQuestionText(text) {
  const vsIdx = text.indexOf(' vs ');
  if (vsIdx === -1) return text;
  const before = text.slice(0, vsIdx);
  const afterFull = text.slice(vsIdx + 4);

  // B파트와 꼬리 질문 분리: " — " 우선, 없으면 마지막 ", "
  let after = afterFull;
  let tail = null;
  const dashIdx = afterFull.indexOf(' — ');
  const commaIdx = afterFull.lastIndexOf(', ');
  if (dashIdx !== -1) {
    after = afterFull.slice(0, dashIdx);
    tail = afterFull.slice(dashIdx + 3);
  } else if (commaIdx !== -1) {
    after = afterFull.slice(0, commaIdx);
    tail = afterFull.slice(commaIdx + 2);
  }

  return (
    <>
      <span className="mr-q-part">{before}</span>
      <span className="mr-q-inline-vs">vs</span>
      <span className="mr-q-part">{after}</span>
      {tail && <span className="mr-q-tail">{tail}</span>}
    </>
  );
}

// 연도 필터 적용
function getFilteredPool(pool, era) {
  if (era === 'all') return pool;
  const opt = ERA_OPTIONS.find(e => e.key === era);
  if (!opt) return pool;
  return pool.filter(m => m.year >= opt.min && m.year <= opt.max);
}

// 유형 결정 로직
function calculateType(answers) {
  let worldR = 0, worldF = 0;
  let senseH = 0, senseM = 0;
  let toneL = 0, toneN = 0;
  let rhythmP = 0, rhythmS = 0;
  let suffixX = 0, suffixC = 0;
  let resolveK = 0, resolveD = 0;

  QUESTIONS.forEach((q, i) => {
    const choice = answers[i];
    if (!choice || choice === 'C' || !q.dim) return;
    const dir = choice === 'A' ? q.aDir : q.bDir;
    switch (q.dim) {
      case 'world':   dir === 'R' ? worldR++   : worldF++;   break;
      case 'sense':   dir === 'H' ? senseH++   : senseM++;   break;
      case 'tone':    dir === 'L' ? toneL++    : toneN++;    break;
      case 'rhythm':  dir === 'P' ? rhythmP++  : rhythmS++;  break;
      case 'suffix':  dir === 'X' ? suffixX++  : suffixC++;  break;
      case 'resolve': dir === 'K' ? resolveK++ : resolveD++; break;
      default: break;
    }
  });

  const world   = worldR   >= worldF   ? 'R' : 'F';
  const sense   = senseH   >= senseM   ? 'H' : 'M';
  const tone    = toneL    >= toneN    ? 'L' : 'N';
  const rhythm  = rhythmP  >  rhythmS  ? 'P' : 'S';
  const suffix  = suffixX  >  suffixC  ? 'X' : 'C';
  const resolve = resolveK >= resolveD ? 'K' : 'D';

  const tiedDims = [
    ...(worldR  === worldF  ? ['세계관']     : []),
    ...(senseH  === senseM  ? ['감성 방식']  : []),
    ...(toneL   === toneN   ? ['분위기']     : []),
    ...(rhythmP === rhythmS ? ['리듬']       : []),
  ];

  return { code: `${world}${sense}${tone}${rhythm}`, suffix, resolve, tiedDims };
}

export default function MovieRecommend() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('start');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [typeResult, setTypeResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [prevGroup, setPrevGroup] = useState(null);
  const [showGroupIntro, setShowGroupIntro] = useState(false);
  const [retryMode, setRetryMode] = useState(false);
  const [moviePool, setMoviePool] = useState([]);
  const [moviePoolFetched, setMoviePoolFetched] = useState(false);
  const [moviePoolError, setMoviePoolError] = useState(false);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [eraFilter, setEraFilter] = useState('all');
  const [showMoviesSection, setShowMoviesSection] = useState(true);
  const [savedResult, setSavedResult] = useState(null);

  // 로그인한 경우 기존 저장 결과 조회
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('movie_recommend_results')
      .select('answers, type_code, suffix, resolve')
      .eq('user_id', String(user.id))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        console.log('[savedResult] data:', data, 'error:', error, 'user.id:', user?.id);
        setSavedResult(data || null);
      });
  }, [user?.id]);

  // 연도 필터 변경 시 추천 영화 재셔플
  useEffect(() => {
    if (moviePool.length === 0) return;
    const filtered = getFilteredPool(moviePool, eraFilter);
    if (filtered.length === 0) {
      setRecommendedMovies([]);
      return;
    }
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setRecommendedMovies(shuffled.slice(0, 5));
  }, [eraFilter, moviePool]);

  // 로그인 후 미저장 결과 복원
  useEffect(() => {
    if (!user?.id) return;
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    sessionStorage.removeItem(SESSION_KEY);
    try {
      const { finalAnswers } = JSON.parse(raw);
      if (finalAnswers) finishQuiz(finalAnswers);
    } catch (e) { /* ignore */ }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 그룹 전환 감지
  const currentQuestion = QUESTIONS[currentQ];
  const currentGroup = currentQuestion?.group;

  // 그룹 전환 처리
  const advance = (newAnswers) => {
    setAnswers(newAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      const nextQ = QUESTIONS[currentQ + 1];
      const nextGroup = nextQ.group;
      if (nextGroup !== currentGroup) {
        setPrevGroup(currentGroup);
        setShowGroupIntro(true);
        setTimeout(() => {
          setShowGroupIntro(false);
          setCurrentQ(prev => prev + 1);
        }, 1200);
      } else {
        setCurrentQ(prev => prev + 1);
      }
    } else {
      finishQuiz(newAnswers);
    }
  };

  // 답변 선택
  const handleSelect = (choice) => {
    if (selected) return;
    setSelected(choice);

    setTimeout(() => {
      setSelected(null);
      const q = QUESTIONS[currentQ];
      const isMovieExample = q.movieA && q.group !== 'movie_vs';

      // 영화 예시 질문 — 안 봤어요(C) 처리
      if (isMovieExample && choice === 'C') {
        if (!retryMode && q.retryMovieA) {
          setRetryMode(true);
          return;
        }
        setRetryMode(false);
        advance({ ...answers });
        return;
      }

      setRetryMode(false);
      advance({ ...answers, [currentQ]: choice });
    }, 350);
  };

  const shuffleMovies = () => {
    const filtered = getFilteredPool(moviePool, eraFilter);
    if (filtered.length === 0) return;
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setRecommendedMovies(shuffled.slice(0, 5));
  };

  const finishQuiz = async (finalAnswers) => {
    const { code, suffix, resolve, tiedDims } = calculateType(finalAnswers);
    const typeData = findType(code);
    setTypeResult({ code, suffix, resolve, tiedDims, typeData, finalAnswers });
    setPhase('result');

    // DB에서 추천 영화 조회 (release_month 포함)
    const { data: movieData, error: movieError } = await supabase
      .from('movies')
      .select('title, title_en, year, director, release_month')
      .contains('type_codes', [code])
      .in('suffix', [suffix, 'both']);

    setMoviePoolFetched(true);
    if (movieError) {
      setMoviePool([]);
      setMoviePoolError(true);
    } else if (movieData && movieData.length > 0) {
      setMoviePool(movieData);
      const shuffled = [...movieData].sort(() => Math.random() - 0.5);
      setRecommendedMovies(shuffled.slice(0, 5));
    } else {
      setMoviePool([]);
    }

    // 로그인한 경우 자동 저장
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from('movie_recommend_results')
        .select('id')
        .eq('user_id', String(user.id))
        .limit(1);

      const payload = { user_id: String(user.id), answers: finalAnswers, type_code: code, suffix, resolve };

      if (existing && existing.length > 0) {
        await supabase.from('movie_recommend_results').update(payload).eq('id', existing[0].id);
      } else {
        await supabase.from('movie_recommend_results').insert([payload]);
      }
      setIsSaved(true);
    } catch (err) {
      console.error('결과 저장 실패:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewSavedResult = async () => {
    if (!savedResult) return;
    if (savedResult.answers && Object.keys(savedResult.answers).length > 0) {
      // answers가 있으면 재계산
      finishQuiz(savedResult.answers);
    } else {
      // answers 없이 type_code로 직접 결과 로드
      const { code, suffix, resolve } = {
        code: savedResult.type_code,
        suffix: savedResult.suffix || 'C',
        resolve: savedResult.resolve || 'K',
      };
      const typeData = findType(code);
      setTypeResult({ code, suffix, resolve, tiedDims: [], typeData, finalAnswers: {} });
      setPhase('result');
      setIsSaved(true);
      const { data: movieData, error: movieError } = await supabase
        .from('movies')
        .select('title, title_en, year, director, release_month')
        .contains('type_codes', [code])
        .in('suffix', [suffix, 'both']);
      setMoviePoolFetched(true);
      if (movieError) {
        setMoviePoolError(true);
      } else if (movieData && movieData.length > 0) {
        setMoviePool(movieData);
        const shuffled = [...movieData].sort(() => Math.random() - 0.5);
        setRecommendedMovies(shuffled.slice(0, 5));
      }
    }
  };

  const handleRestart = () => {
    setPhase('start');
    setCurrentQ(0);
    setAnswers({});
    setSelected(null);
    setTypeResult(null);
    setPrevGroup(null);
    setShowGroupIntro(false);
    setRetryMode(false);
    setMoviePool([]);
    setMoviePoolFetched(false);
    setMoviePoolError(false);
    setRecommendedMovies([]);
    setEraFilter('all');
    setShowMoviesSection(false);
    setIsSaved(false);
  };

  // auth 로딩 중 (undefined = 아직 확인 중)
  if (user === undefined) return null;

  // ═══════════════════════════════════════════════════════════
  // RENDER — 시작 화면
  // ═══════════════════════════════════════════════════════════
  if (phase === 'start') {
    return (
      <div className="mr-wrap">
        <div className="mr-container">
          <button className="mr-back-btn" onClick={() => navigate('/')}>← 홈으로</button>
          <div className="mr-start">
            <div className="mr-logo">🎬</div>
            <h1 className="mr-title">영화 추천받기</h1>
            <p className="mr-subtitle">나에게 맞는 영화 유형 찾기</p>
            <p className="mr-desc">
              {QUESTIONS.length}가지 질문으로<br />
              <span className="mr-desc-accent">32가지 영화 유형</span> 중 나의 타입을 찾아드려요
            </p>
            <div className="mr-time-badge">⏱ 약 3분 · {QUESTIONS.length}개 질문</div>
            <div className="mr-groups-preview">
              {GROUP_ORDER.filter(g => g !== 'subtag').map(g => (
                <span key={g} className="mr-group-chip">
                  {GROUP_ICONS[g]} {
                    g === 'world'    ? '세계관' :
                    g === 'sense'    ? '감성 방식' :
                    g === 'tone'     ? '분위기' :
                    g === 'rhythm'   ? '리듬' :
                    g === 'suffix'   ? '자극 수용도' :
                    g === 'resolve'   ? '감정 해소 시점' : '영화 VS 영화'
                  }
                </span>
              ))}
            </div>
            {user ? (
              <div className="mr-user-greeting">
                👋 <strong>{user.userName || user.loginId}</strong>님을 위한 영화 찾기
              </div>
            ) : (
              <div className="mr-user-greeting guest">
                🎬 로그인 없이도 즐길 수 있어요 · 결과 저장은 로그인 후 가능
              </div>
            )}
            {user && savedResult?.type_code ? (
              <div className="mr-start-actions">
                <button className="mr-view-result-btn" onClick={handleViewSavedResult}>
                  📊 내 결과 보기
                </button>
                <button className="mr-start-btn mr-start-btn-secondary" onClick={() => setPhase('quiz')}>
                  🔄 다시 하기
                </button>
              </div>
            ) : (
              <button className="mr-start-btn" onClick={() => setPhase('quiz')}>
                🎬 시작하기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — 그룹 전환 인트로
  // ═══════════════════════════════════════════════════════════
  if (showGroupIntro) {
    const nextGroup = QUESTIONS[currentQ + 1]?.group;
    return (
      <div className="mr-wrap">
        <div className="mr-container group-intro">
          <div className="mr-group-intro-icon">{GROUP_ICONS[nextGroup]}</div>
          <div className="mr-group-intro-label">
            {nextGroup === 'sense'    ? '감성 방식' :
             nextGroup === 'tone'     ? '분위기' :
             nextGroup === 'rhythm'   ? '리듬' :
             nextGroup === 'suffix'   ? '자극 수용도' :
             nextGroup === 'resolve'  ? '감정 해소 시점' :
             nextGroup === 'subtag'   ? '영화 선택 기준' : '영화 VS 영화'}
          </div>
          <div className="mr-group-intro-desc">
            {nextGroup === 'sense'   ? '영화를 어떻게 느끼나요?' :
             nextGroup === 'tone'    ? '어떤 분위기를 원하나요?' :
             nextGroup === 'rhythm'  ? '어떤 템포를 좋아하나요?' :
             nextGroup === 'suffix'  ? '어느 정도까지 괜찮아요?' :
             nextGroup === 'resolve' ? '감동이 언제 찾아오나요?' :
             nextGroup === 'subtag'  ? '점수에 반영되지 않는 세부 취향 질문이에요' :
             '영화 예시로 취향을 비교해요'}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — 퀴즈 화면
  // ═══════════════════════════════════════════════════════════
  if (phase === 'quiz') {
    const q = QUESTIONS[currentQ];
    const progress = (currentQ / QUESTIONS.length) * 100;
    const groupIcon = GROUP_ICONS[q.group] || '💭';
    const groupLabel =
      q.group === 'world'    ? '세계관' :
      q.group === 'sense'    ? '감성 방식' :
      q.group === 'tone'     ? '분위기' :
      q.group === 'rhythm'   ? '리듬' :
      q.group === 'suffix'   ? '자극 수용도' :
      q.group === 'resolve'  ? '감정 해소 시점' :
      q.group === 'movie_vs' ? '영화 VS 영화' : '영화 선택 기준';
    const groupQCount = QUESTIONS.filter(q2 => q2.group === q.group).length;
    const posInGroup = QUESTIONS.filter((q2, i) => q2.group === q.group && i <= currentQ).length;

    return (
      <div className="mr-wrap">
        <div className="mr-container quiz">
          {/* 진행 바 */}
          <div className="mr-progress-wrap">
            <div className="mr-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="mr-progress-label">
            <span>{currentQ + 1}</span> / {QUESTIONS.length}
          </div>

          {/* 그룹 라벨 */}
          <div className="mr-group-label">
            {groupIcon} {groupLabel}
            <span className="mr-group-pos"> ({posInGroup}/{groupQCount})</span>
          </div>

          {/* 질문 */}
          <div className="mr-question" key={currentQ}>
            {renderQuestionText(q.q)}
          </div>

          {/* 영화 예시 시도 표시 */}
          {!!q.retryMovieA && (
            <div className="mr-attempt-row">
              <span className={`mr-attempt-badge ${!retryMode ? 'active' : ''}`}>① 1번째</span>
              <span className="mr-attempt-arrow">→</span>
              <span className={`mr-attempt-badge ${retryMode ? 'active' : 'dim'}`}>② 2번째</span>
            </div>
          )}

          {/* 선택 카드 */}
          {q.movieA ? (() => {
            const isMovieExample = q.group !== 'movie_vs';
            const movieA = (isMovieExample && retryMode) ? q.retryMovieA : q.movieA;
            const movieB = (isMovieExample && retryMode) ? q.retryMovieB : q.movieB;
            const neutralText = isMovieExample
              ? (retryMode ? '이것도 안 봤어요' : '안 봤어요')
              : '둘 다 좋아 / 잘 모르겠어';
            return (
              <div className="mr-cards mr-cards-movie" key={`cards-${currentQ}-${retryMode}`}>
                <button
                  className={`mr-card mr-movie-duel-card ${selected === 'A' ? 'selected' : ''} ${selected && selected !== 'A' ? 'dimmed' : ''}`}
                  onClick={() => handleSelect('A')}
                  disabled={!!selected}
                >
                  <span className="mr-duel-icon">🎬</span>
                  <span className="mr-duel-title">{movieA.title}</span>
                  <span className="mr-duel-year">{movieA.year}</span>
                  <span className="mr-duel-reason">{movieA.reason}</span>
                </button>

                <div className="mr-vs">VS</div>

                <button
                  className={`mr-card mr-movie-duel-card ${selected === 'B' ? 'selected' : ''} ${selected && selected !== 'B' ? 'dimmed' : ''}`}
                  onClick={() => handleSelect('B')}
                  disabled={!!selected}
                >
                  <span className="mr-duel-icon">🎬</span>
                  <span className="mr-duel-title">{movieB.title}</span>
                  <span className="mr-duel-year">{movieB.year}</span>
                  <span className="mr-duel-reason">{movieB.reason}</span>
                </button>

                <div className="mr-vs mr-vs-or">or</div>

                <button
                  className={`mr-card mr-neutral-btn ${selected === 'C' ? 'selected' : ''} ${selected && selected !== 'C' ? 'dimmed' : ''}`}
                  onClick={() => handleSelect('C')}
                  disabled={!!selected}
                >
                  <span className="mr-card-text">{neutralText}</span>
                </button>
              </div>
            );
          })() : (
            <div className="mr-cards" key={`cards-${currentQ}`}>
              <button
                className={`mr-card ${selected === 'A' ? 'selected' : ''} ${selected && selected !== 'A' ? 'dimmed' : ''}`}
                onClick={() => handleSelect('A')}
                disabled={!!selected}
              >
                <span className="mr-card-text">{q.a}</span>
              </button>

              <div className="mr-vs">VS</div>

              <button
                className={`mr-card ${selected === 'B' ? 'selected' : ''} ${selected && selected !== 'B' ? 'dimmed' : ''}`}
                onClick={() => handleSelect('B')}
                disabled={!!selected}
              >
                <span className="mr-card-text">{q.b}</span>
              </button>

              <div className="mr-vs mr-vs-or">or</div>

              <button
                className={`mr-card mr-neutral-btn ${selected === 'C' ? 'selected' : ''} ${selected && selected !== 'C' ? 'dimmed' : ''}`}
                onClick={() => handleSelect('C')}
                disabled={!!selected}
              >
                <span className="mr-card-text">둘 다 / 잘 모르겠어</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — 결과 화면
  // ═══════════════════════════════════════════════════════════
  if (phase === 'result' && typeResult) {
    const { code, suffix, resolve, tiedDims, typeData } = typeResult;
    const suffixLabel = SUFFIX_LABELS[suffix];
    const resolveLabel = RESOLVE_LABELS[resolve];
    const resolveData = typeData?.resolve?.[resolve];
    const variantData = typeData?.variants?.[suffix];
    const bestMatchData = typeData?.best_match ? findType(typeData.best_match) : null;
    const oppositeData  = typeData?.opposite    ? findType(typeData.opposite)   : null;
    const filteredPool = getFilteredPool(moviePool, eraFilter);

    return (
      <div className="mr-wrap">
        <div className="mr-container result">
          {/* 유형 코드 배지 */}
          <div className="mr-result-badge">
            <span className="mr-code">[{code}-{suffix}]</span>
            <span className={`mr-suffix-tag ${suffix === 'X' ? 'hot' : 'mild'}`}>{suffixLabel}</span>
            <span className="mr-resolve-tag">⚡ {resolveLabel}</span>
          </div>

          {/* 동점 안내 */}
          {tiedDims && tiedDims.length > 0 && (
            <div className="mr-tied-notice">
              {tiedDims.join(', ')} 취향이 비슷해서 기본값이 적용됐어요
            </div>
          )}

          {/* 유형 이름 */}
          <div className="mr-type-name">{typeData?.name}</div>
          <div className="mr-tagline">"{typeData?.tagline}"</div>

          {/* 궁합 유형 — 상단 배치 */}
          <div className="mr-compat">
            {bestMatchData && (
              <div className="mr-compat-card best">
                <div className="mr-compat-label">💛 잘 맞는 유형</div>
                <div className="mr-compat-code">{typeData.best_match}</div>
                <div className="mr-compat-name">{bestMatchData.name}</div>
              </div>
            )}
            {oppositeData && (
              <div className="mr-compat-card opposite">
                <div className="mr-compat-label">🔄 반대 유형</div>
                <div className="mr-compat-code">{typeData.opposite}</div>
                <div className="mr-compat-name">{oppositeData.name}</div>
              </div>
            )}
          </div>

          {/* 설명 */}
          <div className="mr-description">{typeData?.description}</div>

          {/* variant 한 줄 */}
          {variantData?.line && (
            <div className="mr-variant-line">
              <span className={`mr-variant-badge ${suffix === 'X' ? 'hot' : 'mild'}`}>{suffixLabel}</span>
              {variantData.line}
            </div>
          )}

          {/* resolve 한 줄 */}
          {resolveData?.line && (
            <div className="mr-variant-line">
              <span className="mr-variant-badge resolve">⚡ {resolveLabel}</span>
              {resolveData.line}
            </div>
          )}

          {/* 추천 영화 (접힘 토글) */}
          <div className="mr-movies-section">
            <button
              className="mr-movies-toggle"
              onClick={() => setShowMoviesSection(v => !v)}
            >
              🎬 이런 영화를 좋아할 거예요
              <span className="mr-movies-toggle-arrow">{showMoviesSection ? '▲' : '▼'}</span>
              {moviePool.length > 0 && (
                <span className="mr-movies-count">{moviePool.length}편</span>
              )}
            </button>

            {showMoviesSection && (
              <>
                {/* 연도 필터 + 셔플 버튼 한 줄 */}
                <div className="mr-era-filter">
                  {ERA_OPTIONS.map(opt => {
                    const count = opt.key === 'all'
                      ? moviePool.length
                      : moviePool.filter(m => m.year >= opt.min && m.year <= opt.max).length;
                    if (count === 0 && opt.key !== 'all') return null;
                    return (
                      <button
                        key={opt.key}
                        className={`mr-era-chip ${eraFilter === opt.key ? 'active' : ''}`}
                        onClick={() => setEraFilter(opt.key)}
                      >
                        {opt.label}
                        {opt.key !== 'all' && user && <span className="mr-era-count">{count}</span>}
                      </button>
                    );
                  })}
                  {user && filteredPool.length > 5 && (
                    <button className="mr-shuffle-btn" onClick={shuffleMovies}>
                      🔀 다른 영화
                    </button>
                  )}
                </div>

                {moviePoolError ? (
                  <div className="mr-movies-error">추천 영화를 불러오지 못했습니다. 나중에 다시 시도해주세요.</div>
                ) : !moviePoolFetched ? (
                  <div className="mr-movies-loading">불러오는 중...</div>
                ) : recommendedMovies.length > 0 ? (
                  <div className="mr-movies-list">
                    {recommendedMovies.map((movie, i) => (
                      <div key={i} className="mr-movie-card">
                        <div className="mr-movie-rank">{i + 1}</div>
                        <div className="mr-movie-info">
                          <div className="mr-movie-title">{movie.title?.trim()}</div>
                          <div className="mr-movie-meta">
                            {formatReleaseDate(movie.year, movie.release_month)} · {movie.director}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredPool.length === 0 && moviePool.length > 0 ? (
                  <div className="mr-movies-loading">해당 시대 추천 영화가 없어요</div>
                ) : (
                  <div className="mr-movies-loading">해당 유형의 추천 영화 데이터가 없어요</div>
                )}
              </>
            )}
          </div>

          {/* 좋아하는 것 / 피하는 것 */}
          {typeData?.loves && (
            <div className="mr-traits">
              <div className="mr-traits-section loves">
                <span className="mr-traits-label">✅ 좋아요</span>
                <div className="mr-traits-tags">
                  {typeData.loves.map((v, i) => <span key={i} className="mr-trait-chip loves">{v}</span>)}
                </div>
              </div>
              <div className="mr-traits-section avoid">
                <span className="mr-traits-label">❌ 별로예요</span>
                <div className="mr-traits-tags">
                  {typeData.avoid.map((v, i) => <span key={i} className="mr-trait-chip avoid">{v}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* 저장 섹션 */}
          {user ? (
            <div className="mr-save-section">
              {isSaving && <div className="mr-saving">저장 중...</div>}
              {isSaved && <div className="mr-saved-msg">✅ 결과가 저장되었습니다</div>}
            </div>
          ) : (
            <div className="mr-save-prompt">
              <span className="mr-save-prompt-text">결과를 저장하려면 로그인이 필요해요</span>
              <button className="mr-login-save-btn" onClick={() => {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify({ finalAnswers: typeResult.finalAnswers }));
                navigate('/login?next=/movie-recommend');
              }}>
                🔐 로그인하고 저장하기
              </button>
            </div>
          )}

          <div className="mr-result-actions">
            <button className="mr-restart-btn" onClick={handleRestart}>
              🔄 다시 하기
            </button>
            <button className="mr-home-btn" onClick={() => navigate('/')}>
              🏠 홈으로
            </button>
          </div>

          {user?.loginId === 'admin' && (
            <button className="mr-review-btn" disabled>
              🔍 신규 영화 검토하기
              <span className="mr-wip-badge">개발 진행 중</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
