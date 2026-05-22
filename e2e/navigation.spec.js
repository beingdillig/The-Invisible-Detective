/**
 * e2e/navigation.spec.js
 *
 * Tests in-game navigation — home screen app icons, app opens/closes,
 * notification container, and CSS rendering sanity checks.
 * Gets into the game by calling showScreen() directly via JS.
 */

const { test, expect } = require('@playwright/test');

/** Jump straight to home screen, bypassing splash/prelude/passcode. */
async function goToHome(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showScreen === 'function');
  await page.evaluate(() => window.showScreen('home-screen'));
  await expect(page.locator('#home-screen')).toHaveClass(/active/, { timeout: 3000 });
}

// ── Home screen ────────────────────────────────────────────

test.describe('Home screen', () => {
  test('home screen shows app icons', async ({ page }) => {
    await goToHome(page);
    await expect(page.locator('.app-icon')).not.toHaveCount(0);
  });

  test('Messages app icon is present', async ({ page }) => {
    await goToHome(page);
    await expect(page.locator('.app-icon').filter({ hasText: 'Messages' })).toBeVisible();
  });

  test('Case File app icon is present', async ({ page }) => {
    await goToHome(page);
    await expect(page.locator('.app-icon').filter({ hasText: 'Case File' })).toBeVisible();
  });

  test('Gallery app icon is present', async ({ page }) => {
    await goToHome(page);
    await expect(page.locator('.app-icon').filter({ hasText: 'Gallery' })).toBeVisible();
  });

  test('notification container is in DOM', async ({ page }) => {
    await goToHome(page);
    await expect(page.locator('#notification-container')).toBeAttached();
  });
});

// ── App navigation ─────────────────────────────────────────

test.describe('App navigation', () => {
  test('tapping Messages opens messages app', async ({ page }) => {
    await goToHome(page);
    await page.locator('.app-icon').filter({ hasText: 'Messages' }).click();
    await expect(page.locator('#messages-app')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('tapping Notes opens notes app', async ({ page }) => {
    await goToHome(page);
    await page.locator('.app-icon').filter({ hasText: 'Notes' }).click();
    await expect(page.locator('#notes-app')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('tapping Gallery opens gallery app', async ({ page }) => {
    await goToHome(page);
    await page.locator('.app-icon').filter({ hasText: 'Gallery' }).click();
    await expect(page.locator('#gallery-app')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('tapping Case File opens case file screen', async ({ page }) => {
    await goToHome(page);
    await page.locator('.app-icon').filter({ hasText: 'Case File' }).click();
    await expect(page.locator('#case-file-app')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('back button in Messages returns to home', async ({ page }) => {
    await goToHome(page);
    await page.locator('.app-icon').filter({ hasText: 'Messages' }).click();
    await expect(page.locator('#messages-app')).toHaveClass(/active/);
    // Back button in app header
    await page.locator('#messages-app .app-header button').first().click();
    await expect(page.locator('#home-screen')).toHaveClass(/active/, { timeout: 3000 });
  });
});

// ── CSS rendering sanity checks ────────────────────────────
// These are the checks jsdom fundamentally cannot do.

test.describe('CSS rendering (catches jsdom-invisible bugs)', () => {
  test('newgame-modal is display:none on title screen load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#title-screen')).toHaveClass(/active/, { timeout: 6000 });
    const display = await page.locator('#newgame-modal').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('no invisible full-screen overlay blocking home screen', async ({ page }) => {
    await goToHome(page);
    // The element at center of screen should be interactive content, not a blocking overlay
    const hit = await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return {
        id: el.id,
        tag: el.tagName,
        pointerEvents: getComputedStyle(el).pointerEvents,
      };
    });
    // Not the newgame-modal (which was the invisible blocker before the bug fix)
    expect(hit.id).not.toBe('newgame-modal');
    // Should have interactive pointer-events
    expect(hit.pointerEvents).not.toBe('none');
  });

  test('CSS theme is applied — text is not black-on-black', async ({ page }) => {
    await goToHome(page);
    // Verify CSS variables resolved: --text-primary is white (#fff)
    // If CSS failed to load, getComputedStyle would give browser defaults (black text)
    const color = await page.locator('#home-screen').evaluate(
      el => getComputedStyle(el).color
    );
    // Theme sets --text-primary: #ffffff → rgb(255, 255, 255)
    // Browser default is rgb(0, 0, 0) — if that's what we see, CSS didn't load
    expect(color).not.toBe('rgb(0, 0, 0)');
  });

  test('notification container starts empty', async ({ page }) => {
    await goToHome(page);
    const count = await page.locator('#notification-container').evaluate(
      el => el.children.length
    );
    // On home-screen entry, no notifications should be showing (they have a 1s delay)
    // (we navigated via JS, skipping the normal act1 notification sequence)
    expect(count).toBe(0);
  });

  test('notification container is hidden on prelude screen [regression: fixed overlay]', async ({ page }) => {
    // Banners must not float over cinematic/story screens.
    // This test catches the bug where position:absolute made them visible everywhere.
    await page.goto('/');
    await page.waitForFunction(() => typeof window.showScreen === 'function');
    await page.evaluate(() => window.showScreen('prelude-screen'));
    await page.waitForSelector('#prelude-screen.active', { timeout: 3000 });
    const display = await page.locator('#notification-container').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('notification container is visible on home screen', async ({ page }) => {
    await goToHome(page);
    const display = await page.locator('#notification-container').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).not.toBe('none');
  });
});
