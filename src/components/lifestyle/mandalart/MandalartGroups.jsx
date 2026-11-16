import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  createGroup, joinGroupByCode, leaveGroup, getMyGroups, getGroupMembers,
  renameGroup, transferOwner, setMemberColor,
} from '../../../services/lifestyle/mandalartGroupService';
import { getGroupLogs } from '../../../services/lifestyle/mandalartLogService';
import { MEMBER_COLORS, GROUP_MAX_MEMBERS, memberColorHex } from '../../../utils/lifestyle/mandalartUtils';
import { GroupLogList } from './MandalartLogList';
import './MandalartGroups.css';
import './MandalartSocial.css';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const MandalartGroups = () => {
  const { user, isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [openGroupId, setOpenGroupId] = useState(null);
  const [members, setMembers] = useState({}); // groupId → 멤버 배열
  const [busy, setBusy] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editName, setEditName] = useState('');
  const [groupTab, setGroupTab] = useState('members'); // 'members' | 'activity'
  const [activity, setActivity] = useState({}); // groupId → { logs, names }

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    setGroups(await getMyGroups(user.id));
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated && user) loadGroups();
  }, [isAuthenticated, user?.id]);

  const toggleGroup = async (groupId) => {
    if (openGroupId === groupId) { setOpenGroupId(null); return; }
    setOpenGroupId(groupId);
    setGroupTab('members');
    const list = await getGroupMembers(groupId);
    setMembers(prev => ({ ...prev, [groupId]: list }));
  };

  // 그룹 활동 탭: 멤버 목록 기준으로 활동 로그 조회 (열 때마다 새로고침)
  const openActivity = async (groupId) => {
    setGroupTab('activity');
    setActivity(prev => ({ ...prev, [groupId]: null }));
    const list = members[groupId] ?? await getGroupMembers(groupId);
    const result = await getGroupLogs(groupId, list.map(m => m.userId));
    setActivity(prev => ({ ...prev, [groupId]: result }));
  };

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    const result = await createGroup(user.id, newName);
    setBusy(false);
    if (result.error) { setMessage(result.error); return; }
    setNewName('');
    setMessage(`'${result.group.name}' 그룹이 만들어졌어요. 초대코드: ${result.group.invite_code}`);
    loadGroups();
  };

  const handleJoin = async () => {
    if (busy) return;
    setBusy(true);
    const result = await joinGroupByCode(user.id, joinCode);
    setBusy(false);
    if (result.error) { setMessage(result.error); return; }
    setJoinCode('');
    setMessage(`'${result.group.name}' 그룹에 가입했어요.`);
    loadGroups();
  };

  const handleLeave = async (group) => {
    const isOwner = group.owner_id === user.id;
    if (isOwner && group.memberCount > 1) {
      setMessage('방장은 다른 멤버에게 방장을 위임한 후 나갈 수 있어요.');
      return;
    }
    const confirmMsg = isOwner
      ? `'${group.name}' 그룹에서 나가면 그룹이 삭제돼요. 나갈까요?`
      : `'${group.name}' 그룹에서 나갈까요?`;
    if (!window.confirm(confirmMsg)) return;
    const result = await leaveGroup(user.id, group);
    if (result.error) { setMessage(result.error); return; }
    if (openGroupId === group.id) setOpenGroupId(null);
    loadGroups();
  };

  const startRename = (group) => {
    setEditingGroupId(group.id);
    setEditName(group.name);
  };

  const handleRename = async (group) => {
    const result = await renameGroup(user.id, group.id, editName);
    if (result.error) { setMessage(result.error); return; }
    setEditingGroupId(null);
    loadGroups();
  };

  // 내 색 변경 (달력에 표시되는 색, 그룹 안 1색 1명)
  const handleColor = async (groupId, color) => {
    const result = await setMemberColor(user.id, groupId, color);
    if (result.error) setMessage(result.error);
    const list = await getGroupMembers(groupId);
    setMembers(prev => ({ ...prev, [groupId]: list }));
  };

  const handleTransfer = async (group, member) => {
    if (!window.confirm(`${member.name}님에게 방장을 위임할까요? 위임하면 이름 변경·위임 권한이 넘어가요.`)) return;
    const result = await transferOwner(user.id, group.id, member.userId);
    if (result.error) { setMessage(result.error); return; }
    setMessage(`${member.name}님이 새 방장이 되었어요.`);
    loadGroups();
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(`초대코드 ${code} 를 복사했어요.`);
    } catch {
      setMessage(`초대코드: ${code}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mgroup-app">
        <div className="mgroup-empty">
          로그인 후 이용 가능합니다.
          <Link to="/mandalart" className="mgroup-back">← 만다라트</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mgroup-app">
      <div className="mgroup-header">
        <Link to="/mandalart" className="mgroup-back">← 내 만다라트</Link>
        <h1 className="mgroup-title">만다라트 그룹</h1>
        <Link to="/mandalart/social" className="msocial-nav">🌐 소셜</Link>
      </div>

      <div className="mgroup-body">
        <div className="mgroup-forms">
          <div className="mgroup-form">
            <input
              className="mgroup-input"
              placeholder="새 그룹 이름"
              value={newName}
              maxLength={20}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button className="mgroup-btn primary" onClick={handleCreate} disabled={busy}>그룹 만들기</button>
          </div>
          <div className="mgroup-form">
            <input
              className="mgroup-input code"
              placeholder="초대코드 6자리"
              value={joinCode}
              maxLength={6}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button className="mgroup-btn" onClick={handleJoin} disabled={busy}>코드로 가입</button>
          </div>
          {message && <div className="mgroup-message">{message}</div>}
        </div>

        {loading ? (
          <div className="mgroup-empty">그룹 불러오는 중...</div>
        ) : groups.length === 0 ? (
          <div className="mgroup-empty">아직 속한 그룹이 없어요. 그룹을 만들거나 초대코드로 가입해보세요.</div>
        ) : (
          <div className="mgroup-list">
            {groups.map(g => {
              const amOwner = g.owner_id === user.id;
              return (
              <div key={g.id} className={`mgroup-card${openGroupId === g.id ? ' open' : ''}`}>
                {editingGroupId === g.id ? (
                  <div className="mgroup-card-head editing">
                    <input
                      className="mgroup-input"
                      value={editName}
                      maxLength={20}
                      autoFocus
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(g);
                        if (e.key === 'Escape') setEditingGroupId(null);
                      }}
                    />
                    <button className="mgroup-btn primary" onClick={() => handleRename(g)}>저장</button>
                    <button className="mgroup-btn" onClick={() => setEditingGroupId(null)}>취소</button>
                  </div>
                ) : (
                  <div className="mgroup-card-head" onClick={() => toggleGroup(g.id)}>
                    <div className="mgroup-card-info">
                      <span className="mgroup-card-name">{g.name}</span>
                      {amOwner && (
                        <button
                          className="mgroup-rename"
                          title="그룹 이름 변경"
                          onClick={e => { e.stopPropagation(); startRename(g); }}
                        >✏️</button>
                      )}
                      <span className="mgroup-card-count">👥 {g.memberCount}/{GROUP_MAX_MEMBERS}명</span>
                      {g.memberCount >= GROUP_MAX_MEMBERS && <span className="mgroup-full-tag">가득 참</span>}
                      {amOwner && <span className="mgroup-owner-tag">👑 내가 방장</span>}
                    </div>
                    <span className="mgroup-card-arrow">{openGroupId === g.id ? '▲' : '▼'}</span>
                  </div>
                )}
                <div className="mgroup-card-actions">
                  <button className="mgroup-code" onClick={() => handleCopy(g.invite_code)} title="초대코드 복사">
                    🔑 {g.invite_code}
                  </button>
                  <button className="mgroup-leave" onClick={() => handleLeave(g)}>나가기</button>
                </div>

                {openGroupId === g.id && (
                  <div className="mgroup-members">
                    <div className="mgroup-tabs">
                      <button
                        className={`mgroup-tab${groupTab === 'members' ? ' active' : ''}`}
                        onClick={() => setGroupTab('members')}
                      >👥 멤버</button>
                      <button
                        className={`mgroup-tab${groupTab === 'activity' ? ' active' : ''}`}
                        onClick={() => openActivity(g.id)}
                      >📜 활동</button>
                    </div>
                    {groupTab === 'activity' ? (
                      <div className="mgroup-activity">
                        {!activity[g.id]
                          ? <div className="mgroup-empty small">활동 불러오는 중...</div>
                          : <GroupLogList logs={activity[g.id].logs} names={activity[g.id].names} />}
                      </div>
                    ) : !members[g.id] ? (
                      <div className="mgroup-empty small">멤버 불러오는 중...</div>
                    ) : members[g.id].map(m => (
                      <div key={m.userId} className="mgroup-member">
                        <div className="mgroup-member-top">
                          <span className="mgroup-member-name">
                            <span
                              className="mgroup-color-dot"
                              style={{ background: memberColorHex(m.color) }}
                              title="달력에 표시되는 색"
                            />
                            {m.userId === g.owner_id && <span title="방장">👑 </span>}
                            {m.name}{m.userId === user.id && <span className="mgroup-me"> (나)</span>}
                          </span>
                          <span className="mgroup-member-meta">
                            {amOwner && m.userId !== user.id && (
                              <button className="mgroup-transfer" onClick={() => handleTransfer(g, m)}>
                                방장 위임
                              </button>
                            )}
                            <span className="mgroup-member-date">수정 {formatDate(m.updatedAt)}</span>
                          </span>
                        </div>
                        {m.userId === user.id && (
                          <div className="mgroup-color-chips" aria-label="내 색 선택">
                            <span className="mgroup-color-label">내 색</span>
                            {MEMBER_COLORS.map(c => {
                              const takenBy = members[g.id].find(x => x.color === c.key && x.userId !== user.id);
                              return (
                                <button
                                  key={c.key}
                                  className={`mgroup-color-chip${m.color === c.key ? ' active' : ''}${takenBy ? ' taken' : ''}`}
                                  style={{ '--chip-color': c.hex, color: c.ink }}
                                  disabled={!!takenBy}
                                  title={takenBy ? `${takenBy.name}님이 쓰는 색` : c.label}
                                  onClick={() => handleColor(g.id, c.key)}
                                >{c.label}</button>
                              );
                            })}
                          </div>
                        )}
                        <div className="mgroup-member-goal">🎯 {m.coreGoal || '핵심 목표 미설정'}</div>
                        <div className="mgroup-member-progress">
                          <div className="mgroup-track">
                            <div className="mgroup-fill" style={{ width: `${m.totalProgress}%` }} />
                          </div>
                          <span className="mgroup-pct">{m.totalProgress}%</span>
                          <span className="mgroup-target">/ 목표 {m.targetRate}%</span>
                          {m.achieved && <span className="mgroup-achieved">🎉 달성</span>}
                        </div>
                        <Link
                          to={m.userId === user.id ? '/mandalart' : `/mandalart/view/${m.userId}`}
                          className="mgroup-view"
                        >🎯 {m.userId === user.id ? '내 만다라트 보기' : `${m.name}님의 만다라트 보기`} →</Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MandalartGroups;
