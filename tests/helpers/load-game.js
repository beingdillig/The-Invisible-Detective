/**
 * load-game.js
 * Loads script.js into the jsdom environment with all required mocks.
 * Strategy:
 *   - const game variables are exposed via  const x = window.x = value
 *   - function declarations are kept as-is (they hoist inside new Function scope)
 *     then aliased on window via an appended snippet
 *   - External APIs (AudioContext, Leaflet, etc.) are stubbed before eval
 */
const fs   = require('fs');
const path = require('path');
const { buildDOMFixture } = require('./dom-fixture');

// Istanbul instrumentation for coverage measurement.
// Jest's coverage system only instruments files loaded via its module resolver.
// Since script.js is loaded via new Function() (to keep const/let scoped),
// we manually run the Istanbul instrumenter so coverage counters are embedded
// in the code. Jest's babel provider reads global.__coverage__ for the results.
let _instrumenter = null;
function getInstrumenter() {
  if (_instrumenter !== null) return _instrumenter;
  try {
    const { createInstrumenter } = require('istanbul-lib-instrument');
    _instrumenter = createInstrumenter({ esModules: false, compact: false, produceSourceMap: false });
  } catch (e) {
    _instrumenter = false; // unavailable — mark as disabled
  }
  return _instrumenter;
}

// ── Browser API mocks ─────────────────────────────────────
function installMocks() {
  const mockAudioParam = () => ({
    value: 0,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
    setTargetAtTime: jest.fn(),
    cancelScheduledValues: jest.fn(),
  });
  const mockNode = () => ({
    connect: jest.fn(), start: jest.fn(), stop: jest.fn(),
    type: '',
    frequency: mockAudioParam(),
    gain: mockAudioParam(),
    Q: mockAudioParam(),
    detune: mockAudioParam(),
  });
  class MockAudioContext {
    get currentTime() { return 0; }
    get destination() { return {}; }
    createOscillator()    { return mockNode(); }
    createGain()          { return mockNode(); }
    createBiquadFilter()  { return mockNode(); }
    createBuffer(c, l)    { return { getChannelData: () => new Float32Array(l) }; }
    createBufferSource()  { return { ...mockNode(), buffer: null }; }
  }
  global.AudioContext = global.webkitAudioContext = MockAudioContext;

  Object.defineProperty(HTMLMediaElement.prototype, 'play',  { configurable: true, value: jest.fn().mockResolvedValue(undefined) });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: jest.fn() });
  Object.defineProperty(HTMLMediaElement.prototype, 'load',  { configurable: true, value: jest.fn() });

  Object.defineProperty(global.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn().mockRejectedValue(new Error('not available in test')) },
  });

  global.L = {
    map: jest.fn().mockReturnValue({ setView: jest.fn().mockReturnThis(), on: jest.fn() }),
    tileLayer: jest.fn().mockReturnValue({ addTo: jest.fn() }),
    marker: jest.fn().mockReturnValue({ addTo: jest.fn(), bindPopup: jest.fn() }),
  };

  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    clearRect: jest.fn(), fillRect: jest.fn(), beginPath: jest.fn(),
    moveTo: jest.fn(), lineTo: jest.fn(), stroke: jest.fn(),
    createLinearGradient: jest.fn().mockReturnValue({ addColorStop: jest.fn() }),
    fillStyle: '', strokeStyle: '', lineWidth: 1,
  });

  global.requestAnimationFrame = jest.fn(cb => { try { cb(0); } catch(e) {} return 0; });
  global.cancelAnimationFrame  = jest.fn();
}

// ── Script transform ──────────────────────────────────────
// Expose const state variables on window (keep the const declaration for in-scope access)
// Do NOT touch function declarations — they hoist fine; we alias them at the end instead.
function transformScript(src) {
  const varPatches = [
    // State objects
    [/^(const act2State\s*=)/m,    'const act2State=window.act2State='],
    [/^(const act3State\s*=)/m,    'const act3State=window.act3State='],
    [/^(const act4State\s*=\s*\{)/m,'const act4State=window.act4State={'],
    [/^(const act5State\s*=\s*\{)/m,'const act5State=window.act5State={'],
    [/^(const allChats\s*=)/m,     'const allChats=window.allChats='],
    [/^(const SAVE_KEY\s*=)/m,     'const SAVE_KEY=window.SAVE_KEY='],
    [/^(const MAX_NOTIFS\s*=)/m,   'const MAX_NOTIFS=window.MAX_NOTIFS='],
  ];
  varPatches.forEach(([re, rep]) => { src = src.replace(re, rep); });

  // Append window aliases for function declarations
  // (hoisted in new Function scope, but not on window by default)
  // Redirect _overheatActive to window property so resetActStates() can reset it between tests
  src = src.replace(/\blet _overheatActive = false;/, 'window._overheatActive = false;');
  src = src.replace(/\b_overheatActive\b/g, 'window._overheatActive');

  src += `
;(function __exposeInternals() {
  if(typeof showScreen==='function')        window._showScreen       = showScreen;
  if(typeof buildSaveObject==='function')   window.buildSaveObject   = buildSaveObject;
  if(typeof saveGame==='function')          window.saveGame          = saveGame;
  if(typeof loadGame==='function')          window.gameLoadFn        = loadGame;
  if(typeof clearSave==='function')         window.clearSave         = clearSave;
  if(typeof restoreFromSave==='function')   window.restoreFromSave   = restoreFromSave;
  if(typeof createNotification==='function')window.createNotification= createNotification;
  if(typeof triggerOverheat==='function')   window.triggerOverheat   = triggerOverheat;
  if(typeof triggerAct5Boot==='function')   window.triggerAct5Boot   = triggerAct5Boot;
  if(typeof lsGetProgress==='function')     window.lsGetProgress     = lsGetProgress;
  if(typeof lsPopulateLanding==='function') window.lsPopulateLanding = lsPopulateLanding;
  if(typeof openChat==='function')          window.openChat          = openChat;
  if(typeof MAX_NOTIFS!=='undefined')       window.MAX_NOTIFS        = MAX_NOTIFS;
})();`;

  return src;
}

// ── Main loader ───────────────────────────────────────────
function loadGame() {
  jest.clearAllMocks();
  installMocks();
  localStorage.clear();
  buildDOMFixture();

  const scriptPath = path.join(__dirname, '../../script.js');
  let src = fs.readFileSync(scriptPath, 'utf8');
  src = transformScript(src);

  // When Jest runs with --coverage, instrument the source so coverage counters
  // are embedded. The instrumented code writes to global.__coverage__ which
  // Jest's babel provider reads back. This is the only way to get real coverage
  // from code that's eval'd via new Function() rather than require().
  const isCoverage = typeof global.__coverage__ !== 'undefined' ||
                     process.env.JEST_WORKER_ID !== undefined && process.argv.some(a => a.includes('--coverage'));
  if (isCoverage) {
    const inst = getInstrumenter();
    if (inst) {
      try { src = inst.instrumentSync(src, scriptPath); } catch (e) { /* parse errors — skip */ }
    }
  }

  try {
    // new Function keeps const/let scoped; window.xxx assignments land on global
    // eslint-disable-next-line no-new-func
    const fn = new Function(src);
    fn.call(window);
  } catch (e) {
    if (!e.message?.includes('not defined') && !e.message?.includes('Cannot read')) {
      throw e; // re-throw unexpected errors
    }
    // Expected: some refs to DOM elements that don't exist during init
  }
}

// ── Reset act states between tests ───────────────────────
function resetActStates() {
  if (window.act2State) Object.assign(window.act2State, {
    active:false, phase:0, appsVisited:{}, appTimestamps:{},
    watcherMsgCount:0, contactRenamed:false, rheaUnlocked:false,
    echoLogsRead:false, airplaneActive:false, act2ChoiceMade:false,
    warehouseSolved:false,
  });
  if (window.act3State) Object.assign(window.act3State, {
    active:false, phase:0, galleryMutations:0, mirrorReportGenerated:false,
    echoConversationStarted:false, aaravReconstructUnlocked:false,
    loopIncidentTriggered:false, rhea_glitching:false,
    finalSyncUnlocked:false, playerName:null,
    behaviorProfile:{appCounts:{},hesitationEvents:0,emotionalChoices:0,echoTrustScore:0,archetype:null},
  });
  if (window.act4State) Object.assign(window.act4State, {
    active:false, phase:0, syncPath:null, homeEntered:false,
    reportRead:false, kabirFinalSent:false, echoMaskDropped:false,
    finalChoiceReached:false,
  });
  if (window.act5State) Object.assign(window.act5State, {
    active:false, phase:0, impossibleCallDone:false, playerPhotoDone:false,
    chatGlitchDone:false, echoEmotionalDone:false, serverNarrativeDone:false,
    finalChoiceShown:false,
  });
  window._hiddenAlbumUnlocked = false;
  window._overheatActive = false;
  localStorage.clear();
}

module.exports = { loadGame, resetActStates };
