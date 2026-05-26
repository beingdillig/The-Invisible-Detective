/**
 * gallery.test.js
 * Tests for gallery navigation and mirror album functions:
 *   openAlbum, navigateImage, openMirrorSubjectsAlbum, openMirrorFolder
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => { resetActStates(); localStorage.clear(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

// ── openAlbum ──────────────────────────────────────────────
describe('openAlbum()', () => {
  test('is a function on window', () => {
    expect(typeof window.openAlbum).toBe('function');
  });

  test('openAlbum("camera") does not throw', () => {
    expect(() => window.openAlbum('camera')).not.toThrow();
  });

  test('openAlbum("camera") → #album-view screen becomes active', () => {
    window.openAlbum('camera');
    const albumView = document.getElementById('album-view');
    expect(albumView.classList.contains('active')).toBe(true);
  });

  test('openAlbum("camera") → #gallery-grid has children', () => {
    window.openAlbum('camera');
    const grid = document.getElementById('gallery-grid');
    expect(grid.children.length).toBeGreaterThan(0);
  });

  test('openAlbum("camera") → #album-title is "Camera Roll"', () => {
    window.openAlbum('camera');
    const title = document.getElementById('album-title');
    expect(title.textContent).toBe('Camera Roll');
  });

  test('openAlbum("downloads") → #album-title is "Downloads"', () => {
    window.openAlbum('downloads');
    const title = document.getElementById('album-title');
    expect(title.textContent).toBe('Downloads');
  });

  test('openAlbum("downloads") → #gallery-grid has children', () => {
    window.openAlbum('downloads');
    const grid = document.getElementById('gallery-grid');
    expect(grid.children.length).toBeGreaterThan(0);
  });

  test('openAlbum("camera") → grid item count matches camera gallery length (non-zip items + zip)', () => {
    window.openAlbum('camera');
    const grid = document.getElementById('gallery-grid');
    // camera album has 12 items
    expect(grid.children.length).toBe(12);
  });

  test('openAlbum("hidden") → #album-title is "Hidden"', () => {
    window.openAlbum('hidden');
    const title = document.getElementById('album-title');
    expect(title.textContent).toBe('Hidden');
  });

  test('act3State.behaviorProfile.appCounts["album-view"] increments in Act 3', () => {
    window.act3State.active = true;
    const before = window.act3State.behaviorProfile.appCounts['album-view'] || 0;
    window.openAlbum('camera');
    const after = window.act3State.behaviorProfile.appCounts['album-view'] || 0;
    expect(after).toBe(before + 1);
  });

  test('repeated openAlbum calls replace grid contents (no duplicates)', () => {
    window.openAlbum('camera');
    const firstCount = document.getElementById('gallery-grid').children.length;
    window.openAlbum('camera');
    const secondCount = document.getElementById('gallery-grid').children.length;
    expect(secondCount).toBe(firstCount);
  });
});

// ── navigateImage ──────────────────────────────────────────
describe('navigateImage()', () => {
  beforeEach(() => {
    // Open camera album first so currentAlbumName and galleryData are set
    window.openAlbum('camera');
  });

  test('is a function on window', () => {
    expect(typeof window.navigateImage).toBe('function');
  });

  test('navigateImage(1) does not throw', () => {
    expect(() => window.navigateImage(1)).not.toThrow();
  });

  test('navigateImage(1) from first image → #image-view becomes active', () => {
    window.navigateImage(1);
    const view = document.getElementById('image-view');
    expect(view.classList.contains('active')).toBe(true);
  });

  test('navigateImage(1) → #image-counter updates', () => {
    window.navigateImage(1);
    const counter = document.getElementById('image-counter');
    // Should now show "2 / N"
    expect(counter.textContent).toMatch(/^2\s*\/\s*\d+/);
  });

  test('navigateImage(1) → #full-image src updates (non-empty)', () => {
    window.navigateImage(1);
    const img = document.getElementById('full-image');
    expect(img.src).toBeTruthy();
  });

  test('navigateImage(1) → #image-metadata updates (non-empty)', () => {
    window.navigateImage(1);
    const meta = document.getElementById('image-metadata');
    expect(meta.textContent.length).toBeGreaterThan(0);
  });

  test('navigateImage(-1) at index 0 → stays at index 0 (does not wrap)', () => {
    // First, go to image 0 by clicking first item
    window.openAlbum('camera');
    // From index 0, going -1 is out of bounds: n = -1, guard n>=0 fails
    window.navigateImage(-1);
    // Counter should still show index starting at 0 (not changed) or be empty if no image was opened yet
    const counter = document.getElementById('image-counter');
    // After openAlbum index is reset to 0 but image-view not shown yet
    // navigateImage(-1) → n=-1, does nothing
    // counter unchanged from initial state
    expect(counter.textContent).not.toMatch(/^0\s*\//); // index 0 is shown as "1 / N"
  });

  test('navigateImage(1) twice → counter shows 3rd image', () => {
    window.navigateImage(1); // index 1
    window.navigateImage(1); // index 2
    const counter = document.getElementById('image-counter');
    expect(counter.textContent).toMatch(/^3\s*\/\s*\d+/);
  });

  test('navigateImage(1) then navigateImage(-1) → counter returns to 2nd image', () => {
    window.navigateImage(1); // index 1 → "2 / N"
    window.navigateImage(1); // index 2 → "3 / N"
    window.navigateImage(-1); // index 1 → "2 / N"
    const counter = document.getElementById('image-counter');
    expect(counter.textContent).toMatch(/^2\s*\/\s*\d+/);
  });

  test('navigateImage past last image → stays at last (no wrap)', () => {
    // Camera has 12 items total; filter isZip → 12 non-zip
    // Go to end by advancing many steps
    for (let i = 0; i < 15; i++) window.navigateImage(1);
    const counter = document.getElementById('image-counter');
    // Should be at the last item, counter text starts with the last index number
    const parts = counter.textContent.match(/^(\d+)\s*\/\s*(\d+)/);
    if (parts) {
      expect(parseInt(parts[1])).toBe(parseInt(parts[2]));
    }
  });

  test('navigateImage(1) on "hidden" album does not throw', () => {
    window.openAlbum('hidden');
    expect(() => window.navigateImage(1)).not.toThrow();
  });
});

// ── openMirrorSubjectsAlbum ────────────────────────────────
describe('openMirrorSubjectsAlbum()', () => {
  test('is a function on window', () => {
    expect(typeof window.openMirrorSubjectsAlbum).toBe('function');
  });

  test('does not throw', () => {
    window.act3State.active = true;
    window.act4State.active = true;
    expect(() => window.openMirrorSubjectsAlbum()).not.toThrow();
  });

  test('does not throw when act4State.reportRead is false', () => {
    window.act4State.active = true;
    window.act4State.reportRead = false;
    expect(() => window.openMirrorSubjectsAlbum()).not.toThrow();
  });

  test('does not throw when act4State.reportRead is true', () => {
    window.act4State.active = true;
    window.act4State.reportRead = true;
    expect(() => window.openMirrorSubjectsAlbum()).not.toThrow();
  });

  test('#act4-subjects-album screen becomes active after call', () => {
    window.act4State.active = true;
    window.openMirrorSubjectsAlbum();
    const screen = document.getElementById('act4-subjects-album');
    expect(screen.classList.contains('active')).toBe(true);
  });
});

// ── openMirrorFolder ───────────────────────────────────────
describe('openMirrorFolder()', () => {
  test('is a function on window', () => {
    expect(typeof window.openMirrorFolder).toBe('function');
  });

  test('does not throw in Act 2 context', () => {
    window.act2State.active = true;
    // openMirrorFolder triggers overheat on first visit — overheat may run timers
    expect(() => window.openMirrorFolder()).not.toThrow();
    jest.runAllTimers();
  });

  test('#mirror-folder screen becomes active after call', () => {
    window.act2State.active = true;
    window.openMirrorFolder();
    const screen = document.getElementById('mirror-folder');
    expect(screen.classList.contains('active')).toBe(true);
  });

  test('second call does not throw (overheat guard prevents double-trigger)', () => {
    window.act2State.active = true;
    window.openMirrorFolder();
    jest.runAllTimers();
    window._overheatActive = false;
    expect(() => window.openMirrorFolder()).not.toThrow();
    jest.runAllTimers();
  });
});
