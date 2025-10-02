import React from 'react';
import './JobFilters.css';

const JobFilters = ({ filters, onFiltersChange, jobData }) => {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  // 고유한 회사 목록 생성
  const uniqueCompanies = jobData?.jobs ? 
    [...new Set(jobData.jobs.map(job => job.company))].sort() : [];

  // 고유한 위치 목록 생성
  const uniqueLocations = jobData?.jobs ? 
    [...new Set(jobData.jobs.map(job => job.location))].sort() : [];

  // 고유한 경력 목록 생성
  const uniqueExperiences = jobData?.jobs ? 
    [...new Set(jobData.jobs.map(job => job.experience))].sort() : [];

  return (
    <div className="job-filters">
      <div className="filters-row">
        {/* 검색 키워드 */}
        <div className="filter-group">
          <label htmlFor="searchKeyword">검색</label>
          <input
            id="searchKeyword"
            type="text"
            placeholder="직무, 회사명, 기술스택 검색..."
            value={filters.searchKeyword}
            onChange={(e) => handleFilterChange('searchKeyword', e.target.value)}
            className="search-input"
          />
        </div>

        {/* 회사 필터 */}
        <div className="filter-group">
          <label htmlFor="company">회사</label>
          <select
            id="company"
            value={filters.company}
            onChange={(e) => handleFilterChange('company', e.target.value)}
          >
            <option value="">모든 회사</option>
            {uniqueCompanies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        </div>

        {/* 위치 필터 */}
        <div className="filter-group">
          <label htmlFor="location">위치</label>
          <select
            id="location"
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          >
            <option value="">모든 지역</option>
            {uniqueLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>

        {/* 경력 필터 */}
        <div className="filter-group">
          <label htmlFor="experience">경력</label>
          <select
            id="experience"
            value={filters.experience}
            onChange={(e) => handleFilterChange('experience', e.target.value)}
          >
            <option value="">모든 경력</option>
            {uniqueExperiences.map(experience => (
              <option key={experience} value={experience}>{experience}</option>
            ))}
          </select>
        </div>

        {/* 출처 필터 */}
        <div className="filter-group">
          <label htmlFor="source">출처</label>
          <select
            id="source"
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
          >
            <option value="all">모든 사이트</option>
            <option value="saramin">사라민</option>
            <option value="wanted">원티드</option>
            <option value="jobplanet">잡플래닛</option>
          </select>
        </div>

        {/* 정렬 */}
        <div className="filter-group">
          <label htmlFor="sortBy">정렬</label>
          <select
            id="sortBy"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <option value="companySize">회사 크기순</option>
            <option value="newest">최신순</option>
            <option value="company">회사명순</option>
            <option value="relevance">관련도순</option>
          </select>
        </div>
      </div>

      {/* 활성 필터 표시 */}
      <div className="active-filters">
        {Object.entries(filters).map(([key, value]) => {
          if (value && key !== 'sortBy') {
            return (
              <span key={key} className="active-filter-tag">
                {key === 'searchKeyword' ? '검색' : 
                 key === 'company' ? '회사' :
                 key === 'location' ? '위치' :
                 key === 'experience' ? '경력' :
                 key === 'source' ? '출처' : key}: {value}
                <button 
                  onClick={() => handleFilterChange(key, key === 'source' ? 'all' : key === 'sortBy' ? 'companySize' : '')}
                  className="remove-filter-btn"
                >
                  ×
                </button>
              </span>
            );
          }
          return null;
        })}
        
        {Object.values(filters).some(value => value && value !== 'all' && value !== 'companySize') && (
          <button 
            onClick={() => onFiltersChange({
              searchKeyword: '',
              company: '',
              location: '',
              experience: '',
              source: 'all',
              sortBy: 'companySize'
            })}
            className="clear-all-filters-btn"
          >
            모든 필터 초기화
          </button>
        )}
      </div>
    </div>
  );
};

export default JobFilters;