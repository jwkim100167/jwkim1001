import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { loadMonthlyReview, saveMonthlyReview } from '../../../services/lifestyle/monthlyReviewService';
import './MonthlyReview.css';

const QUESTIONS = [
  { key: 'highlight',    label: '이달의 하이라이트',                            section: null },
  { key: 'one_sentence', label: '이달을 한 문장으로 복기한다면',                  section: null },
  { key: 'focus',        label: '이달의 집중',                                  section: '돌아보기' },
  { key: 'achievement',  label: '이달의 완성',                                  section: '돌아보기' },
  { key: 'try',          label: '이달의 시도',                                  section: '돌아보기' },
  { key: 'reflect',      label: '이달의 반성',                                  section: '돌아보기' },
  { key: 'discover',     label: '이달의 발견',                                  section: '돌아보기' },
  { key: 'let_go',       label: '이달의 비움',                                  section: '돌아보기' },
  { key: 'gratitude',    label: '이달의 감사',                                  section: '돌아보기' },
  { key: 'scene',        label: '이달의 장면',                                  section: '돌아보기' },
  { key: 'emotion',      label: '이달의 감정',                                  section: '돌아보기' },
  { key: 'health',       label: '이달의 건강',                                  section: '돌아보기' },
  { key: 'content',      label: '이달의 컨텐츠 (영화·드라마·유튜브·예능·웹툰)',    section: '기록' },
  { key: 'book',         label: '이달의 책 & 공부',                             section: '기록' },
  { key: 'music',        label: '이달의 음악',                                  section: '기록' },
  { key: 'quote',        label: '이달의 문장 & 레퍼런스',                        section: '기록' },
  { key: 'people',       label: '이달의 만남',                                  section: '기록' },
  { key: 'place',        label: '이달의 장소',                                  section: '기록' },
  { key: 'food_out',     label: '이달의 음식 (사 먹은)',                          section: '기록' },
  { key: 'food_home',    label: '이달의 음식 (해 먹은)',                          section: '기록' },
  { key: 'spending',     label: '이달의 소비 & 투자',                            section: '기록' },
  { key: 'etc',          label: '기타',                                          section: '기록' },
  { key: 'photo',        label: '이달의 사진 한 장',                             section: '기록' },
  { key: 'next_month',   label: '다음달의 나에게',                               section: '다음달' },
];

function getCurrentYearMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatDisplayMonth(yearMonth) {
  const [y, m] = yearMonth.split('-');
  return `${y}년 ${parseInt(m, 10)}월`;
}

function shiftMonth(yearMonth, delta) {
  const [y, m] = yearMonth.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

const SECTIONS = ['돌아보기', '기록', '다음달'];

export default function MonthlyReview() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const currentMonth = getCurrentYearMonth();
  const isNextDisabled = selectedMonth >= currentMonth;

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    setSaveMsg('');
    const data = await loadMonthlyReview(user.loginId, selectedMonth);
    setAnswers(data ?? {});
    setLoading(false);
  }, [isAuthenticated, user, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!isAuthenticated || !user) return;
    setSaveMsg('저장 중...');
    const ok = await saveMonthlyReview(user.loginId, selectedMonth, answers);
    setSaveMsg(ok ? '✅ 저장됨' : '❌ 저장 실패');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const headerQuestions = QUESTIONS.filter(q => q.section === null);

  return (
    <div className="mr-page">
      <div className="mr-container">
        <button className="mr-back-btn" onClick={() => navigate('/gatsaeng')}>
          ← 갓생으로
        </button>

        <div className="mr-header">
          <div className="mr-header-icon">📅</div>
          <h1 className="mr-title">먼슬리뷰</h1>
          <p className="mr-subtitle">나의 한 달을 돌아보는 회고</p>
        </div>

        {/* 달 선택 */}
        <div className="mr-month-nav">
          <button
            className="mr-month-btn"
            onClick={() => setSelectedMonth(prev => shiftMonth(prev, -1))}
          >
            &lt;
          </button>
          <span className="mr-month-label">{formatDisplayMonth(selectedMonth)}</span>
          <button
            className="mr-month-btn"
            onClick={() => setSelectedMonth(prev => shiftMonth(prev, 1))}
            disabled={isNextDisabled}
          >
            &gt;
          </button>
        </div>

        {!isAuthenticated && (
          <div className="mr-login-notice">
            🔒 로그인 후 입력 및 저장이 가능합니다.{' '}
            <span className="mr-login-link" onClick={() => navigate('/login')}>
              로그인하기
            </span>
          </div>
        )}

        {loading ? (
          <div className="mr-loading">불러오는 중...</div>
        ) : (
          <div className="mr-form">
            {/* 헤더 질문 (section: null) */}
            {headerQuestions.map(q => (
              <div key={q.key} className="mr-question">
                <label className="mr-label">{q.label}</label>
                <textarea
                  className="mr-textarea"
                  value={answers[q.key] || ''}
                  onChange={e => handleChange(q.key, e.target.value)}
                  disabled={!isAuthenticated}
                  rows={2}
                  placeholder={isAuthenticated ? '' : '로그인 후 입력 가능'}
                />
              </div>
            ))}

            {/* 섹션별 질문 */}
            {SECTIONS.map(section => {
              const sectionQuestions = QUESTIONS.filter(q => q.section === section);
              return (
                <div key={section} className="mr-section">
                  <div className="mr-section-header">
                    <span className="mr-section-line" />
                    <span className="mr-section-title">{section}</span>
                    <span className="mr-section-line" />
                  </div>
                  {sectionQuestions.map(q => (
                    <div key={q.key} className="mr-question">
                      <label className="mr-label">{q.label}</label>
                      <textarea
                        className="mr-textarea"
                        value={answers[q.key] || ''}
                        onChange={e => handleChange(q.key, e.target.value)}
                        disabled={!isAuthenticated}
                        rows={section === '다음달' ? 4 : 2}
                        placeholder={isAuthenticated ? '' : '로그인 후 입력 가능'}
                      />
                    </div>
                  ))}
                </div>
              );
            })}

            {isAuthenticated && (
              <div className="mr-save-row">
                {saveMsg && <span className="mr-save-msg">{saveMsg}</span>}
                <button className="mr-save-btn" onClick={handleSave}>
                  저장하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
