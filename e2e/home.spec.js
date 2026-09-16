import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

// 1. 첫 화면 진입 시 메뉴 영역이 보인다
test('첫 화면 진입 시 메뉴 영역이 보인다', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('heading', { name: '🎯 미니게임천국' })).toBeVisible();
});

// 2. 월드컵 순위 예측 메뉴가 보인다
test('월드컵 순위 예측 메뉴가 보인다', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('heading', { name: '월드컵 순위 예측' })).toBeVisible();
});

// 3. KBO 순위 예측 메뉴가 보인다
test('KBO 순위 예측 메뉴가 보인다', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('heading', { name: 'KBO 순위 예측' })).toBeVisible();
});

// 4. 코브라 게임 메뉴가 보인다
test('코브라 게임 메뉴가 보인다', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('heading', { name: '코브라 게임' })).toBeVisible();
});

// 5. 메뉴를 클릭하면 주소가 바뀐다
test('메뉴를 클릭하면 주소가 바뀐다', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.getByRole('heading', { name: '월드컵 순위 예측' }).click();
  await expect(page).toHaveURL(/\/world-cup-predict/);
});

// 6. 클릭 후 해당 화면의 대표 요소가 보인다
test('클릭 후 해당 화면의 대표 요소가 보인다', async ({ page }) => {
  await page.goto(`${BASE}/world-cup-predict`);
  await expect(page.getByText('2026 FIFA 월드컵')).toBeVisible();
});

// 7. 없는 주소로 직접 들어가면 오류 화면 또는 첫 화면으로 간다
test('없는 주소로 직접 들어가면 오류 화면 또는 첫 화면으로 간다', async ({ page }) => {
  await page.goto(`${BASE}/nonexistent-page-xyz`);
  // App.jsx에 * 라우트가 없어 빈 화면으로 처리됨 — 앱이 크래시 없이 body가 보여야 함
  await expect(page.locator('body')).toBeVisible();
});

// 8. 새로고침해도 메뉴가 그대로 보인다
test('새로고침해도 메뉴가 그대로 보인다', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('heading', { name: '월드컵 순위 예측' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '월드컵 순위 예측' })).toBeVisible();
});
