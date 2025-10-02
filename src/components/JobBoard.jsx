import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchAllJobPostings, 
  saveJobData, 
  loadJobData, 
  shouldUpdateJobData,
  loadUserPreferences 
} from '../utils/jobAPI';
import JobFilters from './JobFilters';
import JobSettings from './JobSettings';
import NotificationPopup from './NotificationPopup';
import './JobBoard.css';

const JobBoard = () => {
  const [jobData, setJobData] = useState(null);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationChanges, setNotificationChanges] = useState([]);
  const [userPreferences, setUserPreferences] = useState(loadUserPreferences());
  const [showSettings, setShowSettings] = useState(false);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    searchKeyword: '',
    company: '',
    location: '',
    experience: '',
    source: 'all',
    sortBy: 'companySize' // companySize, newest, company, relevance
  });

  // 컴포넌트 참조 (자동 업데이트용)
  const jobBoardRef = useRef();

  // 채용정보 가져오기
  const fetchJobData = async (showNotifications = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log('채용정보 업데이트 시작:', new Date().toLocaleString());

      const newJobData = await fetchAllJobPostings();
      
      if (newJobData.error) {
        throw new Error(newJobData.error);
      }

      // 이전 데이터와 비교해서 변화 감지
      const oldData = jobData;
      let changes = [];

      if (oldData && showNotifications) {
        const newJobsCount = newJobData.relevant;
        const oldJobsCount = oldData.relevant;
        const jobDifference = newJobsCount - oldJobsCount;

        if (jobDifference !== 0) {
          changes.push({
            componentName: '새로운 채용공고',
            currentValue: `${newJobsCount}개`,
            currentRange: jobDifference > 0 ? `+${jobDifference}개 추가` : `${Math.abs(jobDifference)}개 감소`,
            hasChanged: true,
            previousValue: `${oldJobsCount}개`,
            previousRange: '이전 데이터',
            isError: false
          });
        }

        // 새로운 회사 체크
        if (oldData.jobs) {
          const oldCompanies = new Set(oldData.jobs.map(job => job.company));
          const newCompanies = newJobData.jobs
            .map(job => job.company)
            .filter(company => !oldCompanies.has(company));

          if (newCompanies.length > 0) {
            changes.push({
              componentName: '신규 회사 채용',
              currentValue: `${newCompanies.length}개 회사`,
              currentRange: newCompanies.slice(0, 3).join(', ') + (newCompanies.length > 3 ? '...' : ''),
              hasChanged: true,
              previousValue: '기존 회사',
              previousRange: '등록된 회사만',
              isError: false
            });
          }
        }
      }

      setJobData(newJobData);
      setFilteredJobs(newJobData.jobs || []);
      saveJobData(newJobData);
      setLastUpdateTime(new Date());

      if (showNotifications && changes.length > 0) {
        setNotificationChanges(changes);
        setShowNotification(true);
      }

      console.log('채용정보 업데이트 완료:', newJobData);
      return newJobData;

    } catch (err) {
      console.error('채용정보 로드 실패:', err);
      setError(err.message);
      
      if (showNotifications) {
        setNotificationChanges([{
          componentName: '채용정보 업데이트 실패',
          currentValue: '오류 발생',
          currentRange: err.message,
          hasChanged: true,
          previousValue: '정상',
          previousRange: '정상 작동',
          isError: true
        }]);
        setShowNotification(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // 필터 적용
  useEffect(() => {
    if (!jobData?.jobs) {
      setFilteredJobs([]);
      return;
    }

    let filtered = [...jobData.jobs];

    // 검색 키워드 필터
    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(keyword) ||
        job.company.toLowerCase().includes(keyword) ||
        job.description.toLowerCase().includes(keyword) ||
        job.skills.some(skill => skill.toLowerCase().includes(keyword))
      );
    }

    // 회사 필터
    if (filters.company) {
      filtered = filtered.filter(job => 
        job.company.toLowerCase().includes(filters.company.toLowerCase())
      );
    }

    // 위치 필터
    if (filters.location) {
      filtered = filtered.filter(job => 
        job.location.includes(filters.location)
      );
    }

    // 경력 필터
    if (filters.experience) {
      filtered = filtered.filter(job => 
        job.experience.includes(filters.experience)
      );
    }

    // 출처 필터
    if (filters.source !== 'all') {
      filtered = filtered.filter(job => job.source === filters.source);
    }

    // 정렬
    switch (filters.sortBy) {
      case 'companySize':
        // 회사 크기 순 (대기업 > 중견기업 > 중소기업 > 스타트업)
        filtered.sort((a, b) => {
          const sizeOrder = { 'large': 4, 'medium-large': 3, 'medium': 2, 'small': 1 };
          const aSizeScore = sizeOrder[a.companyInfo?.size] || 2;
          const bSizeScore = sizeOrder[b.companyInfo?.size] || 2;
          if (aSizeScore !== bSizeScore) {
            return bSizeScore - aSizeScore; // 큰 회사부터
          }
          // 같은 크기면 직원 수로 재정렬
          return (b.companyInfo?.employeeCount || 0) - (a.companyInfo?.employeeCount || 0);
        });
        break;
      case 'company':
        filtered.sort((a, b) => a.company.localeCompare(b.company));
        break;
      case 'relevance':
        // 키워드 매치 점수 기준 (임시 구현)
        filtered.sort((a, b) => {
          const aScore = userPreferences.keywords.filter(keyword => 
            a.title.toLowerCase().includes(keyword.toLowerCase()) ||
            a.description.toLowerCase().includes(keyword.toLowerCase())
          ).length;
          const bScore = userPreferences.keywords.filter(keyword => 
            b.title.toLowerCase().includes(keyword.toLowerCase()) ||
            b.description.toLowerCase().includes(keyword.toLowerCase())
          ).length;
          return bScore - aScore;
        });
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
        break;
      default:
        filtered.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
        break;
    }

    setFilteredJobs(filtered);
  }, [jobData, filters, userPreferences]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      // 저장된 데이터가 있고 24시간 이내라면 사용
      const savedData = loadJobData();
      if (savedData && !shouldUpdateJobData()) {
        console.log('저장된 채용정보 사용');
        setJobData(savedData);
        setFilteredJobs(savedData.jobs || []);
        setLastUpdateTime(new Date(savedData.lastUpdated));
        setLoading(false);
      } else {
        // 새로운 데이터 가져오기
        await fetchJobData(false);
      }
    };

    loadInitialData();

    // 하루에 한번 자동 업데이트 스케줄링
    const scheduleNextUpdate = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 매일 오전 9시에 업데이트

      const timeUntilUpdate = tomorrow.getTime() - now.getTime();
      
      console.log(`다음 채용정보 업데이트: ${tomorrow.toLocaleString()} (${Math.round(timeUntilUpdate / 1000 / 60 / 60)}시간 후)`);
      
      setTimeout(() => {
        fetchJobData(true);
        
        // 이후 매일 실행
        setInterval(() => {
          fetchJobData(true);
        }, 24 * 60 * 60 * 1000); // 24시간마다
        
      }, timeUntilUpdate);
    };
    
    scheduleNextUpdate();
  }, []);

  // 외부에서 호출할 수 있는 fetchData 함수 (Dashboard에서 사용)
  useEffect(() => {
    if (jobBoardRef.current) {
      jobBoardRef.current.fetchData = () => fetchJobData(false);
    }
  }, []);

  // 채용공고 카드 컴포넌트
  const JobCard = ({ job }) => (
    <div className="job-card">
      <div className="job-card-header">
        <h3 className="job-title">{job.title}</h3>
        <span className={`job-source ${job.source}`}>{job.source}</span>
      </div>
      
      <div className="job-company-info">
        <div className="job-company">{job.company}</div>
        <span className={`company-size-tag ${job.companyInfo?.size || 'medium'}`}>
          {job.companyInfo?.category || '중소기업'}
        </span>
      </div>
      
      <div className="job-details">
        <div className="job-detail-item">
          <span className="detail-label">위치:</span>
          <span className="detail-value">{job.location}</span>
        </div>
        <div className="job-detail-item">
          <span className="detail-label">경력:</span>
          <span className="detail-value">{job.experience}</span>
        </div>
        {job.salary && (
          <div className="job-detail-item">
            <span className="detail-label">급여:</span>
            <span className="detail-value">{job.salary}</span>
          </div>
        )}
      </div>

      {job.skills.length > 0 && (
        <div className="job-skills">
          {job.skills.map((skill, index) => (
            <span key={index} className="skill-tag">{skill}</span>
          ))}
        </div>
      )}

      <div className="job-description">
        {job.description.substring(0, 150)}...
      </div>

      <div className="job-card-footer">
        <div className="job-dates">
          <small>등록: {new Date(job.postedDate).toLocaleDateString()}</small>
          {job.deadline && (
            <small>마감: {job.deadline}</small>
          )}
        </div>
        <a 
          href={job.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="job-link-btn"
        >
          지원하기 →
        </a>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="job-board">
        <div className="job-board-header">
          <h1>채용공고 모니터</h1>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>채용정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-board">
        <div className="job-board-header">
          <h1>채용공고 모니터</h1>
        </div>
        <div className="error-state">
          <p>채용정보 로드 중 오류가 발생했습니다: {error}</p>
          <button onClick={() => fetchJobData(false)} className="retry-btn">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="job-board" ref={jobBoardRef}>
      <div className="job-board-header">
        <div className="header-title">
          <h1>채용공고 모니터</h1>
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(true)}
          >
            ⚙️ 필터 설정
          </button>
        </div>
        <div className="update-info">
          {lastUpdateTime && (
            <div>
              <span>마지막 업데이트: {lastUpdateTime.toLocaleString()}</span>
              <br />
              <span>다음 업데이트: 매일 오전 9시</span>
            </div>
          )}
        </div>
      </div>

      <div className="job-stats">
        <div className="stat-item">
          <span className="stat-value">{jobData?.total || 0}</span>
          <span className="stat-label">전체 공고</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{jobData?.relevant || 0}</span>
          <span className="stat-label">관련 공고</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{filteredJobs.length}</span>
          <span className="stat-label">필터 결과</span>
        </div>
      </div>

      {jobData?.sources && (
        <div className="source-stats">
          <small>
            출처별: 사라민 {jobData.sources.saramin}개 | 
            원티드 {jobData.sources.wanted}개 | 
            잡플래닛 {jobData.sources.jobplanet}개
          </small>
        </div>
      )}

      <JobFilters 
        filters={filters}
        onFiltersChange={setFilters}
        jobData={jobData}
      />

      <div className="job-list">
        {filteredJobs.length === 0 ? (
          <div className="no-jobs">
            <p>필터 조건에 맞는 채용공고가 없습니다.</p>
            <button onClick={() => setFilters({
              searchKeyword: '',
              company: '',
              location: '',
              experience: '',
              source: 'all',
              sortBy: 'companySize'
            })}>
              필터 초기화
            </button>
          </div>
        ) : (
          filteredJobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))
        )}
      </div>

      <div className="job-board-footer">
        <div className="footer-navigation">
          <Link to="/" className="home-btn">
            ← 홈으로 돌아가기
          </Link>
          <button 
            onClick={() => fetchJobData(true)}
            className="manual-update-btn"
            disabled={loading}
          >
            🔄 수동 업데이트
          </button>
        </div>
        <p>made by jwkim1001</p>
      </div>

      <JobSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(newPreferences) => {
          setUserPreferences(newPreferences);
          // 설정 변경 후 필터 다시 적용
          fetchJobData(false);
        }}
      />

      <NotificationPopup
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        changes={notificationChanges}
      />
    </div>
  );
};

export default JobBoard;