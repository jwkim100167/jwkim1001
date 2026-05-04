import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadMandalartFromDB, saveMandalartToDB } from '../services/mandalartService';
import './Mandalart.css';

const STORAGE_KEY = 'mandalart_v1';

const SECTOR_COLORS = {
  0: '#E8734A',
  1: '#3DB88A',
  2: '#B85AB0',
  3: '#C9980F',
  4: '#4A6FDC',
  5: '#3AAFD4',
  6: '#7055D4',
  7: '#D44B4B',
  8: '#3FAD50',
};

const STATUS_CONFIG = {
  good:   { label: '잘됨',   color: '#22C55E', bg: 'rgba(34,197,94,0.18)',  border: '#22C55E' },
  normal: { label: '보통',   color: '#EAB308', bg: 'rgba(234,179,8,0.18)',  border: '#EAB308' },
  bad:    { label: '미비함', color: '#EF4444', bg: 'rgba(239,68,68,0.18)', border: '#EF4444' },
};

// 중앙 섹터(sector 4)의 8칸 ↔ 나머지 8개 섹터의 중앙 셀 연동 매핑
// 중앙 섹터 셀 id → 연동된 섹터 중앙 셀 {row, col}
const CENTER_TO_SECTOR = {
  'r3c3': { row: 1, col: 1 }, // sector 0
  'r3c4': { row: 1, col: 4 }, // sector 1
  'r3c5': { row: 1, col: 7 }, // sector 2
  'r4c3': { row: 4, col: 1 }, // sector 3
  'r4c5': { row: 4, col: 7 }, // sector 5
  'r5c3': { row: 7, col: 1 }, // sector 6
  'r5c4': { row: 7, col: 4 }, // sector 7
  'r5c5': { row: 7, col: 7 }, // sector 8
};

// 섹터 중앙 셀 id → 연동된 중앙 섹터 셀 {row, col}
const SECTOR_TO_CENTER = {
  'r1c1': { row: 3, col: 3 },
  'r1c4': { row: 3, col: 4 },
  'r1c7': { row: 3, col: 5 },
  'r4c1': { row: 4, col: 3 },
  'r4c7': { row: 4, col: 5 },
  'r7c1': { row: 5, col: 3 },
  'r7c4': { row: 5, col: 4 },
  'r7c7': { row: 5, col: 5 },
};

function getLinkedId(cellId) {
  if (CENTER_TO_SECTOR[cellId]) {
    const { row, col } = CENTER_TO_SECTOR[cellId];
    return `r${row}c${col}`;
  }
  if (SECTOR_TO_CENTER[cellId]) {
    const { row, col } = SECTOR_TO_CENTER[cellId];
    return `r${row}c${col}`;
  }
  return null;
}

// 중앙 섹터 셀인지 (core 제외)
function isCenterSectorCell(row, col) {
  return row >= 3 && row <= 5 && col >= 3 && col <= 5 && !(row === 4 && col === 4);
}

function getSectorIndex(row, col) {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function isCenterOfSector(row, col) {
  return row % 3 === 1 && col % 3 === 1;
}

function initEmptyState() {
  const cells = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      cells.push({
        id: `r${row}c${col}`,
        row,
        col,
        text: '',
        status: null,
        note: '',
        progress: 0,
        sectorIndex: getSectorIndex(row, col),
      });
    }
  }
  return cells;
}

function normalizeCells(raw) {
  return raw.map((c, i) => ({
    ...c,
    row: c.row ?? Math.floor(i / 9),
    col: c.col ?? i % 9,
    progress: c.progress ?? 0,
    sectorIndex: c.sectorIndex ?? getSectorIndex(
      c.row ?? Math.floor(i / 9),
      c.col ?? i % 9
    ),
  }));
}

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

function calcProgress(cells) {
  const SCORE = { good: 1.0, normal: 0.5, bad: 0.0 };
  if (cells.length === 0) return 0;
  const sum = cells.reduce((acc, c) => acc + (SCORE[c.status] ?? 0), 0);
  return Math.round((sum / cells.length) * 100);
}

function getSectorProgress(cells, sectorIndex) {
  const sRow = Math.floor(sectorIndex / 3) * 3 + 1;
  const sCol = (sectorIndex % 3) * 3 + 1;
  return calcProgress(
    cells.filter(c => c.sectorIndex === sectorIndex && !(c.row === sRow && c.col === sCol))
  );
}

// 섹터 내 8칸의 개인 진행도(progress) 평균
function getSectorAvgProgress(cells, sectorIndex) {
  const sRow = Math.floor(sectorIndex / 3) * 3 + 1;
  const sCol = (sectorIndex % 3) * 3 + 1;
  const actionCells = cells.filter(
    c => c.sectorIndex === sectorIndex && !(c.row === sRow && c.col === sCol)
  );
  if (actionCells.length === 0) return 0;
  const sum = actionCells.reduce((acc, c) => acc + (c.progress ?? 0), 0);
  return Math.round(sum / actionCells.length);
}

