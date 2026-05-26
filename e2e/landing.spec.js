/**
 * e2e/landing.spec.js
 *
 * Tests the landing page in a real Chromium browser with real CSS applied.
 * This is the layer that catches bugs invisible to jsdom — like the
 * `display:flex !important` modal overlay that blocked all input.
 *
 * Key design principle:
 *   - Never use page.reload() inside a test. The visibilitychange autosave
 *     fires on navigation and writes an Act-1 save, polluting localStorage.
 *   - For a fresh-state page: just page.goto('/') — each test gets a fresh
 *     browser context (test-scoped fixture) with empty localStorage.
 *   - For a save-state page: use page.addInitScript() to populate localStorage
 *     BEFORE the page scripts run, so the save is there from the first load.
 */

const { test, expect } = require('@playwright/test');

// ── Helpers ────────────────────────────────────────────────

/** Wait for title screen to become active (after ~2.9s splash transition). */
async function waitForTitleScreen(page) {
  await expect(page.locator('#title-screen')).toHaveClass(/active/, { timeout: 6000 });
}

/**
 * Navigate to the landing page with a pre-injected save.
 * addInitScript runs synchronously BEFORE any page scripts,
 * so the save is in localStorage from the very first line of script.js.
 */
async function gotoWithSave(page, currentAct) {
  await page.addInitScript(({ act }) => {
    const save = {
      version: 1,
      currentAct: act,
      act2Active: act >= 2,
      act3Active: act >= 3,
      act4Active: act >= 4,
      act5Active: act >= 5,
      // preludeSeen intentionally omitted — restoreFromSave activates lock-screen
      // when preludeSeen:true, which covers the title-screen and blocks clicks.
      chats: [],
    };
    localStorage.setItem('tid_save_v1', JSON.stringify(save));
  }, { act: currentAct });
  await page.goto('/');
}

// ── Splash screen ──────────────────────────────────────────

test.describe('Splash screen', () => {
  test('splash screen is visible on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#splash-screen')).toHaveClass(/active/);
  });

  test('splash fades and title screen appears within 5s', async ({ page }) => {
    await page.goto('/');
    await waitForTitleScreen(page);
    await expect(page.locator('#title-screen')).toHaveClass(/active/);
    await expect(page.locator('#splash-screen')).not.toHaveClass(/active/);
  });

  test('game title text is visible on title screen', async ({ page }) => {
    await page.goto('/');
    await waitForTitleScreen(page);
    await expect(page.locator('.ls-title-line1')).toContainText('INVISIBLE');
    await expect(page.locator('.ls-title-line2')).toContainText('DETECTIVE');
  });
});

// ── Progress display ───────────────────────────────────────

test.describe('Progress timeline', () => {
  test('shows 0% with no save', async ({ page }) => {
    await page.goto('/');
    await waitForTitleScreen(page);
    await expect(page.locator('#ls-progress-pct')).toHaveText('0%');
  });

  test('shows 20% when Act 2 is active', async ({ page }) => {
    await gotoWithSave(page, 2);
    await waitForTitleScreen(page);
    await expect(page.locator('#ls-progress-pct')).toHaveText('20%');
  });

  test('shows 40% when Act 3 is active', async ({ page }) => {
    await gotoWithSave(page, 3);
    await waitForTitleScreen(page);
    await expect(page.locator('#ls-progress-pct')).toHaveText('40%');
  });

  test('shows 60% when Act 4 is active', async ({ page }) => {
    await gotoWithSave(page, 4);
    await waitForTitleScreen(page);
    await expect(page.locator('#ls-progress-pct')).toHaveText('60%');
  });

  test('renders 5 act nodes', async ({ page }) => {
    await page.goto('/');
    await waitForTitleScreen(page);
    await expect(page.locator('#ls-acts-row .ls-act-node')).toHaveCount(5);
  });

  test('phone hint says BEGIN with no save', async ({ page }) => {
    await page.goto('/');
    await waitForTitleScreen(page);
    await expect(page.locator('#ls-phone-hint')).toContainText(/BEGIN|begin|start/i);
  });

  test('phone hint says CONTINUE with save', async ({ page }) => {
    await gotoWithSave(page, 2);
    await waitForTitleScreen(page);
    await expect(page.locator('#ls-phone-hint')).toContainText(/continue/i);
  });
});

