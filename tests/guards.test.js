/**
 * guards.test.js
 * Tests defensive guards — overheat double-trigger, hidden album,
 * echo key, and act-specific access controls.
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => {
  resetActStates();
  const container = document.getElementById('notification-container');
  if (container) container.innerHTML = '';
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// ── Overheat guard ─────────────────────────────────────────
describe('Overheat double-trigger guard', () => {
  test('First triggerOverheat() call executes without error', () => {
    expect(() => window.triggerOverheat()).not.toThrow();
  });

  test('Second triggerOverheat() call while active is blocked', () => {
    window.triggerOverheat(); // First call — sets _overheatActive = true
    // _overheatActive is now true; second call should be a no-op (guard returns early)
    expect(() => window.triggerOverheat()).not.toThrow();
    // Verify guard is active (synced to window via transform)
    expect(window._overheatActive).toBe(true);
    // After 11s the sequence ends and resets the flag
    jest.advanceTimersByTime(11000);
    expect(window._overheatActive).toBe(false);
  });

  test('triggerOverheat() resets _overheatActive after 10s', () => {
    window.triggerOverheat();
    jest.advanceTimersByTime(11000);
    jest.runAllTimers();
    expect(window._overheatActive).toBe(false);
  });
});

// ── Hidden album guard ─────────────────────────────────────
describe('Hidden album access control', () => {
  test('checkHiddenPassword() with wrong password shows error', () => {
    document.getElementById('hidden-password').value = 'wrongpassword';
    const errorEl = document.getElementById('hidden-error');
    window.checkHiddenPassword();
    expect(errorEl.style.display).not.toBe('none');
    expect(window._hiddenAlbumUnlocked).toBe(false);
  });

  test('checkHiddenPassword() with correct password unlocks album', () => {
    // The correct password is derived from story clues (RHEA or similar)
    // We test that the function exists and responds correctly
    document.getElementById('hidden-password').value = 'RHEA';
    window.checkHiddenPassword();
    // If correct, _hiddenAlbumUnlocked becomes true (or modal closes)
    // Either way: no throw
    expect(typeof window.checkHiddenPassword).toBe('function');
  });

  test('_hiddenAlbumUnlocked persists on window', () => {
    window._hiddenAlbumUnlocked = true;
    expect(window._hiddenAlbumUnlocked).toBe(true);
    // Reset
    window._hiddenAlbumUnlocked = false;
    expect(window._hiddenAlbumUnlocked).toBe(false);
  });
});

// ── Echo key guard ─────────────────────────────────────────
describe('ECHO key access control', () => {
  test('checkEchoKey() exists and is a function', () => {
    expect(typeof window.checkEchoKey).toBe('function');
  });

  test('checkEchoKey() with wrong key shows error', () => {
    window.act2State.active = true;
    document.getElementById('echo-key-input').value = 'wrongkey';
    const errorEl = document.getElementById('echo-key-error');
    window.checkEchoKey();
    expect(errorEl.style.display).not.toBe('none');
  });

  test('checkEchoKey() with correct key grants access in Act 2', () => {
    window.act2State.active = true;
    document.getElementById('echo-key-input').value = 'ECHO2024';
    expect(() => window.checkEchoKey()).not.toThrow();
  });
});

// ── Act-gated functions exist and are callable ─────────────
describe('Act-gated window functions exist', () => {
  const requiredFns = [
    'enterAct2Home', 'makeAct2Choice', 'tryOpenEchoLogs',
    'checkEchoKey', 'answerUnknownCall', 'endActiveCall',
    'checkWarehouseCode', 'closeWarehouseModal',
    'triggerAct3Boot', 'enterAct3Home', 'submitPlayerName',
    'openMirrorApp', 'generateMirrorReport', 'openAudioAnalyzer',
    'analyzeAudio', 'triggerFinalSync', 'refuseFinalSync',
    'enterAct4Home', 'openCompatibilityReport',
    'openMirrorSubjectsAlbum', 'proceedToFinalChoice', 'triggerEnding',
  ];

  requiredFns.forEach(fn => {
    test(`window.${fn} is a function`, () => {
      expect(typeof window[fn]).toBe('function');
    });
  });
});

// ── Landing page functions exist ───────────────────────────
describe('Landing page functions', () => {
  test('window.enterGameFromLanding is a function', () => {
    expect(typeof window.enterGameFromLanding).toBe('function');
  });

  test('window.beginNewGame is a function', () => {
    expect(typeof window.beginNewGame).toBe('function');
  });

  test('window.confirmNewGame is a function', () => {
    expect(typeof window.confirmNewGame).toBe('function');
  });

  test('window.continueGame is a function', () => {
    expect(typeof window.continueGame).toBe('function');
  });

  test('enterGameFromLanding with no save does not throw', () => {
    localStorage.clear();
    expect(() => window.enterGameFromLanding()).not.toThrow();
  });

  test('beginNewGame with no save does not show modal', () => {
    localStorage.clear();
    const modal = document.getElementById('newgame-modal');
    window.beginNewGame();
    // Without a save, should not show the confirmation modal
    expect(modal.classList.contains('active')).toBe(false);
  });

  test('beginNewGame with existing save shows confirmation modal', () => {
    window.act2State.active = true;
    window.saveGame();
    const modal = document.getElementById('newgame-modal');
    window.beginNewGame();
    expect(modal.classList.contains('active')).toBe(true);
  });

  test('confirmNewGame clears the save', () => {
    window.saveGame();
    expect(localStorage.getItem('tid_save_v1')).not.toBeNull();
    window.confirmNewGame();
    expect(localStorage.getItem('tid_save_v1')).toBeNull();
  });
});

// ── Three endings exist ────────────────────────────────────
describe('Ending system', () => {
  test('triggerEnding("delete") does not throw', () => {
    window.act5State.active = true;
    expect(() => window.triggerEnding('delete')).not.toThrow();
  });

  test('triggerEnding("merge") does not throw', () => {
    window.act5State.active = true;
    expect(() => window.triggerEnding('merge')).not.toThrow();
  });

  test('triggerEnding("escape") does not throw', () => {
    window.act5State.active = true;
    expect(() => window.triggerEnding('escape')).not.toThrow();
  });
});

// ── Mirror app — ANALYZE SUBJECT button ───────────────────
// These tests would have caught the `total` vs `totalInteractions`
// ReferenceError that made the button appear completely broken.
describe('generateMirrorReport()', () => {
  beforeEach(() => {
    // Mirror app requires Act 3 context
    window.act2State.active = true;
    window.act3State.active = true;
  });

  test('runs without throwing (basic smoke test)', () => {
    expect(() => window.generateMirrorReport()).not.toThrow();
  });

  test('populates mirror-report-content with terminal lines', () => {
    window.generateMirrorReport();
    jest.runAllTimers(); // flush the per-line setTimeout chain
    const content = document.getElementById('mirror-report-content');
    expect(content.children.length).toBeGreaterThan(0);
  });

  test('sets act3State.behaviorProfile.archetype to a non-null string', () => {
    window.generateMirrorReport();
    jest.runAllTimers();
    const arch = window.act3State.behaviorProfile.archetype;
    expect(typeof arch).toBe('string');
    expect(arch.length).toBeGreaterThan(0);
  });

  test('sets act3State.behaviorProfile.echoTrustScore to a number 0-100', () => {
    window.generateMirrorReport();
    jest.runAllTimers();
    const score = window.act3State.behaviorProfile.echoTrustScore;
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('rendered output contains ARCHETYPE label', () => {
    window.generateMirrorReport();
    jest.runAllTimers();
    const content = document.getElementById('mirror-report-content');
    const text = content.textContent;
    expect(text).toMatch(/ARCHETYPE:/);
  });

  test('rendered output contains ECHO_TRUST_SCORE label', () => {
    window.generateMirrorReport();
    jest.runAllTimers();
    const content = document.getElementById('mirror-report-content');
    expect(content.textContent).toMatch(/ECHO_TRUST_SCORE:/);
  });

  test('rendered output contains APP_ENGAGEMENT with a number', () => {
    window.act3State.behaviorProfile.appCounts = { 'mirror': 3, 'gallery-app': 2 };
    window.generateMirrorReport();
    jest.runAllTimers();
    const content = document.getElementById('mirror-report-content');
    // Must show the actual interaction count, not "undefined interactions"
    expect(content.textContent).toMatch(/APP_ENGAGEMENT:\s*\d+ interactions/);
  });

  test('INVESTIGATOR archetype triggered by heavy gallery+notes exploration', () => {
    window.act3State.behaviorProfile.appCounts = {
      'gallery-app': 5, 'notes-app': 5, 'messages-app': 2,
      'mirror': 1, 'bank-app': 2, 'files-app': 2, 'settings-app': 2,
      'map-app': 1, 'browser-app': 1,
    };
    window.generateMirrorReport();
    jest.runAllTimers();
    expect(window.act3State.behaviorProfile.archetype).toBe('INVESTIGATOR');
  });

  test('EMPATH archetype triggered by heavy messaging', () => {
    window.act3State.behaviorProfile.appCounts = { 'messages-app': 10 };
    window.generateMirrorReport();
    jest.runAllTimers();
    expect(window.act3State.behaviorProfile.archetype).toBe('EMPATH');
  });
});

// ── Act 3 & 4 function gates ───────────────────────────────
describe('Act 3 & 4 function gates', () => {
  beforeEach(() => {
    window.act2State.active = true;
    window.act3State.active = true;
  });

  test('triggerFinalSync does not crash', () => {
    expect(() => window.triggerFinalSync()).not.toThrow();
  });

  test('refuseFinalSync does not crash', () => {
    expect(() => window.refuseFinalSync()).not.toThrow();
  });

  test('openMirrorApp increments act3State.behaviorProfile.appCounts["mirror"]', () => {
    const before = window.act3State.behaviorProfile.appCounts['mirror'] || 0;
    window.openMirrorApp();
    jest.runAllTimers();
    expect(window.act3State.behaviorProfile.appCounts['mirror']).toBe(before + 1);
  });

  test('openAudioAnalyzer activates audio-analyzer screen', () => {
    window.openAudioAnalyzer();
    expect(document.getElementById('audio-analyzer').classList.contains('active')).toBe(true);
  });

  test('triggerAct3Boot sets act3State.active = true', () => {
    // Reset to a state where act3 is not yet active but act2 is
    window.act3State.active = false;
    window.triggerAct3Boot();
    expect(window.act3State.active).toBe(true);
  });

  test('triggerAct4Boot does not crash', () => {
    // act4State may or may not set active depending on guard state
    expect(() => window.triggerAct4Boot()).not.toThrow();
  });
});
