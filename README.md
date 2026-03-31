# 🎯 미니게임천국 (등대지기)

> 다양한 웹 서비스를 한 곳에서 — 로또 분석, 취향 매칭, 맛집 추천, 금융 대시보드

**Live Demo:** https://[your-username].github.io/jwkim1001/

---

## 📌 프로젝트 소개

개인 취미 프로젝트로 제작한 멀티 서비스 웹앱입니다.
로그인·회원가입 기반의 회원제 기능과 비회원 기능을 함께 제공하며,
Supabase를 백엔드로 활용해 사용자 데이터를 저장·관리합니다.

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | React 19, React Router DOM 7 |
| Build | Vite 7 |
| Backend / DB | Supabase (PostgreSQL) |
| 로컬 DB | SQLite WASM |
| 인증 | 세션 직접 관리 (localStorage, 60분 만료) |
| 배포 | GitHub Pages (`gh-pages`) |

---

## ✨ 주요 기능

### 🎰 로또 서비스

비회원 / 회원 두 가지 모드를 제공합니다.

**기본 (비회원)**
- 로또 번호 랜덤 생성 (6개 / 1~45)

**멤버십 (회원 전용)**
- 5게임 동시 생성
- 고급 필터 설정
  - 제외 번호 / 포함 번호 지정
  - 끝자리·십의 자리 패턴 제외
  - 연속 번호 방지
  - 홀짝 비율 제한 (0:6, 6:0 차단)
  - 합계 범위 필터 (기본 100~170)
  - AC값 필터
  - 게임 간 중복 방지
- 역대 당첨 번호 대조 (52주 백테스트)
- 생성 게임 저장 / 마이페이지에서 이력 확인

---

### 😋 취향 알기 (TasteMatch)

- 4개 카테고리 × 20문항 선택형 퀴즈
  - 음식 취향 / 생활 습관 / 인간관계 / 딜레마
- 결과를 Supabase에 저장 후 다른 사용자와 취향 유사도 비교
- 비회원 참여 가능 (저장·비교는 로그인 필요)

---

### 🍽️ MOMOK (맛집 추천)

- 지역 → 세부 지역 → 카테고리 단계별 필터링
- Supabase 기반 식당 데이터

**MOMOK Best (회원 전용)**
- "라이프" 포인트 소모 방식으로 카드 잠금 해제
- 별표(★) 카드 우선 정렬
- 리뷰 있는 카드에 노란 별 배지 표시

→ [상세 문서](./docs/MOMOK_BEST.md)

---

### 📊 스마트 대시보드 *(준비 중)*

- USD/KRW 환율 실시간 조회
- 크립토 공포·탐욕 지수 (Fear & Greed Index)
- 주식 변동성 지수 (VIX Index)
- 변동 알림 팝업

---

### 💼 채용 공고 모니터 *(준비 중)*

- 다수 소스에서 채용 공고 수집
- 키워드 / 회사 / 경력 필터
- 신규 공고 변동 감지 및 알림

---

## 📁 프로젝트 구조

```
src/
├── components/               # 화면 컴포넌트
│   ├── Home.jsx              # 메인 허브 (서비스 카드 목록)
│   ├── Lotto.jsx             # 로또 멤버십 (생성·분석·백테스트)
│   ├── LottoBasic.jsx        # 로또 기본 (비회원)
│   ├── TasteMatch.jsx        # 취향 퀴즈 & 유사도 비교
│   ├── Momok.jsx             # 맛집 추천
│   ├── MomokBest.jsx         # 맛집 프리미엄 카드
│   ├── Dashboard.jsx         # 금융 지표 대시보드
│   ├── JobBoard.jsx          # 채용 공고 모니터
│   ├── MyPage.jsx            # 마이페이지 (저장 게임·통계)
│   └── Admin.jsx             # 관리자 페이지
├── context/
│   └── AuthContext.jsx       # 전역 인증 상태 (로그인·세션 관리)
├── services/
│   ├── authService.js        # 로그인·회원가입·비밀번호 검증
│   ├── database.js           # SQLite WASM 로컬 DB
│   ├── supabaseLotto.js      # 로또 데이터 Supabase 연동
│   └── supabaseRestaurant.js # 맛집 데이터 Supabase 연동
├── utils/
│   ├── lottoAPI.js           # 로또 번호 생성·분석 알고리즘
│   ├── jobAPI.js             # 채용 공고 수집·필터링
│   └── notificationUtils.js  # 변동 감지 및 알림 유틸
├── data/
│   └── tasteMatchData.js     # 취향 퀴즈 문항 데이터
├── App.jsx                   # 라우터 설정
└── supabaseClient.js         # Supabase 클라이언트 초기화
```

---

## 🚀 로컬 실행

```bash
# 1. 저장소 클론
git clone https://github.com/[your-username]/[repo-name].git
cd [repo-name]

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
# .env 파일 생성 후 아래 값 입력
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. 개발 서버 실행
npm run dev
```

---

## 📦 배포

```bash
npm run deploy
# Vite 빌드 후 gh-pages 브랜치로 자동 배포
```

---

## 📋 서비스 현황

| 서비스 | 상태 | 로그인 필요 |
|--------|------|-------------|
| 로또 (기본) | ✅ 운영 중 | ✗ |
| 로또 (멤버십) | ✅ 운영 중 | ✓ |
| MOMOK | ✅ 운영 중 (개선 중) | ✗ |
| MOMOK Best | ✅ 운영 중 | ✓ |
| 취향 알기 | ✅ 운영 중 | 선택 |
| 스마트 대시보드 | 🚧 준비 중 | - |
| 채용 공고 모니터 | 🚧 준비 중 | - |
| What to Eat | 🚧 준비 중 | - |

---

## ⚠️ 참고 사항

- `.env` 파일은 저장소에 포함되지 않습니다. Supabase 프로젝트를 직접 생성하고 환경 변수를 설정해야 합니다.
- 일부 기능(MOMOK Best, 로또 멤버십)은 별도의 Supabase 테이블 스키마가 필요합니다.
- 관리자 계정(`admin`)은 별도 권한 부여가 필요합니다.

---

## 📄 License

이 프로젝트는 개인 포트폴리오 목적으로 제작되었습니다.
