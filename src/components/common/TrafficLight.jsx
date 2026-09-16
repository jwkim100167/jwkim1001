import React, { useState } from 'react';
import './TrafficLight.css';

const TrafficLight = ({ id, initialState = 'red' }) => {
  const [currentLight, setCurrentLight] = useState(initialState);

  const getNextLight = (current) => {
    switch (current) {
      case 'red':
        return 'yellow';
      case 'yellow':
        return 'green';
      case 'green':
        return 'blue';
      case 'blue':
        return 'red';
      default:
        return 'red';
    }
  };

  const getStatusMessage = (light) => {
    switch (light) {
      case 'red':
        return '안정';
      case 'yellow':
        return '경계';
      case 'green':
        return '공포';
      case 'blue':
        return '극공포';
      default:
        return '대기';
    }
  };

  const getLightStyle = (light) => {
    switch (light) {
      case 'red':
        return { backgroundColor: '#ff4444', boxShadow: '0 0 25px #ff4444' };
      case 'yellow':
        return { backgroundColor: '#ffff44', boxShadow: '0 0 25px #ffff44' };
      case 'green':
        return { backgroundColor: '#44ff44', boxShadow: '0 0 25px #44ff44' };
      case 'blue':
        return { backgroundColor: '#4488ff', boxShadow: '0 0 25px #4488ff' };
      default:
        return {};
    }
  };

  const handleClick = () => {
    setCurrentLight(prev => getNextLight(prev));
  };

  return (
    <div className="traffic-light-single" onClick={handleClick}>
      <div className="traffic-light-header">
        <h3>신호등 {id}</h3>
        <span className="data-period">데이터 출처</span>
        <span className="data-period">준비중</span>
      </div>
      
      <div className="single-light-container">
        <div 
          className={`single-light ${currentLight ? 'active' : ''}`}
          style={currentLight ? getLightStyle(currentLight) : {}}
        ></div>
      </div>
      
      <div className="traffic-light-status">
        <div className="status-message">
          {getStatusMessage(currentLight)} ({currentLight})
        </div>
      </div>
      
      <div className="threshold-guide">
        클릭하여 상태 변경 (4단계 순환)
      </div>
    </div>
  );
};

export default TrafficLight;