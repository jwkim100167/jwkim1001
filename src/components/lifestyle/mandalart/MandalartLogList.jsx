import React, { useState, useEffect } from 'react';
import { getMyLogs } from '../../../services/lifestyle/mandalartLogService';
import { LOG_FILTERS, formatLog, timeAgo, dateGroupLabel } from '../../../utils/lifestyle/mandalartLog';
import './MandalartLogList.css';

// 로그 목록 (날짜별 묶음). showName: 그룹 피드처럼 행동한 사람 이름 표시
export const LogList = ({ logs, names = {}, showName = false, emptyText = '아직 기록이 없어요.' }) => {
  if (!logs.length) return <div className="mlog-empty">{emptyText}</div>;

  const groups = [];
  logs.forEach(log => {
    const label = dateGroupLabel(log.updated_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(log);
    else groups.push({ label, items: [log] });
  });

  return (
    <div className="mlog-list">
      {groups.map(g => (
        <div key={g.label} className="mlog-day">
          <div className="mlog-day-label">{g.label}</div>
          {g.items.map(log => {
            const { icon, text } = formatLog(log, names);
            return (
              <div key={log.id} className={`mlog-item${log.type.endsWith('achieved') ? ' achieve' : ''}`}>
                <span className="mlog-icon">{icon}</span>
                <span className="mlog-text">
                  {showName && <b className="mlog-name">{names[log.user_id] ?? '멤버'}</b>}
                  {text}
                </span>
                <span className="mlog-time">{timeAgo(log.updated_at)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// 내 설정 > 로그 보기
export const MyLogPanel = ({ userId }) => {
  const [category, setCategory] = useState('all');
  const [logs, setLogs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async (cat, offset) => {
    setLoading(true);
    const result = await getMyLogs(userId, { category: cat, offset });
    setLogs(prev => (offset === 0 ? result.logs : [...prev, ...result.logs]));
    setHasMore(result.hasMore);
    setLoading(false);
  };

  useEffect(() => {
    load(category, 0);
  }, [userId, category]);

  return (
    <div className="mlog-panel">
      <div className="mlog-filters">
        {LOG_FILTERS.map(f => (
          <button
            key={f.key}
            className={`mlog-filter${category === f.key ? ' active' : ''}`}
            onClick={() => setCategory(f.key)}
          >{f.label}</button>
        ))}
      </div>
      <div className="mlog-scroll">
        {loading && logs.length === 0
          ? <div className="mlog-empty">불러오는 중...</div>
          : <LogList logs={logs} />}
        {hasMore && (
          <button className="mlog-more" onClick={() => load(category, logs.length)} disabled={loading}>
            {loading ? '불러오는 중...' : '더 보기'}
          </button>
        )}
      </div>
    </div>
  );
};
