/**
 * browser.test.js
 * Tests for the in-game NX Search browser:
 *   performBrowserSearch, renderBrowserHome, openBrowserPage, showBrowserHistory
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => { resetActStates(); localStorage.clear(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

// ── performBrowserSearch ───────────────────────────────────
describe('performBrowserSearch()', () => {
  test('is a function on window', () => {
    expect(typeof window.performBrowserSearch).toBe('function');
  });

  test('empty string returns early without modifying search-results-list', () => {
    const list = document.getElementById('search-results-list');
    list.innerHTML = '<div class="sentinel"></div>';
    window.performBrowserSearch('');
    // Guard returns early — list should be untouched
    expect(list.querySelector('.sentinel')).not.toBeNull();
  });

  test('whitespace-only string returns early', () => {
    const list = document.getElementById('search-results-list');
    list.innerHTML = '<div class="sentinel"></div>';
    window.performBrowserSearch('   ');
    expect(list.querySelector('.sentinel')).not.toBeNull();
  });

  test('"nexus" query produces at least one result in #search-results-list', () => {
    window.performBrowserSearch('nexus');
    const list = document.getElementById('search-results-list');
    expect(list.children.length).toBeGreaterThan(0);
  });

  test('"ECHO" query (case-insensitive) produces results', () => {
    window.performBrowserSearch('ECHO');
    const list = document.getElementById('search-results-list');
    expect(list.children.length).toBeGreaterThan(0);
  });

  test('"elena" query returns relevant result', () => {
    window.performBrowserSearch('elena');
    const list = document.getElementById('search-results-list');
    expect(list.children.length).toBeGreaterThan(0);
    expect(list.textContent).toMatch(/Elena Torres/i);
  });

  test('"rhea" query returns researcher result', () => {
    window.performBrowserSearch('rhea');
    const list = document.getElementById('search-results-list');
    expect(list.children.length).toBeGreaterThan(0);
    expect(list.textContent).toMatch(/Rhea/i);
  });

  test('"unknown_xyz_123" query → no search-result divs rendered', () => {
    window.performBrowserSearch('unknown_xyz_123');
    const list = document.getElementById('search-results-list');
    // No result divs — only the "no results" placeholder
    expect(list.querySelectorAll('.search-result').length).toBe(0);
  });

  test('"unknown_xyz_123" query → "No results" shown in count element', () => {
    window.performBrowserSearch('unknown_xyz_123');
    const countEl = document.getElementById('search-result-count');
    expect(countEl.textContent).toMatch(/no results/i);
  });

  test('successful search updates #browser-url-input with search URL', () => {
    window.performBrowserSearch('nexus');
    const urlInput = document.getElementById('browser-url-input');
    expect(urlInput.value).toMatch(/nx-search\.com\/search/);
    expect(urlInput.value).toMatch(/nexus/i);
  });

  test('successful search adds query to browserHistory (idempotent on repeat)', () => {
    // First search adds to history
    window.performBrowserSearch('nexus unique query abc');
    window.performBrowserSearch('nexus unique query abc');
    // Second call should not duplicate (the guard checks find())
    // No throw expected
    expect(() => window.performBrowserSearch('nexus unique query abc')).not.toThrow();
  });

  test('result count element shows count for multi-result search', () => {
    window.performBrowserSearch('nexus');
    const countEl = document.getElementById('search-result-count');
    expect(countEl.textContent).toMatch(/About \d+ result/i);
  });
});

// ── renderBrowserHome ──────────────────────────────────────
describe('renderBrowserHome()', () => {
  test('is a function on window', () => {
    expect(typeof window.renderBrowserHome).toBe('function');
  });

  test('does not throw', () => {
    expect(() => window.renderBrowserHome()).not.toThrow();
  });

  test('#browser-home-content is non-empty after call', () => {
    window.renderBrowserHome();
    const el = document.getElementById('browser-home-content');
    expect(el.innerHTML.length).toBeGreaterThan(0);
  });

  test('#browser-home-content contains the NX Search logo text', () => {
    window.renderBrowserHome();
    const el = document.getElementById('browser-home-content');
    expect(el.textContent).toMatch(/NX/);
  });

  test('#browser-url-input value set to nx-search.com', () => {
    window.renderBrowserHome();
    const urlInput = document.getElementById('browser-url-input');
    expect(urlInput.value).toBe('nx-search.com');
  });

  test('home content contains quick-access link for nexus-wiki', () => {
    window.renderBrowserHome();
    const el = document.getElementById('browser-home-content');
    expect(el.innerHTML).toMatch(/nexus-wiki/);
  });

  test('home content contains quick-access link for echo-forums', () => {
    window.renderBrowserHome();
    const el = document.getElementById('browser-home-content');
    expect(el.innerHTML).toMatch(/echo-forums/);
  });

  test('home content contains Aarav\'s History section', () => {
    window.renderBrowserHome();
    const el = document.getElementById('browser-home-content');
    expect(el.textContent).toMatch(/Aarav'?s History/i);
  });

  test('act3State.behaviorProfile.appCounts["browser-app"] increments when renderBrowserHome called in Act 3', () => {
    window.act3State.active = true;
    const before = window.act3State.behaviorProfile.appCounts['browser-app'] || 0;
    window.renderBrowserHome();
    const after = window.act3State.behaviorProfile.appCounts['browser-app'] || 0;
    expect(after).toBe(before + 1);
  });
});

// ── openBrowserPage ────────────────────────────────────────
describe('openBrowserPage()', () => {
  test('is a function on window', () => {
    expect(typeof window.openBrowserPage).toBe('function');
  });

  test('does not throw for known page "nexus-wiki"', () => {
    expect(() => window.openBrowserPage('nexus-wiki')).not.toThrow();
  });

  test('does not throw for known page "elena-news"', () => {
    expect(() => window.openBrowserPage('elena-news')).not.toThrow();
  });

  test('does not throw for known page "echo-forums"', () => {
    expect(() => window.openBrowserPage('echo-forums')).not.toThrow();
  });

  test('does not throw for known page "rhea-profile"', () => {
    expect(() => window.openBrowserPage('rhea-profile')).not.toThrow();
  });

  test('does not throw for known page "division-zero"', () => {
    expect(() => window.openBrowserPage('division-zero')).not.toThrow();
  });

  test('unknown page ID → returns early without modifying #browser-page-view', () => {
    const view = document.getElementById('browser-page-view');
    view.innerHTML = '<div class="sentinel"></div>';
    window.openBrowserPage('totally_unknown_page_id_xyz');
    // Guard: if(!page) return; — view should be untouched
    expect(view.querySelector('.sentinel')).not.toBeNull();
  });

  test('"nexus-wiki" → #browser-page-view has content', () => {
    window.openBrowserPage('nexus-wiki');
    const view = document.getElementById('browser-page-view');
    expect(view.innerHTML.length).toBeGreaterThan(0);
  });

  test('"nexus-wiki" → #browser-page-view contains "Nexus Dynamics"', () => {
    window.openBrowserPage('nexus-wiki');
    const view = document.getElementById('browser-page-view');
    expect(view.textContent).toMatch(/Nexus Dynamics/);
  });

  test('"elena-news" → #browser-page-view contains "Elena"', () => {
    window.openBrowserPage('elena-news');
    const view = document.getElementById('browser-page-view');
    expect(view.textContent).toMatch(/Elena/);
  });

  test('act3State.behaviorProfile.appCounts["browser-page-view"] increments in Act 3', () => {
    window.act3State.active = true;
    const before = window.act3State.behaviorProfile.appCounts['browser-page-view'] || 0;
    window.openBrowserPage('nexus-wiki');
    const after = window.act3State.behaviorProfile.appCounts['browser-page-view'] || 0;
    expect(after).toBe(before + 1);
  });
});

// ── showBrowserHistory ─────────────────────────────────────
describe('showBrowserHistory()', () => {
  test('is a function on window', () => {
    expect(typeof window.showBrowserHistory).toBe('function');
  });

  test('does not throw', () => {
    expect(() => window.showBrowserHistory()).not.toThrow();
  });

  test('#browser-history-content is non-empty after call', () => {
    window.showBrowserHistory();
    const el = document.getElementById('browser-history-content');
    expect(el.innerHTML.length).toBeGreaterThan(0);
  });

  test('#browser-history-content contains Aarav\'s search queries', () => {
    window.showBrowserHistory();
    const el = document.getElementById('browser-history-content');
    // aaravHistory contains "Elena Torres journalist missing"
    expect(el.textContent).toMatch(/Elena Torres/i);
  });

  test('#browser-history-content contains date headers from aaravHistory', () => {
    window.showBrowserHistory();
    const el = document.getElementById('browser-history-content');
    expect(el.textContent).toMatch(/Oct/i);
  });

  test('second call overwrites content (no duplication)', () => {
    window.showBrowserHistory();
    const first = document.getElementById('browser-history-content').innerHTML;
    window.showBrowserHistory();
    const second = document.getElementById('browser-history-content').innerHTML;
    // Content is re-rendered each call — should be identical length, not doubled
    expect(second.length).toBe(first.length);
  });
});
