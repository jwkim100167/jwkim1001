import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  loadMandalartFromDB, saveMandalartToDB, loadMandalartSettings, saveMandalartSettings,
} from '../../../services/lifestyle/mandalartService';
import { loadMemberMandalart } from '../../../services/lifestyle/mandalartGroupService';
import { writeLogs } from '../../../services/lifestyle/mandalartLogService';
import { diffCells } from '../../../utils/lifestyle/mandalartLog';
import { MyLogPanel } from './MandalartLogList';
import {
  SECTOR_COLORS, STATUS_CONFIG, CENTER_TO_SECTOR, getLinkedId, isCenterSectorCell,
  getSectorIndex, isCenterOfSector, initEmptyState, normalizeCells,
  getSectorAvgProgress, getTotalProgress,
  TARGET_OPTIONS, DEFAULT_SETTINGS, normalizeSettings, isAchieved,
} from '../../../utils/lifestyle/mandalartUtils';
import './Mandalart.css';

const STORAGE_KEY = 'mandalart_v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initEmptyState();
    const data = JSON.parse(raw);
    if (data.cells && Array.isArray(data.cells)) return normalizeCells(data.cells);
    return initEmptyState();
  } catch {
    return initEmptyState();
  }
}

function saveToStorage(cells) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cells, version: 1 }));
  } catch {}
}

