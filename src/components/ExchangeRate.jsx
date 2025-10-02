import React, { useState, forwardRef, useImperativeHandle } from 'react';
import './ExchangeRate.css';

const ExchangeRate = forwardRef((props, ref) => {
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 환율에 따른 신호등 색상 결정 (순수 색상)
  const getLightColor = (rate) => {
    if (!rate) return { color: 'none', style: {} };
    
    let color;
    
    if (rate >= 1500) {
      // 극공포 (순수 파란색)
      color = '#4488ff';
    } else if (rate >= 1450) {
      // 공포 구간 (순수 초록색)
      color = '#44ff44';
    } else if (rate >= 1300) {
      // 경계 구간 (순수 노란색)
      color = '#ffff44';
    } else {
      // 안정 구간 (순수 빨간색)
      color = '#ff4444';
    }
    
    return { color: 'gradient', style: { backgroundColor: color, boxShadow: `0 0 25px ${color}` } };
  };

  // 환율에 따른 상태 메시지
  const getStatusMessage = (rate) => {
    if (!rate) return '환율 정보 없음';
    if (rate >= 1500) return `극공포 (${rate}원)\n심각한 경제 위기 상황`;
    if (rate >= 1450) return `공포 (${rate}원)\n위기 국면 진입의 시그널로 해석 가능`;
    if (rate >= 1300) return `경계 (${rate}원)`;
    return `안정 (${rate}원)`;
  };

  // 환율 API 호출 (외부에서 호출 가능)
  const fetchExchangeRate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 실제 환율 API 사용 (무료 API 예시)
      // 여기서는 예시로 ExchangeRate-API를 사용합니다
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      if (data && data.rates && data.rates.KRW) {
        const rate = Math.round(data.rates.KRW);
        setExchangeRate(rate);
        return rate;
      } else {
        throw new Error('환율 데이터를 가져올 수 없습니다');
      }
    } catch (err) {
      console.error('환율 API 에러:', err);
      setError('환율 정보를 가져오는데 실패했습니다');
      setExchangeRate(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 외부에서 호출할 수 있는 메서드 노출
  useImperativeHandle(ref, () => ({
    fetchData: fetchExchangeRate
  }));

  const lightInfo = getLightColor(exchangeRate);

  return (
    <div className="exchange-rate-light">
      <div className="exchange-rate-header">
        <h3>환율 (USD/KRW)</h3>
        <span className="data-period">평균 데이터</span>
        <span className="data-period">5년(2021~2025)</span>
        {loading && <span className="loading">로딩중...</span>}
      </div>
      
      <div className="single-light-container">
        <div 
          className={`single-light ${lightInfo.color !== 'none' ? 'active' : ''}`}
          style={lightInfo.color !== 'none' ? lightInfo.style : {}}
        ></div>
      </div>
      
      <div className="exchange-rate-status">
        {error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="status-message">
            {getStatusMessage(exchangeRate).split('\n').map((line, index) => (
              <div key={index} className={index === 1 ? 'crisis-warning' : ''}>{line}</div>
            ))}
          </div>
        )}
      </div>
      
      <div className="threshold-guide">
        <div>≤₩1,300 안정</div>
        <div>₩1,300~₩1,449 경계</div>
        <div>₩1,450~₩1,499 공포</div>
        <div>≥₩1,500 극공포</div>
      </div>
    </div>
  );
});

export default ExchangeRate;