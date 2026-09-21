import { useNavigate } from 'react-router-dom';
import './GatsaengHub.css';

const HUB_SERVICES = [
  {
    id: 'mandalart',
    icon: '🎯',
    title: '만다라트 [멤버십]',
    desc: '9×9 목표 관리 플래너',
    links: [{ label: '시작하기 →', path: '/mandalart' }],
  },
];

export default function GatsaengHub() {
  const navigate = useNavigate();

  return (
    <div className="gh-page">
      <div className="gh-container">
        <button className="gh-back-btn" onClick={() => navigate('/')}>
          ← 홈으로
        </button>

        <div className="gh-header">
          <div className="gh-header-icon">💪</div>
          <h1 className="gh-title">갓생</h1>
          <p className="gh-subtitle">목표 설정 · 자기계발 한 곳에</p>
        </div>

        <div className="gh-cards">
          {HUB_SERVICES.map((svc) => (
            <div key={svc.id} className="gh-card">
              <div className="gh-card-icon">{svc.icon}</div>
              <div className="gh-card-body">
                <div className="gh-card-title">{svc.title}</div>
                <div className="gh-card-desc">{svc.desc}</div>
              </div>
              <div className="gh-card-links">
                {svc.links.map((link) => (
                  <button
                    key={link.path}
                    className="gh-link-btn"
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
