// 채용 정보 API 관리 유틸리티

// 사용자 설정 (5~10년차 IT 직군, 서울/경기 지역 고정)
const USER_PREFERENCES = {
  keywords: ['프론트엔드', '백엔드', '풀스택', '개발자', 'javascript', 'react', 'node.js', 'python', 'java', 'spring', 'vue', 'angular', 'DevOps', '시스템', '아키텍트', '테크리드', 'CTO'],
  excludeKeywords: ['인턴', '신입', '1년차', '2년차', '3년차', '4년차', '주니어', '계약직', '파견', '외주'],
  experienceLevel: ['5년', '6년', '7년', '8년', '9년', '10년', '5~10년', '경력 5년', '경력 6년', '경력 7년', '경력 8년', '경력 9년', '경력 10년'],
  locations: ['서울', '경기', '판교', '강남', '분당', '성남', '수원', '안양', '용인', '고양', '부천'],
  companies: [], // 관심 회사 목록
  salaryMin: 0 // 최소 연봉 (만원 단위)
};

// 사라민 공개 API (실제 환경에서는 API 키 필요)
const SARAMIN_API_BASE = 'https://oapi.saramin.co.kr/job-search';
const WANTED_API_BASE = 'https://www.wanted.co.kr/api/chaos/jobs/v1/list';

// 회사 크기 매핑 (실제로는 회사 정보 API나 데이터베이스에서 가져와야 함)
const COMPANY_SIZE_DATA = {
  // 대기업 (1만명 이상)
  '삼성': { size: 'large', employeeCount: 100000, category: '대기업' },
  'LG': { size: 'large', employeeCount: 50000, category: '대기업' },
  'SK': { size: 'large', employeeCount: 40000, category: '대기업' },
  '현대': { size: 'large', employeeCount: 70000, category: '대기업' },
  'KT': { size: 'large', employeeCount: 25000, category: '대기업' },
  
  // 중견기업 (1000~9999명)
  '네이버': { size: 'medium-large', employeeCount: 8000, category: '중견기업' },
  '카카오': { size: 'medium-large', employeeCount: 6000, category: '중견기업' },
  '쿠팡': { size: 'medium-large', employeeCount: 5000, category: '중견기업' },
  '라인': { size: 'medium-large', employeeCount: 3000, category: '중견기업' },
  '배달의민족': { size: 'medium-large', employeeCount: 2500, category: '중견기업' },
  '토스': { size: 'medium-large', employeeCount: 2000, category: '중견기업' },
  '당근마켓': { size: 'medium', employeeCount: 1500, category: '중견기업' },
  '야놀자': { size: 'medium', employeeCount: 1200, category: '중견기업' },
  
  // 중소기업 (100~999명)
  '핀테크회사': { size: 'medium', employeeCount: 800, category: '중소기업' },
  '핀테크 회사': { size: 'medium', employeeCount: 800, category: '중소기업' },
  'IT솔루션': { size: 'medium', employeeCount: 400, category: '중소기업' },
  '이커머스플랫폼': { size: 'medium', employeeCount: 350, category: '중소기업' },
  '이커머스 플랫폼': { size: 'medium', employeeCount: 350, category: '중소기업' },
  '게임회사': { size: 'medium', employeeCount: 300, category: '중소기업' },
  '게임 회사': { size: 'medium', employeeCount: 300, category: '중소기업' },
  
  // 통신 3사
  'SKT': { size: 'large', employeeCount: 30000, category: '대기업' },
  'SK텔레콤': { size: 'large', employeeCount: 30000, category: '대기업' },
  'LGU+': { size: 'large', employeeCount: 15000, category: '대기업' },
  'LG유플러스': { size: 'large', employeeCount: 15000, category: '대기업' },
  
  // 추가 대기업들
  'LG전자': { size: 'large', employeeCount: 70000, category: '대기업' },
  'LG화학': { size: 'large', employeeCount: 45000, category: '대기업' },
  'SK하이닉스': { size: 'large', employeeCount: 35000, category: '대기업' },
  
  // 스타트업 (100명 미만)
  '스타트업': { size: 'small', employeeCount: 50, category: '스타트업' },
  '테크스타트업': { size: 'small', employeeCount: 80, category: '스타트업' },
  '테크 스타트업': { size: 'small', employeeCount: 80, category: '스타트업' }
};

