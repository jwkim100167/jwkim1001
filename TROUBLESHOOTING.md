# 로또 데이터 업데이트 문제 해결 가이드

## 문제: 새로운 회차 데이터가 GitHub Pages에 반영되지 않음

### 증상
- 로컬(localhost)에서는 최신 회차(예: 1195회차)가 정상적으로 보임
- GitHub Pages 배포 사이트에서는 이전 회차(예: 1194회차)까지만 보임
- 강력 새로고침(Ctrl + Shift + R)을 해도 변경사항이 반영되지 않음

### 발생 이력
- 2025-10-25: 1194회차 → 1195회차 업데이트 시 동일 문제 발생
- 2025-10-18: 1193회차 → 1194회차 업데이트 시 동일 문제 발생

---

## 원인

### 1. 데이터 파일은 정상적으로 배포됨
```bash
# 배포된 파일 확인 (1195가 정상적으로 있음)
curl https://jwkim100167.github.io/jwkim1001/lotto-data.json | tail -20
```

### 2. 실제 원인: **브라우저/CDN 캐시**
- GitHub Pages의 CDN 캐시가 이전 버전을 유지
- 브라우저의 HTTP 캐시가 JSON 파일을 캐싱
- 일반 새로고침(F5)이나 강력 새로고침(Ctrl+Shift+R)으로도 JSON 파일 캐시가 완전히 지워지지 않음

---

## 해결 방법

### ✅ 방법 1: 시크릿 모드로 확인 (가장 빠름)
1. 브라우저 시크릿 모드 실행
2. https://jwkim100167.github.io/jwkim1001/ 접속
3. 최신 데이터 확인

### ✅ 방법 2: 브라우저 캐시 완전 삭제
1. F12 (개발자 도구 열기)
2. **Application** 탭 선택
3. **Storage** → **Clear site data** 클릭
4. 페이지 새로고침

### ✅ 방법 3: 콘솔에서 직접 확인
```javascript
// F12 → Console 탭에서 실행
fetch('https://jwkim100167.github.io/jwkim1001/lotto-data.json')
  .then(r => r.json())
  .then(d => {
    console.log('총 회차:', d.totalRounds);
    console.log('최신 회차:', Math.max(...d.data.map(item => item.round)));
  });
```

---

## 배포 프로세스 (참고)

### 자동 업데이트 흐름
1. **GitHub Actions** (매주 일요일 오전 7시 KST)
   - `scripts/fetch-lotto-data.js` 실행
   - `public/lotto-data.json` 업데이트
   - 자동 커밋 & 푸시

2. **수동 배포 트리거** (필요 시)
   ```bash
   git commit --allow-empty -m "Trigger GitHub Pages deployment with [회차번호]"
   git push
   ```

3. **GitHub Pages 배포**
   - Push 감지
   - `npm run build` 실행
   - `dist` 폴더를 GitHub Pages에 배포

### 배포 확인
```bash
# 원격 저장소 파일 확인
git show HEAD:public/lotto-data.json | tail -20

# 배포된 파일 확인
curl https://jwkim100167.github.io/jwkim1001/lotto-data.json | tail -20

# 로컬 파일 확인
tail -20 public/lotto-data.json
```

---

## 체크리스트

- [ ] 로컬에서 데이터 정상 확인 (`localhost:5173`)
- [ ] Git에 커밋 & 푸시 완료
- [ ] GitHub Actions 워크플로우 실행 확인
- [ ] 배포된 JSON 파일에서 최신 회차 확인 (curl 명령)
- [ ] **시크릿 모드 또는 캐시 삭제 후** 사이트 확인

---

## 주의사항

⚠️ **"안 보인다"고 판단하기 전에:**
1. 시크릿 모드로 먼저 확인할 것
2. 배포된 JSON 파일을 curl로 직접 확인할 것
3. CDN 캐시 전파에 최대 5-10분 소요될 수 있음
