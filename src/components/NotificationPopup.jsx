import React, { useState, useEffect } from 'react';
import './NotificationPopup.css';

const NotificationPopup = ({ isVisible, onClose, changes }) => {
  const [timeLeft, setTimeLeft] = useState(60); // 60초

  useEffect(() => {
    if (!isVisible) return;

    // 1분 후 자동으로 닫기
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 60000);

    // 초 단위 카운트다운
    const countdownTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(autoCloseTimer);
      clearInterval(countdownTimer);
    };
  }, [isVisible, onClose]);

  useEffect(() => {
    if (isVisible) {
      setTimeLeft(60); // 팝업이 다시 열릴 때 초기화
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const hasChanges = changes && changes.some(change => change.hasChanged);

  return (
    <div className="notification-overlay">
      <div className="notification-popup">
        <div className="notification-header">
          <h2>📊 시간별 모니터링 결과</h2>
          <div className="notification-timer">{timeLeft}초 후 자동 닫힘</div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="notification-content">
          <div className="timestamp">
            업데이트 시간: {new Date().toLocaleString().split(':').slice(0, 2).join(':')}
          </div>
          
          {!hasChanges ? (
            <div className="no-changes">
              <div className="no-changes-icon">✅</div>
              <div className="no-changes-message">
                <strong>변동 사항 없음</strong>
                <p>모든 지수가 기존 범위를 유지하고 있습니다.</p>
              </div>
            </div>
          ) : (
            <div className="changes-list">
              {changes.map((change, index) => (
                <div key={index} className={`change-item ${change.isError ? 'error' : change.hasChanged ? 'changed' : 'unchanged'}`}>
                  <div className="change-icon">
                    {change.isError ? '❌' : change.hasChanged ? '🚨' : '📈'}
                  </div>
                  <div className="change-details">
                    <div className="component-name">{change.componentName}</div>
                    <div className="change-info">
                      {change.isError ? (
                        <div className="error-info">
                          <div className="error-message">
                            <strong>{change.currentRange}</strong>
                          </div>
                          <div className="error-description">
                            데이터를 가져오는데 실패했습니다
                          </div>
                        </div>
                      ) : change.hasChanged ? (
                        <>
                          <div className="range-change">
                            <span className="previous">{change.previousRange} ({change.previousValue})</span>
                            <span className="arrow">→</span>
                            <span className="current">{change.currentRange} ({change.currentValue})</span>
                          </div>
                        </>
                      ) : (
                        <div className="no-change">
                          <span className="current">{change.currentRange} ({change.currentValue})</span>
                          <span className="status">유지</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="notification-footer">
          <div className="next-update">
            다음 업데이트: {(() => {
              const now = new Date();
              const nextHour = new Date(now);
              nextHour.setHours(now.getHours() + 1, 0, 0, 0);
              return nextHour.toLocaleString();
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;