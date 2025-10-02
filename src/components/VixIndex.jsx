import React, { useState, forwardRef, useImperativeHandle } from 'react';
import './VixIndex.css';

const VixIndex = forwardRef((props, ref) => {
  const [vixIndex, setVixIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // VIX 지수에 따른 신호등 색상 결정 (순수 색상)
  const getLightColor = (index) => {
    if (index === null || index === undefined) return { color: 'none', style: {} };
    
    let color;
    
    if (index >= 40) {
      // 극공포 구간 (순수 파란색)
      color = '#4488ff';
    } else if (index >= 30) {
      // 공포 구간 (순수 초록색)
      color = '#44ff44';
    } else if (index >= 20) {
      // 경계 구간 (순수 노란색)
      color = '#ffff44';
    } else {
      // 안정 구간 (순수 빨간색)
      color = '#ff4444';
    }
    
    return { color: 'gradient', style: { backgroundColor: color, boxShadow: `0 0 25px ${color}` } };
  };

  // VIX 지수에 따른 상태 메시지
  const getStatusMessage = (index) => {
    if (index === null || index === undefined) return '지수 정보 없음';
    if (index >= 40) return `극공포 (${index})\n시장 극도 불안`;
    if (index >= 30) return `공포 (${index})\n고변동성`;
    if (index >= 20) return `경계 (${index})\n보통변동성`;
    return `안정 (${index})\n저변동성`;
  };

  // VIX 지수 API 호출
  const fetchVixIndex = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('VIX API 호출 시작...');
      
      // 1차 시도: 12data API (무료, CORS 지원)
      try {
        const response = await fetch('https://api.twelvedata.com/quote?symbol=VIX&apikey=demo');
        console.log('12data API 응답:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('12data 데이터:', data);
          
          if (data && typeof data.close === 'string') {
            const index = parseFloat(data.close);
            if (!isNaN(index)) {
              console.log('VIX 지수 성공 (12data):', index);
              setVixIndex(index);
              return index;
            }
          }
        }
      } catch (twelveErr) {
        console.error('12data API 에러:', twelveErr);
      }

      // 2차 시도: Polygon API (무료 티어)
      try {
        const response = await fetch('https://api.polygon.io/v2/aggs/ticker/I:VIX/prev?apikey=demo');
        console.log('Polygon API 응답:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Polygon 데이터:', data);
          
          if (data?.results?.[0]?.c) {
            const index = parseFloat(data.results[0].c);
            if (!isNaN(index)) {
              console.log('VIX 지수 성공 (Polygon):', index);
              setVixIndex(index);
              return index;
            }
          }
        }
      } catch (polygonErr) {
        console.error('Polygon API 에러:', polygonErr);
      }

      // API 실패로 인해 데이터 없음
      throw new Error('모든 VIX API 실패');
      
    } catch (err) {
      console.error('VIX 전체 API 에러:', err);
      setError('실시간 데이터 연결 실패 (시뮬레이션 모드)');
      
      // API 실패 시 null 반환
      console.log('VIX API 완전 실패 - 데이터 없음');
      setVixIndex(null);
      return null;
      
    } finally {
      setLoading(false);
    }
  };

  // 외부에서 호출할 수 있는 메서드 노출
  useImperativeHandle(ref, () => ({
    fetchData: fetchVixIndex
  }));

  const lightInfo = getLightColor(vixIndex);

  return (
    <div className="vix-index-light">
      <div className="vix-index-header">
        <h3>VIX 지수</h3>
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
      
      <div className="vix-index-status">
        {error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="status-message">
            {getStatusMessage(vixIndex).split('\n').map((line, index) => (
              <div key={index} className={index === 1 ? 'sub-message' : ''}>{line}</div>
            ))}
          </div>
        )}
      </div>
      
      <div className="threshold-guide">
        <div>&lt;20 안정</div>
        <div>20-29 경계</div>
        <div>30-39 공포</div>
        <div>≥40 극공포</div>
      </div>
    </div>
  );
});

export default VixIndex;