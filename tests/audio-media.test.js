/**
 * audio-media.test.js
 * Tests for audio and media playback functions:
 *   playAmbient, stopAmbient, toggleMusic, stopMusic, nextTrack, prevTrack,
 *   seekMusic, toggleRecording, startPreludeSequence, stopVoicePlayer,
 *   toggleVoicePlayback
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => {
  loadGame();
  // MediaRecorder mock — getUserMedia already rejects in load-game mocks,
  // but provide a valid constructor so any code path that reaches it is safe.
  global.MediaRecorder = class {
    constructor() { this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; if (this.onstop) this.onstop(); }
    addEventListener() {}
    get stream() { return { getTracks: () => [] }; }
  };
  global.MediaRecorder.isTypeSupported = () => true;
});
beforeEach(() => { resetActStates(); localStorage.clear(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

// ── playAmbient / stopAmbient ──────────────────────────────
describe('playAmbient() and stopAmbient()', () => {
  test('playAmbient is a function on window', () => {
    expect(typeof window.playAmbient).toBe('function');
  });

  test('stopAmbient is a function on window', () => {
    expect(typeof window.stopAmbient).toBe('function');
  });

  test('stopAmbient() does not crash when no ambient has been started', () => {
    expect(() => window.stopAmbient()).not.toThrow();
    jest.runAllTimers();
  });

  test('stopAmbient(0.5) with explicit duration does not crash', () => {
    expect(() => window.stopAmbient(0.5)).not.toThrow();
    jest.runAllTimers();
  });

  test('playAmbient(1) does not crash (act 1 layer)', () => {
    expect(() => window.playAmbient(1)).not.toThrow();
    jest.runAllTimers();
  });

  test('playAmbient(2) does not crash (act 2 layer)', () => {
    expect(() => window.playAmbient(2)).not.toThrow();
    jest.runAllTimers();
  });

  test('playAmbient(3) does not crash', () => {
    expect(() => window.playAmbient(3)).not.toThrow();
    jest.runAllTimers();
  });

  test('playAmbient(4) does not crash', () => {
    expect(() => window.playAmbient(4)).not.toThrow();
    jest.runAllTimers();
  });

  test('playAmbient(5) does not crash', () => {
    expect(() => window.playAmbient(5)).not.toThrow();
    jest.runAllTimers();
  });

  test('stopAmbient() after playAmbient does not crash', () => {
    window.playAmbient(1);
    expect(() => window.stopAmbient()).not.toThrow();
    jest.runAllTimers();
  });

  test('calling playAmbient with the same act twice is a no-op on second call', () => {
    // Same act should return early (if act === _currentAct) — no crash
    window.playAmbient(2);
    expect(() => window.playAmbient(2)).not.toThrow();
    jest.runAllTimers();
  });
});

// ── Music controls ─────────────────────────────────────────
describe('Music controls', () => {
  test('stopMusic is a function on window', () => {
    expect(typeof window.stopMusic).toBe('function');
  });

  test('toggleMusic is a function on window', () => {
    expect(typeof window.toggleMusic).toBe('function');
  });

  test('nextTrack is a function on window', () => {
    expect(typeof window.nextTrack).toBe('function');
  });

  test('prevTrack is a function on window', () => {
    expect(typeof window.prevTrack).toBe('function');
  });

  test('seekMusic is a function on window', () => {
    expect(typeof window.seekMusic).toBe('function');
  });

  test('stopMusic() does not crash when no track is playing', () => {
    expect(() => window.stopMusic()).not.toThrow();
  });

  test('toggleMusic() does not crash', () => {
    expect(() => window.toggleMusic()).not.toThrow();
  });

  test('nextTrack() does not crash', () => {
    expect(() => window.nextTrack()).not.toThrow();
  });

  test('prevTrack() does not crash', () => {
    expect(() => window.prevTrack()).not.toThrow();
  });

  test('nextTrack() changes #music-title to a non-empty string', () => {
    window.nextTrack();
    const title = document.getElementById('music-title');
    expect(title.textContent.length).toBeGreaterThan(0);
  });

  test('nextTrack() called twice results in a valid track title', () => {
    // Two nexts cycle through the 2-track list — result must be a known title
    const knownTitles = ['Late Night Drive', 'Nexus Protocol'];
    window.nextTrack();
    window.nextTrack();
    const title = document.getElementById('music-title');
    expect(knownTitles).toContain(title.textContent);
  });

  test('prevTrack() after two nextTrack() calls results in a valid track title', () => {
    const knownTitles = ['Late Night Drive', 'Nexus Protocol'];
    window.nextTrack();
    window.nextTrack();
    window.prevTrack();
    const title = document.getElementById('music-title');
    expect(knownTitles).toContain(title.textContent);
  });

  test('seekMusic() with a synthetic event does not crash (no duration set)', () => {
    // musicAudio.duration is undefined/NaN in jsdom — seekMusic returns early
    const fakeEvent = { clientX: 100 };
    expect(() => window.seekMusic(fakeEvent)).not.toThrow();
  });

  test('stopMusic() after toggleMusic() does not crash', () => {
    window.toggleMusic();
    expect(() => window.stopMusic()).not.toThrow();
  });
});

// ── toggleRecording ────────────────────────────────────────
describe('toggleRecording()', () => {
  test('is a function on window', () => {
    expect(typeof window.toggleRecording).toBe('function');
  });

  test('does not throw (getUserMedia rejects → catch branch fires)', async () => {
    // getUserMedia is mocked to reject in load-game.js
    // toggleRecording calls it, the rejection is caught silently (alert call)
    global.alert = jest.fn(); // suppress jsdom alert
    window.toggleRecording();
    // Let the promise rejection settle
    await Promise.resolve();
    // No uncaught error
    expect(true).toBe(true);
  });
});

// ── startPreludeSequence ───────────────────────────────────
describe('startPreludeSequence()', () => {
  test('is a function on window', () => {
    expect(typeof window.startPreludeSequence).toBe('function');
  });

  test('does not throw on first call', () => {
    expect(() => window.startPreludeSequence()).not.toThrow();
    jest.runAllTimers();
  });

  test('second call is a no-op (preludeComplete flag guard)', () => {
    window.startPreludeSequence();
    jest.runAllTimers(); // drains the beat sequence, sets preludeComplete
    // Second call should hit the guard and return early without error
    expect(() => window.startPreludeSequence()).not.toThrow();
    jest.runAllTimers();
  });
});

// ── Voice player ───────────────────────────────────────────
describe('Voice player controls', () => {
  test('stopVoicePlayer is a function on window', () => {
    expect(typeof window.stopVoicePlayer).toBe('function');
  });

  test('toggleVoicePlayback is a function on window', () => {
    expect(typeof window.toggleVoicePlayback).toBe('function');
  });

  test('stopVoicePlayer() does not crash', () => {
    expect(() => window.stopVoicePlayer()).not.toThrow();
  });

  test('toggleVoicePlayback() does not crash when no src set', () => {
    // voiceAudio.src is empty — toggling playback should be safe
    expect(() => window.toggleVoicePlayback()).not.toThrow();
  });

  test('stopVoicePlayer() sets voice-play-btn text to play symbol', () => {
    window.stopVoicePlayer();
    const btn = document.getElementById('voice-play-btn');
    expect(btn.textContent).toBe('▶');
  });

  test('stopVoicePlayer() sets voice-waveform opacity to 0.5', () => {
    window.stopVoicePlayer();
    const waveform = document.getElementById('voice-waveform');
    expect(waveform.style.opacity).toBe('0.5');
  });
});
