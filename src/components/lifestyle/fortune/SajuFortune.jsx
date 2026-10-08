import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getYearGanji,
  getDayGanji,
  getRelation,
  getElementDist,
  getTodayMsgIndex,
  GAN_ELEMENT,
  ELEMENT_KOR,
} from '../../../utils/sajuCalc';
import {
  RELATION_META,
  FORTUNE_MESSAGES,
  ILGAN_LUCK,
  ILGAN_TRAIT,
} from '../../../data/lifestyle/fortuneTexts';
import './SajuFortune.css';

const STORAGE_KEY = 'saju_birthdate';

const ELEMENT_COLORS = { 木: '#5a9e5a', 火: '#e05c5c', 土: '#c4a435', 金: '#aaaaaa', 水: '#4a90d9' };
const ELEMENT_ORDER = ['木', '火', '土', '金', '水'];

function StarRow({ label, count }) {
  return (
    <div className="sf-star-row">
      <span className="sf-star-label">{label}</span>
      <span className="sf-stars">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < count ? 'sf-star filled' : 'sf-star'}>
            {i < count ? '★' : '☆'}
          </span>
        ))}
      </span>
    </div>
  );
}

export default function SajuFortune() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('input'); // 'input' | 'loading' | 'result'
  const [birthdate, setBirthdate] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBirthdate(saved);
    }
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!birthdate) return;
    localStorage.setItem(STORAGE_KEY, birthdate);
    setPhase('loading');
    setTimeout(() => {
      setResult(calculate(birthdate));
      setPhase('result');
    }, 1500);
  }

  function handleReset() {
    setPhase('input');
    setResult(null);
  }

  function calculate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const today = new Date();

    const yearGanji = getYearGanji(y, m, d);
    const birthDayGanji = getDayGanji(y, m, d);
    const todayGanji = getDayGanji(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );

    const relation = getRelation(birthDayGanji.gan, todayGanji.gan);
    const meta = RELATION_META[relation];
    const msgIdx = getTodayMsgIndex(15);
    const message = FORTUNE_MESSAGES[relation][msgIdx];

    const elementDist = getElementDist(yearGanji, birthDayGanji);
    const luck = ILGAN_LUCK[birthDayGanji.gan];
    const trait = ILGAN_TRAIT[birthDayGanji.gan];
    const myElement = GAN_ELEMENT[birthDayGanji.gan];

    return {
      yearGanji,
      birthDayGanji,
      todayGanji,
      relation,
      meta,
      message,
      elementDist,
      luck,
      trait,
      myElement,
      todayStr: `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`,
    };
  }

  return (
    <div className="sf-page">
      <div className="sf-container">
        <div className="sf-nav-row">
          <button className="sf-nav-btn" onClick={() => navigate('/')}>← 홈</button>
          <button className="sf-nav-btn" onClick={() => navigate('/bonus')}>보너스 →</button>
        </div>

        {phase === 'input' && (
          <div className="sf-input-section">
            <div className="sf-header-icon">🔮</div>
            <h1 className="sf-title">오늘의 운세</h1>
            <p className="sf-subtitle">생년월일로 오늘의 사주 흐름을 읽어드립니다</p>
            <form className="sf-form" onSubmit={handleSubmit}>
              <label className="sf-label">생년월일</label>
              <input
                type="date"
                className="sf-date-input"
                value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
              />
              <button type="submit" className="sf-submit-btn">운세 보기 →</button>
            </form>
          </div>
        )}

        {phase === 'loading' && (
          <div className="sf-loading">
            <div className="sf-loading-icon">🔮</div>
            <p className="sf-loading-text">사주를 읽고 있습니다...</p>
          </div>
        )}

        {phase === 'result' && result && (
          <div className="sf-result">
            {/* 연주 / 일주 */}
            <div className="sf-ganji-section">
              <div className="sf-ganji-card">
                <div className="sf-ganji-label">연주(年柱)</div>
                <div className="sf-ganji-chars">
                  <span className="sf-gan">{result.yearGanji.gan}</span>
                  <span className="sf-ji">{result.yearGanji.ji}</span>
                </div>
                <div className="sf-ganji-sub">
                  {result.yearGanji.zodiac}띠 ·{' '}
                  <span style={{ color: ELEMENT_COLORS[GAN_ELEMENT[result.yearGanji.gan]] }}>
                    {ELEMENT_KOR[GAN_ELEMENT[result.yearGanji.gan]]}
                  </span>
                </div>
              </div>
              <div className="sf-ganji-card">
                <div className="sf-ganji-label">일주(日柱)</div>
                <div className="sf-ganji-chars">
                  <span className="sf-gan">{result.birthDayGanji.gan}</span>
                  <span className="sf-ji">{result.birthDayGanji.ji}</span>
                </div>
                <div className="sf-ganji-sub">
                  <span style={{ color: ELEMENT_COLORS[result.myElement] }}>
                    {ELEMENT_KOR[result.myElement]}
                  </span>{' '}
                  · {result.trait}
                </div>
              </div>
            </div>

            {/* 오늘의 운세 */}
            <div className="sf-fortune-section">
              <div className="sf-today-date">{result.todayStr} 오늘의 운세</div>
              <div className="sf-relation-badge">{result.meta.label}</div>
              <div className="sf-relation-sub">{result.meta.sub}</div>

              <div className="sf-stars-section">
                <StarRow label="전체운" count={result.meta.stars.overall} />
                <StarRow label="애정운" count={result.meta.stars.love} />
                <StarRow label="금전운" count={result.meta.stars.money} />
                <StarRow label="건강운" count={result.meta.stars.health} />
              </div>

              <div className="sf-message">"{result.message}"</div>

              <div className="sf-luck-grid">
                {[
                  { icon: '🎨', label: '행운의 색',    value: result.luck.color },
                  { icon: '🔢', label: '행운의 숫자',  value: result.luck.number },
                  { icon: '🧭', label: '행운의 방향',  value: result.luck.direction },
                  { icon: '🎁', label: '행운의 물건',  value: result.luck.item },
                  { icon: '⏰', label: '좋은 시간대',  value: result.luck.time },
                  { icon: '⚠️', label: '오늘 피할 것', value: result.luck.avoid, danger: true },
                ].map(({ icon, label, value, danger }) => (
                  <div key={label} className={`sf-luck-card${danger ? ' danger' : ''}`}>
                    <span className="sf-luck-card-icon">{icon}</span>
                    <span className="sf-luck-card-label">{label}</span>
                    <span className="sf-luck-card-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 오행 분포 */}
            <div className="sf-element-section">
              <div className="sf-section-title">오행 분포</div>
              {ELEMENT_ORDER.map(el => (
                <div key={el} className="sf-element-row">
                  <span className="sf-el-name" style={{ color: ELEMENT_COLORS[el] }}>
                    {el}
                  </span>
                  <div className="sf-el-bar-bg">
                    <div
                      className="sf-el-bar-fill"
                      style={{
                        width: `${(result.elementDist[el] / 4) * 100}%`,
                        background: ELEMENT_COLORS[el],
                      }}
                    />
                  </div>
                  <span className="sf-el-pct">{Math.round((result.elementDist[el] / 4) * 100)}%</span>
                </div>
              ))}
            </div>

            <button className="sf-reset-btn" onClick={handleReset}>
              생년월일 변경
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
