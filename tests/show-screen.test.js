/**
 * show-screen.test.js
 * Tests for showScreen(id) — screen activation, notification-container
 * visibility, act-tracking side-effects, and audio-player analyzer button.
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => {
  resetActStates();
  localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// ── Helper ──────────────────────────────────────────────────
function activeScreens() {
  return [...document.querySelectorAll('.screen.active')].map(s => s.id);
}

// ── window._showScreen is exposed ──────────────────────────
describe('window._showScreen exposure', () => {
  test('window._showScreen is a function', () => {
    expect(typeof window._showScreen).toBe('function');
  });
});

// ── Basic screen activation ─────────────────────────────────
describe('showScreen — basic activation', () => {
  test('showScreen("home-screen") makes #home-screen have class "active"', () => {
    window._showScreen('home-screen');
    expect(document.getElementById('home-screen').classList.contains('active')).toBe(true);
  });

  test('showScreen("home-screen") deactivates all other screens', () => {
    // Manually activate a different screen first
    document.getElementById('lock-screen').classList.add('active');
    document.getElementById('notes-app').classList.add('active');
    window._showScreen('home-screen');
    const others = activeScreens().filter(id => id !== 'home-screen');
    expect(others).toHaveLength(0);
  });

  test('showScreen("chat-view") activates chat-view', () => {
    window._showScreen('chat-view');
    expect(document.getElementById('chat-view').classList.contains('active')).toBe(true);
  });

  test('showScreen("chat-view") deactivates previously-active screens', () => {
    window._showScreen('home-screen');
    window._showScreen('chat-view');
    expect(document.getElementById('home-screen').classList.contains('active')).toBe(false);
  });

  test('showScreen("lock-screen") activates lock-screen', () => {
    window._showScreen('lock-screen');
    expect(document.getElementById('lock-screen').classList.contains('active')).toBe(true);
  });

  test('showScreen("act2-lock") activates act2-lock', () => {
    window._showScreen('act2-lock');
    expect(document.getElementById('act2-lock').classList.contains('active')).toBe(true);
  });

  test('showScreen("gallery-app") activates gallery-app', () => {
    window._showScreen('gallery-app');
    expect(document.getElementById('gallery-app').classList.contains('active')).toBe(true);
  });

  test('only one screen is active after any showScreen call', () => {
    window._showScreen('notes-app');
    const screens = activeScreens();
    expect(screens.length).toBe(1);
    expect(screens[0]).toBe('notes-app');
  });

  test('showScreen with unknown id does not crash', () => {
    expect(() => window._showScreen('does-not-exist-xyz')).not.toThrow();
  });

  test('showScreen with unknown id leaves no screen active', () => {
    window._showScreen('does-not-exist-xyz');
    expect(activeScreens()).toHaveLength(0);
  });
});

// ── Act 2 tracking ──────────────────────────────────────────
describe('showScreen — act2State tracking', () => {
  beforeEach(() => {
    window.act2State.active = true;
    window.act2State.appsVisited = {};
  });

  test('showScreen("gallery-app") increments act2State.appsVisited["gallery-app"] to 1', () => {
    window._showScreen('gallery-app');
    expect(window.act2State.appsVisited['gallery-app']).toBe(1);
  });

  test('showScreen("notes-app") twice → appsVisited["notes-app"] = 2', () => {
    window._showScreen('notes-app');
    window._showScreen('notes-app');
    expect(window.act2State.appsVisited['notes-app']).toBe(2);
  });

  test('showScreen("gallery-app") records an appTimestamps entry', () => {
    window._showScreen('gallery-app');
    expect(window.act2State.appTimestamps['gallery-app']).toBeDefined();
  });

  test('act2State tracking does not fire when act2State.active=false', () => {
    window.act2State.active = false;
    window._showScreen('gallery-app');
    expect(window.act2State.appsVisited['gallery-app']).toBeUndefined();
  });

  test('multiple different apps each get separate visit counts', () => {
    window._showScreen('gallery-app');
    window._showScreen('notes-app');
    window._showScreen('gallery-app');
    expect(window.act2State.appsVisited['gallery-app']).toBe(2);
    expect(window.act2State.appsVisited['notes-app']).toBe(1);
  });
});

// ── Act 3 tracking ──────────────────────────────────────────
describe('showScreen — act3State tracking', () => {
  beforeEach(() => {
    window.act3State.active = true;
    window.act3State.behaviorProfile.appCounts = {};
  });

  test('showScreen("gallery-app") increments act3State.behaviorProfile.appCounts["gallery-app"]', () => {
    window._showScreen('gallery-app');
    expect(window.act3State.behaviorProfile.appCounts['gallery-app']).toBe(1);
  });

  test('showScreen("mirror-app") increments appCounts["mirror-app"]', () => {
    window._showScreen('mirror-app');
    expect(window.act3State.behaviorProfile.appCounts['mirror-app']).toBe(1);
  });

  test('showScreen("notes-app") three times → appCounts["notes-app"] = 3', () => {
    window._showScreen('notes-app');
    window._showScreen('notes-app');
    window._showScreen('notes-app');
    expect(window.act3State.behaviorProfile.appCounts['notes-app']).toBe(3);
  });

  test('act3State tracking does not fire when act3State.active=false', () => {
    window.act3State.active = false;
    window._showScreen('gallery-app');
    expect(window.act3State.behaviorProfile.appCounts['gallery-app']).toBeUndefined();
  });

  test('different apps are tracked independently', () => {
    window._showScreen('messages-app');
    window._showScreen('email-app');
    window._showScreen('messages-app');
    expect(window.act3State.behaviorProfile.appCounts['messages-app']).toBe(2);
    expect(window.act3State.behaviorProfile.appCounts['email-app']).toBe(1);
  });
});

// ── Notification-container visibility ───────────────────────
describe('showScreen — notification-container visibility', () => {
  function ncDisplay() {
    return document.getElementById('notification-container').style.display;
  }

  // lock-screen IS in NOTIF_VISIBLE — notifications should be visible
  test('showScreen("lock-screen") shows #notification-container', () => {
    window._showScreen('lock-screen');
    expect(ncDisplay()).toBe('flex');
  });

  test('showScreen("act2-lock") hides #notification-container (not in NOTIF_VISIBLE)', () => {
    window._showScreen('act2-lock');
    expect(ncDisplay()).toBe('none');
  });

  test('showScreen("prelude-screen") hides #notification-container (not in NOTIF_VISIBLE)', () => {
    window._showScreen('prelude-screen');
    expect(ncDisplay()).toBe('none');
  });

  test('showScreen("home-screen") shows #notification-container', () => {
    window._showScreen('home-screen');
    expect(ncDisplay()).toBe('flex');
  });

  test('showScreen("chat-view") shows #notification-container', () => {
    window._showScreen('chat-view');
    expect(ncDisplay()).toBe('flex');
  });

  test('showScreen("gallery-app") shows #notification-container', () => {
    window._showScreen('gallery-app');
    expect(ncDisplay()).toBe('flex');
  });

  test('showScreen("notes-app") shows #notification-container', () => {
    window._showScreen('notes-app');
    expect(ncDisplay()).toBe('flex');
  });

  test('showScreen("act2-boot") hides #notification-container (not in NOTIF_VISIBLE)', () => {
    window._showScreen('act2-boot');
    expect(ncDisplay()).toBe('none');
  });
});

// ── audio-player: analyzer launch button ───────────────────
describe('showScreen("audio-player") — analyzer-launch-btn', () => {
  test('with act3State.active=false, #analyzer-launch-btn is NOT shown by showScreen', () => {
    window.act3State.active = false;
    const btn = document.getElementById('analyzer-launch-btn');
    btn.style.display = 'none';
    window._showScreen('audio-player');
    // showScreen only sets display when act3 is active; if inactive, it should stay none
    expect(btn.style.display).toBe('none');
  });

  test('with act3State.active=true, #analyzer-launch-btn gets display="block"', () => {
    window.act3State.active = true;
    const btn = document.getElementById('analyzer-launch-btn');
    btn.style.display = 'none';
    window._showScreen('audio-player');
    expect(btn.style.display).toBe('block');
  });

  test('with act2State.echoLogsRead=false but act3State not active, btn stays none', () => {
    window.act2State.echoLogsRead = false;
    window.act3State.active = false;
    const btn = document.getElementById('analyzer-launch-btn');
    btn.style.display = 'none';
    window._showScreen('audio-player');
    expect(btn.style.display).toBe('none');
  });

  test('with act3State.active=true, showScreen shows audio-player as active screen', () => {
    window.act3State.active = true;
    window._showScreen('audio-player');
    expect(document.getElementById('audio-player').classList.contains('active')).toBe(true);
  });
});