// 회사 크기 정보 가져오기
function getCompanySize(companyName) {
  // 회사명에서 키워드 찾기
  for (const [keyword, info] of Object.entries(COMPANY_SIZE_DATA)) {
    if (companyName.includes(keyword)) {
      return info;
    }
  }
  // 기본값 (정보 없는 회사는 중소기업으로 분류)
  return { size: 'medium', employeeCount: 200, category: '중소기업' };
}

// 채용 정보 데이터 구조 표준화
class JobPosting {
  constructor(data, source) {
    this.id = data.id || `${source}_${Date.now()}_${Math.random()}`;
    this.title = data.title || '';
    this.company = data.company || '';
    this.location = data.location || '';
    this.experience = data.experience || '';
    this.salary = data.salary || '';
    this.skills = data.skills || [];
    this.description = data.description || '';
    this.url = data.url || '';
    this.postedDate = data.postedDate || new Date().toISOString();
    this.deadline = data.deadline || '';
    this.source = source;
    this.companyInfo = getCompanySize(this.company);
    this.isRelevant = this.checkRelevance();
  }

  // 사용자 관심사와 매치되는지 확인
  checkRelevance() {
    const titleLower = this.title.toLowerCase();
    const companyLower = this.company.toLowerCase();
    const descriptionLower = this.description.toLowerCase();
    const allText = `${titleLower} ${companyLower} ${descriptionLower}`;

    // 제외 키워드 체크
    const hasExcludeKeywords = USER_PREFERENCES.excludeKeywords.some(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    if (hasExcludeKeywords) return false;

    // 관심 키워드 체크
    const hasRelevantKeywords = USER_PREFERENCES.keywords.some(keyword => 
      allText.includes(keyword.toLowerCase())
    );

    // 위치 체크
    const hasRelevantLocation = USER_PREFERENCES.locations.length === 0 || 
      USER_PREFERENCES.locations.some(location => 
        this.location.includes(location)
      );

    return hasRelevantKeywords && hasRelevantLocation;
  }
}

// 사라민 API 호출 (모의 데이터 사용)
async function fetchSaraminJobs() {
  try {
    // 실제 환경에서는 CORS 문제로 서버사이드에서 호출해야 함
    // 현재는 모의 데이터로 대체
    console.log('사라민 채용정보 조회 시작...');
    
    // 모의 사라민 데이터 (5~10년차 IT 직군)
    const mockSaraminData = [
      {
        id: 'saramin_1',
        title: '네이버 - 시니어 프론트엔드 개발자 (React/TypeScript)',
        company: '네이버',
        location: '경기 분당구',
        experience: '경력 5~8년',
        salary: '연봉 7000~9000만원',
        skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'Redux'],
        description: '대규모 서비스의 프론트엔드 아키텍처 설계 및 개발, 주니어 개발자 멘토링',
        url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123456',
        postedDate: new Date().toISOString(),
        deadline: '2025-08-30'
      },
      {
        id: 'saramin_2',
        title: '카카오 - 테크리드 (백엔드)',
        company: '카카오',
        location: '경기 판교',
        experience: '경력 7~10년',
        salary: '연봉 8000~12000만원',
        skills: ['Java', 'Spring Boot', 'Kubernetes', 'MSA', 'AWS'],
        description: '백엔드 팀 리딩 및 시스템 아키텍처 설계, 기술 전략 수립',
        url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123457',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-15'
      },
      {
        id: 'saramin_3',
        title: '쿠팡 - DevOps 엔지니어 (Senior)',
        company: '쿠팡',
        location: '서울 송파구',
        experience: '경력 6~9년',
        salary: '연봉 8500~11000만원',
        skills: ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'Jenkins'],
        description: '대규모 인프라 운영 및 CI/CD 파이프라인 구축, 클라우드 아키텍처 설계',
        url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123458',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-20'
      },
      {
        id: 'saramin_4',
        title: '삼성전자 - 소프트웨어 아키텍트',
        company: '삼성전자',
        location: '경기 수원시',
        experience: '경력 8~12년',
        salary: '연봉 9000~13000만원',
        skills: ['Java', 'Spring', 'MSA', 'System Design', 'Leadership'],
        description: '엔터프라이즈 소프트웨어 아키텍처 설계 및 기술 리더십',
        url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123459',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-25'
      }
    ];

