import React, { useState, forwardRef, useImperativeHandle } from 'react';
import './FearGreedIndex.css';

const FearGreedIndex = forwardRef((props, ref) => {
  const [fearGreedIndex, setFearGreedIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 공포와 탐욕 지수에 따른 신호등 색상 결정 (순수 색상)
  const getLightColor = (index) => {
    if (index === null || index === undefined) return { color: 'none', style: {} };
    
    let color;
    
    if (index >= 75) {
      // 안정 구간 (순수 빨간색)
      color = '#ff4444';
    } else if (index >= 50) {
      // 경계 구간 (순수 노란색)
      color = '#ffff44';
    } else if (index >= 25) {
      // 공포 구간 (순수 초록색)
      color = '#44ff44';
    } else {
      // 극공포 구간 (순수 파란색)
      color = '#4488ff';
    }
    
    return { color: 'gradient', style: { backgroundColor: color, boxShadow: `0 0 25px ${color}` } };
  };

  // 공포와 탐욕 지수에 따른 상태 메시지
  const getStatusMessage = (index) => {
    if (index === null || index === undefined) return '지수 정보 없음';
    if (index >= 75) return `안정 (${index})\n극도의 탐욕 상태`;
    if (index >= 50) return `경계 (${index})\n탐욕 상태`;
    if (index >= 25) return `공포 (${index})\n중립 상태`;
    return `극공포 (${index})\n매수 기회`;
  };

  // 공포와 탐욕 지수 API 호출 (외부에서 호출 가능)
  const fetchFearGreedIndex = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // CNN Fear & Greed Index API 호출
      const response = await fetch('https://api.alternative.me/fng/');
      const data = await response.json();
      
      if (data && data.data && data.data[0] && data.data[0].value) {
        const index = parseInt(data.data[0].value);
        setFearGreedIndex(index);
        return index;
      } else {
        throw new Error('공포와 탐욕 지수 데이터를 가져올 수 없습니다');
      }
    } catch (err) {
      console.error('공포와 탐욕 지수 API 에러:', err);
      setError('지수 정보를 가져오는데 실패했습니다');
      setFearGreedIndex(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 외부에서 호출할 수 있는 메서드 노출
  useImperativeHandle(ref, () => ({
    fetchData: fetchFearGreedIndex
  }));

  const lightInfo = getLightColor(fearGreedIndex);

  return (
    <div className="fear-greed-index-light">
      <div className="fear-greed-index-header">
        <h3>공포와 탐욕 지수</h3>
        <span className="data-period">데이터 출처</span>
        <span className="data-period">준비중</span>
        {loading && <span className="loading">로딩중...</span>}
      </div>
      
      <div className="single-light-container">
        <div 
          className={`single-light ${lightInfo.color !== 'none' ? 'active' : ''}`}
          style={lightInfo.color !== 'none' ? lightInfo.style : {}}
        ></div>
      </div>
      
      <div className="fear-greed-index-status">
        {error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="status-message">
            {getStatusMessage(fearGreedIndex).split('\n').map((line, index) => (
              <div key={index} className={index === 1 ? 'sub-message' : ''}>{line}</div>
            ))}
          </div>
        )}
      </div>
      
      <div className="threshold-guide">
        <div>≥75 안정</div>
        <div>50-74 경계</div>
        <div>25-49 공포</div>
        <div>0-24 극공포</div>
      </div>
    </div>
  );
});

export default FearGreedIndex;