/**
 * e2e/passcode.spec.js
 *
 * Tests the in-game passcode screen in a real browser.
 * Jumps directly to the passcode screen via JS (skips splash/prelude animations).
 *
 * HTML structure: buttons use class "key" with inline onclick="handleKeypad(...)"
 * No data-key attributes — select by text content or id.
 */

const { test, expect } = require('@playwright/test');

/** Navigate to passcode screen by calling showScreen() directly via JS. */
async function goToPasscode(page) {
  await page.goto('/');
  // showScreen is a top-level function declaration — it's a real window global in the browser
  await page.waitForFunction(() => typeof window.showScreen === 'function');
  await page.evaluate(() => window.showScreen('passcode-screen'));
  await expect(page.locator('#passcode-screen')).toHaveClass(/active/, { timeout: 3000 });
}

/** Click a keypad digit by its text content. */
async function tapKey(page, key) {
  if (key === 'cancel') {
    await page.locator('#key-cancel').click();
  } else if (key === 'del') {
    await page.locator('#key-delete').click();
  } else {
    // Digits 0–9: find the button whose text is exactly that digit
    await page.locator(`button.key:text-is("${key}")`).click();
  }
}

// ── Passcode screen ────────────────────────────────────────

test.describe('Passcode screen', () => {
  test('correct passcode 1107 opens home screen', async ({ page }) => {
    await goToPasscode(page);
    for (const digit of ['1', '1', '0', '7']) {
      await tapKey(page, digit);
    }
    await expect(page.locator('#home-screen')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('wrong passcode shows error state on dots', async ({ page }) => {
    await goToPasscode(page);
    for (const digit of ['9', '9', '9', '9']) {
      await tapKey(page, digit);
    }
    // At least one dot should have the error class
    await expect(page.locator('#main-passcode-dots .dot.error').first()).toBeAttached({ timeout: 2000 });
    // Home screen should NOT be open
    await expect(page.locator('#home-screen')).not.toHaveClass(/active/);
  });

  test('cancel key clears all filled dots', async ({ page }) => {
    await goToPasscode(page);
    await tapKey(page, '1');
    await tapKey(page, '1');
    // Two dots should be filled
    await expect(page.locator('#main-passcode-dots .dot.filled')).toHaveCount(2);
    await tapKey(page, 'cancel');
    await expect(page.locator('#main-passcode-dots .dot.filled')).toHaveCount(0);
  });

  test('del key removes last digit', async ({ page }) => {
    await goToPasscode(page);
    await tapKey(page, '1');
    await tapKey(page, '1');
    await tapKey(page, 'del');
    await expect(page.locator('#main-passcode-dots .dot.filled')).toHaveCount(1);
  });

  test('passcode screen is visible and interactable', async ({ page }) => {
    await goToPasscode(page);
    await expect(page.locator('#passcode-screen')).toHaveClass(/active/);
    await expect(page.locator('.keypad')).toBeVisible();
    await expect(page.locator('#main-passcode-dots')).toBeVisible();
  });
});
