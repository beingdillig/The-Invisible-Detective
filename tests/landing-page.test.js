/**
 * landing-page.test.js
 * Tests the landing page flow, progress population, and begin/continue logic.
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => {
  resetActStates();
  localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// ── lsGetProgress ──────────────────────────────────────────
describe('lsGetProgress()', () => {
  test('is exposed on window', () => {
    expect(typeof window.lsGetProgress).toBe('function');
  });

  test('returns hasSave=false when no localStorage entry', () => {
    const r = window.lsGetProgress();
    expect(r.hasSave).toBe(false);
  });

  test('returns currentAct=1 when no save', () => {
    const r = window.lsGetProgress();
    expect(r.currentAct).toBe(1);
  });

  test('returns completedActs=0 when no save', () => {
    const r = window.lsGetProgress();
    expect(r.completedActs).toBe(0);
  });

  test('returns hasSave=true when save exists', () => {
    window.act2State.active = true;
    window.saveGame();
    const r = window.lsGetProgress();
    expect(r.hasSave).toBe(true);
  });

  test('returns correct currentAct=2 from save', () => {
    window.act2State.active = true;
    window.saveGame();
    const r = window.lsGetProgress();
    expect(r.currentAct).toBe(2);
  });

  test('returns correct currentAct=3 from save', () => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.saveGame();
    const r = window.lsGetProgress();
    expect(r.currentAct).toBe(3);
  });

  test('completedActs = currentAct - 1', () => {
    window.act2State.active = true;
    window.saveGame();
    const r = window.lsGetProgress();
    expect(r.completedActs).toBe(r.currentAct - 1);
  });

  test('handles corrupted localStorage without throwing', () => {
    localStorage.setItem('tid_save_v1', '{{BAD JSON}}');
    expect(() => window.lsGetProgress()).not.toThrow();
    const r = window.lsGetProgress();
    expect(r.hasSave).toBe(false);
  });
});

// ── lsPopulateLanding ──────────────────────────────────────
describe('lsPopulateLanding()', () => {
  test('exists as a function', () => {
    expect(typeof window.lsPopulateLanding).toBe('function');
  });

  test('sets progress pct to 0% with no save', () => {
    localStorage.clear();
    window.lsPopulateLanding();
    // Use advanceTimersByTime not runAllTimers — avoids infinite setInterval loop
    jest.advanceTimersByTime(500);
    const pct = document.getElementById('ls-progress-pct');
    expect(pct.textContent).toBe('0%');
  });

  test('sets progress pct to 20% when act2 active', () => {
    window.act2State.active = true;
    window.saveGame();
    window.lsPopulateLanding();
    jest.advanceTimersByTime(500);
    const pct = document.getElementById('ls-progress-pct');
    expect(pct.textContent).toBe('20%');
  });

  test('sets progress pct to 40% when act3 active', () => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.saveGame();
    window.lsPopulateLanding();
    jest.advanceTimersByTime(500);
    const pct = document.getElementById('ls-progress-pct');
    expect(pct.textContent).toBe('40%');
  });

  test('creates 5 act nodes in ls-acts-row', () => {
    window.lsPopulateLanding();
    jest.advanceTimersByTime(500);
    const row = document.getElementById('ls-acts-row');
    expect(row.children.length).toBe(5);
  });

  test('phone hint says "BEGIN" for no-save state', () => {
    localStorage.clear();
    window.lsPopulateLanding();
    jest.advanceTimersByTime(100);
    const hint = document.getElementById('ls-phone-hint');
    expect(hint.textContent.toLowerCase()).toMatch(/begin|start/i);
  });

  test('phone hint says "continue" when save exists', () => {
    window.act2State.active = true;
    window.saveGame();
    window.lsPopulateLanding();
    jest.advanceTimersByTime(100);
    const hint = document.getElementById('ls-phone-hint');
    expect(hint.textContent.toLowerCase()).toMatch(/continue/i);
  });
});

// ── enterGameFromLanding ───────────────────────────────────
describe('enterGameFromLanding()', () => {
  test('function exists', () => {
    expect(typeof window.enterGameFromLanding).toBe('function');
  });

  test('with no save: does not throw', () => {
    localStorage.clear();
    expect(() => window.enterGameFromLanding()).not.toThrow();
  });

  test('with no save: shows prelude-screen', () => {
    localStorage.clear();
    window.enterGameFromLanding();
    jest.advanceTimersByTime(500);
    const prelude = document.getElementById('prelude-screen');
    expect(prelude.classList.contains('active')).toBe(true);
  });

  test('with save: does not throw', () => {
    window.act2State.active = true;
    window.saveGame();
    expect(() => window.enterGameFromLanding()).not.toThrow();
  });
});

// ── beginNewGame ───────────────────────────────────────────
describe('beginNewGame()', () => {
  test('function exists', () => {
    expect(typeof window.beginNewGame).toBe('function');
  });

  test('with no save: does not show modal', () => {
    localStorage.clear();
    const modal = document.getElementById('newgame-modal');
    window.beginNewGame();
    expect(modal.classList.contains('active')).toBe(false);
  });

  test('with save: shows confirmation modal', () => {
    window.act2State.active = true;
    window.saveGame();
    const modal = document.getElementById('newgame-modal');
    window.beginNewGame();
    expect(modal.classList.contains('active')).toBe(true);
  });
});

// ── confirmNewGame ─────────────────────────────────────────
describe('confirmNewGame()', () => {
  test('function exists', () => {
    expect(typeof window.confirmNewGame).toBe('function');
  });

  test('clears localStorage save', () => {
    window.act2State.active = true;
    window.saveGame();
    expect(localStorage.getItem('tid_save_v1')).not.toBeNull();
    window.confirmNewGame();
    expect(localStorage.getItem('tid_save_v1')).toBeNull();
  });

  test('hides the confirmation modal', () => {
    const modal = document.getElementById('newgame-modal');
    modal.classList.add('active');
    window.confirmNewGame();
    expect(modal.classList.contains('active')).toBe(false);
  });

  test('shows prelude-screen after confirming', () => {
    window.confirmNewGame();
    jest.advanceTimersByTime(500);
    const prelude = document.getElementById('prelude-screen');
    expect(prelude.classList.contains('active')).toBe(true);
  });
});

// ── continueGame ───────────────────────────────────────────
describe('continueGame()', () => {
  test('function exists', () => {
    expect(typeof window.continueGame).toBe('function');
  });

  test('with no save: starts prelude without crashing', () => {
    localStorage.clear();
    expect(() => window.continueGame()).not.toThrow();
  });

  test('with save: calls restoreFromSave without error', () => {
    window.act2State.active = true;
    window.saveGame();
    expect(() => window.continueGame()).not.toThrow();
  });
});

// ── DOM elements exist ─────────────────────────────────────
describe('Landing page DOM elements', () => {
  const requiredIds = [
    'splash-screen', 'title-screen', 'ls-progress-fill',
    'ls-progress-pct', 'ls-acts-row', 'ls-phone-hint',
    'ls-ps-clock', 'newgame-modal',
  ];
  requiredIds.forEach(id => {
    test(`#${id} exists in DOM`, () => {
      expect(document.getElementById(id)).not.toBeNull();
    });
  });
});
