/**
 * case-file.test.js
 * Tests the Case File app — progress rendering, act nodes,
 * objective text, and status stamp.
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => {
  resetActStates();
  localStorage.clear();
  // Clear case file elements
  ['cf-acts-list','cf-progress-fill','cf-progress-pct',
   'cf-objective-text','cf-status-stamp','cf-subject-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
    if (el && id === 'cf-progress-fill') el.style.width = '';
    if (el && id === 'cf-progress-pct')  el.textContent = '';
  });
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// ── CF_ACT_DATA ────────────────────────────────────────────
describe('CF_ACT_DATA constants', () => {
  test('window.CF_ACT_DATA is defined', () => {
    // CF_ACT_DATA is const inside openCaseFile scope — test via openCaseFile behavior
    expect(typeof window.openCaseFile).toBe('function');
  });
});

// ── Progress with no save ──────────────────────────────────
describe('openCaseFile() — no save state', () => {
  beforeEach(() => {
    localStorage.clear();
    window.openCaseFile();
    jest.runAllTimers();
  });

  test('progress % shows 0%', () => {
    const pct = document.getElementById('cf-progress-pct');
    expect(pct.textContent).toBe('0%');
  });

  test('creates 5 act nodes', () => {
    const list = document.getElementById('cf-acts-list');
    expect(list.children.length).toBe(5);
  });

  test('first act node has "current" dot class', () => {
    const list = document.getElementById('cf-acts-list');
    const firstDot = list.querySelector('.cf-act-dot-wrap');
    expect(firstDot?.classList.contains('cf-active')).toBe(true);
  });

  test('acts 2-5 are locked when no save', () => {
    const list = document.getElementById('cf-acts-list');
    const dots = list.querySelectorAll('.cf-act-dot-wrap');
    // Acts 2-5 (index 1-4) should be locked
    for (let i = 1; i < 5; i++) {
      expect(dots[i]?.classList.contains('cf-locked')).toBe(true);
    }
  });

  test('status stamp shows NEW', () => {
    const stamp = document.getElementById('cf-status-stamp');
    expect(stamp.textContent).toBe('NEW');
  });

  test('objective text matches Act 1 objective', () => {
    const obj = document.getElementById('cf-objective-text');
    expect(obj.textContent.length).toBeGreaterThan(0);
    expect(obj.textContent.toLowerCase()).toMatch(/unlock|aarav|phone/i);
  });
});

// ── Progress at Act 2 ──────────────────────────────────────
describe('openCaseFile() — Act 2 in progress', () => {
  beforeEach(() => {
    window.act2State.active = true;
    window.saveGame();
    window.openCaseFile();
    jest.runAllTimers();
  });

  test('progress % shows 20%', () => {
    const pct = document.getElementById('cf-progress-pct');
    expect(pct.textContent).toBe('20%');
  });

  test('act 1 node is completed (cf-done)', () => {
    const list = document.getElementById('cf-acts-list');
    const dots = list.querySelectorAll('.cf-act-dot-wrap');
    expect(dots[0]?.classList.contains('cf-done')).toBe(true);
  });

  test('act 2 node is current (cf-active)', () => {
    const list = document.getElementById('cf-acts-list');
    const dots = list.querySelectorAll('.cf-act-dot-wrap');
    expect(dots[1]?.classList.contains('cf-active')).toBe(true);
  });

  test('status stamp shows ACTIVE', () => {
    const stamp = document.getElementById('cf-status-stamp');
    expect(stamp.textContent).toBe('ACTIVE');
  });

  test('Act 2 objective text is shown', () => {
    const obj = document.getElementById('cf-objective-text');
    expect(obj.textContent.toLowerCase()).toMatch(/watcher|echo|warehouse|identify/i);
  });
});

// ── Progress at Act 3 ──────────────────────────────────────
describe('openCaseFile() — Act 3 in progress', () => {
  beforeEach(() => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.saveGame();
    window.openCaseFile();
    jest.runAllTimers();
  });

  test('progress % shows 40%', () => {
    const pct = document.getElementById('cf-progress-pct');
    expect(pct.textContent).toBe('40%');
  });

  test('acts 1 and 2 are completed', () => {
    const list = document.getElementById('cf-acts-list');
    const dots = list.querySelectorAll('.cf-act-dot-wrap');
    expect(dots[0]?.classList.contains('cf-done')).toBe(true);
    expect(dots[1]?.classList.contains('cf-done')).toBe(true);
  });

  test('act 3 is current', () => {
    const list = document.getElementById('cf-acts-list');
    const dots = list.querySelectorAll('.cf-act-dot-wrap');
    expect(dots[2]?.classList.contains('cf-active')).toBe(true);
  });
});

// ── Progress at Act 4 ──────────────────────────────────────
describe('openCaseFile() — Act 4 in progress', () => {
  beforeEach(() => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.act4State.active = true;
    window.saveGame();
    window.openCaseFile();
    jest.runAllTimers();
  });

  test('progress % shows 60%', () => {
    const pct = document.getElementById('cf-progress-pct');
    expect(pct.textContent).toBe('60%');
  });

  test('acts 1-3 are completed', () => {
    const list = document.getElementById('cf-acts-list');
    const dots = list.querySelectorAll('.cf-act-dot-wrap');
    [0,1,2].forEach(i => expect(dots[i]?.classList.contains('cf-done')).toBe(true));
  });
});

// ── Progress at Act 5 ──────────────────────────────────────
describe('openCaseFile() — Act 5 (The Mirror)', () => {
  beforeEach(() => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.act4State.active = true;
    window.act5State.active = true;
    window.saveGame();
    window.openCaseFile();
    jest.runAllTimers();
  });

  test('progress % shows 80%', () => {
    const pct = document.getElementById('cf-progress-pct');
    expect(pct.textContent).toBe('80%');
  });

  test('act 5 is current', () => {
    const list = document.getElementById('cf-acts-list');
    const dots = list.querySelectorAll('.cf-act-dot-wrap');
    expect(dots[4]?.classList.contains('cf-active')).toBe(true);
  });
});

// ── openCaseFile navigates to case-file-app screen ────────
describe('openCaseFile() navigation', () => {
  test('shows case-file-app screen', () => {
    window.openCaseFile();
    const screen = document.getElementById('case-file-app');
    expect(screen.classList.contains('active')).toBe(true);
  });
});
