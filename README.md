# 로또 번호 생성기 & 분석 도구

React 기반 로또 번호 생성기 및 당첨번호 분석 애플리케이션

## 주요 기능

### 1. 🎲 번호 생성
- 6개 랜덤 번호 생성 (1-45)
- 필수 포함 번호 설정
- 다양한 제외 옵션:
  - 저번주 당첨번호 제외
  - 1의 자리/10의 자리 기반 제외
  - 연속 4개 번호 제외
  - 전체 최다/최소 출현 번호 제외
  - 최신 15회 최다 출현 번호 제외
  - 최신 15회 미추첨 번호 제외

### 2. 🔍 당첨번호 확인
- 회차별 당첨번호 조회
- 내 번호와 당첨번호 비교
- 5개 이상 겹치는 과거 회차 분석

### 3. 📊 분석
- 회차별 당첨번호 분석
- 이전 회차(-1, -2)와 겹침 분석
- 최신 15회 통계 (최다 출현, 미추첨)
- 전체 통계 (최다/최소 출현)

## 기술 스택

- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL)
- **Styling**: CSS3

## 설치 및 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. Supabase 설정

#### 환경 변수 설정
`.env.example`을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 내용:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Supabase 프로젝트 설정

1. **프로젝트 생성**
   - [Supabase](https://supabase.com) 접속 → 새 프로젝트 생성

2. **테이블 생성**
   ```sql
   CREATE TABLE lottoTable (
     id SERIAL PRIMARY KEY,
     number INTEGER NOT NULL UNIQUE,
     date VARCHAR(20),
     count1 INTEGER,
     count2 INTEGER,
     count3 INTEGER,
     count4 INTEGER,
     count5 INTEGER,
     count6 INTEGER,
     bonus INTEGER
   );
   ```

3. **RLS 정책 설정**
   ```sql
   CREATE POLICY "Enable read access for all users" ON lottoTable
   FOR SELECT USING (true);
   ```

4. **API 키 확인**
   - Settings → API에서 URL과 anon key 복사 → `.env`에 입력

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 빌드
```bash
npm run build
```

## 라이선스

MIT