// 전체 진행률 = 외부 8개 섹터 평균 진행도의 평균
function getTotalProgress(cells) {
  const outerSectors = [0, 1, 2, 3, 5, 6, 7, 8];
  const avgs = outerSectors.map(s => getSectorAvgProgress(cells, s));
  return Math.round(avgs.reduce((a, v) => a + v, 0) / avgs.length);
}

const Mandalart = () => {
  const { user, isAuthenticated } = useAuth();
  const [cells, setCells] = useState(initEmptyState);
  const [loadingDB, setLoadingDB] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellId: null });
  const [panelTitle, setPanelTitle] = useState('');
  const [panelNote, setPanelNote] = useState('');
  const [panelCellProgress, setPanelCellProgress] = useState(0);
  const [focusSector, setFocusSector] = useState(null);
  const [celebratingCells, setCelebratingCells] = useState(new Set());
  const noteDebounceRef = useRef(null);
  const saveDebounceRef = useRef(null);
  const longTapTimerRef = useRef(null);
  const isFirstLoad = useRef(true);

  // 마운트 시 데이터 로드
  useEffect(() => {
    const load = async () => {
      if (isAuthenticated && user) {
        setLoadingDB(true);
        const dbCells = await loadMandalartFromDB(user.id);
        if (dbCells && Array.isArray(dbCells)) {
          setCells(normalizeCells(dbCells));
        } else {
          // DB에 없으면 localStorage 데이터 마이그레이션 or 빈 상태
          const local = loadFromStorage();
          setCells(local);
        }
        setLoadingDB(false);
      } else {
        setCells(loadFromStorage());
      }
      isFirstLoad.current = false;
    };
    load();
  }, [isAuthenticated, user?.id]);

  // cells 변경 시 저장 (첫 로드 제외)
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (isAuthenticated && user) {
      // DB 저장 debounce 1초
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => {
        saveMandalartToDB(user.id, cells);
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
    if (!isAuthenticated) return;
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

  const handleCellProgressChange = (e) => {
    const val = Number(e.target.value);
    const prevVal = panelCellProgress;
    setPanelCellProgress(val);
    if (selectedCell) {
      updateCell(selectedCell.id, { progress: val });
      setSelectedCell(prev => ({ ...prev, progress: val }));
      // 100% 최초 달성 시 축하 애니메이션
      if (val === 100 && prevVal < 100) {
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

  const resetAll = () => {
    if (!confirm('모든 내용을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setCells(initEmptyState());
    setSelectedCell(null);
    setPanelOpen(false);
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
      style.background = `color-mix(in srgb, ${color} 20%, transparent)`;
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
    const sectorPct = getSectorAvgProgress(cells, cell.sectorIndex);
    const isSelected = selectedCell?.id === cell.id && panelOpen;
    const isCelebrating = celebratingCells.has(cell.id);

    return (
      <div
        key={cell.id}
        className={`mandalart-cell${isSelected ? ' selected' : ''}${isMirror ? ' mirror-cell' : ''}${isCelebrating ? ' celebrating' : ''}`}
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
        {isSubGoal && (
          <>
            <span className="smg-pct">{sectorPct}%</span>
            <div className="sector-mini-gauge">
              <div className="smg-fill" style={{ width: `${sectorPct}%` }} />
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
  const selectedSectorPct = selectedCellData ? getSectorProgress(cells, selectedCellData.sectorIndex) : 0;

  if (loadingDB) {
    return (
      <div className="mandalart-app">
        <div className="mandalart-loading">만다라트 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="mandalart-app">
      <div className="mandalart-header">
        <div className="header-top">
          <Link to="/" className="back-btn">← 홈</Link>
          <h1 className="header-title">만다라트 [멤버십]</h1>
          {isAuthenticated && (
            <span className="user-badge">{user?.userName || user?.loginId}</span>
          )}
          <div className="header-actions">
            <button onClick={resetAll} className="action-btn reset-btn">초기화</button>
          </div>
        </div>
        <div className="global-progress">
          <span className="gp-label">전체 진행률</span>
          <div className="gp-track">
            <div className="gp-fill" style={{ width: `${totalProgress}%` }} />
          </div>
          <span className="gp-pct">{totalProgress}%</span>
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
            rows={2}
          />
          <span className="panel-title-count">{panelTitle.length}/18</span>
        </div>

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

        <div className="panel-cell-gauge">
          <div className="cell-gauge-header">
            <span className="cell-gauge-label">진행도</span>
            <span className="cell-gauge-value">{panelCellProgress}%</span>
          </div>
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
          <div className="cell-gauge-track-labels">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>

        <textarea
          className="panel-note"
          placeholder="상세 내용, 실행 방법, 회고 등을 자유롭게 작성하세요..."
          rows={20}
          value={panelNote}
          onChange={handlePanelNoteChange}
        />

        <div className="panel-progress">
          <span className="panel-progress-label">이 섹터 진행률</span>
          <div className="mini-gauge">
            <div className="mini-gauge-fill" style={{ width: `${selectedSectorPct}%` }} />
          </div>
          <span className="panel-gauge-pct">{selectedSectorPct}%</span>
        </div>
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
