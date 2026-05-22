/**
 * e2e/act-themes.spec.js
 *
 * Tests act-based wallpaper CSS classes and notification visibility
 * across different acts. Uses addInitScript to seed localStorage
 * so we can test later acts without playing through the story.
 */

const { test, expect } = require('@playwright/test');

async function withSave(page, act) {
  await page.addInitScript(({ act }) => {
    localStorage.setItem('tid_save_v1', JSON.stringify({
      version: 1, currentAct: act,
      act2Active: act >= 2, act3Active: act >= 3,
      act4Active: act >= 4, act5Active: act >= 5,
      act2SyncPath: act >= 2 ? 'archive' : null,
      chats: [],
    }));
  }, { act });
}

async function goToHome(page) {
  await page.waitForFunction(() => typeof window.showScreen === 'function');
  await page.evaluate(() => window.showScreen('home-screen'));
  await expect(page.locator('#home-screen')).toHaveClass(/active/, { timeout: 3000 });
}

// ── Act wallpaper CSS classes ─────────────────────────────────────────────────

test.describe('Act wallpaper classes', () => {
  test('Act 1: home screen has no act class (default dark)', async ({ page }) => {
    await page.goto('/');
    await goToHome(page);
    const cls = await page.locator('#home-screen').getAttribute('class');
    expect(cls).not.toContain('act2-home');
    expect(cls).not.toContain('act3-home');
    expect(cls).not.toContain('act4-home');
    expect(cls).not.toContain('act5-home');
  });

  test('Act 2: home screen has act2-home class (red tint)', async ({ page }) => {
    await withSave(page, 2);
    await page.goto('/');
    await goToHome(page);
    await expect(page.locator('#home-screen')).toHaveClass(/act2-home/);
  });

  test('Act 3: home screen has act3-home class (purple glow)', async ({ page }) => {
    await withSave(page, 3);
    await page.goto('/');
    await goToHome(page);
    await expect(page.locator('#home-screen')).toHaveClass(/act3-home/);
  });

  test('Act 4: home screen has act4-home class (danger red)', async ({ page }) => {
    await withSave(page, 4);
    await page.goto('/');
    await goToHome(page);
    await expect(page.locator('#home-screen')).toHaveClass(/act4-home/);
  });

  test('Act 5: home screen has act5-home class (green terminal)', async ({ page }) => {
    await withSave(page, 5);
    await page.goto('/');
    await goToHome(page);
    await expect(page.locator('#home-screen')).toHaveClass(/act5-home/);
  });

  test('Act 2: does NOT also have act3-home or act4-home class', async ({ page }) => {
    await withSave(page, 2);
    await page.goto('/');
    await goToHome(page);
    const cls = await page.locator('#home-screen').getAttribute('class');
    expect(cls).not.toContain('act3-home');
    expect(cls).not.toContain('act4-home');
    expect(cls).not.toContain('act5-home');
  });
});

// ── Act-specific app icons ────────────────────────────────────────────────────

test.describe('Act-specific app icons', () => {
  test('Act 1: Files app icon is NOT present', async ({ page }) => {
    await page.goto('/');
    await goToHome(page);
    const count = await page.locator('.app-icon').filter({ hasText: 'Files' }).count();
    expect(count).toBe(0);
  });

  test('Act 2: Files app icon IS present', async ({ page }) => {
    await withSave(page, 2);
    await page.goto('/');
    await goToHome(page);
    await expect(page.locator('.app-icon').filter({ hasText: 'Files' })).toBeVisible();
  });

  test('Act 2: Observer app icon IS present', async ({ page }) => {
    await withSave(page, 2);
    await page.goto('/');
    await goToHome(page);
    await expect(page.locator('.app-icon').filter({ hasText: 'Observer' })).toBeVisible();
  });
});

// ── Notification visibility per screen ───────────────────────────────────────

test.describe('Notification visibility across screens', () => {
  test('banners hidden on title screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#title-screen.active', { timeout: 8000 });
    const display = await page.locator('#notification-container').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('banners hidden on passcode screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.showScreen === 'function');
    await page.evaluate(() => window.showScreen('passcode-screen'));
    await page.waitForSelector('#passcode-screen.active', { timeout: 3000 });
    const display = await page.locator('#notification-container').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('banners visible on lock screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.showScreen === 'function');
    await page.evaluate(() => window.showScreen('lock-screen'));
    await page.waitForSelector('#lock-screen.active', { timeout: 3000 });
    const display = await page.locator('#notification-container').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).not.toBe('none');
  });

  test('banners visible inside Messages app', async ({ page }) => {
    await page.goto('/');
    await goToHome(page);
    await page.evaluate(() => window.showScreen('messages-app'));
    await page.waitForSelector('#messages-app.active', { timeout: 3000 });
    const display = await page.locator('#notification-container').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).not.toBe('none');
  });
});
