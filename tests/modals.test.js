/**
 * modals.test.js
 * Tests for modal close functions and miscellaneous UI functions:
 *   closeZipModal, closeHiddenModal, closeWarehouseModal, promptHiddenAlbum,
 *   answerUnknownCall, endActiveCall, openArchiveChatView, bankFeatureMsg,
 *   clearNotifPanel, onEchoTerminalExit, playRecoveredVideo, toggleVoicePlayback
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => { resetActStates(); localStorage.clear(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

// ── closeZipModal ──────────────────────────────────────────
describe('closeZipModal()', () => {
  test('is a function on window', () => {
    expect(typeof window.closeZipModal).toBe('function');
  });

  test('removes "active" from #zip-modal', () => {
    const modal = document.getElementById('zip-modal');
    modal.classList.add('active');
    window.closeZipModal();
    expect(modal.classList.contains('active')).toBe(false);
  });

  test('clears #zip-password value', () => {
    document.getElementById('zip-password').value = 'testpassword';
    window.closeZipModal();
    expect(document.getElementById('zip-password').value).toBe('');
  });

  test('hides #zip-error', () => {
    const err = document.getElementById('zip-error');
    err.style.display = 'block';
    window.closeZipModal();
    expect(err.style.display).toBe('none');
  });

  test('safe to call when modal is not active', () => {
    document.getElementById('zip-modal').classList.remove('active');
    expect(() => window.closeZipModal()).not.toThrow();
  });
});

// ── closeHiddenModal ───────────────────────────────────────
describe('closeHiddenModal()', () => {
  test('is a function on window', () => {
    expect(typeof window.closeHiddenModal).toBe('function');
  });

  test('removes "active" from #hidden-modal', () => {
    const modal = document.getElementById('hidden-modal');
    modal.classList.add('active');
    window.closeHiddenModal();
    expect(modal.classList.contains('active')).toBe(false);
  });

  test('clears #hidden-password value', () => {
    document.getElementById('hidden-password').value = 'NEXUS';
    window.closeHiddenModal();
    expect(document.getElementById('hidden-password').value).toBe('');
  });

  test('hides #hidden-error', () => {
    const err = document.getElementById('hidden-error');
    err.style.display = 'block';
    window.closeHiddenModal();
    expect(err.style.display).toBe('none');
  });

  test('safe to call when modal is not active', () => {
    document.getElementById('hidden-modal').classList.remove('active');
    expect(() => window.closeHiddenModal()).not.toThrow();
  });
});

// ── closeWarehouseModal ────────────────────────────────────
describe('closeWarehouseModal()', () => {
  test('is a function on window', () => {
    expect(typeof window.closeWarehouseModal).toBe('function');
  });

  test('removes "active" from #warehouse-modal', () => {
    const modal = document.getElementById('warehouse-modal');
    modal.classList.add('active');
    window.closeWarehouseModal();
    expect(modal.classList.contains('active')).toBe(false);
  });

  test('clears #warehouse-code value', () => {
    document.getElementById('warehouse-code').value = '1234';
    window.closeWarehouseModal();
    expect(document.getElementById('warehouse-code').value).toBe('');
  });

  test('hides #warehouse-error', () => {
    const err = document.getElementById('warehouse-error');
    err.style.display = 'block';
    window.closeWarehouseModal();
    expect(err.style.display).toBe('none');
  });

  test('safe to call when modal is not active', () => {
    document.getElementById('warehouse-modal').classList.remove('active');
    expect(() => window.closeWarehouseModal()).not.toThrow();
  });
});

// ── promptHiddenAlbum ──────────────────────────────────────
describe('promptHiddenAlbum()', () => {
  test('is a function on window', () => {
    expect(typeof window.promptHiddenAlbum).toBe('function');
  });

  test('with _hiddenAlbumUnlocked=false → shows #hidden-modal (adds "active")', () => {
    window._hiddenAlbumUnlocked = false;
    const modal = document.getElementById('hidden-modal');
    modal.classList.remove('active');
    window.promptHiddenAlbum();
    expect(modal.classList.contains('active')).toBe(true);
  });

  test('with _hiddenAlbumUnlocked=true → does not show #hidden-modal', () => {
    window._hiddenAlbumUnlocked = true;
    const modal = document.getElementById('hidden-modal');
    modal.classList.remove('active');
    window.promptHiddenAlbum();
    // Should call openAlbum('hidden') instead of showing modal
    expect(modal.classList.contains('active')).toBe(false);
  });

  test('with _hiddenAlbumUnlocked=true → does not throw', () => {
    window._hiddenAlbumUnlocked = true;
    expect(() => window.promptHiddenAlbum()).not.toThrow();
  });
});

// ── answerUnknownCall ──────────────────────────────────────
describe('answerUnknownCall()', () => {
  test('is a function on window', () => {
    expect(typeof window.answerUnknownCall).toBe('function');
  });

  test('does not throw', () => {
    window.act2State.active = true;
    expect(() => window.answerUnknownCall()).not.toThrow();
    jest.runAllTimers();
  });

  test('sets #call-status-text to "Connected"', () => {
    window.act2State.active = true;
    window.answerUnknownCall();
    expect(document.getElementById('call-status-text').textContent).toBe('Connected');
  });

  test('after 8 simulated seconds, sets #call-status-text to "Call Ended"', () => {
    window.act2State.active = true;
    window.answerUnknownCall();
    jest.advanceTimersByTime(9000);
    expect(document.getElementById('call-status-text').textContent).toBe('Call Ended');
  });
});

// ── endActiveCall ──────────────────────────────────────────
describe('endActiveCall()', () => {
  test('is a function on window', () => {
    expect(typeof window.endActiveCall).toBe('function');
  });

  test('does not throw', () => {
    expect(() => window.endActiveCall()).not.toThrow();
  });

  test('navigates to #phone-app screen', () => {
    window.endActiveCall();
    const phoneApp = document.getElementById('phone-app');
    expect(phoneApp.classList.contains('active')).toBe(true);
  });
});

// ── openArchiveChatView ────────────────────────────────────
describe('openArchiveChatView()', () => {
  test('is a function on window', () => {
    expect(typeof window.openArchiveChatView).toBe('function');
  });

  test('does not throw with a known subject id "elena"', () => {
    // archive-chat-title and archive-chat-history are not in the DOM fixture
    // so the function returns early — still must not throw
    expect(() => window.openArchiveChatView('elena')).not.toThrow();
  });

  test('does not throw with an unknown subject id', () => {
    expect(() => window.openArchiveChatView('nonexistent_subject_xyz')).not.toThrow();
  });

  test('does not throw with subject id "aarav"', () => {
    window.act4State.active = true;
    expect(() => window.openArchiveChatView('aarav')).not.toThrow();
    jest.runAllTimers();
  });
});

// ── bankFeatureMsg ─────────────────────────────────────────
describe('bankFeatureMsg()', () => {
  test('is a function on window', () => {
    expect(typeof window.bankFeatureMsg).toBe('function');
  });

  test('does not throw with feature "Transfer"', () => {
    expect(() => window.bankFeatureMsg('Transfer')).not.toThrow();
    jest.runAllTimers();
  });

  test('does not throw with feature "Pay"', () => {
    expect(() => window.bankFeatureMsg('Pay')).not.toThrow();
    jest.runAllTimers();
  });

  test('appends a toast element to #bank-app', () => {
    const bankApp = document.getElementById('bank-app');
    window.bankFeatureMsg('Transfer');
    const toast = bankApp.querySelector('#bank-toast');
    expect(toast).not.toBeNull();
  });

  test('toast contains the feature name in its text', () => {
    const bankApp = document.getElementById('bank-app');
    window.bankFeatureMsg('Transfer');
    const toast = bankApp.querySelector('#bank-toast');
    expect(toast.textContent).toMatch(/Transfer/);
  });

  test('toast shows "Unavailable" label', () => {
    const bankApp = document.getElementById('bank-app');
    window.bankFeatureMsg('Transfer');
    const toast = bankApp.querySelector('#bank-toast');
    expect(toast.textContent).toMatch(/Unavailable/);
  });

  test('second call replaces the first toast (no duplicate #bank-toast)', () => {
    const bankApp = document.getElementById('bank-app');
    window.bankFeatureMsg('Transfer');
    window.bankFeatureMsg('Pay');
    const toasts = bankApp.querySelectorAll('#bank-toast');
    expect(toasts.length).toBe(1);
  });

  test('toast auto-removes after 3s + 320ms', () => {
    const bankApp = document.getElementById('bank-app');
    window.bankFeatureMsg('Transfer');
    expect(bankApp.querySelector('#bank-toast')).not.toBeNull();
    jest.advanceTimersByTime(3400);
    expect(bankApp.querySelector('#bank-toast')).toBeNull();
  });
});

// ── clearNotifPanel ────────────────────────────────────────
describe('clearNotifPanel()', () => {
  test('is a function on window', () => {
    expect(typeof window.clearNotifPanel).toBe('function');
  });

  test('does not throw on empty panel', () => {
    expect(() => window.clearNotifPanel()).not.toThrow();
  });

  test('removes all .np-item elements from #notif-panel-list', () => {
    const list = document.getElementById('notif-panel-list');
    // Add fake notification items
    list.innerHTML += '<div class="np-item">Notif 1</div><div class="np-item">Notif 2</div>';
    expect(list.querySelectorAll('.np-item').length).toBe(2);
    window.clearNotifPanel();
    expect(list.querySelectorAll('.np-item').length).toBe(0);
  });

  test('after clearing, #notif-panel-empty is visible again', () => {
    const list = document.getElementById('notif-panel-list');
    // Add np-items directly as child elements (not via innerHTML +=, which re-parses and stales refs)
    const item = document.createElement('div');
    item.className = 'np-item';
    item.textContent = 'Notif 1';
    list.appendChild(item);
    const empty = document.getElementById('notif-panel-empty');
    empty.style.display = 'none';
    window.clearNotifPanel();
    // clearNotifPanel restores empty indicator: empty.style.display = ''
    expect(document.getElementById('notif-panel-empty').style.display).toBe('');
  });

  test('calling clearNotifPanel twice does not throw', () => {
    window.clearNotifPanel();
    expect(() => window.clearNotifPanel()).not.toThrow();
  });
});

// ── onEchoTerminalExit ─────────────────────────────────────
describe('onEchoTerminalExit()', () => {
  test('is a function on window', () => {
    expect(typeof window.onEchoTerminalExit).toBe('function');
  });

  test('does not throw', () => {
    window.act2State.active = true;
    expect(() => window.onEchoTerminalExit()).not.toThrow();
    jest.runAllTimers();
  });

  test('adds "overheating" class to #home-screen immediately', () => {
    window.act2State.active = true;
    window.onEchoTerminalExit();
    const home = document.getElementById('home-screen');
    expect(home.classList.contains('overheating')).toBe(true);
  });

  test('removes "overheating" class after 2s', () => {
    window.act2State.active = true;
    window.onEchoTerminalExit();
    jest.advanceTimersByTime(2500);
    const home = document.getElementById('home-screen');
    expect(home.classList.contains('overheating')).toBe(false);
  });
});

// ── playRecoveredVideo ─────────────────────────────────────
describe('playRecoveredVideo()', () => {
  test('is a function on window', () => {
    expect(typeof window.playRecoveredVideo).toBe('function');
  });

  test('does not throw on call', () => {
    expect(() => window.playRecoveredVideo()).not.toThrow();
    jest.runAllTimers();
  });

  test('sets #vid-text to "[CORRUPTED VIDEO STREAM]" initially', () => {
    window.playRecoveredVideo();
    const textEl = document.getElementById('vid-text');
    expect(textEl.textContent).toBe('[CORRUPTED VIDEO STREAM]');
  });

  test('#vid-progress starts at 0%', () => {
    window.playRecoveredVideo();
    const progress = document.getElementById('vid-progress');
    expect(progress.style.width).toBe('0%');
  });

  test('#vid-time starts at "00:00"', () => {
    window.playRecoveredVideo();
    const timeEl = document.getElementById('vid-time');
    expect(timeEl.textContent).toBe('00:00');
  });

  test('after 1s, progress bar transitions to 100%', () => {
    window.playRecoveredVideo();
    jest.advanceTimersByTime(1100);
    const progress = document.getElementById('vid-progress');
    expect(progress.style.width).toBe('100%');
  });
});

// ── toggleVoicePlayback ────────────────────────────────────
describe('toggleVoicePlayback() in modals context', () => {
  test('is a function on window', () => {
    expect(typeof window.toggleVoicePlayback).toBe('function');
  });

  test('does not throw when voiceAudio has no src', () => {
    expect(() => window.toggleVoicePlayback()).not.toThrow();
  });

  test('does not throw when called twice consecutively', () => {
    window.toggleVoicePlayback();
    expect(() => window.toggleVoicePlayback()).not.toThrow();
  });
});
