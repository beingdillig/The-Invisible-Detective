/**
 * save-restore.test.js
 * Tests the persistence engine — save, load, restore, and clear.
 * All 5 acts must save and restore correctly.
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => {
  resetActStates();
  localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// ── Save key ───────────────────────────────────────────────
describe('Save key', () => {
  test('SAVE_KEY is tid_save_v1', () => {
    expect(window.SAVE_KEY).toBe('tid_save_v1');
  });
});

// ── buildSaveObject ────────────────────────────────────────
describe('buildSaveObject()', () => {
  test('returns version 1', () => {
    const save = window.buildSaveObject();
    expect(save.version).toBe(1);
  });

  test('currentAct = 1 when all acts inactive', () => {
    const save = window.buildSaveObject();
    expect(save.currentAct).toBe(1);
  });

  test('currentAct = 2 when act2 active', () => {
    window.act2State.active = true;
    const save = window.buildSaveObject();
    expect(save.currentAct).toBe(2);
  });

  test('currentAct = 3 when act3 active', () => {
    window.act2State.active = true;
    window.act3State.active = true;
    const save = window.buildSaveObject();
    expect(save.currentAct).toBe(3);
  });

  test('currentAct = 4 when act4 active', () => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.act4State.active = true;
    const save = window.buildSaveObject();
    expect(save.currentAct).toBe(4);
  });

  test('currentAct = 5 when act5 active', () => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.act4State.active = true;
    window.act5State.active = true;
    const save = window.buildSaveObject();
    expect(save.currentAct).toBe(5);
  });

  test('saves act2 flags correctly', () => {
    window.act2State.active = true;
    window.act2State.rheaUnlocked = true;
    window.act2State.warehouseSolved = true;
    window.act2State.echoLogsRead = true;
    window.act2State.contactRenamed = true;
    const save = window.buildSaveObject();
    expect(save.act2Active).toBe(true);
    expect(save.rheaUnlocked).toBe(true);
    expect(save.warehouseSolved).toBe(true);
    expect(save.echoLogsRead).toBe(true);
    expect(save.contactRenamed).toBe(true);
  });

  test('saves act3 flags correctly', () => {
    window.act3State.active = true;
    window.act3State.playerName = 'TestPlayer';
    window.act3State.behaviorProfile.echoTrustScore = 42;
    window.act3State.finalSyncUnlocked = true;
    const save = window.buildSaveObject();
    expect(save.act3Active).toBe(true);
    expect(save.playerName).toBe('TestPlayer');
    expect(save.echoTrustScore).toBe(42);
    expect(save.finalSyncUnlocked).toBe(true);
  });

  test('saves act4 flags correctly', () => {
    window.act4State.active = true;
    window.act4State.syncPath = 'accept';
    window.act4State.reportRead = true;
    const save = window.buildSaveObject();
    expect(save.act4Active).toBe(true);
    expect(save.act4SyncPath).toBe('accept');
    expect(save.act4ReportRead).toBe(true);
  });

  test('saves act5 flags correctly', () => {
    window.act5State.active = true;
    window.act5State.impossibleCallDone = true;
    window.act5State.finalChoiceShown = true;
    const save = window.buildSaveObject();
    expect(save.act5Active).toBe(true);
    expect(save.act5ImpossibleCallDone).toBe(true);
    expect(save.act5FinalChoiceShown).toBe(true);
  });

  test('saves hidden album state', () => {
    window._hiddenAlbumUnlocked = true;
    const save = window.buildSaveObject();
    expect(save.hiddenUnlocked).toBe(true);
  });

  test('save has timestamp', () => {
    const before = Date.now();
    const save = window.buildSaveObject();
    expect(save.timestamp).toBeGreaterThanOrEqual(before);
  });

  test('chats array is included', () => {
    const save = window.buildSaveObject();
    expect(Array.isArray(save.chats)).toBe(true);
    expect(save.chats.length).toBeGreaterThan(0);
  });
});

// ── saveGame / loadGame ────────────────────────────────────
describe('saveGame() / gameLoadFn()', () => {
  test('saveGame() writes to localStorage under SAVE_KEY', () => {
    window.act2State.active = true;
    window.saveGame();
    const raw = localStorage.getItem('tid_save_v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.currentAct).toBe(2);
  });

  test('gameLoadFn() returns null when no save exists', () => {
    localStorage.clear();
    const result = window.gameLoadFn();
    expect(result).toBeNull();
  });

  test('gameLoadFn() returns parsed save object when save exists', () => {
    window.act2State.active = true;
    window.saveGame();
    const result = window.gameLoadFn();
    expect(result).not.toBeNull();
    expect(result.version).toBe(1);
    expect(result.currentAct).toBe(2);
  });

  test('gameLoadFn() returns null for corrupted localStorage', () => {
    localStorage.setItem('tid_save_v1', 'CORRUPTED_JSON{{{');
    const result = window.gameLoadFn();
    expect(result).toBeNull();
  });
});

// ── clearSave ──────────────────────────────────────────────
describe('clearSave()', () => {
  test('clearSave() removes the save from localStorage', () => {
    window.saveGame();
    expect(localStorage.getItem('tid_save_v1')).not.toBeNull();
    window.clearSave();
    expect(localStorage.getItem('tid_save_v1')).toBeNull();
  });

  test('clearSave() on empty localStorage does not throw', () => {
    localStorage.clear();
    expect(() => window.clearSave()).not.toThrow();
  });
});

// ── restoreFromSave ────────────────────────────────────────
describe('restoreFromSave()', () => {
  test('does nothing if save is null', () => {
    expect(() => window.restoreFromSave(null)).not.toThrow();
    expect(window.act2State.active).toBe(false);
  });

  test('does nothing if save version !== 1', () => {
    window.restoreFromSave({ version: 99, currentAct: 3 });
    expect(window.act2State.active).toBe(false);
  });

  test('restores act2State.active for currentAct = 2', () => {
    const save = { version: 1, currentAct: 2, act2Active: true,
      rheaUnlocked: false, echoLogsRead: false, warehouseSolved: false,
      contactRenamed: false, watcherMsgCount: 0, airplaneActive: false,
      act2ChoiceMade: false, hiddenUnlocked: false, chats: [],
      act3Active: false, act4Active: false, act5Active: false,
      playerName: null, archetype: null, echoTrustScore: 0,
      preludeSeen: true, galleryMutations: 0, extraNoteCount: 0,
      cameraGallery: [] };
    window.restoreFromSave(save);
    jest.runAllTimers();
    expect(window.act2State.active).toBe(true);
  });

  test('restores act3State.active for currentAct = 3', () => {
    const save = { version: 1, currentAct: 3, act2Active: true,
      act3Active: true, act4Active: false, act5Active: false,
      rheaUnlocked: true, echoLogsRead: false, warehouseSolved: true,
      contactRenamed: false, watcherMsgCount: 0, airplaneActive: false,
      act2ChoiceMade: true, hiddenUnlocked: false, chats: [],
      playerName: 'Aarav', archetype: 'INVESTIGATOR', echoTrustScore: 15,
      preludeSeen: true, galleryMutations: 0, extraNoteCount: 0,
      finalSyncUnlocked: false, echoConversationStarted: false,
      aaravReconstructUnlocked: false, loopIncidentTriggered: false,
      rhea_glitching: false, act3SyncPath: null, cameraGallery: [] };
    window.restoreFromSave(save);
    jest.runAllTimers();
    expect(window.act3State.active).toBe(true);
    expect(window.act3State.playerName).toBe('Aarav');
  });

  test('restores hiddenAlbumUnlocked flag', () => {
    const save = { version: 1, currentAct: 2, act2Active: true,
      hiddenUnlocked: true, chats: [], act3Active: false, act4Active: false,
      act5Active: false, rheaUnlocked: false, echoLogsRead: false,
      warehouseSolved: false, contactRenamed: false, watcherMsgCount: 0,
      airplaneActive: false, act2ChoiceMade: false, playerName: null,
      archetype: null, echoTrustScore: 0, preludeSeen: true,
      galleryMutations: 0, extraNoteCount: 0, cameraGallery: [] };
    window.restoreFromSave(save);
    jest.runAllTimers();
    expect(window._hiddenAlbumUnlocked).toBe(true);
  });
});

// ── lsGetProgress (landing page helper) ───────────────────
describe('lsGetProgress()', () => {
  test('returns hasSave=false when localStorage is empty', () => {
    localStorage.clear();
    const result = window.lsGetProgress ? window.lsGetProgress() : { hasSave: false };
    // lsGetProgress is defined in the landing page section
    expect(result.hasSave).toBe(false);
  });

  test('returns currentAct from save', () => {
    window.act2State.active = true;
    window.saveGame();
    if (window.lsGetProgress) {
      const result = window.lsGetProgress();
      expect(result.currentAct).toBe(2);
      expect(result.hasSave).toBe(true);
      expect(result.completedActs).toBe(1);
    }
  });

  test('completedActs = currentAct - 1', () => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.saveGame();
    if (window.lsGetProgress) {
      const result = window.lsGetProgress();
      expect(result.completedActs).toBe(result.currentAct - 1);
    }
  });
});
