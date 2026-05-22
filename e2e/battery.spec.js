/**
 * e2e/battery.spec.js
 *
 * Tests the real-time battery drain UI system.
 * Verifies that _updateBattery() correctly updates all status bar elements
 * and applies colour changes at the correct thresholds.
 */

const { test, expect } = require('@playwright/test');

async function goToHome(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showScreen === 'function');
  await page.evaluate(() => window.showScreen('home-screen'));
  await expect(page.locator('#home-screen')).toHaveClass(/active/, { timeout: 3000 });
}

test.describe('Battery UI — home screen status bar', () => {
  test('battery level bar width reflects percentage', async ({ page }) => {
    await goToHome(page);
    await page.evaluate(() => window._updateBattery(65));
    const width = await page.locator('#home-screen .battery-level').evaluate(
      el => el.style.width
    );
    expect(width).toBe('65%');
  });

  test('batt-pct text reflects percentage', async ({ page }) => {
    await goToHome(page);
    await page.evaluate(() => window._updateBattery(65));
    await expect(page.locator('#home-screen .batt-pct')).toHaveText('65%');
  });

  test('battery bar is red at 10%', async ({ page }) => {
    await goToHome(page);
    await page.evaluate(() => window._updateBattery(10));
    const bg = await page.locator('#home-screen .battery-level').evaluate(
      el => el.style.background
    );
    expect(bg).toBe('rgb(255, 69, 58)'); // #ff453a
  });

  test('battery bar is orange at 20%', async ({ page }) => {
    await goToHome(page);
    await page.evaluate(() => window._updateBattery(20));
    const bg = await page.locator('#home-screen .battery-level').evaluate(
      el => el.style.background
    );
    expect(bg).toBe('rgb(255, 149, 0)'); // #ff9500
  });

  test('battery bar has no colour override at 50%', async ({ page }) => {
    await goToHome(page);
    await page.evaluate(() => window._updateBattery(50));
    const bg = await page.locator('#home-screen .battery-level').evaluate(
      el => el.style.background
    );
    expect(bg).toBe(''); // no inline override — CSS default applies
  });

  test('battery percentage text is red at 10%', async ({ page }) => {
    await goToHome(page);
    await page.evaluate(() => window._updateBattery(10));
    const color = await page.locator('#home-screen .batt-pct').evaluate(
      el => el.style.color
    );
    expect(color).toBe('rgb(255, 69, 58)');
  });

  test('battery clamps at 0 — never goes negative', async ({ page }) => {
    await goToHome(page);
    await page.evaluate(() => window._updateBattery(-50));
    await expect(page.locator('#home-screen .batt-pct')).toHaveText('0%');
  });

  test('battery clamps at 100 — never exceeds full', async ({ page }) => {
    await goToHome(page);
    await page.evaluate(() => window._updateBattery(150));
    await expect(page.locator('#home-screen .batt-pct')).toHaveText('100%');
  });
});

test.describe('Battery UI — lock screen status bar', () => {
  test('lock screen battery updates with _updateBattery()', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.showScreen === 'function');
    await page.evaluate(() => window.showScreen('lock-screen'));
    await expect(page.locator('#lock-screen')).toHaveClass(/active/);
    await page.evaluate(() => window._updateBattery(42));
    await expect(page.locator('#lock-screen .batt-pct')).toHaveText('42%');
  });
});
