import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVerificationQuestions, verifyAndActivate } from '../services/authService';
import './Verify.css';

export default function Verify() {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [answer, setAnswer] = useState('');
  const [recommendPerson, setRecommendPerson] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginDirect } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { userId, loginId, userName, createdAt } = location.state || {};

  // 잘못된 접근 방지
  useEffect(() => {
    if (!userId || !loginId) {
      navigate('/login');
    }
  }, [userId, loginId, navigate]);

  // 질문 목록 로드
  useEffect(() => {
    getVerificationQuestions().then((data) => {
      setQuestions(data);
      if (data.length > 0) setSelectedQuestionId(String(data[0].id));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedQuestionId) {
      setError('질문을 선택해주세요.');
      return;
    }
    if (!answer.trim()) {
      setError('답변을 입력해주세요.');
      return;
    }

    setLoading(true);
    const result = await verifyAndActivate(userId, loginId, createdAt, selectedQuestionId, answer, recommendPerson, userName);
    setLoading(false);

    if (result.success) {
      loginDirect(result.user);
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-container">
        <h2>본인 인증</h2>
        <p className="verify-desc">
          계정 상태를 확인하기 위해 질문에 답변해주세요.
        </p>

        <form onSubmit={handleSubmit} className="verify-form">
          <div className="form-group">
            <label htmlFor="question">질문 선택</label>
            <select
              id="question"
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
            >
              {questions.map((q) => (
                <option key={q.id} value={String(q.id)}>
                  {q.question}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="answer">답변</label>
            <input
              type="text"
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="답변을 입력하세요"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="recommendPerson">추천인 <span className="optional">(선택)</span></label>
            <input
              type="text"
              id="recommendPerson"
              value={recommendPerson}
              onChange={(e) => setRecommendPerson(e.target.value)}
              placeholder="추천인 아이디를 입력하세요"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="verify-btn" disabled={loading}>
            {loading ? '확인 중...' : '제출'}
          </button>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/login')}
          >
            로그인으로 돌아가기
          </button>
        </form>
      </div>
    </div>
  );
}
