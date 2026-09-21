import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServiceConfig } from '../../services/core/supabaseAdmin';
import './GatsaengHub.css';

const HUB_SERVICES = [
  {
    id: 'mandalart',
    icon: '🎯',
    title: '만다라트 [멤버십]',
    desc: '9×9 목표 관리 플래너',
    links: [{ label: '시작하기 →', path: '/mandalart' }],
  },
  {
    id: 'monthly-review',
    icon: '📅',
    title: '먼슬리뷰',
    desc: '나의 한 달을 돌아보는 회고',
    links: [{ label: '시작하기 →', path: '/monthly-review' }],
  },
];

export default function GatsaengHub() {
  const navigate = useNavigate();
  const [orderedServices, setOrderedServices] = useState(HUB_SERVICES);

  useEffect(() => {
    getServiceConfig().then(cfg => {
      const dbOrder = cfg?.childrenMap?.['gatsaeng'];
      if (dbOrder?.length > 0) {
        setOrderedServices(
          [...HUB_SERVICES].sort((a, b) => {
            const ai = dbOrder.indexOf(a.id);
            const bi = dbOrder.indexOf(b.id);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          })
        );
      }
    });
  }, []);

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
          {orderedServices.map((svc) => (
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
