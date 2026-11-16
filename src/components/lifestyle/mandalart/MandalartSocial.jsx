import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  getMyPublic, setMyPublic, getSocialFeed, toggleLike,
} from '../../../services/lifestyle/mandalartSocialService';
import './MandalartGroups.css';
import './MandalartSocial.css';

const TABS = [
  { key: 'latest', label: '🕒 최신' },
  { key: 'popular', label: '🔥 인기' },
];

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const MandalartSocial = () => {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState('latest');
  const [feed, setFeed] = useState({ latest: [], popular: [] });
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(null); // null: 만다라트 미작성
  const [message, setMessage] = useState('');
  const [likingId, setLikingId] = useState(null);

  const loadFeed = async () => {
    setFeed(await getSocialFeed(user.id));
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const load = async () => {
      setLoading(true);
      const [pub] = await Promise.all([getMyPublic(user.id), loadFeed()]);
      setIsPublic(pub);
      setLoading(false);
    };
    load();
  }, [isAuthenticated, user?.id]);

  const handleTogglePublic = async () => {
    const next = !isPublic;
    if (next && !window.confirm(
      '내 만다라트를 소셜에 공개할까요?\n\n' +
      '· 모든 회원이 제목·목표·진행도·상태를 볼 수 있어요.\n' +
      '· 메모는 공개되지 않아요.\n' +
      '· 언제든 다시 비공개로 바꿀 수 있어요.'
    )) return;
    const result = await setMyPublic(user.id, next);
    if (result.error) { setMessage(result.error); return; }
    setIsPublic(result.isPublic);
    setMessage(result.isPublic ? '소셜에 공개했어요.' : '비공개로 바꿨어요. 소셜에서 내려갔어요.');
    loadFeed();
  };

  const handleLike = async (item) => {
    if (likingId) return;
    setLikingId(item.userId);
    if (await toggleLike(user.id, item.userId, item.likedByMe)) await loadFeed();
    setLikingId(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="mgroup-app">
        <div className="mgroup-empty">
          로그인 후 이용 가능합니다.
          <Link to="/mandalart" className="mgroup-back">← 만다라트</Link>
        </div>
      </div>
    );
  }

  const list = feed[tab];

  return (
    <div className="mgroup-app">
      <div className="mgroup-header">
        <Link to="/mandalart" className="mgroup-back">← 내 만다라트</Link>
        <h1 className="mgroup-title">만다라트 소셜</h1>
        <Link to="/mandalart/groups" className="msocial-nav">👥 그룹</Link>
      </div>

      <div className="mgroup-body">
        <div className="mgroup-forms">
          <div className="msocial-public">
            <div className="msocial-public-text">
              <span className="msocial-public-title">
                내 만다라트 {isPublic ? '🌐 공개 중' : '🔒 비공개'}
              </span>
              <span className="msocial-public-desc">
                {isPublic === null
                  ? '만다라트를 먼저 작성하면 공개할 수 있어요.'
                  : '공개하면 모든 회원이 볼 수 있어요. 메모는 공개되지 않아요.'}
              </span>
            </div>
            <button
              className={`msocial-switch${isPublic ? ' on' : ''}`}
              onClick={handleTogglePublic}
              disabled={isPublic === null}
              aria-label="소셜 공개 설정"
            >
              <span className="msocial-switch-knob" />
            </button>
          </div>
          {message && <div className="mgroup-message">{message}</div>}
        </div>

        <div className="msocial-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`msocial-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="mgroup-empty">소셜 불러오는 중...</div>
        ) : list.length === 0 ? (
          <div className="mgroup-empty">아직 공개된 만다라트가 없어요. 첫 번째로 공개해보세요!</div>
        ) : (
          <div className="mgroup-list">
            {list.map((item, i) => {
              const isMe = item.userId === user.id;
              return (
                <div key={item.userId} className="mgroup-card msocial-card">
                  <div className="mgroup-member">
                    <div className="mgroup-member-top">
                      <span className="mgroup-member-name">
                        <span className="msocial-rank">{i + 1}</span>
                        {item.name}{isMe && <span className="mgroup-me"> (나)</span>}
                      </span>
                      <span className="mgroup-member-date">수정 {formatDate(item.updatedAt)}</span>
                    </div>
                    <div className="mgroup-member-goal">🎯 {item.coreGoal || '핵심 목표 미설정'}</div>
                    <div className="mgroup-member-progress">
                      <div className="mgroup-track">
                        <div className="mgroup-fill" style={{ width: `${item.totalProgress}%` }} />
                      </div>
                      <span className="mgroup-pct">{item.totalProgress}%</span>
                      <span className="mgroup-target">/ 목표 {item.targetRate}%</span>
                      {item.achieved && <span className="mgroup-achieved">🎉 달성</span>}
                    </div>
                    <div className="msocial-actions">
                      <button
                        className={`msocial-like${item.likedByMe ? ' liked' : ''}`}
                        onClick={() => handleLike(item)}
                        disabled={isMe || likingId === item.userId}
                        title={isMe ? '내 만다라트에는 응원할 수 없어요' : '응원하기'}
                      >
                        <span className="msocial-like-icon">👏</span>
                        {isMe ? '받은 응원' : item.likedByMe ? '응원함' : '응원하기'} {item.likeCount}
                      </button>
                      <Link
                        to={isMe ? '/mandalart' : `/mandalart/view/${item.userId}`}
                        className="mgroup-view"
                      >🎯 {isMe ? '내 만다라트 보기' : `${item.name}님의 만다라트 보기`} →</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MandalartSocial;