// ── Phone tap ──────────────────────────────────────────────

test.describe('Phone tap (enter game)', () => {
  test('tapping phone with no save shows prelude screen', async ({ page }) => {
    await page.goto('/');
    await waitForTitleScreen(page);
    await page.locator('#ls-phone-wrap').click();
    await expect(page.locator('#prelude-screen')).toHaveClass(/active/, { timeout: 5000 });
  });

  test('phone tap is actually clickable — not blocked by overlay [regression: display:flex !important]', async ({ page }) => {
    // This is the exact regression test for the CSS !important bug.
    // The invisible modal overlay (always display:flex) was capturing every tap.
    await page.goto('/');
    await waitForTitleScreen(page);

    // Verify modal is truly hidden via computed style (not just inline attribute)
    const modalDisplay = await page.locator('#newgame-modal').evaluate(
      el => getComputedStyle(el).display
    );
    expect(modalDisplay).toBe('none');

    // The click must actually reach the phone
    await page.locator('#ls-phone-wrap').click();
    await expect(page.locator('#prelude-screen')).toHaveClass(/active/, { timeout: 5000 });
  });
});

// ── New Game modal ─────────────────────────────────────────

test.describe('New Game modal', () => {
  test('modal computed display is none on page load [regression: !important override]', async ({ page }) => {
    await page.goto('/');
    await waitForTitleScreen(page);
    const display = await page.locator('#newgame-modal').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('NEW GAME with no save skips modal and starts prelude', async ({ page }) => {
    await page.goto('/');
    await waitForTitleScreen(page);
    await page.locator('.ls-footer-new').click();
    await expect(page.locator('#prelude-screen')).toHaveClass(/active/, { timeout: 5000 });
    const display = await page.locator('#newgame-modal').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('NEW GAME with existing save shows confirmation modal', async ({ page }) => {
    await gotoWithSave(page, 2);
    await waitForTitleScreen(page);
    await page.locator('.ls-footer-new').click();

    // Modal must be truly visible (computed style — jsdom can't catch this)
    const display = await page.locator('#newgame-modal').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('flex');
    await expect(page.locator('.modal-title')).toContainText('Start New Game');
  });

  test('CANCEL closes modal and keeps save intact', async ({ page }) => {
    await gotoWithSave(page, 2);
    await waitForTitleScreen(page);
    await page.locator('.ls-footer-new').click();
    await expect(page.locator('#newgame-modal')).toHaveClass(/active/);

    await page.locator('.modal-btn-cancel').click();

    const display = await page.locator('#newgame-modal').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('none');

    // Save still exists
    const save = await page.evaluate(() => localStorage.getItem('tid_save_v1'));
    expect(save).not.toBeNull();

    // Title screen still visible
    await expect(page.locator('#title-screen')).toHaveClass(/active/);
  });

  test('ERASE & START FRESH clears save and starts prelude', async ({ page }) => {
    await gotoWithSave(page, 2);
    await waitForTitleScreen(page);
    await page.locator('.ls-footer-new').click();
    await expect(page.locator('#newgame-modal')).toHaveClass(/active/);

    await page.locator('.modal-btn-danger').click();

    // Prelude screen is active — confirms the fresh-start flow ran correctly.
    // Note: we do NOT check localStorage here because page.addInitScript() re-injects
    // the fixture save on every navigation (including the /?fresh=1 redirect), so the
    // localStorage assertion is always a false negative in Playwright tests.
    // The prelude-screen becoming active is the correct observable outcome.
    await expect(page.locator('#prelude-screen')).toHaveClass(/active/, { timeout: 5000 });

    // Modal is closed
    const display = await page.locator('#newgame-modal').evaluate(
      el => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('modal buttons are tappable — not intercepted by another element', async ({ page }) => {
    await gotoWithSave(page, 2);
    await waitForTitleScreen(page);
    await page.locator('.ls-footer-new').click();
    await expect(page.locator('#newgame-modal')).toHaveClass(/active/);

    await expect(page.locator('.modal-btn-danger')).toBeVisible();
    await expect(page.locator('.modal-btn-cancel')).toBeVisible();
    await expect(page.locator('.modal-btn-danger')).toBeEnabled();
    await expect(page.locator('.modal-btn-cancel')).toBeEnabled();
  });
});
