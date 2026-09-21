import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServiceConfig } from '../../services/core/supabaseAdmin';
import './BonusHub.css';

const HUB_SERVICES = [
  {
    id: 'lotto',
    icon: '🎰',
    title: '로또 번호 생성',
    desc: '행운의 번호를 뽑아보세요',
    links: [
      { label: '일반 →', path: '/lotto-basic' },
      { label: '멤버십 →', path: '/lotto' },
    ],
  },
  {
    id: 'food',
    icon: '🍽️',
    title: '오늘 뭐 먹지?',
    desc: '오늘 점심·저녁 메뉴 추천',
    links: [
      { label: '추천받기 →', path: '/whattoeat' },
      { label: '멤버십 →', path: '/momok-best' },
    ],
  },
];

export default function BonusHub() {
  const navigate = useNavigate();
  const [orderedServices, setOrderedServices] = useState(HUB_SERVICES);

  useEffect(() => {
    getServiceConfig().then(cfg => {
      const dbOrder = cfg?.childrenMap?.['bonus'];
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
    <div className="bh-page">
      <div className="bh-container">
        <button className="bh-back-btn" onClick={() => navigate('/')}>
          ← 홈으로
        </button>

        <div className="bh-header">
          <div className="bh-header-icon">🎁</div>
          <h1 className="bh-title">보너스</h1>
          <p className="bh-subtitle">로또 번호 · 오늘 메뉴 한 번에</p>
        </div>

        <div className="bh-cards">
          {orderedServices.map((svc) => (
            <div key={svc.id} className="bh-card">
              <div className="bh-card-icon">{svc.icon}</div>
              <div className="bh-card-body">
                <div className="bh-card-title">{svc.title}</div>
                <div className="bh-card-desc">{svc.desc}</div>
              </div>
              <div className="bh-card-links">
                {svc.links.map((link) => (
                  <button
                    key={link.path}
                    className="bh-link-btn"
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