const Mandalart = () => {
  const { user, isAuthenticated } = useAuth();
  // /mandalart/view/:userId → 그룹원 만다라트 읽기 전용 모드
  const { userId: viewUserId } = useParams();
  const navigate = useNavigate();
  const readOnly = !!viewUserId;
  const [viewName, setViewName] = useState('');
  const [viewError, setViewError] = useState('');
  const [cells, setCells] = useState(initEmptyState);
  const [loadingDB, setLoadingDB] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellId: null });
  const [panelTitle, setPanelTitle] = useState('');
  const [panelGoal, setPanelGoal] = useState('');
  const [panelNote, setPanelNote] = useState('');
  const [panelCellProgress, setPanelCellProgress] = useState(0);
  const [focusSector, setFocusSector] = useState(null);
  const [celebratingCells, setCelebratingCells] = useState(new Set());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const noteDebounceRef = useRef(null);
  const saveDebounceRef = useRef(null);
  const longTapTimerRef = useRef(null);
  const isFirstLoad = useRef(true);
  const lastSavedCellsRef = useRef(null); // 로그 비교용: 마지막으로 DB에 저장한 cells
  const [settingsView, setSettingsView] = useState('settings'); // 'settings' | 'logs'

  // 마운트 시 데이터 로드
  useEffect(() => {
    const load = async () => {
      isFirstLoad.current = true;
      if (readOnly) {
        if (!isAuthenticated || !user) {
          setViewError('로그인 후 이용 가능합니다.');
          return;
        }
        setLoadingDB(true);
        const result = await loadMemberMandalart(user.id, Number(viewUserId));
        if (result.error) {
          setViewError(result.error);
        } else {
          setViewError('');
          setViewName(result.name);
          setCells(result.cells ? normalizeCells(result.cells) : initEmptyState());
          setSettings(result.settings);
        }
        setLoadingDB(false);
        return; // 읽기 전용: isFirstLoad 를 풀지 않아 저장되지 않음
      }
      if (isAuthenticated && user) {
        setLoadingDB(true);
        const [dbCells, dbSettings] = await Promise.all([
          loadMandalartFromDB(user.id),
          loadMandalartSettings(user.id),
        ]);
        setSettings(normalizeSettings(dbSettings));
        // DB에 없으면 localStorage 데이터 마이그레이션 or 빈 상태
        const loaded = dbCells && Array.isArray(dbCells) ? normalizeCells(dbCells) : loadFromStorage();
        lastSavedCellsRef.current = loaded;
        setCells(loaded);
        setLoadingDB(false);
      } else {
        setCells(loadFromStorage());
      }
      isFirstLoad.current = false;
    };
    load();
  }, [isAuthenticated, user?.id, viewUserId]);

  // cells 변경 시 저장 (첫 로드 제외)
  useEffect(() => {
    if (isFirstLoad.current || readOnly) return; // 남의 만다라트는 절대 저장하지 않음
    if (isAuthenticated && user) {
      // DB 저장 debounce 1초
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(async () => {
        const saved = await saveMandalartToDB(user.id, cells);
        if (!saved) return;
        // 마지막 저장본과 비교해 바뀐 항목만 활동 로그로 기록
        const entries = diffCells(lastSavedCellsRef.current, cells, settings.targetRate);
        lastSavedCellsRef.current = cells;
        writeLogs(user.id, entries);
      }, 1000);
    } else {
      saveToStorage(cells);
    }
  }, [cells]);

  // ESC 키
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (focusSector !== null) { setFocusSector(null); return; }
        setSettingsOpen(false);
        setPanelOpen(false);
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusSector]);

  // 외부 클릭 시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const getCellById = (id) => cells.find(c => c.id === id);
  const getCellByRowCol = (row, col) => cells[row * 9 + col];

  // 텍스트 업데이트 시 연동 셀도 함께 업데이트
  const updateCell = (cellId, updates) => {
    setCells(prev => {
      let next = prev.map(c => c.id === cellId ? { ...c, ...updates } : c);
      // 텍스트 변경이면 연동 셀 동기화
      if ('text' in updates) {
        const linkedId = getLinkedId(cellId);
        if (linkedId) {
          next = next.map(c => c.id === linkedId ? { ...c, text: updates.text } : c);
        }
      }
      return next;
    });
  };

  const openPanel = (cell) => {
    setSelectedCell(cell);
    setPanelTitle(cell.text);
    setPanelGoal(cell.goal ?? '');
    setPanelNote(cell.note);
    setPanelCellProgress(cell.progress ?? 0);
    setPanelOpen(true);
  };

  // 중앙 섹터 셀 클릭 시 → 연동된 섹터 중앙 셀의 패널을 열기
  const handleCellClick = (cell) => {
    if (!isAuthenticated) {
      alert('로그인 후 이용 가능합니다.');
      return;
    }
    if (CENTER_TO_SECTOR[cell.id]) {
      const { row, col } = CENTER_TO_SECTOR[cell.id];
      const linked = getCellByRowCol(row, col);
      if (linked) { openPanel(linked); return; }
    }
    openPanel(cell);
  };

  const openContextMenu = (e, cell) => {
    e.preventDefault();
    if (!isAuthenticated || readOnly) return;
    setContextMenu({ visible: true, x: e.clientX ?? e.pageX, y: e.clientY ?? e.pageY, cellId: cell.id });
  };

  const handlePanelTitleChange = (e) => {
    const val = e.target.value;
    if (val.length > 18) return; // 18자 제한
    setPanelTitle(val);
    if (selectedCell) {
      updateCell(selectedCell.id, { text: val });
      setSelectedCell(prev => ({ ...prev, text: val }));
    }
  };

  const handlePanelGoalChange = (e) => {
    const val = e.target.value;
    if (val.length > 18) return;
    setPanelGoal(val);
    if (selectedCell) {
      updateCell(selectedCell.id, { goal: val });
      setSelectedCell(prev => ({ ...prev, goal: val }));
    }
  };

  const targetRate = settings.targetRate;

  const handleTargetChange = async (rate) => {
    if (rate === settings.targetRate) return;
    const next = { ...settings, targetRate: rate };
    const prevRate = settings.targetRate;
    setSettings(next);
    if (isAuthenticated && user && await saveMandalartSettings(user.id, next, cells)) {
      writeLogs(user.id, [{ type: 'target_rate', before: String(prevRate), after: String(rate) }]);
    }
  };

  const handleCellProgressChange = (e) => {
    const val = Number(e.target.value);
    const prevVal = panelCellProgress;
    setPanelCellProgress(val);
    if (selectedCell) {
      updateCell(selectedCell.id, { progress: val });
      setSelectedCell(prev => ({ ...prev, progress: val }));
      // 목표 달성률을 처음 넘는 순간 축하 애니메이션
      if (isAchieved(val, targetRate) && !isAchieved(prevVal, targetRate)) {
        const cellId = selectedCell.id;
        setCelebratingCells(prev => new Set([...prev, cellId]));
        setTimeout(() => {
          setCelebratingCells(prev => {
            const next = new Set(prev);
            next.delete(cellId);
            return next;
          });
        }, 1800);
      }
    }
  };

  const handlePanelNoteChange = (e) => {
    const val = e.target.value;
    setPanelNote(val);
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
    noteDebounceRef.current = setTimeout(() => {
      if (selectedCell) updateCell(selectedCell.id, { note: val });
    }, 500);
  };

  const handleStatusChange = (status, cellId = null) => {
    const targetId = cellId || selectedCell?.id;
    if (!targetId) return;
    const cell = getCellById(targetId);
    const newStatus = cell?.status === status ? null : status;
    updateCell(targetId, { status: newStatus });
    if (selectedCell?.id === targetId) setSelectedCell(prev => ({ ...prev, status: newStatus }));
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const clearStatus = (cellId) => {
    updateCell(cellId, { status: null });
    if (selectedCell?.id === cellId) setSelectedCell(prev => ({ ...prev, status: null }));
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const totalProgress = getTotalProgress(cells);

  const getCellStyle = (cell, row, col) => {
    const s = cell.sectorIndex;
    const isCoreCell = row === 4 && col === 4;
    const isSubGoal = isCenterOfSector(row, col);
    const color = SECTOR_COLORS[s];
    const style = {};

    if (isCoreCell) {
      style.background = color;
      style.color = '#fff';
      style.fontWeight = '700';
    } else if (isSubGoal) {
      style.background = color;
      style.color = '#fff';
      style.fontWeight = '600';
    } else {
      style.background = `color-mix(in srgb, ${color} 30%, white)`;
      style.color = '#1C1C2E';
    }

    if (cell.status && STATUS_CONFIG[cell.status]) {
      style.boxShadow = `inset 0 0 0 3px ${STATUS_CONFIG[cell.status].border}`;
    }

    return style;
  };

  const renderCell = (row, col) => {
    const cell = getCellByRowCol(row, col);
    if (!cell) return null;
    const isSubGoal = isCenterOfSector(row, col);
    const isMirror = isCenterSectorCell(row, col);
    const isCoreCell = row === 4 && col === 4;
    // 미러 셀이면 연동된 외부 섹터의 진행률을 표시
    const mirrorLinkedSectorPct = (() => {
      if (!isMirror) return null;
      const linked = CENTER_TO_SECTOR[cell.id];
      if (!linked) return null;
      return getSectorAvgProgress(cells, getSectorIndex(linked.row, linked.col));
    })();
    const sectorPct = isCoreCell ? totalProgress : (mirrorLinkedSectorPct !== null ? mirrorLinkedSectorPct : getSectorAvgProgress(cells, cell.sectorIndex));
    const isSelected = selectedCell?.id === cell.id && panelOpen;
    const isCelebrating = celebratingCells.has(cell.id);
    const sectorAchieved = (isSubGoal || isMirror) && isAchieved(sectorPct, targetRate);

    return (
      <div
        key={cell.id}
        className={`mandalart-cell${isSelected ? ' selected' : ''}${isMirror ? ' mirror-cell' : ''}${(isSubGoal || isMirror) ? ' has-gauge' : ''}${isCelebrating ? ' celebrating' : ''}${sectorAchieved ? ' achieved' : ''}`}
        style={getCellStyle(cell, row, col)}
        onClick={() => handleCellClick(cell)}
        onContextMenu={(e) => openContextMenu(e, cell)}
        onTouchStart={(e) => {
          longTapTimerRef.current = setTimeout(() => openContextMenu(e.touches[0], cell), 500);
        }}
        onTouchEnd={() => clearTimeout(longTapTimerRef.current)}
        onTouchMove={() => clearTimeout(longTapTimerRef.current)}
      >
        {cell.status && (
          <div className="status-overlay" style={{ background: STATUS_CONFIG[cell.status]?.bg }} />
        )}
        <span className="cell-text">
          {cell.text.split('\n').map((line, i, arr) => (
            <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
          ))}
        </span>
        {isMirror && <span className="mirror-indicator" title="섹터 목표와 연동됨">↗</span>}
        {(isSubGoal || isMirror) && (
          <>
            <span className="smg-pct">{sectorAchieved && '🎉 '}{sectorPct}%</span>
            <div className="sector-mini-gauge">
              <div className="smg-fill" style={{ width: `${sectorPct}%` }} />
              {targetRate < 100 && <div className="smg-target-tick" style={{ left: `${targetRate}%` }} />}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderSector = (sectorIndex, inFocus = false) => {
    const sRowStart = Math.floor(sectorIndex / 3) * 3;
    const sColStart = (sectorIndex % 3) * 3;
    const sectorCells = [];
    for (let r = sRowStart; r < sRowStart + 3; r++) {
      for (let c = sColStart; c < sColStart + 3; c++) {
        sectorCells.push(renderCell(r, c));
      }
    }
    if (inFocus) {
      return <div className="focus-sector-grid">{sectorCells}</div>;
    }
    return (
      <div key={sectorIndex} className="mandalart-sector-wrap">
        <div className="mandalart-sector">{sectorCells}</div>
        <button
          className="focus-btn"
          onClick={(e) => { e.stopPropagation(); setFocusSector(sectorIndex); }}
          title="확대 보기"
        >⤢</button>
      </div>
    );
  };

  const selectedCellData = selectedCell ? cells.find(c => c.id === selectedCell.id) : null;

  // 중간목표(섹터 중앙) 또는 큰 목표(core)는 달성률 자동 계산
  const isAutoProgress = selectedCellData && isCenterOfSector(selectedCellData.row, selectedCellData.col);
  const autoProgressValue = isAutoProgress
    ? (selectedCellData.row === 4 && selectedCellData.col === 4
        ? getTotalProgress(cells)
        : getSectorAvgProgress(cells, selectedCellData.sectorIndex))
    : null;
  const displayProgress = autoProgressValue !== null ? autoProgressValue : panelCellProgress;

  if (loadingDB) {
    return (
      <div className="mandalart-app">
        <div className="mandalart-loading">만다라트 불러오는 중...</div>
      </div>
    );
  }

  if (readOnly && viewError) {
    return (
      <div className="mandalart-app">
        <div className="mandalart-loading">
          {viewError}
          <button className="back-btn back-btn-plain" onClick={() => navigate(-1)}>← 뒤로</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mandalart-app${panelOpen ? ' panel-open' : ''}`}>
      <div className="mandalart-header">
        <div className="header-top">
          {readOnly ? (
            <>
              <button className="back-btn back-btn-plain" onClick={() => navigate(-1)}>← 뒤로</button>
              <h1 className="header-title">{viewName}님의 만다라트</h1>
              <span className="user-badge">읽기 전용</span>
            </>
          ) : (
            <>
              <Link to="/" className="back-btn">← 홈</Link>
              <h1 className="header-title">만다라트 [멤버십]</h1>
              {isAuthenticated && (
                <>
                  <Link to="/mandalart/groups" className="group-btn">👥 그룹</Link>
                  <Link to="/mandalart/social" className="group-btn">🌐 소셜</Link>
                  <button
                    className="user-badge user-badge-btn"
                    onClick={() => { setSettingsView('settings'); setSettingsOpen(true); }}
                    title="내 설정"
                  >⚙️ {user?.userName || user?.loginId}</button>
                </>
              )}
            </>
          )}
        </div>
        <div className="global-progress">
          <span className="gp-label">전체 진행률</span>
          <div className="gp-track">
            <div className="gp-fill" style={{ width: `${totalProgress}%` }} />
            {targetRate < 100 && <div className="gp-target-line" style={{ left: `${targetRate}%` }} />}
          </div>
          <span className="gp-pct">{totalProgress}%</span>
          <span className="gp-target">/ 목표 {targetRate}%</span>
          {isAchieved(totalProgress, targetRate) && <span className="achieved-badge">🎉 달성</span>}
        </div>
      </div>

      <div className="mandalart-grid-wrapper">
        <div className="mandalart-grid">
          {Array.from({ length: 9 }, (_, i) => renderSector(i))}
        </div>
      </div>

      <div className={`detail-panel${panelOpen ? ' open' : ''}`}>
        <div className="panel-header">
          <span className="panel-sector-badge">
            섹터 {selectedCellData ? selectedCellData.sectorIndex + 1 : ''}
          </span>
          <button className="panel-close" onClick={() => setPanelOpen(false)}>✕</button>
        </div>

        <div className="panel-title-wrap">
          <textarea
            className="panel-title-input"
            placeholder="항목 제목 (최대 18자)"
            value={panelTitle}
            onChange={handlePanelTitleChange}
            readOnly={readOnly}
            rows={2}
          />
          <span className="panel-title-count">{panelTitle.length}/18</span>
        </div>

        <div className="panel-goal-wrap">
          <textarea
            className="panel-goal-input"
            placeholder="목표 (가능하면 수치화, 최대 18자)"
            value={panelGoal}
            onChange={handlePanelGoalChange}
            readOnly={readOnly}
            rows={2}
          />
          <span className="panel-goal-count">{panelGoal.length}/18</span>
        </div>

        {!readOnly && (
          <div className="panel-status-row">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                className={`status-btn${selectedCellData?.status === key ? ' active' : ''}`}
                style={{ '--status-color': cfg.color }}
                onClick={() => handleStatusChange(key)}
              >
                {key === 'good' ? '✅' : key === 'normal' ? '🟡' : '❌'} {cfg.label}
              </button>
            ))}
          </div>
        )}

        <div className="panel-cell-gauge">
          <div className="cell-gauge-header">
            <span className="cell-gauge-label">진행도</span>
            <span className="cell-gauge-value">
              {isAchieved(displayProgress, targetRate) && <span className="achieved-badge">🎉 달성</span>}
              {displayProgress}% <span className="gp-target">/ 목표 {targetRate}%</span>
            </span>
          </div>
          {(isAutoProgress || readOnly) ? (
            <div className="cell-gauge-auto-wrap">
              <div className="cell-gauge-auto-bar" style={{ width: `${displayProgress}%` }} />
              {targetRate < 100 && <div className="gp-target-line" style={{ left: `${targetRate}%` }} />}
            </div>
          ) : (
            <>
              <div className="cell-gauge-range-wrap">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={panelCellProgress}
                  onChange={handleCellProgressChange}
                  className="cell-gauge-range"
                  style={{ '--gauge-pct': `${panelCellProgress}%` }}
                />
                {targetRate < 100 && <div className="range-target-line" style={{ left: `${targetRate}%` }} />}
              </div>
              <div className="cell-gauge-track-labels">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </>
          )}
        </div>

        {!readOnly && (
          <textarea
            className="panel-note"
            placeholder="상세 내용, 실행 방법, 회고 등을 자유롭게 작성하세요..."
            rows={20}
            value={panelNote}
            onChange={handlePanelNoteChange}
          />
        )}

      </div>

      {focusSector !== null && (
        <div className="focus-overlay" onClick={() => setFocusSector(null)}>
          <div className="focus-modal" onClick={e => e.stopPropagation()}>
            <div className="focus-modal-header">
              <span className="focus-modal-title">
                섹터 {focusSector + 1}
                {(() => {
                  const sRow = Math.floor(focusSector / 3) * 3 + 1;
                  const sCol = (focusSector % 3) * 3 + 1;
                  const c = getCellByRowCol(sRow, sCol);
                  return c?.text ? ` — ${c.text.replace(/\n/g, ' ')}` : '';
                })()}
              </span>
              <button className="focus-modal-close" onClick={() => setFocusSector(null)}>✕</button>
            </div>
            {renderSector(focusSector, true)}
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="focus-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="focus-modal settings-modal" onClick={e => e.stopPropagation()}>
            <div className="focus-modal-header">
              {settingsView === 'logs' ? (
                <span className="focus-modal-title">
                  <button className="back-btn back-btn-plain settings-back" onClick={() => setSettingsView('settings')}>←</button>
                  📜 내 활동 로그
                </span>
              ) : (
                <span className="focus-modal-title">⚙️ 내 설정</span>
              )}
              <button className="focus-modal-close" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>

            {settingsView === 'logs' ? (
              <MyLogPanel userId={user.id} />
            ) : (
            <>
            <div className="settings-section">
              <div className="settings-label">🎯 목표 달성률</div>
              <div className="settings-desc">이 % 이상이면 셀·섹터·전체에 '달성'으로 표시돼요.</div>
              <div className="target-chips">
                {TARGET_OPTIONS.map(rate => (
                  <button
                    key={rate}
                    className={`target-chip${targetRate === rate ? ' active' : ''}`}
                    onClick={() => handleTargetChange(rate)}
                  >{rate}%</button>
                ))}
              </div>
            </div>

            <div className="settings-section settings-divider">
              <div className="settings-label">📜 활동 로그</div>
              <div className="settings-desc">진행도 조정, 항목 수정, 목표 달성 기록을 볼 수 있어요.</div>
              <button className="settings-log-btn" onClick={() => setSettingsView('logs')}>로그 보기 →</button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => handleStatusChange('good', contextMenu.cellId)}>✅ 잘됨</button>
          <button onClick={() => handleStatusChange('normal', contextMenu.cellId)}>🟡 보통</button>
          <button onClick={() => handleStatusChange('bad', contextMenu.cellId)}>❌ 미비함</button>
          <button onClick={() => clearStatus(contextMenu.cellId)}>지우기</button>
        </div>
      )}
    </div>
  );
};

export default Mandalart;
