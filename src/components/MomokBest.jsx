import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { getUserLife, decreaseUserLife } from '../services/authService';
import './MomokBest.css';


export default function MomokBest() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [cards, setCards] = useState([]);
  const [userLife, setUserLife] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noLifeMsg, setNoLifeMsg] = useState(false);
  const [loginRequiredMsg, setLoginRequiredMsg] = useState(false);

  const isExempt = user?.loginId === 'admin' || user?.loginId === 'test';

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dataRes, catRes] = await Promise.all([
        supabase.from('restaurantDataTable').select('*').eq('bobYN', true).eq('isOpen', true),
        supabase.from('restaurantCategoryTable').select('*'),
      ]);

      const dataRows = dataRes.data || [];
      const catRows = catRes.data || [];

      const joined = dataRows.map((row) => {
        const rId = row.r_id ?? row.id;
        const cats = catRows.filter((c) => c.r_id === rId);
        const cat = cats[0] || null;
        return {
          ...row,
          _rId: rId,
          signature: cat?.signature || row.signature || '-',
          category: cat?.category || '-',
          location: cat?.location || '',
          location2: cat?.location2 || '',
        };
      });

      const sorted = joined.sort((a, b) => {
        const aHasLink = a.link ? 0 : 1;
        const bHasLink = b.link ? 0 : 1;
        if (aHasLink !== bHasLink) return aHasLink - bHasLink;
        const catCmp = (a.category || '-').localeCompare(b.category || '-', 'ko');
        if (catCmp !== 0) return catCmp;
        return (a.address || '').localeCompare(b.address || '', 'ko');
      });

      setCards(sorted);

      if (user) {
        const life = await getUserLife(user.id);
        setUserLife(life);
      }
    } catch (err) {
      console.error('MomokBest 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCardClick = async (card) => {
    if (!isAuthenticated) {
      setLoginRequiredMsg(true);
      setTimeout(() => setLoginRequiredMsg(false), 2500);
      return;
    }
    if (!isExempt && userLife <= 0) {
      setNoLifeMsg(true);
      setTimeout(() => setNoLifeMsg(false), 2500);
      return;
    }
    if (!isExempt) {
      const next = await decreaseUserLife(user.id);
      setUserLife(next);
    }
    setSelectedCard(card);
  };

  const handleCloseModal = () => setSelectedCard(null);

  return (
    <div className="momokbest-page">
      {/* 헤더 */}
      <div className="mb-header">
        <button className="mb-back-btn" onClick={() => navigate('/')}>← 홈</button>
        <h1 className="mb-title">🏆 MOMOK - Best</h1>
        <div className="mb-life">
          {isExempt ? (
            <span className="mb-life-exempt">∞</span>
          ) : (
            <span>
              {userLife > 0 && userLife <= 4 && Array.from({ length: userLife }).map((_, i) => (
                <span key={i} className="mb-heart">❤️</span>
              ))}
              {userLife >= 5 && <span>❤️ <span className="mb-life-count">+{userLife}개</span></span>}
              {userLife <= 0 && <span className="mb-no-life">라이프 소진</span>}
            </span>
          )}
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="mb-notice">
        ⚠️ 카드를 클릭하면 라이프가 <strong>1 차감</strong>됩니다.
        {!isExempt && ` (현재 ${userLife}개)`}
        &nbsp;·&nbsp;매일 첫 로그인 시 라이프 <strong>+3</strong> 충전
      </div>

      {loginRequiredMsg && (
        <div className="mb-nolife-toast">🔒 로그인이 필요합니다!</div>
      )}

      {noLifeMsg && (
        <div className="mb-nolife-toast">❌ 라이프가 없습니다. 내일 다시 접속하면 충전됩니다!</div>
      )}

      {/* 카드 그리드 */}
      {loading ? (
        <div className="mb-loading">로딩 중...</div>
      ) : cards.length === 0 ? (
        <div className="mb-empty">표시할 레스토랑이 없습니다.</div>
      ) : (
        <div className="mb-grid">
          {cards.map((card, idx) => (
            <div
              key={card._rId ?? idx}
              className={`mb-card ${!isExempt && userLife <= 0 ? 'mb-card-disabled' : ''}`}
              onClick={() => handleCardClick(card)}
            >
              {card.link && <span className="mb-card-star">★</span>}
              <div className="mb-card-top">
                <div className="mb-card-location">{card.location || '랜덤'}</div>
                <div className="mb-card-location2">{card.location2 || '랜덤'}</div>
              </div>
              <div className="mb-card-bottom">
                <div className="mb-card-category">{card.category}</div>
                <div className="mb-card-signature">{card.signature}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedCard && (
        <div className="mb-modal-overlay" onClick={handleCloseModal}>
          <div className="mb-modal" onClick={(e) => e.stopPropagation()}>
            <button className="mb-modal-close" onClick={handleCloseModal}>✕</button>
            <div className="mb-modal-icon">🎉</div>
            <h2 className="mb-modal-name">{selectedCard.name}</h2>
            <div className="mb-modal-category">{selectedCard.category}</div>
            {selectedCard.signature && selectedCard.signature !== '-' && (
              <div className="mb-modal-signature">대표메뉴: {selectedCard.signature}</div>
            )}
            {selectedCard.address && (
              <div className="mb-modal-address">📍 {selectedCard.address}</div>
            )}
            <div className="mb-modal-links">
              {selectedCard.link && (
                <a
                  href={selectedCard.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-modal-link"
                >
                  리뷰 보기 →
                </a>
              )}
              {selectedCard.name && (
                <a
                  href={`https://map.naver.com/p/search/${encodeURIComponent(
                    selectedCard.name + ' ' + (selectedCard.address || '')
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-modal-link naver"
                >
                  네이버 지도 →
                </a>
              )}
            </div>
            <div className="mb-modal-life-info">
              {!isExempt && <span>남은 라이프: {userLife}개</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
