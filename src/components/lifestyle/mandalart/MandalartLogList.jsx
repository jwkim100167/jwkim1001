import React, { useState, useEffect } from 'react';
import { getMyLogs, getGroupLogs, clearMyLogs } from '../../../services/lifestyle/mandalartLogService';
import { getMyGroups, getGroupMembers } from '../../../services/lifestyle/mandalartGroupService';
import { LOG_FILTERS, typesOfCategory, formatLog, formatTime, dateGroupLabel } from '../../../utils/lifestyle/mandalartLog';
import './MandalartLogList.css';

// 최신순 로그 배열 → [{ label, items }] 날짜 묶음
function groupByDate(logs) {
  const groups = [];
  logs.forEach(log => {
    const label = dateGroupLabel(log.updated_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(log);
    else groups.push({ label, items: [log] });
  });
  return groups;
}

const LogItem = ({ log, names, showName }) => {
  const { icon, text, detail } = formatLog(log, names);
  return (
    <div className={`mlog-item${log.type.endsWith('achieved') ? ' achieve' : ''}`}>
      <span className="mlog-icon">{icon}</span>
      <span className="mlog-text">
        {showName && <b className="mlog-name">{names[log.user_id] ?? '멤버'} ·</b>}
        <span className="mlog-main">{text}</span>
        {detail && <span className="mlog-detail">{detail}</span>}
      </span>
      <span className="mlog-time">{formatTime(log.updated_at)}</span>
    </div>
  );
};

// 로그 목록 (날짜별 묶음). showName: 행동한 사람 이름 표시
export const LogList = ({ logs, names = {}, showName = false, emptyText = '아직 기록이 없어요.' }) => {
  if (!logs.length) return <div className="mlog-empty">{emptyText}</div>;
  return (
    <div className="mlog-list">
      {groupByDate(logs).map(g => (
        <div key={g.label} className="mlog-day">
          <div className="mlog-day-label">{g.label}</div>
          {g.items.map(log => <LogItem key={log.id} log={log} names={names} showName={showName} />)}
        </div>
      ))}
    </div>
  );
};

// 그룹 로그: 날짜별 → 멤버별 건수 요약, 멤버를 누르면 그날 로그 전체 펼침
export const GroupLogList = ({ logs, names = {}, emptyText = '아직 그룹 활동이 없어요.' }) => {
  const [expanded, setExpanded] = useState(() => new Set());
  if (!logs.length) return <div className="mlog-empty">{emptyText}</div>;

  const toggle = (key) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <div className="mlog-list">
      {groupByDate(logs).map(g => {
        // 그날 활동이 최근인 멤버 순서 유지
        const byUser = new Map();
        g.items.forEach(log => {
          if (!byUser.has(log.user_id)) byUser.set(log.user_id, []);
          byUser.get(log.user_id).push(log);
        });
        return (
          <div key={g.label} className="mlog-day">
            <div className="mlog-day-label">{g.label}</div>
            {[...byUser.entries()].map(([uid, items]) => {
              const key = `${g.label}|${uid}`;
              const open = expanded.has(key);
              return (
                <div key={key} className={`mlog-member${open ? ' open' : ''}`}>
                  <button className="mlog-member-row" onClick={() => toggle(key)}>
                    <span className="mlog-member-name">{names[uid] ?? '멤버'}</span>
                    <span className="mlog-member-count">{items.length}건</span>
                    <span className="mlog-member-arrow">{open ? '▲' : '▼'}</span>
                  </button>
                  {open && (
                    <div className="mlog-member-logs">
                      {items.map(log => <LogItem key={log.id} log={log} names={names} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// 내 로그 (서버 필터 + 20건씩 더 보기)
const MyLogs = ({ userId, category }) => {
  const [logs, setLogs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async (offset) => {
    setLoading(true);
    const result = await getMyLogs(userId, { category, offset });
    setLogs(prev => (offset === 0 ? result.logs : [...prev, ...result.logs]));
    setHasMore(result.hasMore);
    setLoading(false);
  };

  useEffect(() => {
    load(0);
  }, [userId, category]);

  if (loading && logs.length === 0) return <div className="mlog-empty">불러오는 중...</div>;
  return (
    <>
      <LogList logs={logs} />
      {hasMore && (
        <button className="mlog-more" onClick={() => load(logs.length)} disabled={loading}>
          {loading ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </>
  );
};

// 그룹 로그 (내가 속한 그룹 선택 → 멤버 공개 로그 + 그룹 로그 최신 30건)
const GroupLogs = ({ userId, category }) => {
  const [groups, setGroups] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [feed, setFeed] = useState(null);

  useEffect(() => {
    getMyGroups(userId).then(list => {
      setGroups(list);
      if (list.length) setGroupId(list[0].id);
    });
  }, [userId]);

  useEffect(() => {
    if (!groupId) return;
    setFeed(null);
    getGroupMembers(groupId)
      .then(members => getGroupLogs(groupId, members.map(m => m.userId)))
      .then(setFeed);
  }, [groupId]);

  if (!groups) return <div className="mlog-empty">불러오는 중...</div>;
  if (!groups.length) return <div className="mlog-empty">속한 그룹이 없어요. 그룹에 가입하면 멤버들의 활동을 볼 수 있어요.</div>;

  const types = typesOfCategory(category);
  const logs = feed ? (types ? feed.logs.filter(l => types.includes(l.type)) : feed.logs) : [];

  return (
    <>
      {groups.length > 1 && (
        <div className="mlog-groups">
          {groups.map(g => (
            <button
              key={g.id}
              className={`mlog-group${groupId === g.id ? ' active' : ''}`}
              onClick={() => setGroupId(g.id)}
            >{g.name}</button>
          ))}
        </div>
      )}
      {!feed
        ? <div className="mlog-empty">불러오는 중...</div>
        : <GroupLogList logs={logs} names={feed.names} />}
    </>
  );
};

// 활동 로그 창: [내 로그 | 그룹 로그] 토글 + 카테고리 필터
// onCleared(clearedAt): 내 로그 초기화 후 화면이 들고 있는 설정에도 반영하도록 알림
export const LogPanel = ({ userId, onCleared }) => {
  const [scope, setScope] = useState('me'); // 'me' | 'group'
  const [category, setCategory] = useState('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // 초기화 후 내 로그 다시 불러오기

  const handleClear = async () => {
    setClearing(true);
    const result = await clearMyLogs(userId);
    setClearing(false);
    if (result.error) { setClearError(result.error); return; }
    setClearError('');
    setConfirmClear(false);
    setRefreshKey(k => k + 1);
    onCleared?.(result.clearedAt);
  };

  return (
    <div className="mlog-panel">
      <div className="mlog-scope">
        <button
          className={`mlog-scope-btn${scope === 'me' ? ' active' : ''}`}
          onClick={() => setScope('me')}
        >👤 내 로그</button>
        <button
          className={`mlog-scope-btn${scope === 'group' ? ' active' : ''}`}
          onClick={() => setScope('group')}
        >👥 그룹 로그</button>
      </div>
      <div className="mlog-filters">
        {LOG_FILTERS.map(f => (
          <button
            key={f.key}
            className={`mlog-filter${category === f.key ? ' active' : ''}`}
            onClick={() => setCategory(f.key)}
          >{f.label}</button>
        ))}
        {scope === 'me' && (
          <button
            className="mlog-clear-btn"
            onClick={() => { setClearError(''); setConfirmClear(true); }}
          >🗑️ 내 로그 초기화</button>
        )}
      </div>
      {scope === 'me' && confirmClear && (
        <div className="mlog-confirm" role="alertdialog" aria-label="내 로그 초기화 확인">
          <div className="mlog-confirm-text">
            <b>내 로그를 초기화할까요?</b>
            <span>내 로그에서만 지워지고, 그룹 로그에는 그대로 남아요.</span>
            {clearError && <span className="mlog-confirm-error">{clearError}</span>}
          </div>
          <div className="mlog-confirm-actions">
            <button className="mlog-confirm-cancel" onClick={() => setConfirmClear(false)} disabled={clearing}>취소</button>
            <button className="mlog-confirm-ok" onClick={handleClear} disabled={clearing}>
              {clearing ? '초기화 중...' : '확인'}
            </button>
          </div>
        </div>
      )}
      <div className="mlog-scroll">
        {scope === 'me'
          ? <MyLogs key={refreshKey} userId={userId} category={category} />
          : <GroupLogs userId={userId} category={category} />}
      </div>
    </div>
  );
};
