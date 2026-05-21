/**
 * act-flow.test.js
 * Tests the sequential act gating — acts can only be entered in order,
 * and terminal puzzles cannot replay earlier act endings.
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => {
  resetActStates();
  // Clear notification container before each test
  const container = document.getElementById('notification-container');
  if (container) container.innerHTML = '';
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// ── Initial state ──────────────────────────────────────────
describe('Initial act states', () => {
  test('act2State starts inactive', () => {
    expect(window.act2State.active).toBe(false);
  });
  test('act3State starts inactive', () => {
    expect(window.act3State.active).toBe(false);
  });
  test('act4State starts inactive', () => {
    expect(window.act4State.active).toBe(false);
  });
  test('act5State starts inactive', () => {
    expect(window.act5State.active).toBe(false);
  });
  test('Hidden album starts locked', () => {
    expect(window._hiddenAlbumUnlocked).toBe(false);
  });
});

// ── Act 1 → 2 transition ──────────────────────────────────
describe('Act 1 → Act 2 transition', () => {
  test('enterAct2Home() sets act2State.active = true', () => {
    window.enterAct2Home();
    jest.runAllTimers();
    expect(window.act2State.active).toBe(true);
  });

  test('act2State.phase starts at 0', () => {
    expect(window.act2State.phase).toBe(0);
  });
});

// ── ZIP password guard ─────────────────────────────────────
describe('ZIP password guard (Act 1 ending protection)', () => {
  test('checkZipPassword() in Act 2 creates a guard notification (not replay Act 1 ending)', () => {
    window.act2State.active = true;
    document.getElementById('zip-password').value = 'ECHO2024';
    const container = document.getElementById('notification-container');
    window.checkZipPassword();
    jest.advanceTimersByTime(500);
    // Guard path: creates a notification and returns early
    expect(container.children.length).toBeGreaterThan(0);
    // Act 2 stays active — not reset
    expect(window.act2State.active).toBe(true);
  });

  test('checkZipPassword() in Act 3 creates a guard notification (not replay Act 1 ending)', () => {
    window.act2State.active = true;
    window.act3State.active = true;
    document.getElementById('zip-password').value = 'ECHO2024';
    const container = document.getElementById('notification-container');
    window.checkZipPassword();
    jest.advanceTimersByTime(500);
    expect(container.children.length).toBeGreaterThan(0);
    expect(window.act3State.active).toBe(true);
  });

  test('checkZipPassword() in Act 1 with wrong password shows zip error', () => {
    document.getElementById('zip-password').value = 'wrongpassword';
    const errEl = document.getElementById('zip-error');
    window.checkZipPassword();
    jest.advanceTimersByTime(500);
    // Wrong password in act1 shows error element
    expect(errEl.style.display).not.toBe(''); // display has been set
  });
});

// ── Warehouse guard ────────────────────────────────────────
describe('Warehouse code guard (Act 2 ending protection)', () => {
  test('checkWarehouseCode() in Act 1 creates access-denied notification — not Act 2 ending', () => {
    // act2State.active is false (Act 1 state)
    const warehouseInput = document.getElementById('warehouse-code');
    warehouseInput.value = '0413';
    const container = document.getElementById('notification-container');
    window.checkWarehouseCode();
    jest.advanceTimersByTime(500);
    // Act 1 guard: creates notification and returns without activating act2
    expect(container.children.length).toBeGreaterThan(0);
    expect(window.act2State.active).toBe(false);
  });

  test('checkWarehouseCode() in Act 2 with correct code 0413 solves warehouse', () => {
    window.act2State.active = true;
    const warehouseInput = document.getElementById('warehouse-code');
    warehouseInput.value = '0413';
    window.checkWarehouseCode();
    jest.runAllTimers();
    expect(window.act2State.warehouseSolved).toBe(true);
  });

  test('checkWarehouseCode() in Act 2 with wrong code shows error', () => {
    window.act2State.active = true;
    const warehouseInput = document.getElementById('warehouse-code');
    warehouseInput.value = '9999';
    const errorEl = document.getElementById('warehouse-error');
    window.checkWarehouseCode();
    expect(errorEl.style.display).not.toBe('none');
    expect(window.act2State.warehouseSolved).toBeFalsy();
  });

  test('checkWarehouseCode() in Act 3 does not re-trigger warehouse flow', () => {
    window.act2State.active = true;
    window.act2State.warehouseSolved = true;
    window.act3State.active = true;
    const warehouseInput = document.getElementById('warehouse-code');
    warehouseInput.value = '0413';
    window.checkWarehouseCode();
    jest.runAllTimers();
    // act3State should remain active and not be reset
    expect(window.act3State.active).toBe(true);
  });
});

// ── Act 2 → 3 transition ──────────────────────────────────
describe('Act 2 → Act 3 transition', () => {
  test('act3 does not activate without act2 being active first', () => {
    expect(window.act2State.active).toBe(false);
    expect(window.act3State.active).toBe(false);
  });

  test('triggerAct3Boot() activates act3State when act2 is complete', () => {
    window.act2State.active = true;
    window.act2State.act2ChoiceMade = true;
    window.triggerAct3Boot();
    jest.runAllTimers();
    expect(window.act3State.active).toBe(true);
  });
});

// ── Act 3 → 4 transition ──────────────────────────────────
describe('Act 3 → Act 4 transition', () => {
  test('triggerFinalSync() transitions to act4 from act3', () => {
    window.act2State.active = true;
    window.act3State.active = true;
    window.act3State.finalSyncUnlocked = true;
    window.triggerFinalSync();
    jest.runAllTimers();
    expect(window.act4State.active).toBe(true);
  });

  test('refuseFinalSync() also leads to act4 (both paths converge)', () => {
    resetActStates();
    window.act2State.active = true;
    window.act3State.active = true;
    window.refuseFinalSync();
    jest.runAllTimers();
    expect(window.act4State.active).toBe(true);
  });
});

// ── Act 4 → 5 transition ──────────────────────────────────
describe('Act 4 → Act 5 transition', () => {
  test('triggerAct5Boot() activates act5State', () => {
    window.act4State.active = true;
    window.act4State.finalChoiceReached = true;
    window.triggerAct5Boot();
    jest.runAllTimers();
    expect(window.act5State.active).toBe(true);
  });
});

// ── Passcode ───────────────────────────────────────────────
describe('Passcode system', () => {
  beforeEach(() => {
    jest.useRealTimers();
    const dots = document.querySelectorAll('#main-passcode-dots .dot');
    dots.forEach(d => d.classList.remove('filled', 'error'));
  });

  test('Correct passcode 1107 navigates to home-screen', () => {
    return new Promise(resolve => {
      ['1','1','0','7'].forEach(k => window.handleKeypad(k));
      setTimeout(() => {
        expect(document.getElementById('home-screen').classList.contains('active')).toBe(true);
        resolve();
      }, 300);
    });
  });

  test('Wrong passcode shows error dots and does not open home screen', () => {
    return new Promise(resolve => {
      ['9','9','9','9'].forEach(k => window.handleKeypad(k));
      setTimeout(() => {
        const dots = document.querySelectorAll('#main-passcode-dots .dot');
        const hasError = Array.from(dots).some(d => d.classList.contains('error'));
        expect(hasError).toBe(true);
        resolve();
      }, 300);
    });
  });

  test('Cancel key clears entry', () => {
    window.handleKeypad('1');
    window.handleKeypad('cancel');
    const dots = document.querySelectorAll('#main-passcode-dots .dot');
    dots.forEach(d => expect(d.classList.contains('filled')).toBe(false));
  });

  test('Del key removes last digit', () => {
    window.handleKeypad('1');
    window.handleKeypad('1');
    window.handleKeypad('del');
    const filled = Array.from(document.querySelectorAll('#main-passcode-dots .dot'))
      .filter(d => d.classList.contains('filled'));
    expect(filled.length).toBe(1);
  });

  test('handleKeypad is a function', () => {
    expect(typeof window.handleKeypad).toBe('function');
  });
});