    return mockSaraminData.map(job => new JobPosting(job, 'saramin'));
  } catch (error) {
    console.error('사라민 API 호출 실패:', error);
    return [];
  }
}

// 원티드 API 호출 (모의 데이터 사용)
async function fetchWantedJobs() {
  try {
    console.log('원티드 채용정보 조회 시작...');
    
    // 모의 원티드 데이터 (5~10년차 IT 직군)
    const mockWantedData = [
      {
        id: 'wanted_1',
        title: '토스 - CTO (Chief Technology Officer)',
        company: '토스',
        location: '서울 강남구',
        experience: '경력 10년 이상',
        salary: '연봉 12000~18000만원',
        skills: ['Leadership', 'System Architecture', 'Team Management', 'Strategy'],
        description: '기술 전략 수립 및 개발팀 총괄, 스케일링 경험 필수',
        url: 'https://www.wanted.co.kr/wd/123456',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-01'
      },
      {
        id: 'wanted_2',
        title: '라인 - 시니어 풀스택 개발자',
        company: '라인',
        location: '경기 분당구',
        experience: '경력 6~10년',
        salary: '연봉 7500~10000만원',
        skills: ['React', 'Spring Boot', 'Python', 'PostgreSQL', 'Redis'],
        description: '메신저 서비스 풀스택 개발 및 아키텍처 개선',
        url: 'https://www.wanted.co.kr/wd/123457',
        postedDate: new Date().toISOString(),
        deadline: '2025-08-25'
      },
      {
        id: 'wanted_3',
        title: '배달의민족 - 데이터 엔지니어 (Senior)',
        company: '배달의민족',
        location: '서울 송파구',
        experience: '경력 5~8년',
        salary: '연봉 7000~9500만원',
        skills: ['Python', 'Spark', 'Kafka', 'Airflow', 'BigQuery'],
        description: '대규모 데이터 파이프라인 설계 및 운영, ML 모델 서빙',
        url: 'https://www.wanted.co.kr/wd/123458',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-10'
      },
      {
        id: 'wanted_4',
        title: '당근마켓 - 플랫폼 엔지니어 (Senior)',
        company: '당근마켓',
        location: '서울 서초구',
        experience: '경력 6~9년',
        salary: '연봉 8000~10500만원',
        skills: ['Kubernetes', 'Go', 'Terraform', 'Prometheus', 'Grafana'],
        description: '개발자 플랫폼 구축 및 운영, 개발 생산성 향상',
        url: 'https://www.wanted.co.kr/wd/123459',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-05'
      }
    ];

    return mockWantedData.map(job => new JobPosting(job, 'wanted'));
  } catch (error) {
    console.error('원티드 API 호출 실패:', error);
    return [];
  }
}

