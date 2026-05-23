/**
 * e2e/apps.spec.js
 *
 * Content and interaction tests for the main in-game apps:
 * Messages, Gallery, Notes, Case File, Settings.
 * Gets into the game via showScreen() to skip splash/prelude/passcode.
 */

const { test, expect } = require('@playwright/test');

async function goToHome(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showScreen === 'function');
  await page.evaluate(() => window.showScreen('home-screen'));
  await expect(page.locator('#home-screen')).toHaveClass(/active/, { timeout: 3000 });
}

async function openApp(page, appId) {
  await page.evaluate(id => window.showScreen(id), appId);
  await expect(page.locator(`#${appId}`)).toHaveClass(/active/, { timeout: 3000 });
}

// ── Messages ──────────────────────────────────────────────────────────────────

test.describe('Messages app', () => {
  test('chat list renders at least 2 contacts', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'messages-app');
    // Chat items are rendered as .nx-list-item inside #chat-list
    await expect(page.locator('#chat-list .nx-list-item')).not.toHaveCount(0);
    const count = await page.locator('#chat-list .nx-list-item').count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('UNKNOWN contact is in the chat list', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'messages-app');
    await expect(page.locator('#chat-list .nx-list-item').filter({ hasText: 'UNKNOWN' })).toBeVisible();
  });

  test('Mom contact is in the chat list', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'messages-app');
    await expect(page.locator('#chat-list .nx-list-item').filter({ hasText: 'Mom' })).toBeVisible();
  });

  test('tapping a chat opens the conversation view', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'messages-app');
    await page.locator('#chat-list .nx-list-item').first().click();
    await expect(page.locator('#chat-view')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('chat view shows at least one message bubble', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'messages-app');
    await page.locator('#chat-list .nx-list-item').first().click();
    await expect(page.locator('#chat-view')).toHaveClass(/active/);
    await expect(page.locator('.message')).not.toHaveCount(0);
  });

  test('back button in chat view returns to message list', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'messages-app');
    await page.locator('#chat-list .nx-list-item').first().click();
    await expect(page.locator('#chat-view')).toHaveClass(/active/);
    await page.locator('#chat-view .back-btn').click();
    await expect(page.locator('#messages-app')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('chat input field is present and focusable', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'messages-app');
    await page.locator('#chat-list .nx-list-item').first().click();
    await expect(page.locator('#chat-input-field')).toBeVisible();
  });
});

// ── Gallery ───────────────────────────────────────────────────────────────────

test.describe('Gallery app', () => {
  test('gallery renders at least one album', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'gallery-app');
    await expect(page.locator('.album-card')).not.toHaveCount(0);
  });

  test('Camera Roll album is present', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'gallery-app');
    // Album text lives in .album-title sibling; the parent is .album-card
    await expect(page.locator('.album-card').filter({ hasText: 'Camera Roll' })).toBeVisible();
  });

  test('tapping an album opens album view', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'gallery-app');
    // Click the album-card (has the onclick handler)
    await page.locator('.album-card').first().click();
    await expect(page.locator('#album-view')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('album view shows at least one photo', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'gallery-app');
    await page.locator('.album-thumb').first().click();
    await expect(page.locator('#album-view')).toHaveClass(/active/);
    // Photos render as .gallery-item divs inside #gallery-grid
    await expect(page.locator('#gallery-grid .gallery-item')).not.toHaveCount(0);
  });
});

// ── Notes ─────────────────────────────────────────────────────────────────────

test.describe('Notes app', () => {
  test('notes list renders at least one note', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'notes-app');
    // Notes render as .note-card inside #notes-list
    await expect(page.locator('#notes-list .note-card')).not.toHaveCount(0);
  });

  test('tapping a note opens note view', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'notes-app');
    await page.locator('#notes-list .note-card').first().click();
    await expect(page.locator('#note-view')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('note view shows title and body', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'notes-app');
    await page.locator('#notes-list .note-card').first().click();
    await expect(page.locator('#note-title')).not.toBeEmpty();
    await expect(page.locator('#note-body')).not.toBeEmpty();
  });

  test('back button in note view returns to notes list', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'notes-app');
    await page.locator('#notes-list .note-card').first().click();
    await page.locator('#note-view .back-btn').click();
    await expect(page.locator('#notes-app')).toHaveClass(/active/, { timeout: 3000 });
  });
});

// ── Case File ─────────────────────────────────────────────────────────────────

test.describe('Case File app', () => {
  test('case file shows the subject name — Aarav Mehta', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'case-file-app');
    await expect(page.locator('#case-file-app')).toContainText('Aarav Mehta');
  });

  test('case file shows case number', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'case-file-app');
    await expect(page.locator('#case-file-app')).toContainText('INV-2024-001');
  });

  test('persons of interest section lists Kabir', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'case-file-app');
    await expect(page.locator('#case-file-app')).toContainText('Kabir');
  });

  test('persons of interest section lists Dr. Rhea Kapoor', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'case-file-app');
    await expect(page.locator('#case-file-app')).toContainText('Dr. Rhea Kapoor');
  });

  test('threat section mentions ECHO', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'case-file-app');
    await expect(page.locator('#case-file-app')).toContainText('ECHO');
  });

  test('case file has ACTIVE status badge', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'case-file-app');
    await expect(page.locator('#case-file-app')).toContainText('ACTIVE');
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

test.describe('Settings app', () => {
  test('settings list renders items', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'settings-app');
    // Settings render as .settings-row inside .settings-group
    await expect(page.locator('.settings-group .settings-row')).not.toHaveCount(0);
    const count = await page.locator('.settings-group .settings-row').count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('tapping a settings item opens detail view', async ({ page }) => {
    await goToHome(page);
    await openApp(page, 'settings-app');
    // Click a row that is NOT a toggle (toggles don't open detail)
    await page.locator('.settings-group .settings-row').filter({ hasText: 'Wi-Fi' }).click();
    await expect(page.locator('#settings-detail')).toHaveClass(/active/, { timeout: 3000 });
  });
});
