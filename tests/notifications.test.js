/**
 * notifications.test.js
 * Tests notification creation, cap (MAX_NOTIFS = 5), and auto-removal.
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

function getNotifCount() {
  return document.getElementById('notification-container').children.length;
}

// ── Basic creation ─────────────────────────────────────────
describe('createNotification()', () => {
  test('function is exposed on window', () => {
    expect(typeof window.createNotification).toBe('function');
  });

  test('creates an element in notification-container', () => {
    window.createNotification('Test', 'Title', 'Body text', false, false);
    expect(getNotifCount()).toBe(1);
  });

  test('created notification contains the title text', () => {
    window.createNotification('App', 'AlertTitle', 'Something happened', false, false);
    const container = document.getElementById('notification-container');
    expect(container.innerHTML).toContain('AlertTitle');
  });

  test('created notification contains the body text', () => {
    window.createNotification('App', 'T', 'UniqueBodyText999', false, false);
    const container = document.getElementById('notification-container');
    expect(container.innerHTML).toContain('UniqueBodyText999');
  });

  test('multiple notifications stack', () => {
    window.createNotification('A', 'T1', 'B1', false, false);
    window.createNotification('B', 'T2', 'B2', false, false);
    window.createNotification('C', 'T3', 'B3', false, false);
    expect(getNotifCount()).toBe(3);
  });
});

// ── MAX_NOTIFS cap ─────────────────────────────────────────
describe('MAX_NOTIFS cap', () => {
  test('MAX_NOTIFS constant equals 5', () => {
    expect(window.MAX_NOTIFS).toBe(5);
  });

  test('5 notifications: all present', () => {
    for (let i = 0; i < 5; i++) {
      window.createNotification('App', `Title${i}`, `Body${i}`, false, false);
    }
    expect(getNotifCount()).toBe(5);
  });

  test('6th notification: oldest is removed (fade starts)', () => {
    for (let i = 0; i < 6; i++) {
      window.createNotification('App', `N${i}`, `B${i}`, false, false);
    }
    // Immediately after 6th: oldest starts opacity fade (still in DOM momentarily)
    // After fade completes: count = 5
    jest.advanceTimersByTime(600);
    expect(getNotifCount()).toBeLessThanOrEqual(5);
  });

  test('10 rapid notifications never exceed 5 after flush', () => {
    for (let i = 0; i < 10; i++) {
      window.createNotification('App', `N${i}`, `B${i}`, false, false);
    }
    jest.advanceTimersByTime(1000);
    expect(getNotifCount()).toBeLessThanOrEqual(5);
  });
});

// ── Auto-remove ────────────────────────────────────────────
describe('Auto-remove notifications', () => {
  test('autoRemove=true: notification removed after 8s timeout + fade', () => {
    window.createNotification('App', 'Auto', 'Removes', false, true);
    expect(getNotifCount()).toBe(1);
    jest.advanceTimersByTime(8100); // 8s timeout
    jest.advanceTimersByTime(600);  // 500ms fade
    expect(getNotifCount()).toBe(0);
  });

  test('autoRemove=false: notification stays', () => {
    window.createNotification('App', 'Persist', 'Stays', false, false);
    jest.advanceTimersByTime(10000);
    expect(getNotifCount()).toBe(1);
  });
});

// ── Warning notifications ──────────────────────────────────
describe('Warning (glitch) notifications', () => {
  test('isWarning=true creates notification without error', () => {
    expect(() => {
      window.createNotification('ECHO', 'WARNING', 'System anomaly', true, true);
    }).not.toThrow();
    expect(getNotifCount()).toBe(1);
  });
});
