import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../supabaseClient';
import { QUESTIONS, MUSIC_TYPES, GROUP_ICONS, findType } from '../../../data/lifestyle/musicTypes';
import './MusicRecommend.css';

const GROUP_ORDER = ['tempo', 'mood', 'genre', 'focus', 'song_vs'];

const SESSION_KEY = 'music_quiz_pending';

const ERA_OPTIONS = [
  { key: 'all',     label: '전체' },
  { key: 'classic', label: '~1999', min: 0,    max: 1999 },
  { key: '2000s',   label: '2000s', min: 2000, max: 2009 },
  { key: '2010s',   label: '2010s', min: 2010, max: 2019 },
  { key: '2020s',   label: '2020~', min: 2020, max: 9999 },
];

function getFilteredPool(pool, era) {
  if (era === 'all') return pool;
  const opt = ERA_OPTIONS.find(e => e.key === era);
  if (!opt) return pool;
  return pool.filter(s => s.year >= opt.min && s.year <= opt.max);
}

function renderQuestionText(text) {
  const vsIdx = text.indexOf(' vs ');
  if (vsIdx === -1) return text;
  const before = text.slice(0, vsIdx);
  const afterFull = text.slice(vsIdx + 4);

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

function calculateType(answers) {
  let tempoH = 0, tempoC = 0;
  let moodB = 0, moodD = 0;
  let genreM = 0, genreA = 0;
  let focusL = 0, focusS = 0;

  QUESTIONS.forEach((q, i) => {
    const choice = answers[i];
    if (!choice || choice === 'C' || !q.dim) return;
    const dir = choice === 'A' ? q.aDir : q.bDir;
    switch (q.dim) {
      case 'tempo':  dir === 'H' ? tempoH++ : tempoC++; break;
      case 'mood':   dir === 'B' ? moodB++  : moodD++;  break;
      case 'genre':  dir === 'M' ? genreM++ : genreA++; break;
      case 'focus':  dir === 'L' ? focusL++ : focusS++; break;
      default: break;
    }
  });

  const tempo = tempoH >= tempoC ? 'H' : 'C';
  const mood  = moodB  >= moodD  ? 'B' : 'D';
  const genre = genreM >= genreA ? 'M' : 'A';
  const focus = focusL >= focusS ? 'L' : 'S';

  const tiedDims = [
    ...(tempoH === tempoC ? ['템포']  : []),
    ...(moodB  === moodD  ? ['감성']  : []),
    ...(genreM === genreA ? ['장르']  : []),
    ...(focusL === focusS ? ['감상법'] : []),
  ];

  return { code: `${tempo}${mood}${genre}${focus}`, tiedDims };
}

export default function MusicRecommend() {
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
  const [songPool, setSongPool] = useState([]);
  const [songPoolFetched, setSongPoolFetched] = useState(false);
  const [songPoolError, setSongPoolError] = useState(false);
  const [recommendedSongs, setRecommendedSongs] = useState([]);
  const [eraFilter, setEraFilter] = useState('all');
  const [showSongsSection, setShowSongsSection] = useState(true);
  const [savedResult, setSavedResult] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('music_recommend_results')
      .select('answers, type_code')
      .eq('user_id', String(user.id))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSavedResult(data || null));
  }, [user?.id]);

  useEffect(() => {
    if (songPool.length === 0) return;
    const filtered = getFilteredPool(songPool, eraFilter);
    if (filtered.length === 0) { setRecommendedSongs([]); return; }
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setRecommendedSongs(shuffled.slice(0, 5));
  }, [eraFilter, songPool]);

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

  const currentQuestion = QUESTIONS[currentQ];
  const currentGroup = currentQuestion?.group;

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

  const handleSelect = (choice) => {
    if (selected) return;
    setSelected(choice);

    setTimeout(() => {
      setSelected(null);
      const q = QUESTIONS[currentQ];
      const isSongExample = q.songA && q.group !== 'song_vs';

      if (isSongExample && choice === 'C') {
        if (!retryMode && q.retrySongA) {
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

  const shuffleSongs = () => {
    const filtered = getFilteredPool(songPool, eraFilter);
    if (filtered.length === 0) return;
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setRecommendedSongs(shuffled.slice(0, 5));
  };

  const finishQuiz = async (finalAnswers) => {
    const { code, tiedDims } = calculateType(finalAnswers);
    const typeData = findType(code);
    setTypeResult({ code, tiedDims, typeData, finalAnswers });
    setPhase('result');

    const { data: songData, error: songError } = await supabase
      .from('songs')
      .select('title, artist, year')
      .contains('type_codes', [code]);

    setSongPoolFetched(true);
    if (songError) {
      setSongPool([]);
      setSongPoolError(true);
    } else if (songData && songData.length > 0) {
      setSongPool(songData);
      const shuffled = [...songData].sort(() => Math.random() - 0.5);
      setRecommendedSongs(shuffled.slice(0, 5));
    } else {
      setSongPool([]);
    }

    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from('music_recommend_results')
        .select('id')
        .eq('user_id', String(user.id))
        .limit(1);

      const payload = { user_id: String(user.id), answers: finalAnswers, type_code: code };

      if (existing && existing.length > 0) {
        await supabase.from('music_recommend_results').update(payload).eq('id', existing[0].id);
      } else {
        await supabase.from('music_recommend_results').insert([payload]);
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
      finishQuiz(savedResult.answers);
    } else {
      const code = savedResult.type_code;
      const typeData = findType(code);
      setTypeResult({ code, tiedDims: [], typeData, finalAnswers: {} });
      setPhase('result');
      setIsSaved(true);
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('title, artist, year')
        .contains('type_codes', [code]);
      setSongPoolFetched(true);
      if (!songError && songData?.length > 0) {
        setSongPool(songData);
        const shuffled = [...songData].sort(() => Math.random() - 0.5);
        setRecommendedSongs(shuffled.slice(0, 5));
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
    setSongPool([]);
    setSongPoolFetched(false);
    setSongPoolError(false);
    setRecommendedSongs([]);
    setEraFilter('all');
    setShowSongsSection(false);
    setIsSaved(false);
  };

  if (user === undefined) return null;

  // ═══════════════════════════════════════════════════════════
  // 시작 화면
  // ═══════════════════════════════════════════════════════════
  if (phase === 'start') {
    return (
      <div className="mu-wrap">
        <div className="mu-container">
          <button className="mu-back-btn" onClick={() => navigate('/taste-lab')}>← 취향연구소</button>
          <div className="mu-start">
            <div className="mu-logo">🎵</div>
            <h1 className="mu-title">음악 취향 찾기</h1>
            <p className="mu-subtitle">나에게 맞는 음악 유형 찾기</p>
            <p className="mu-desc">
              {QUESTIONS.length}가지 질문으로<br />
              <span className="mu-desc-accent">16가지 음악 취향 유형</span> 중 나의 타입을 찾아드려요
            </p>
            <div className="mu-time-badge">⏱ 약 3분 · {QUESTIONS.length}개 질문 · 한국 노래만</div>
            <div className="mu-groups-preview">
              {GROUP_ORDER.filter(g => g !== 'song_vs').map(g => (
                <span key={g} className="mu-group-chip">
                  {GROUP_ICONS[g]} {
                    g === 'tempo' ? '템포' :
                    g === 'mood'  ? '감성' :
                    g === 'genre' ? '장르' : '감상법'
                  }
                </span>
              ))}
            </div>
            {user ? (
              <div className="mu-user-greeting">
                👋 <strong>{user.userName || user.loginId}</strong>님을 위한 음악 찾기
              </div>
            ) : (
              <div className="mu-user-greeting guest">
                🎵 로그인 없이도 즐길 수 있어요 · 결과 저장은 로그인 후 가능
              </div>
            )}
            {user && savedResult?.type_code ? (
              <div className="mu-start-actions">
                <button className="mu-view-result-btn" onClick={handleViewSavedResult}>
                  📊 내 결과 보기
                </button>
                <button className="mu-start-btn mu-start-btn-secondary" onClick={() => setPhase('quiz')}>
                  🔄 다시 하기
                </button>
              </div>
            ) : (
              <button className="mu-start-btn" onClick={() => setPhase('quiz')}>
                🎵 시작하기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 그룹 전환 인트로
  // ═══════════════════════════════════════════════════════════
  if (showGroupIntro) {
    const nextGroup = QUESTIONS[currentQ + 1]?.group;
    const nextGroupLabel =
      nextGroup === 'mood'    ? '감성' :
      nextGroup === 'genre'   ? '장르' :
      nextGroup === 'focus'   ? '감상법' :
      nextGroup === 'song_vs' ? '노래 VS 노래' : '템포';
    const nextGroupDesc =
      nextGroup === 'mood'    ? '어떤 감성의 음악이 더 끌리나요?' :
      nextGroup === 'genre'   ? '주류 vs 인디, 어느 쪽인가요?' :
      nextGroup === 'focus'   ? '가사 vs 사운드, 어디에 집중하나요?' :
      nextGroup === 'song_vs' ? '노래 예시로 취향을 비교해요' : '빠른 음악 vs 잔잔한 음악';

    return (
      <div className="mu-wrap">
        <div className="mu-container group-intro">
          <div className="mu-group-intro-icon">{GROUP_ICONS[nextGroup]}</div>
          <div className="mu-group-intro-label">{nextGroupLabel}</div>
          <div className="mu-group-intro-desc">{nextGroupDesc}</div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 퀴즈 화면
  // ═══════════════════════════════════════════════════════════
  if (phase === 'quiz') {
    const q = QUESTIONS[currentQ];
    const progress = (currentQ / QUESTIONS.length) * 100;
    const groupIcon = GROUP_ICONS[q.group] || '🎵';
    const groupLabel =
      q.group === 'tempo'   ? '템포' :
      q.group === 'mood'    ? '감성' :
      q.group === 'genre'   ? '장르' :
      q.group === 'focus'   ? '감상법' : '노래 VS 노래';
    const groupQCount = QUESTIONS.filter(q2 => q2.group === q.group).length;
    const posInGroup = QUESTIONS.filter((q2, i) => q2.group === q.group && i <= currentQ).length;

    return (
      <div className="mu-wrap">
        <div className="mu-container quiz">
          <div className="mu-progress-wrap">
            <div className="mu-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="mu-progress-label">
            <span>{currentQ + 1}</span> / {QUESTIONS.length}
          </div>

          <div className="mu-group-label">
            {groupIcon} {groupLabel}
            <span className="mu-group-pos"> ({posInGroup}/{groupQCount})</span>
          </div>

          <div className="mu-question" key={currentQ}>
            {renderQuestionText(q.q)}
          </div>

          {!!q.retrySongA && (
            <div className="mu-attempt-row">
              <span className={`mu-attempt-badge ${!retryMode ? 'active' : ''}`}>① 1번째</span>
              <span className="mu-attempt-arrow">→</span>
              <span className={`mu-attempt-badge ${retryMode ? 'active' : 'dim'}`}>② 2번째</span>
            </div>
          )}

          {q.songA ? (() => {
            const isSongExample = q.group !== 'song_vs';
            const songA = (isSongExample && retryMode) ? q.retrySongA : q.songA;
            const songB = (isSongExample && retryMode) ? q.retrySongB : q.songB;
            const neutralText = isSongExample
              ? (retryMode ? '이것도 안 들어봤어요' : '안 들어봤어요')
              : '둘 다 좋아 / 잘 모르겠어';
            return (
              <div className="mu-cards mu-cards-song" key={`cards-${currentQ}-${retryMode}`}>
                <button
                  className={`mu-card mu-song-duel-card ${selected === 'A' ? 'selected' : ''} ${selected && selected !== 'A' ? 'dimmed' : ''}`}
                  onClick={() => handleSelect('A')}
                  disabled={!!selected}
                >
                  <span className="mu-duel-icon">🎵</span>
                  <span className="mu-duel-title">{songA.title}</span>
                  <span className="mu-duel-artist">{songA.artist} · {songA.year}</span>
                  <span className="mu-duel-reason">{songA.reason}</span>
                </button>

                <div className="mu-vs">VS</div>

                <button
                  className={`mu-card mu-song-duel-card ${selected === 'B' ? 'selected' : ''} ${selected && selected !== 'B' ? 'dimmed' : ''}`}
                  onClick={() => handleSelect('B')}
                  disabled={!!selected}
                >
                  <span className="mu-duel-icon">🎵</span>
                  <span className="mu-duel-title">{songB.title}</span>
                  <span className="mu-duel-artist">{songB.artist} · {songB.year}</span>
                  <span className="mu-duel-reason">{songB.reason}</span>
                </button>

                <div className="mu-vs mu-vs-or">or</div>

                <button
                  className={`mu-card mu-neutral-btn ${selected === 'C' ? 'selected' : ''} ${selected && selected !== 'C' ? 'dimmed' : ''}`}
                  onClick={() => handleSelect('C')}
                  disabled={!!selected}
                >
                  <span className="mu-card-text">{neutralText}</span>
                </button>
              </div>
            );
          })() : (
            <div className="mu-cards" key={`cards-${currentQ}`}>
              <button
                className={`mu-card ${selected === 'A' ? 'selected' : ''} ${selected && selected !== 'A' ? 'dimmed' : ''}`}
                onClick={() => handleSelect('A')}
                disabled={!!selected}
              >
                <span className="mu-card-text">{q.a}</span>
              </button>

              <div className="mu-vs">VS</div>

              <button
                className={`mu-card ${selected === 'B' ? 'selected' : ''} ${selected && selected !== 'B' ? 'dimmed' : ''}`}
                onClick={() => handleSelect('B')}
                disabled={!!selected}
              >
                <span className="mu-card-text">{q.b}</span>
              </button>

              <div className="mu-vs mu-vs-or">or</div>

              <button
                className={`mu-card mu-neutral-btn ${selected === 'C' ? 'selected' : ''} ${selected && selected !== 'C' ? 'dimmed' : ''}`}
                onClick={() => handleSelect('C')}
                disabled={!!selected}
              >
                <span className="mu-card-text">둘 다 / 잘 모르겠어</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 결과 화면
  // ═══════════════════════════════════════════════════════════
  if (phase === 'result' && typeResult) {
    const { code, tiedDims, typeData } = typeResult;
    const bestMatchData = typeData?.best_match ? findType(typeData.best_match) : null;
    const oppositeData  = typeData?.opposite    ? findType(typeData.opposite)   : null;
    const filteredPool = getFilteredPool(songPool, eraFilter);

    return (
      <div className="mu-wrap">
        <div className="mu-container result">
          <div className="mu-result-badge">
            <span className="mu-code">[{code}]</span>
          </div>

          {tiedDims && tiedDims.length > 0 && (
            <div className="mu-tied-notice">
              {tiedDims.join(', ')} 취향이 비슷해서 기본값이 적용됐어요
            </div>
          )}

          <div className="mu-type-name">{typeData?.name}</div>
          <div className="mu-tagline">"{typeData?.tagline}"</div>

          <div className="mu-compat">
            {bestMatchData && (
              <div className="mu-compat-card best">
                <div className="mu-compat-label">💛 잘 맞는 유형</div>
                <div className="mu-compat-code">{typeData.best_match}</div>
                <div className="mu-compat-name">{bestMatchData.name}</div>
              </div>
            )}
            {oppositeData && (
              <div className="mu-compat-card opposite">
                <div className="mu-compat-label">🔄 반대 유형</div>
                <div className="mu-compat-code">{typeData.opposite}</div>
                <div className="mu-compat-name">{oppositeData.name}</div>
              </div>
            )}
          </div>

          <div className="mu-description">{typeData?.description}</div>

          <div className="mu-loves-avoid">
            {typeData?.loves && (
              <div className="mu-loves">
                <span className="mu-loves-label">좋아해요</span>
                {typeData.loves.map((l, i) => (
                  <span key={i} className="mu-loves-tag">{l}</span>
                ))}
              </div>
            )}
            {typeData?.avoid && (
              <div className="mu-avoid">
                <span className="mu-avoid-label">별로예요</span>
                {typeData.avoid.map((a, i) => (
                  <span key={i} className="mu-avoid-tag">{a}</span>
                ))}
              </div>
            )}
          </div>

          <div className="mu-songs-section">
            <button
              className="mu-songs-toggle"
              onClick={() => setShowSongsSection(v => !v)}
            >
              🎵 이런 노래를 좋아할 거예요
              <span className="mu-songs-toggle-arrow">{showSongsSection ? '▲' : '▼'}</span>
              {songPool.length > 0 && (
                <span className="mu-songs-count">{songPool.length}곡</span>
              )}
            </button>

            {showSongsSection && (
              <>
                <div className="mu-era-filter">
                  {ERA_OPTIONS.map(opt => {
                    const count = opt.key === 'all'
                      ? songPool.length
                      : songPool.filter(s => s.year >= opt.min && s.year <= opt.max).length;
                    if (count === 0 && opt.key !== 'all') return null;
                    return (
                      <button
                        key={opt.key}
                        className={`mu-era-btn ${eraFilter === opt.key ? 'active' : ''}`}
                        onClick={() => setEraFilter(opt.key)}
                      >
                        {opt.label}
                        {opt.key !== 'all' && <span className="mu-era-count">{count}</span>}
                      </button>
                    );
                  })}
                  <button className="mu-shuffle-btn" onClick={shuffleSongs} title="다른 노래 보기">
                    🔀
                  </button>
                </div>

                {songPoolFetched && songPool.length === 0 && !songPoolError && (
                  <div className="mu-songs-empty">아직 등록된 노래가 없어요</div>
                )}
                {songPoolError && (
                  <div className="mu-songs-empty">노래 목록을 불러오지 못했어요</div>
                )}
                {filteredPool.length === 0 && songPool.length > 0 && (
                  <div className="mu-songs-empty">해당 연도 노래가 없어요</div>
                )}

                <div className="mu-songs-list">
                  {recommendedSongs.map((s, i) => (
                    <div key={i} className="mu-song-item">
                      <span className="mu-song-num">{i + 1}</span>
                      <div className="mu-song-info">
                        <span className="mu-song-title">{s.title}</span>
                        <span className="mu-song-artist">{s.artist} · {s.year}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mu-result-actions">
            {isSaving && <p className="mu-saving">저장 중...</p>}
            {isSaved  && <p className="mu-saved">✅ 저장됨</p>}
            {!user && (
              <button
                className="mu-save-btn"
                onClick={() => {
                  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ finalAnswers: typeResult.finalAnswers }));
                  navigate('/login');
                }}
              >
                로그인하고 결과 저장
              </button>
            )}
            <button className="mu-restart-btn" onClick={handleRestart}>다시 하기</button>
            <button className="mu-home-btn" onClick={() => navigate('/taste-lab')}>취향연구소로</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