// 잡플래닛 API 호출 (모의 데이터 사용)
async function fetchJobplanetJobs() {
  try {
    console.log('잡플래닛 채용정보 조회 시작...');
    
    const mockJobplanetData = [
      {
        id: 'jobplanet_1',
        title: 'LG전자 - 시스템 아키텍트 (Enterprise)',
        company: 'LG전자',
        location: '서울 영등포구',
        experience: '경력 8~12년',
        salary: '연봉 9500~13000만원',
        skills: ['Java', 'Spring', 'MSA', 'Docker', 'System Design'],
        description: '글로벌 서비스 시스템 아키텍처 설계 및 기술 전략 수립',
        url: 'https://www.jobplanet.co.kr/job/123456',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-10'
      },
      {
        id: 'jobplanet_2',
        title: 'SK텔레콤 - 시니어 백엔드 개발자',
        company: 'SK텔레콤',
        location: '서울 중구',
        experience: '경력 6~10년',
        salary: '연봉 8000~11000만원',
        skills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'RabbitMQ'],
        description: '통신 서비스 백엔드 개발 및 성능 최적화',
        url: 'https://www.jobplanet.co.kr/job/123457',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-15'
      },
      {
        id: 'jobplanet_3',
        title: 'KT - 클라우드 엔지니어 (Senior)',
        company: 'KT',
        location: '경기 성남시',
        experience: '경력 5~8년',
        salary: '연봉 7500~9500만원',
        skills: ['AWS', 'Azure', 'Terraform', 'Ansible', 'Linux'],
        description: '클라우드 인프라 설계 및 운영, 마이그레이션 프로젝트',
        url: 'https://www.jobplanet.co.kr/job/123458',
        postedDate: new Date().toISOString(),
        deadline: '2025-09-12'
      }
    ];

    return mockJobplanetData.map(job => new JobPosting(job, 'jobplanet'));
  } catch (error) {
    console.error('잡플래닛 API 호출 실패:', error);
    return [];
  }
}

// 모든 채용 사이트에서 데이터 수집
export async function fetchAllJobPostings() {
  try {
    console.log('전체 채용정보 수집 시작:', new Date().toLocaleString());
    
    const [saraminJobs, wantedJobs, jobplanetJobs] = await Promise.all([
      fetchSaraminJobs(),
      fetchWantedJobs(),
      fetchJobplanetJobs()
    ]);

    const allJobs = [...saraminJobs, ...wantedJobs, ...jobplanetJobs];
    
    // 관련 있는 채용공고만 필터링
    const relevantJobs = allJobs.filter(job => job.isRelevant);
    
    console.log(`총 ${allJobs.length}개 채용공고 중 ${relevantJobs.length}개가 관심 분야와 매치됨`);
    
    return {
      total: allJobs.length,
      relevant: relevantJobs.length,
      jobs: relevantJobs,
      lastUpdated: new Date().toISOString(),
      sources: {
        saramin: saraminJobs.length,
        wanted: wantedJobs.length,
        jobplanet: jobplanetJobs.length
      }
    };
  } catch (error) {
    console.error('채용정보 수집 실패:', error);
    return {
      total: 0,
      relevant: 0,
      jobs: [],
      lastUpdated: new Date().toISOString(),
      error: error.message
    };
  }
}

// 사용자 설정 업데이트
export function updateUserPreferences(newPreferences) {
  Object.assign(USER_PREFERENCES, newPreferences);
  localStorage.setItem('jobPreferences', JSON.stringify(USER_PREFERENCES));
}

// 사용자 설정 로드
export function loadUserPreferences() {
  const saved = localStorage.getItem('jobPreferences');
  if (saved) {
    Object.assign(USER_PREFERENCES, JSON.parse(saved));
  }
  return USER_PREFERENCES;
}

// 채용정보 로컬 저장
export function saveJobData(jobData) {
  localStorage.setItem('jobData', JSON.stringify(jobData));
  localStorage.setItem('jobDataTimestamp', Date.now().toString());
}

// 저장된 채용정보 로드
export function loadJobData() {
  const data = localStorage.getItem('jobData');
  const timestamp = localStorage.getItem('jobDataTimestamp');
  
  if (data && timestamp) {
    const age = Date.now() - parseInt(timestamp);
    // 24시간 이내의 데이터만 유효
    if (age < 24 * 60 * 60 * 1000) {
      return JSON.parse(data);
    }
  }
  return null;
}

// 채용정보가 업데이트 필요한지 확인
export function shouldUpdateJobData() {
  const timestamp = localStorage.getItem('jobDataTimestamp');
  if (!timestamp) return true;
  
  const age = Date.now() - parseInt(timestamp);
  // 24시간마다 업데이트
  return age >= 24 * 60 * 60 * 1000;
}

export default {
  fetchAllJobPostings,
  updateUserPreferences,
  loadUserPreferences,
  saveJobData,
  loadJobData,
  shouldUpdateJobData
};