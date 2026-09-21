import { useNavigate } from 'react-router-dom';
import './TasteHub.css';

const HUB_SERVICES = [
  {
    id: 'movie',
    icon: '🎬',
    title: '영화 취향 찾기',
    desc: '나의 영화 취향 유형 찾기',
    links: [{ label: '시작하기 →', path: '/movie-recommend' }],
  },
  {
    id: 'kbo',
    icon: '⚾',
    title: 'KBO 순위 예측',
    desc: '2026 시즌 순위 예측 · 점수 확인',
    links: [
      { label: '예측하기 →', path: '/kbo-predict/form' },
      { label: '결과 확인 →', path: '/kbo-predict/result' },
    ],
  },
  {
    id: 'food-vip',
    icon: '🍽️',
    title: '오늘 뭐 먹지? [멤버십]',
    desc: '멤버십 전용 음식 추천',
    links: [{ label: '입장하기 →', path: '/momok-best' }],
  },
];

export default function TasteHub() {
  const navigate = useNavigate();

  return (
    <div className="th-page">
      <div className="th-container">
        <button className="th-back-btn" onClick={() => navigate('/')}>
          ← 홈으로
        </button>

        <div className="th-header">
          <div className="th-header-icon">🔬</div>
          <h1 className="th-title">취향연구소</h1>
          <p className="th-subtitle">나의 일상 취향을 발견하고 추천받는 공간</p>
        </div>

        <div className="th-cards">
          {HUB_SERVICES.map((svc) => (
            <div key={svc.id} className="th-card">
              <div className="th-card-icon">{svc.icon}</div>
              <div className="th-card-body">
                <div className="th-card-title">{svc.title}</div>
                <div className="th-card-desc">{svc.desc}</div>
              </div>
              <div className="th-card-links">
                {svc.links.map((link) => (
                  <button
                    key={link.path}
                    className="th-link-btn"
                    onClick={() => navigate(link.path)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
