/**
 * e2e/act3-mirror.spec.js
 *
 * End-to-end tests for Act 3's MIRROR app: loading from an Act 3 save,
 * entering the Act 3 home screen, opening MIRROR, and verifying the
 * behavioral analysis report renders correctly.
 */

const { test, expect } = require('@playwright/test');

// ── ACT 3 save fixture ─────────────────────────────────────
const ACT3_SAVE = JSON.stringify({
  version: 1, timestamp: Date.now(),
  currentAct: 3, act2Active: true, act3Active: true,
  preludeSeen: true, playerName: 'Investigator',
  echoTrustScore: 45, archetype: null,
  rheaUnlocked: true, echoLogsRead: true,
  act2ChoiceMade: true, contactRenamed: false,
  watcherMsgCount: 2, warehouseSolved: true,
  airplaneActive: false,
  hiddenUnlocked: false, zipOpened: true,
  settingsUpdated: true,
  chats: [], extraNoteCount: 0,
  cameraGallery: [], galleryMutations: 0,
  finalSyncUnlocked: false, echoConversationStarted: false,
  aaravReconstructUnlocked: false, loopIncidentTriggered: false,
  rhea_glitching: false, act3SyncPath: null,
  act4Active: false, act4SyncPath: null, act4HomeEntered: false,
  act4ReportRead: false, act4KabirFinalSent: false,
  act4EchoMaskDropped: false, act4FinalChoiceReached: false,
  act5Active: false, act5ImpossibleCallDone: false,
  act5PlayerPhotoDone: false, act5ChatGlitchDone: false,
  act5EchoEmotionalDone: false, act5ServerNarrativeDone: false,
  act5FinalChoiceShown: false,
});

/** Load the game with the Act 3 save pre-injected into localStorage. */
async function loadWithAct3Save(page) {
  await page.addInitScript(saveData => {
    localStorage.setItem('tid_save_v1', saveData);
  }, ACT3_SAVE);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showScreen === 'function');
}

// ── Loading & routing ──────────────────────────────────────

test.describe('Act 3 save — loading and routing', () => {
  test('prelude-screen NOT shown after loading Act 3 save and tapping phone', async ({ page }) => {
    await loadWithAct3Save(page);
    // Wait for title screen or act2-lock to appear (save restores to act2-lock since currentAct >= 2)
    await page.waitForFunction(
      () => document.getElementById('act2-lock')?.classList.contains('active') ||
            document.getElementById('title-screen')?.classList.contains('active'),
      { timeout: 8000 }
    );
    const preludeActive = await page.evaluate(
      () => document.getElementById('prelude-screen')?.classList.contains('active') ?? false
    );
    expect(preludeActive).toBe(false);
  });

  test('act2-lock or act3 screen shown after loading Act 3 save (not prelude)', async ({ page }) => {
    await loadWithAct3Save(page);
    // Navigate to the right screen via continueGame (simulates phone tap)
    await page.waitForFunction(() => typeof window.continueGame === 'function');
    await page.evaluate(() => window.continueGame());
    // currentAct >= 2 → continueGame routes to act2-lock
    await expect(page.locator('#act2-lock')).toHaveClass(/active/, { timeout: 5000 });
  });
});

// ── enterAct3Home ──────────────────────────────────────────

test.describe('Act 3 home screen', () => {
  test('enterAct3Home called via page.evaluate → home-screen active', async ({ page }) => {
    await loadWithAct3Save(page);
    await page.waitForFunction(() => typeof window.enterAct3Home === 'function');
    await page.evaluate(() => {
      // Set up required state before calling enterAct3Home
      window.act2State.active = true;
      window.act3State.active = true;
      window.enterAct3Home();
    });
    await expect(page.locator('#home-screen')).toHaveClass(/active/, { timeout: 5000 });
  });

  test('Mirror icon visible in DOM after enterAct3Home', async ({ page }) => {
    await loadWithAct3Save(page);
    await page.waitForFunction(() => typeof window.enterAct3Home === 'function');
    await page.evaluate(() => {
      window.act2State.active = true;
      window.act3State.active = true;
      window.enterAct3Home();
    });
    await expect(page.locator('#mirror-app-icon')).toBeAttached({ timeout: 5000 });
  });
});

// ── MIRROR app ─────────────────────────────────────────────

test.describe('Mirror app — open and report', () => {
  async function goToMirrorApp(page) {
    await loadWithAct3Save(page);
    await page.waitForFunction(() => typeof window.openMirrorApp === 'function');
    await page.evaluate(() => {
      window.act2State.active = true;
      window.act3State.active = true;
      window.act3State.playerName = 'Investigator';
      window.act3State.behaviorProfile.appCounts = {
        'gallery-app': 3, 'notes-app': 3, 'messages-app': 4,
        'mirror': 0, 'bank-app': 1, 'files-app': 1,
      };
      window.openMirrorApp();
    });
  }

  test('openMirrorApp() via page.evaluate → mirror-app screen active', async ({ page }) => {
    await goToMirrorApp(page);
    await expect(page.locator('#mirror-app')).toHaveClass(/active/, { timeout: 5000 });
  });

  test('ANALYZE SUBJECT button visible in mirror-app screen', async ({ page }) => {
    await goToMirrorApp(page);
    // The button text is "ANALYZE SUBJECT" — search broadly
    const btn = page.locator('#mirror-app').getByText(/ANALYZE/i);
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('Click ANALYZE → after 3000ms → mirror-report-content non-empty', async ({ page }) => {
    await goToMirrorApp(page);
    // Click the ANALYZE SUBJECT button
    await page.locator('#mirror-app').getByText(/ANALYZE/i).click();
    // Wait for the per-line setTimeout chain to populate the report (allow 3s)
    await page.waitForFunction(
      () => (document.getElementById('mirror-report-content')?.children.length ?? 0) > 0,
      { timeout: 6000 }
    );
    const childCount = await page.evaluate(
      () => document.getElementById('mirror-report-content')?.children.length ?? 0
    );
    expect(childCount).toBeGreaterThan(0);
  });

  test('mirror-report-content contains "ARCHETYPE:"', async ({ page }) => {
    await goToMirrorApp(page);
    // Trigger generateMirrorReport and flush all timers via JS
    await page.evaluate(() => {
      window.generateMirrorReport();
    });
    await page.waitForFunction(
      () => document.getElementById('mirror-report-content')?.textContent?.includes('ARCHETYPE:'),
      { timeout: 6000 }
    );
    const text = await page.evaluate(
      () => document.getElementById('mirror-report-content')?.textContent ?? ''
    );
    expect(text).toMatch(/ARCHETYPE:/);
  });

  test('mirror-report-content contains "ECHO_TRUST_SCORE:"', async ({ page }) => {
    await goToMirrorApp(page);
    await page.evaluate(() => {
      window.generateMirrorReport();
    });
    await page.waitForFunction(
      () => document.getElementById('mirror-report-content')?.textContent?.includes('ECHO_TRUST_SCORE:'),
      { timeout: 6000 }
    );
    const text = await page.evaluate(
      () => document.getElementById('mirror-report-content')?.textContent ?? ''
    );
    expect(text).toMatch(/ECHO_TRUST_SCORE:/);
  });
});
