import React, { useState, useEffect } from 'react';
import { loadUserPreferences, updateUserPreferences } from '../utils/jobAPI';
import './JobSettings.css';

const JobSettings = ({ isOpen, onClose, onSave }) => {
  const [preferences, setPreferences] = useState(loadUserPreferences());
  const [tempPreferences, setTempPreferences] = useState(preferences);

  useEffect(() => {
    if (isOpen) {
      const currentPrefs = loadUserPreferences();
      setPreferences(currentPrefs);
      setTempPreferences(currentPrefs);
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setTempPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setTempPreferences(prev => ({
      ...prev,
      [field]: array
    }));
  };

  const handleSave = () => {
    updateUserPreferences(tempPreferences);
    setPreferences(tempPreferences);
    onSave?.(tempPreferences);
    onClose();
  };

  const handleCancel = () => {
    setTempPreferences(preferences);
    onClose();
  };

  const handleReset = () => {
    const defaultPrefs = {
      keywords: ['프론트엔드', '백엔드', '풀스택', '개발자', 'javascript', 'react', 'node.js'],
      excludeKeywords: ['인턴', '신입만', '계약직'],
      experienceLevel: ['신입', '경력무관', '1-3년', '3-5년'],
      locations: ['서울', '경기', '판교', '강남'],
      companies: [],
      salaryMin: 0
    };
    setTempPreferences(defaultPrefs);
  };

  if (!isOpen) return null;

  return (
    <div className="job-settings-overlay" onClick={handleCancel}>
      <div className="job-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>채용공고 필터 설정</h2>
          <button className="close-btn" onClick={handleCancel}>×</button>
        </div>

        <div className="settings-content">
          {/* 관심 키워드 */}
          <div className="setting-group">
            <label>관심 키워드</label>
            <textarea
              value={tempPreferences.keywords.join(', ')}
              onChange={(e) => handleArrayInputChange('keywords', e.target.value)}
              placeholder="프론트엔드, 백엔드, React, Node.js..."
              rows={3}
            />
            <small>쉼표(,)로 구분해서 입력하세요</small>
          </div>

          {/* 제외 키워드 */}
          <div className="setting-group">
            <label>제외 키워드</label>
            <textarea
              value={tempPreferences.excludeKeywords.join(', ')}
              onChange={(e) => handleArrayInputChange('excludeKeywords', e.target.value)}
              placeholder="인턴, 신입만, 계약직..."
              rows={2}
            />
            <small>이 키워드가 포함된 공고는 제외됩니다</small>
          </div>

          {/* 희망 지역 */}
          <div className="setting-group">
            <label>희망 지역</label>
            <textarea
              value={tempPreferences.locations.join(', ')}
              onChange={(e) => handleArrayInputChange('locations', e.target.value)}
              placeholder="서울, 경기, 판교, 강남..."
              rows={2}
            />
            <small>빈 칸으로 두면 모든 지역을 포함합니다</small>
          </div>

          {/* 경력 수준 */}
          <div className="setting-group">
            <label>관심 경력 수준</label>
            <textarea
              value={tempPreferences.experienceLevel.join(', ')}
              onChange={(e) => handleArrayInputChange('experienceLevel', e.target.value)}
              placeholder="신입, 경력무관, 1-3년, 3-5년..."
              rows={2}
            />
            <small>관심 있는 경력 수준을 입력하세요</small>
          </div>

          {/* 관심 회사 */}
          <div className="setting-group">
            <label>관심 회사</label>
            <textarea
              value={tempPreferences.companies.join(', ')}
              onChange={(e) => handleArrayInputChange('companies', e.target.value)}
              placeholder="네이버, 카카오, 쿠팡, 라인..."
              rows={2}
            />
            <small>특별히 관심 있는 회사가 있다면 입력하세요 (선택사항)</small>
          </div>

          {/* 최소 연봉 */}
          <div className="setting-group">
            <label>최소 희망 연봉 (만원)</label>
            <input
              type="number"
              value={tempPreferences.salaryMin}
              onChange={(e) => handleInputChange('salaryMin', parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="100"
            />
            <small>0으로 두면 연봉 조건을 확인하지 않습니다</small>
          </div>
        </div>

        <div className="settings-footer">
          <button className="reset-btn" onClick={handleReset}>
            기본값으로 초기화
          </button>
          <div className="action-buttons">
            <button className="cancel-btn" onClick={handleCancel}>
              취소
            </button>
            <button className="save-btn" onClick={handleSave}>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobSettings;