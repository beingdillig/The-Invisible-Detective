/**
 * act3-5.test.js
 * Tests for makeAct2Choice, tryOpenEchoLogs, submitPlayerName,
 * enterAct3Home, enterAct4Home, checkEchoRootCode, proceedToFinalChoice,
 * refuseFinalSync, openCompatibilityReport, openFinalChoiceEarly,
 * analyzeAudio, and act5EndCall.
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => {
  resetActStates();
  localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// ══════════════════════════════════════════════════════════
// makeAct2Choice
// ══════════════════════════════════════════════════════════
describe('makeAct2Choice()', () => {
  function setupAct2Chat() {
    // The function looks up allChats.find(c => c.id === 'unknown')
    // allChats is initialised by script.js — just set active
    window.act2State.active = true;
    window.act2State.act2ChoiceMade = false;
  }

  test('second call when act2ChoiceMade=true is a no-op (guard)', () => {
    setupAct2Chat();
    window.act2State.act2ChoiceMade = true;
    const chatBefore = window.allChats.find(c => c.id === 'unknown');
    const lengthBefore = chatBefore ? chatBefore.messages.length : 0;
    window.makeAct2Choice('TRUST');
    const lengthAfter = chatBefore ? chatBefore.messages.length : 0;
    // guard fired, nothing should have been appended
    expect(lengthAfter).toBe(lengthBefore);
  });

  test('makeAct2Choice("TRUST") sets act2State.act2ChoiceMade=true', () => {
    setupAct2Chat();
    window.makeAct2Choice('TRUST');
    expect(window.act2State.act2ChoiceMade).toBe(true);
  });

  test('makeAct2Choice removes #act2-choices element from DOM', () => {
    setupAct2Chat();
    // Ensure the element exists before calling
    if (!document.getElementById('act2-choices')) {
      const chatHistory = document.getElementById('chat-history');
      const div = document.createElement('div');
      div.id = 'act2-choices';
      chatHistory.appendChild(div);
    }
    expect(document.getElementById('act2-choices')).not.toBeNull();
    window.makeAct2Choice('TRUST');
    expect(document.getElementById('act2-choices')).toBeNull();
  });

  test('makeAct2Choice shows #chat-input-field (clears display:none)', () => {
    setupAct2Chat();
    const inp = document.getElementById('chat-input-field');
    inp.style.display = 'none';
    window.makeAct2Choice('TRUST');
    // The function sets inp.style.display = '' (empty string, not 'block')
    expect(inp.style.display).toBe('');
  });

  test('after makeAct2Choice("TRUST") a "me" message is appended to allChats["unknown"]', () => {
    setupAct2Chat();
    window.act2State.act2ChoiceMade = false;
    const chat = window.allChats.find(c => c.id === 'unknown');
    const before = chat ? chat.messages.length : 0;
    window.makeAct2Choice('TRUST');
    const after = chat ? chat.messages.length : 0;
    expect(after).toBeGreaterThan(before);
    const lastMsg = chat.messages[chat.messages.length - 1];
    // The player's choice is pushed as sender:'me'
    expect(lastMsg.sender).toBe('me');
    expect(lastMsg.text).toBe('TRUST');
  });
});

// ══════════════════════════════════════════════════════════
// tryOpenEchoLogs
// ══════════════════════════════════════════════════════════
describe('tryOpenEchoLogs()', () => {
  test('when rheaUnlocked=false, #echo-key-modal gets class "active"', () => {
    window.act2State.active = true;
    window.act2State.rheaUnlocked = false;
    const modal = document.getElementById('echo-key-modal');
    modal.classList.remove('active');
    window.tryOpenEchoLogs();
    expect(modal.classList.contains('active')).toBe(true);
  });

  test('when rheaUnlocked=true, echo-terminal screen becomes active', () => {
    window.act2State.active = true;
    window.act2State.rheaUnlocked = true;
    window.tryOpenEchoLogs();
    expect(document.getElementById('echo-terminal').classList.contains('active')).toBe(true);
  });

  test('safe to call when rheaUnlocked=false and modal already has class "active"', () => {
    window.act2State.rheaUnlocked = false;
    document.getElementById('echo-key-modal').classList.add('active');
    expect(() => window.tryOpenEchoLogs()).not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════
// submitPlayerName
// ══════════════════════════════════════════════════════════
describe('submitPlayerName()', () => {
  function setNameInput(val) {
    document.getElementById('act3-name-input').value = val;
  }

  test('input "Arjun" → act3State.playerName = "Arjun"', () => {
    setNameInput('Arjun');
    window.submitPlayerName();
    expect(window.act3State.playerName).toBe('Arjun');
  });

  test('empty input → act3State.playerName = "Anonymous"', () => {
    setNameInput('');
    window.submitPlayerName();
    expect(window.act3State.playerName).toBe('Anonymous');
  });

  test('whitespace-only input → act3State.playerName = "Anonymous"', () => {
    setNameInput('   ');
    window.submitPlayerName();
    expect(window.act3State.playerName).toBe('Anonymous');
  });

  test('#act3-name-modal loses "active" class after submit', () => {
    const modal = document.getElementById('act3-name-modal');
    modal.classList.add('active');
    setNameInput('Priya');
    window.submitPlayerName();
    expect(modal.classList.contains('active')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// enterAct3Home
// ══════════════════════════════════════════════════════════
describe('enterAct3Home()', () => {
  beforeEach(() => {
    window.act2State.active = true;
    window.act3State.active = true;
    // Remove mirror-app-icon if it exists from a previous test run
    const existing = document.getElementById('mirror-app-icon');
    if (existing) existing.remove();
  });

  test('home-screen gets "act3-home" class', () => {
    window.enterAct3Home();
    expect(document.getElementById('home-screen').classList.contains('act3-home')).toBe(true);
  });

  test('home-screen loses "act2-home" class if it had it', () => {
    document.getElementById('home-screen').classList.add('act2-home');
    window.enterAct3Home();
    expect(document.getElementById('home-screen').classList.contains('act2-home')).toBe(false);
  });

  test('#mirror-app-icon is appended to .app-grid', () => {
    window.enterAct3Home();
    expect(document.getElementById('mirror-app-icon')).not.toBeNull();
    const grid = document.querySelector('.app-grid');
    expect(grid.contains(document.getElementById('mirror-app-icon'))).toBe(true);
  });

  test('calling enterAct3Home twice does not create duplicate #mirror-app-icon', () => {
    window.enterAct3Home();
    window.enterAct3Home();
    const icons = document.querySelectorAll('#mirror-app-icon');
    expect(icons.length).toBe(1);
  });

  test('does not crash when called', () => {
    expect(() => window.enterAct3Home()).not.toThrow();
  });

  test('notification is fired after 500ms', () => {
    window.enterAct3Home();
    const container = document.getElementById('notification-container');
    // Before advancing time, container should not yet have the notification
    const countBefore = container.children.length;
    jest.advanceTimersByTime(600);
    // createNotification appends to notification-container
    expect(container.children.length).toBeGreaterThan(countBefore);
  });

  test('#act3-name-modal gets "active" class after 2000ms (promptPlayerName fires)', () => {
    const modal = document.getElementById('act3-name-modal');
    modal.classList.remove('active');
    window.enterAct3Home();
    jest.advanceTimersByTime(2100);
    expect(modal.classList.contains('active')).toBe(true);
  });

  test('home-screen is activated (showScreen called)', () => {
    window.enterAct3Home();
    expect(document.getElementById('home-screen').classList.contains('active')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// enterAct4Home (window.enterAct4Home — the Act-4 entry wrapper)
// Note: window.enterAct4Home uses an act4State.homeEntered guard and
// calls showScreen('home-screen') + adds 'act4-home' class. The inner
// function (triggered via triggerAct4Boot timer) handles icon injection.
// ══════════════════════════════════════════════════════════
describe('enterAct4Home()', () => {
  beforeEach(() => {
    // Reset homeEntered so each test can trigger entry
    window.act4State.active = true;
    window.act4State.homeEntered = false;
  });

  test('home-screen gets "act4-home" class', () => {
    window.enterAct4Home();
    expect(document.getElementById('home-screen').classList.contains('act4-home')).toBe(true);
  });

  test('home-screen is shown as active screen', () => {
    window.enterAct4Home();
    expect(document.getElementById('home-screen').classList.contains('active')).toBe(true);
  });

  test('act4State.homeEntered = true after first call', () => {
    window.enterAct4Home();
    expect(window.act4State.homeEntered).toBe(true);
  });

  test('second call is blocked by homeEntered guard — home-screen still active', () => {
    window.enterAct4Home();
    // Navigate away
    window._showScreen('gallery-app');
    expect(document.getElementById('home-screen').classList.contains('active')).toBe(false);
    // Second call should be no-op due to guard
    window.enterAct4Home();
    expect(document.getElementById('home-screen').classList.contains('active')).toBe(false);
  });

  test('does not crash when called', () => {
    expect(() => window.enterAct4Home()).not.toThrow();
  });

  // act4State.active is set by triggerAct4Boot before calling enterAct4Home
  test('act4State.active=true after triggerAct4Boot fires (via fast-forwarded timer)', () => {
    // Reset so triggerAct4Boot can run (its own guard: if act4State.active return)
    window.act4State.active = false;
    window.act4State.homeEntered = false;
    expect(() => window.triggerAct4Boot()).not.toThrow();
    expect(window.act4State.active).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// checkEchoRootCode
// ══════════════════════════════════════════════════════════
describe('checkEchoRootCode()', () => {
  function setCode(val) {
    document.getElementById('echo-root-code').value = val;
  }

  beforeEach(() => {
    window.act4State.active = true;
    window.act4State.rootCodeAttempts = 0;
    // Reset modal state
    document.getElementById('echo-root-modal').classList.add('active');
    document.getElementById('echo-root-error').style.display = 'none';
    document.getElementById('echo-root-code-hint').style.display = 'none';
    document.getElementById('echo-root-code').value = '';
  });

  test('correct code "CONTINUITY" → echo-root-modal loses "active" class', () => {
    setCode('CONTINUITY');
    window.checkEchoRootCode();
    expect(document.getElementById('echo-root-modal').classList.contains('active')).toBe(false);
  });

  test('wrong code → act4State.rootCodeAttempts increments by 1', () => {
    setCode('WRONGCODE');
    window.checkEchoRootCode();
    expect(window.act4State.rootCodeAttempts).toBe(1);
  });

  test('wrong code → #echo-root-error becomes visible (display="block")', () => {
    setCode('WRONGCODE');
    window.checkEchoRootCode();
    expect(document.getElementById('echo-root-error').style.display).toBe('block');
  });

  test('2 wrong attempts → #echo-root-code-hint is still hidden', () => {
    setCode('BAD1');
    window.checkEchoRootCode();
    document.getElementById('echo-root-code').value = 'BAD2';
    window.checkEchoRootCode();
    expect(document.getElementById('echo-root-code-hint').style.display).toBe('none');
  });

  test('3+ wrong attempts → #echo-root-code-hint becomes visible', () => {
    ['BAD1', 'BAD2', 'BAD3'].forEach(code => {
      document.getElementById('echo-root-code').value = code;
      window.checkEchoRootCode();
    });
    expect(document.getElementById('echo-root-code-hint').style.display).toBe('block');
  });
});

// ══════════════════════════════════════════════════════════
// proceedToFinalChoice
// ══════════════════════════════════════════════════════════
describe('proceedToFinalChoice()', () => {
  beforeEach(() => {
    window.act4State.active = true;
    window.act5State.active = true;
    window.act3State.playerName = 'TestPlayer';
    window.act3State.behaviorProfile.echoTrustScore = 75;
  });

  test('act5State.finalChoiceShown = true after call', () => {
    window.proceedToFinalChoice();
    expect(window.act5State.finalChoiceShown).toBe(true);
  });

  test('act4-final-choice screen is activated', () => {
    window.proceedToFinalChoice();
    expect(document.getElementById('act4-final-choice').classList.contains('active')).toBe(true);
  });

  test('#act4-choice-text contains player name', () => {
    window.proceedToFinalChoice();
    const text = document.getElementById('act4-choice-text').innerHTML;
    expect(text).toContain('TestPlayer');
  });

  test('#act4-choice-text contains trust score "75/100"', () => {
    window.proceedToFinalChoice();
    const text = document.getElementById('act4-choice-text').innerHTML;
    expect(text).toContain('75/100');
  });

  test('saveGame is called — localStorage is updated', () => {
    window.proceedToFinalChoice();
    expect(localStorage.getItem('tid_save_v1')).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════
// refuseFinalSync
// ══════════════════════════════════════════════════════════
describe('refuseFinalSync()', () => {
  beforeEach(() => {
    window.act3State.active = true;
    window.act4State.active = false;
    window.act5State.finalChoiceShown = false;
  });

  test('does not crash', () => {
    expect(() => window.refuseFinalSync()).not.toThrow();
  });

  test('act5State.finalChoiceShown remains false (refuse does not show final choice)', () => {
    window.refuseFinalSync();
    // The refuse path shows act3-ending then eventually boots act4 — it does NOT call proceedToFinalChoice
    expect(window.act5State.finalChoiceShown).toBe(false);
  });

  test('saveGame is called — localStorage is updated', () => {
    window.refuseFinalSync();
    expect(localStorage.getItem('tid_save_v1')).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════
// openCompatibilityReport
// ══════════════════════════════════════════════════════════
describe('openCompatibilityReport()', () => {
  beforeEach(() => {
    window.act4State.active = true;
    window.act4State.reportRead = false;
  });

  test('act4State.reportRead = true after call', () => {
    window.openCompatibilityReport();
    expect(window.act4State.reportRead).toBe(true);
  });

  test('act4-report screen is activated', () => {
    window.openCompatibilityReport();
    expect(document.getElementById('act4-report').classList.contains('active')).toBe(true);
  });

  test('saveGame is called — localStorage is updated', () => {
    window.openCompatibilityReport();
    expect(localStorage.getItem('tid_save_v1')).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════
// openFinalChoiceEarly
// ══════════════════════════════════════════════════════════
describe('openFinalChoiceEarly()', () => {
  test('act4State.active=false → does not crash, no screen change to act4-final-choice', () => {
    window.act4State.active = false;
    const before = document.getElementById('act4-final-choice').classList.contains('active');
    expect(() => window.openFinalChoiceEarly()).not.toThrow();
    expect(document.getElementById('act4-final-choice').classList.contains('active')).toBe(before);
  });

  test('act4State.active=true → does not crash', () => {
    window.act4State.active = true;
    window.act5State.active = true;
    expect(() => window.openFinalChoiceEarly()).not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════
// analyzeAudio
// ══════════════════════════════════════════════════════════
describe('analyzeAudio()', () => {
  beforeEach(() => {
    window.act3State.active = true;
    window.act3State.behaviorProfile._trustBonus = 0;
    // Ensure analyzer-result is in DOM (fixture has it)
    const el = document.getElementById('analyzer-result');
    if (el) el.innerHTML = '';
  });

  test('#analyzer-result is populated with non-empty innerHTML', () => {
    window.analyzeAudio();
    const el = document.getElementById('analyzer-result');
    expect(el.innerHTML.trim().length).toBeGreaterThan(0);
  });

  test('act3State.behaviorProfile._trustBonus incremented by 5', () => {
    window.act3State.behaviorProfile._trustBonus = 10;
    window.analyzeAudio();
    expect(window.act3State.behaviorProfile._trustBonus).toBe(15);
  });

  test('safe to call when #analyzer-result is absent', () => {
    const el = document.getElementById('analyzer-result');
    el.remove();
    expect(() => window.analyzeAudio()).not.toThrow();
    // Restore for later tests
    const audio = document.getElementById('audio-analyzer');
    const restored = document.createElement('div');
    restored.id = 'analyzer-result';
    audio.appendChild(restored);
  });
});

// ══════════════════════════════════════════════════════════
// act5EndCall
// ══════════════════════════════════════════════════════════
describe('act5EndCall()', () => {
  beforeEach(() => {
    window.act5State.active = true;
    const overlay = document.getElementById('act5-call-overlay');
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
  });

  test('does not crash', () => {
    expect(() => window.act5EndCall()).not.toThrow();
  });

  test('#act5-call-overlay is faded out (opacity set to "0")', () => {
    window.act5EndCall();
    const overlay = document.getElementById('act5-call-overlay');
    // The function immediately sets opacity = '0' before the setTimeout for display:none
    expect(overlay.style.opacity).toBe('0');
  });
});
