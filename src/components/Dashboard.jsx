import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ExchangeRate from './ExchangeRate';
import FearGreedIndex from './FearGreedIndex';
import VixIndex from './VixIndex';
import TrafficLight from './common/TrafficLight';
import NotificationPopup from './common/NotificationPopup';
import { checkAllRangeChanges } from '../utils/common/notificationUtils';
import './Dashboard.css';

const Dashboard = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationChanges, setNotificationChanges] = useState([]);
  const [values, setValues] = useState({
    exchangeRate: null,
    fearGreedIndex: null,
    vixIndex: null
  });
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // 컴포넌트 참조
  const exchangeRateRef = useRef();
  const fearGreedRef = useRef();
  const vixRef = useRef();

  // 배치 업데이트 함수
  const runBatchUpdate = async () => {
    console.log('배치 업데이트 시작:', new Date().toLocaleString());
    
    try {
      // 모든 컴포넌트의 데이터를 가져옴
      const exchangeRateValue = await exchangeRateRef.current?.fetchData();
      const fearGreedValue = await fearGreedRef.current?.fetchData();
      const vixValue = await vixRef.current?.fetchData();

      const newValues = {
        exchangeRate: exchangeRateValue,
        fearGreedIndex: fearGreedValue,
        vixIndex: vixValue
      };

      setValues(newValues);

      // API 실패 확인
      const failedAPIs = [];
      if (exchangeRateValue === null) failedAPIs.push('환율 (USD/KRW)');
      if (fearGreedValue === null) failedAPIs.push('공포와 탐욕 지수');
      if (vixValue === null) failedAPIs.push('VIX 지수');

      // 범위 변경 확인
      const changes = checkAllRangeChanges(newValues);
      
      // API 실패 정보 추가
      if (failedAPIs.length > 0) {
        changes.push({
          componentName: 'API 연결 실패',
          currentValue: `${failedAPIs.length}개 실패`,
          currentRange: failedAPIs.join(', '),
          hasChanged: true,
          previousValue: '정상',
          previousRange: '연결됨',
          isError: true
        });
      }
      
      setNotificationChanges(changes);
      
      // 알림 표시
      setShowNotification(true);
      setLastUpdateTime(new Date());

      console.log('배치 업데이트 완료:', changes);
    } catch (error) {
      console.error('배치 업데이트 에러:', error);
    }
  };

  // 컴포넌트 마운트 시 즉시 실행하고, 이후 매 시간 정각에 실행
  useEffect(() => {
    // 즉시 첫 업데이트 (데이터만 가져와서 표시, 알림은 표시하지 않음)
    const runInitialUpdate = async () => {
      console.log('초기 데이터 로드 시작:', new Date().toLocaleString());
      
      try {
        // 모든 컴포넌트의 데이터를 가져옴
        const exchangeRateValue = await exchangeRateRef.current?.fetchData();
        const fearGreedValue = await fearGreedRef.current?.fetchData();
        const vixValue = await vixRef.current?.fetchData();

        const newValues = {
          exchangeRate: exchangeRateValue,
          fearGreedIndex: fearGreedValue,
          vixIndex: vixValue
        };

        setValues(newValues);
        setLastUpdateTime(new Date());
        
        console.log('초기 데이터 로드 완료:', newValues);
      } catch (error) {
        console.error('초기 데이터 로드 에러:', error);
      }
    };

    // 즉시 초기 데이터 로드
    const timer = setTimeout(() => {
      runInitialUpdate();
    }, 500);

    // 다음 정각까지의 시간을 계산하고 정각마다 실행
    const scheduleNextUpdate = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0); // 다음 정각으로 설정
      
      const timeUntilNextHour = nextHour.getTime() - now.getTime();
      
      console.log(`다음 업데이트: ${nextHour.toLocaleString()} (${Math.round(timeUntilNextHour / 1000 / 60)}분 후)`);
      
      // 첫 번째 정각 업데이트 스케줄링
      setTimeout(() => {
        runBatchUpdate();
        
        // 이후 매 시간 정각마다 실행
        setInterval(() => {
          runBatchUpdate();
        }, 60 * 60 * 1000); // 1시간마다
        
      }, timeUntilNextHour);
    };
    
    scheduleNextUpdate();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>자동 모니터링 대시보드</h1>
        <div className="global-color-guide">
          🔴 안정 🟡 경계 🟢 공포 🔵 극공포
        </div>
        <div className="batch-info">
          {lastUpdateTime ? (
            <div>
              마지막 업데이트: {lastUpdateTime.toLocaleString()}
              <br />
              다음 업데이트: {(() => {
                const now = new Date();
                const nextHour = new Date(now);
                nextHour.setHours(now.getHours() + 1, 0, 0, 0);
                return nextHour.toLocaleString();
              })()}
            </div>
          ) : (
            <div>시스템 초기화 중...</div>
          )}
        </div>
      </div>
      
      <div className="traffic-lights-grid">
        <ExchangeRate ref={exchangeRateRef} />
        <FearGreedIndex ref={fearGreedRef} />
        <VixIndex ref={vixRef} />
        <TrafficLight id={4} initialState="red" />
        <TrafficLight id={5} initialState="yellow" />
      </div>
      
      <div className="dashboard-footer">
        <div className="footer-navigation">
          <Link to="/" className="home-btn">
            ← 홈으로 돌아가기
          </Link>
          <button 
            onClick={runBatchUpdate}
            className="manual-update-btn"
          >
            🔄 수동 업데이트
          </button>
        </div>
        <p>made by jwkim1001</p>
      </div>

      <NotificationPopup
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        changes={notificationChanges}
      />
    </div>
  );
};

export default Dashboard;