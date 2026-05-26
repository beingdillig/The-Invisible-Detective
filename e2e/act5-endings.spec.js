/**
 * e2e/act5-endings.spec.js
 *
 * End-to-end tests for Act 5's final choice screen and three endings.
 * Verifies proceedToFinalChoice() populates the screen with the player
 * name and trust score, and that all three ending branches execute
 * without throwing JavaScript errors.
 */

const { test, expect } = require('@playwright/test');

// ── ACT 5 save fixture ─────────────────────────────────────
const ACT5_SAVE = JSON.stringify({
  version: 1, timestamp: Date.now(),
  currentAct: 5,
  act2Active: true, act3Active: true, act4Active: true, act5Active: true,
  preludeSeen: true, playerName: 'Investigator',
  echoTrustScore: 65, archetype: 'INVESTIGATOR',
  rheaUnlocked: true, echoLogsRead: true,
  act2ChoiceMade: true, contactRenamed: false,
  watcherMsgCount: 4, warehouseSolved: true,
  airplaneActive: false,
  hiddenUnlocked: false, zipOpened: true,
  settingsUpdated: true,
  chats: [], extraNoteCount: 0,
  cameraGallery: [], galleryMutations: 0,
  finalSyncUnlocked: true, echoConversationStarted: true,
  aaravReconstructUnlocked: true, loopIncidentTriggered: true,
  rhea_glitching: true, act3SyncPath: null,
  act4Active: true, act4SyncPath: 'merge', act4HomeEntered: true,
  act4ReportRead: true, act4KabirFinalSent: false,
  act4EchoMaskDropped: false, act4FinalChoiceReached: true,
  act4ChoiceMade: false, act4PlayerName: 'Investigator',
  act4Phase: 3, act4EndingPath: null, act4MemoryBleed: 0,
  act4SubjectsViewed: {},
  act5ImpossibleCallDone: true, act5PlayerPhotoDone: true,
  act5ChatGlitchDone: true, act5EchoEmotionalDone: true,
  act5ServerNarrativeDone: true, act5FinalChoiceShown: false,
});

/** Load the game with the Act 5 save pre-injected into localStorage. */
async function loadWithAct5Save(page) {
  await page.addInitScript(saveData => {
    localStorage.setItem('tid_save_v1', saveData);
  }, ACT5_SAVE);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.proceedToFinalChoice === 'function');
}

/** Set up Act 5 state via JS and call proceedToFinalChoice. */
async function goToFinalChoice(page) {
  await loadWithAct5Save(page);
  await page.evaluate(() => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.act3State.playerName = 'Investigator';
    window.act3State.behaviorProfile.echoTrustScore = 65;
    window.act3State.behaviorProfile.archetype = 'INVESTIGATOR';
    window.act4State.active = true;
    window.act5State.active = true;
    window.proceedToFinalChoice();
  });
}

// ── Final choice screen ────────────────────────────────────

test.describe('Act 5 final choice screen', () => {
  test('proceedToFinalChoice() → act4-final-choice screen active', async ({ page }) => {
    await goToFinalChoice(page);
    await expect(page.locator('#act4-final-choice')).toHaveClass(/active/, { timeout: 5000 });
  });

  test('act4-choice-text contains player name "Investigator"', async ({ page }) => {
    await goToFinalChoice(page);
    await expect(page.locator('#act4-choice-text')).toContainText('Investigator', { timeout: 5000 });
  });

  test('act4-choice-text contains trust score "65/100"', async ({ page }) => {
    await goToFinalChoice(page);
    await expect(page.locator('#act4-choice-text')).toContainText('65/100', { timeout: 5000 });
  });
});

// ── Endings — no JS errors ─────────────────────────────────

test.describe('Act 5 endings — no JavaScript errors', () => {
  async function runEndingTest(page, endingType) {
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await loadWithAct5Save(page);
    await page.evaluate(() => {
      window.act2State.active = true;
      window.act3State.active = true;
      window.act3State.playerName = 'Investigator';
      window.act3State.behaviorProfile.echoTrustScore = 65;
      window.act3State.behaviorProfile.archetype = 'INVESTIGATOR';
      window.act4State.active = true;
      window.act5State.active = true;
    });

    const result = await page.evaluate(type => {
      try {
        window.triggerEnding(type);
        return { threw: false };
      } catch (e) {
        return { threw: true, message: e.message };
      }
    }, endingType);

    expect(result.threw).toBe(false);
    // Give timers a moment to run, then check for page-level errors
    await page.waitForTimeout(500);
    expect(jsErrors).toHaveLength(0);
  }

  test('triggerEnding("delete") does not throw JS errors', async ({ page }) => {
    await runEndingTest(page, 'delete');
  });

  test('triggerEnding("merge") does not throw JS errors', async ({ page }) => {
    await runEndingTest(page, 'merge');
  });

  test('triggerEnding("escape") does not throw JS errors', async ({ page }) => {
    await runEndingTest(page, 'escape');
  });
});
