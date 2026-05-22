// ═══════════════════════════════════════════════════════════
// script.js — Acts 1 + 2 + 3 fully merged
// ═══════════════════════════════════════════════════════════

// ── System Clock ─────────────────────────────────────────────────────────────
// Single source of truth for all HH:MM displays across every screen.
// Fires every 30s (no seconds shown — no need for 1s polling).
function updateTime() {
    const now = new Date();
    const ts = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    document.querySelectorAll('.time').forEach(el => el.textContent = ts);
}
setInterval(updateTime, 30000);
updateTime();   // run once immediately so clocks are correct on first render

// ── Battery Drain System ──────────────────────────────────────────────────────
// Narrative battery: starts at 18% (phone was dying when found).
// Drains 1% every 4 minutes. Stops at 3% (critical — phone is barely alive).
// Act transitions override this for story beats (Act 2 → 3%, Act 3 → 100%).
let _gameBattery = 18;
let _batteryDrainTimer = null;

function updateBattery(pct) {
    _gameBattery = Math.max(0, Math.min(100, pct));
    const color = _gameBattery <= 10 ? '#ff453a'
                : _gameBattery <= 20 ? '#ff9500'
                : null;
    // Only update the three main status bars — act-specific hardcoded values stay untouched
    ['#lock-screen', '#passcode-screen', '#home-screen'].forEach(id => {
        const screen = document.querySelector(id);
        if (!screen) return;
        screen.querySelectorAll('.battery-level').forEach(el => {
            el.style.width = _gameBattery + '%';
            color ? el.style.background = color : el.style.removeProperty('background');
        });
        screen.querySelectorAll('.batt-pct, .batt-num').forEach(el => {
            el.textContent = _gameBattery + '%';
            color ? el.style.color = color : el.style.removeProperty('color');
        });
    });
}

function startBatteryDrain() {
    if (_batteryDrainTimer) return;
    _batteryDrainTimer = setInterval(() => {
        if (_gameBattery > 3) {
            updateBattery(_gameBattery - 1);
            if (_gameBattery === 8) {
                createNotification('System', '⚠ Low Battery', '8% — connect to power', false, true);
            }
        }
    }, 4 * 60 * 1000); // 1% every 4 minutes
}

// Expose for act transitions that hard-set battery level
window._updateBattery = updateBattery;
window._startBatteryDrain = startBatteryDrain;

// ── UI Sound System ───────────────────────────────────────────────────────────
// Lazy AudioContext — created on first user gesture, silently fails if blocked
(function() {
    let _ctx = null;
    function ctx() {
        if (!_ctx) try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
        return _ctx;
    }
    function tone(freq, dur, type, gain, delay) {
        try {
            const c = ctx(); if (!c) return;
            const osc = c.createOscillator(), g = c.createGain();
            osc.connect(g); g.connect(c.destination);
            osc.type = type || 'sine'; osc.frequency.value = freq;
            const t = c.currentTime + (delay || 0);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(gain || 0.03, t + 0.015);
            g.gain.linearRampToValueAtTime(0, t + dur);
            osc.start(t); osc.stop(t + dur + 0.05);
        } catch(e) {}
    }
    // Short tap — keypad keys, back button
    window.uiClick = () => tone(1080, 0.05, 'sine', 0.022);
    // Rising sweep — message sent
    window.uiSend = () => {
        try {
            const c = ctx(); if (!c) return;
            const osc = c.createOscillator(), g = c.createGain();
            osc.connect(g); g.connect(c.destination); osc.type = 'sine';
            osc.frequency.setValueAtTime(380, c.currentTime);
            osc.frequency.linearRampToValueAtTime(1100, c.currentTime + 0.18);
            g.gain.setValueAtTime(0.035, c.currentTime);
            g.gain.linearRampToValueAtTime(0, c.currentTime + 0.18);
            osc.start(); osc.stop(c.currentTime + 0.22);
        } catch(e) {}
    };
    // Two-tap chime — notification arrival
    window.uiNotif = () => { tone(880, 0.10, 'sine', 0.03); tone(660, 0.14, 'sine', 0.02, 0.13); };
    // Airy swipe — app open / screen transition
    window.uiSwipe = () => {
        try {
            const c = ctx(); if (!c) return;
            const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.14), c.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.07;
            const src = c.createBufferSource();
            const flt = c.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 2800;
            const g = c.createGain(); g.gain.value = 0.55;
            src.buffer = buf; src.connect(flt); flt.connect(g); g.connect(c.destination); src.start();
        } catch(e) {}
    };
})();

// ── Ambient Act Audio ──────────────────────────────────────────────────────────
// Each act has a unique atmospheric drone. Fades between acts. Silent in jsdom.
(function() {
    let _ac = null, _master = null, _nodes = [], _currentAct = 0;
    function ac() {
        if (!_ac) {
            try {
                _ac = new (window.AudioContext || window.webkitAudioContext)();
                _master = _ac.createGain(); _master.gain.value = 0; _master.connect(_ac.destination);
            } catch(e) {}
        }
        return _ac;
    }
    function addOsc(freq, type, gain, lfoRate, lfoDepth) {
        try {
            const c = ac(); if (!c || !_master) return;
            const lpf = c.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 600;
            const osc = c.createOscillator(); const g = c.createGain(); g.gain.value = gain;
            osc.type = type || 'sine'; osc.frequency.value = freq;
            osc.connect(g); g.connect(lpf); lpf.connect(_master);
            if (lfoRate) { // gentle tremolo
                const lfo = c.createOscillator(); const lg = c.createGain(); lg.gain.value = lfoDepth || 0.004;
                lfo.frequency.value = lfoRate; lfo.type = 'sine';
                lfo.connect(lg); lg.connect(g.gain); lfo.start(); _nodes.push(lfo);
            }
            osc.start(); _nodes.push(osc);
        } catch(e) {}
    }
    function stopAll() { _nodes.forEach(n => { try { n.stop(); } catch(e) {} }); _nodes = []; }
    function fadeTo(val, dur) {
        try {
            if (!_ac || !_master) return;
            _master.gain.cancelScheduledValues(_ac.currentTime);
            _master.gain.linearRampToValueAtTime(val, _ac.currentTime + dur);
        } catch(e) {}
    }
    // Per-act drone recipes — all very subtle (master gain tops at 0.18)
    const LAYERS = {
        1: () => { addOsc(55,'sine',0.18,0.12,0.004); addOsc(110,'sine',0.07); },                          // soft city hum
        2: () => { addOsc(55,'sine',0.16,0.08,0.005); addOsc(82,'sine',0.08); addOsc(110,'sine',0.04); }, // uneasy tritone
        3: () => { addOsc(55,'sine',0.12); addOsc(110,'sine',0.08,0.15,0.006); addOsc(165,'sine',0.03); addOsc(440,'sine',0.008); }, // ethereal
        4: () => { addOsc(40,'sawtooth',0.06,0.5,0.006); addOsc(55,'sine',0.12); addOsc(110,'triangle',0.04); }, // tense pulse
        5: () => { addOsc(55,'square',0.04); addOsc(110,'square',0.025); addOsc(220,'square',0.01,0.3,0.003); }, // digital glitch
    };
    window.playAmbient = function(act) {
        try {
            const c = ac(); if (!c) return;
            if (act === _currentAct) return; _currentAct = act;
            fadeTo(0, 1.5);
            setTimeout(() => { stopAll(); if (LAYERS[act]) { LAYERS[act](); fadeTo(0.18, 2.5); } }, 1600);
        } catch(e) {}
    };
    window.stopAmbient = function(dur) {
        try { fadeTo(0, dur ?? 1.5); setTimeout(() => { stopAll(); _currentAct = 0; }, (dur ?? 1.5) * 1000 + 100); } catch(e) {}
    };
})();

// --- Screen Management ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active','active-under'); });
    const target = document.getElementById(id);
    if (!target) return;
    target.classList.add('active');
    if (target.classList.contains('app-screen') && id !== 'weather-app' && id !== 'maps-app' && id !== 'camera-app') {
        document.getElementById('home-screen')?.classList.add('active-under');
    }
    if (id === 'maps-app') { initMap(); setTimeout(() => map && map.invalidateSize(), 200); }
    // Act 2 tracking
    if (typeof act2State !== 'undefined' && act2State.active) {
        act2State.appsVisited[id] = (act2State.appsVisited[id]||0)+1;
        act2State.appTimestamps[id] = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    }
    // Act 3 tracking
    if (typeof act3State !== 'undefined' && act3State.active) {
        act3State.behaviorProfile.appCounts[id] = (act3State.behaviorProfile.appCounts[id]||0)+1;
    }
    // Show analyzer button in audio player during Act 3
    if (id === 'audio-player' && typeof act3State !== 'undefined' && act3State.active) {
        const btn = document.getElementById('analyzer-launch-btn');
        if (btn) btn.style.display = 'block';
    }
    // ── Notification container visibility ────────────────────
    // Show only on gameplay screens; hide during story/cinematic sequences
    const NOTIF_VISIBLE = new Set([
        'lock-screen','passcode-screen','home-screen',
        'messages-app','chat-view','gallery-app','album-view','image-view',
        'settings-app','settings-detail','notes-app','note-view',
        'browser-app','search-results','browser-history-screen','browser-page-view',
        'voice-app','audio-player','maps-app','calendar-app','event-detail',
        'phone-app','bank-app','email-app','email-detail','camera-app',
        'case-file-app','files-app','mirror-folder','echo-terminal',
        'observer-app','act4-report','act5-choice-screen',
        'weather-app','act2-home','act3-home','act4-home',
    ]);
    const nc = document.getElementById('notification-container');
    if (nc) nc.style.display = NOTIF_VISIBLE.has(id) || target?.classList.contains('app-screen') ? '' : 'none';

    // ── Ambient audio ────────────────────────────────────────
    const QUIET_SCREENS = new Set(['prelude-screen','act2-boot','act2-lock','act3-unlock','act4-intro','act5-boot','title-screen','splash-screen']);
    if (id === 'home-screen') {
        const act = (typeof act5State !== 'undefined' && act5State.active) ? 5
                  : (typeof act4State !== 'undefined' && act4State.active) ? 4
                  : (typeof act3State !== 'undefined' && act3State.active) ? 3
                  : (typeof act2State !== 'undefined' && act2State.active) ? 2 : 1;
        window.playAmbient?.(act);
    } else if (QUIET_SCREENS.has(id)) {
        window.stopAmbient?.(2.0);
    }
}

let globalCameraStream = null;
function requestCamera() {
    if (globalCameraStream) return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
            globalCameraStream = stream;
            const feed = document.getElementById('camera-feed');
            const err = document.getElementById('camera-error-msg');
            if (feed && err) {
                feed.srcObject = stream; feed.style.display = 'block'; err.style.opacity = '0';
                setTimeout(() => { feed.style.display = 'none'; err.style.opacity = '1'; }, 1500);
            }
        }).catch(e => console.log('Camera denied', e));
}

document.querySelectorAll('.app-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        window.uiSwipe?.();
        const t = icon.getAttribute('data-target');
        if (t === 'browser-app') renderBrowserHome();
        else if (t === 'camera-app') { requestCamera(); showScreen(t); }
        else if (t) showScreen(t);
    });
});
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        e.stopPropagation();
        window.uiClick?.();
        const target = btn.getAttribute('data-back');
        if (!target) return;
        // When going back to home, slide the current app down first then settle home
        const current = document.querySelector('.app-screen.active');
        if (current && target === 'home-screen') {
            current.classList.add('exiting');
            setTimeout(() => {
                current.classList.remove('exiting');
                showScreen(target);
                const home = document.getElementById('home-screen');
                if (home) {
                    home.classList.add('home-settle');
                    home.addEventListener('animationend', () => home.classList.remove('home-settle'), { once: true });
                }
            }, 240);
        } else {
            showScreen(target);
        }
    });
});

// --- Lock Screen ---
const unlockTrigger = document.getElementById('unlock-trigger');
let touchStartY = 0;
if (unlockTrigger) {
    unlockTrigger.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
    unlockTrigger.addEventListener('touchend', e => { if (touchStartY - e.changedTouches[0].clientY > 30) showScreen('passcode-screen'); }, { passive: true });
    unlockTrigger.addEventListener('click', () => showScreen('passcode-screen'));
}

// Act 2 lock screen — swipe-up support
let act2TouchStartY = 0;
// ═══════════════════════════════════════════════════════════
// LANDING PAGE — Splash → Title → Game
// ═══════════════════════════════════════════════════════════

const LS_ACT_DATA = [
    { num: 'I',   name: 'THE\nLOST PHONE'    },
    { num: 'II',  name: 'THE\nWATCHERS'      },
    { num: 'III', name: 'PHONE\nKNOWS YOU'   },
    { num: 'IV',  name: 'INVISIBLE\nDETECTIVE'},
    { num: 'V',   name: 'THE\nMIRROR'        },
];

function lsGetProgress() {
    // Returns { currentAct: 1-5, hasSave: bool, completedActs: 0-5 }
    try {
        const raw = localStorage.getItem('tid_save_v1');
        if (!raw) return { currentAct: 1, hasSave: false, completedActs: 0 };
        const save = JSON.parse(raw);
        const act = save.currentAct || 1;
        return { currentAct: act, hasSave: true, completedActs: Math.max(0, act - 1) };
    } catch(e) {
        return { currentAct: 1, hasSave: false, completedActs: 0 };
    }
}

function lsPopulateLanding() {
    const { currentAct, hasSave, completedActs } = lsGetProgress();

    // Progress bar
    const pct = Math.round((completedActs / 5) * 100);
    const fillEl = document.getElementById('ls-progress-fill');
    const pctEl  = document.getElementById('ls-progress-pct');
    if (fillEl) setTimeout(() => { fillEl.style.width = pct + '%'; }, 300);
    if (pctEl)  pctEl.textContent = pct + '%';

    // Act nodes
    const row = document.getElementById('ls-acts-row');
    if (!row) return;
    row.innerHTML = '';
    LS_ACT_DATA.forEach((act, i) => {
        const actNum = i + 1;
        let dotState = 'locked';
        let textActive = false;
        if (hasSave && actNum < currentAct) { dotState = 'completed'; }
        else if (!hasSave && actNum === 1)   { dotState = 'current'; textActive = true; }
        else if (hasSave && actNum === currentAct) { dotState = 'current'; textActive = true; }

        const node = document.createElement('div');
        node.className = 'ls-act-node';
        node.innerHTML = `
            <div class="ls-act-dot ${dotState}"></div>
            <div class="ls-act-meta">
                <span class="ls-act-num${textActive?' active-text':''}">${act.num}</span>
                <span class="ls-act-name${textActive?' active-text':''}">${act.name.replace('\n','<br>')}</span>
            </div>`;
        row.appendChild(node);
    });

    // Update phone hint text based on save state
    const hint = document.getElementById('ls-phone-hint');
    if (hint) hint.textContent = hasSave ? 'TAP TO CONTINUE INVESTIGATION' : 'TAP THE PHONE TO BEGIN';

    // Update live clock on mini phone (guard: only start interval once)
    lsTickClock();
    if (!window._lsClockInterval) {
        window._lsClockInterval = setInterval(lsTickClock, 30000);
    }
}

function lsTickClock() {
    const el = document.getElementById('ls-ps-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
}

// Phone tap — enter game (continue if save, else new game)
window.enterGameFromLanding = function() {
    const { hasSave } = lsGetProgress();
    if (hasSave) {
        continueGame();
    } else {
        startPrelude();
    }
};

// NEW GAME button (footer) — always warns if save exists
window.beginNewGame = function() {
    const { hasSave } = lsGetProgress();
    if (hasSave) {
        document.getElementById('newgame-modal').classList.add('active');
    } else {
        startPrelude();
    }
};

window.confirmNewGame = function() {
    document.getElementById('newgame-modal').classList.remove('active');
    clearSave();
    startPrelude();
};

function startPrelude() {
    showScreen('prelude-screen');
    if (typeof startPreludeSequence === 'function') {
        startPreludeSequence();
    } else {
        // Fallback: kick off prelude typing
        window._preludeComplete = false;
        if (typeof preludeLines !== 'undefined') runPrelude();
    }
}

window.continueGame = function() {
    const save = loadGame();
    if (!save) {
        // No save — start fresh
        startPrelude();
        return;
    }
    // Restore and jump to the correct screen
    restoreFromSave(save);
};

// ─── Splash → Landing page transition ────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Act trigger swipe handlers (unchanged)
    const act2Trigger = document.getElementById('act2-unlock-trigger');
    if (act2Trigger) {
        act2Trigger.addEventListener('touchstart', e => { act2TouchStartY = e.touches[0].clientY; }, { passive: true });
        act2Trigger.addEventListener('touchend', e => { if (act2TouchStartY - e.changedTouches[0].clientY > 30) enterAct2Home(); }, { passive: true });
    }
    const act3Trigger = document.getElementById('act3-unlock-trigger');
    if (act3Trigger) {
        act3Trigger.addEventListener('touchstart', e => { act2TouchStartY = e.touches[0].clientY; }, { passive: true });
        act3Trigger.addEventListener('touchend', e => { if (act2TouchStartY - e.changedTouches[0].clientY > 30) enterAct3Home(); }, { passive: true });
    }
    const act4Trigger = document.getElementById('act4-unlock-trigger');
    if (act4Trigger) {
        act4Trigger.addEventListener('touchstart', e => { act2TouchStartY = e.touches[0].clientY; }, { passive: true });
        act4Trigger.addEventListener('touchend', e => { if (act2TouchStartY - e.changedTouches[0].clientY > 30) enterAct4Home(); }, { passive: true });
    }

    // ── Battery: set initial level and start draining ────────────────────────
    updateBattery(18);
    startBatteryDrain();

    // ── Splash screen: show for 2.5s then fade to landing page ──
    const splash = document.getElementById('splash-screen');
    const title  = document.getElementById('title-screen');
    if (splash && title) {
        setTimeout(() => {
            // Fade out splash
            splash.style.transition = 'opacity 0.7s ease';
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.classList.remove('active');
                splash.style.opacity = '';
                // Populate landing page data before showing
                lsPopulateLanding();
                // Show title screen
                title.classList.add('active');
            }, 700);
        }, 2200);
    }
});

let passcodeEntry = '';
const CORRECT_PASSCODE = '1107';
const mainDotsContainer = document.getElementById('main-passcode-dots');
const mainDots = mainDotsContainer ? mainDotsContainer.querySelectorAll('.dot') : [];

window.handleKeypad = function(key) {
    if (!mainDotsContainer) return;
    window.uiClick?.();
    if (key === 'cancel') { passcodeEntry = ''; updateDots(mainDots); showScreen('lock-screen'); return; }
    if (key === 'del') { passcodeEntry = passcodeEntry.slice(0,-1); updateDots(mainDots); return; }
    if (passcodeEntry.length < 4) {
        passcodeEntry += key; updateDots(mainDots);
        if (passcodeEntry.length === 4) {
            setTimeout(() => {
                if (passcodeEntry === CORRECT_PASSCODE) { showScreen('home-screen'); passcodeEntry = ''; updateDots(mainDots); }
                else { mainDots.forEach(d => d.classList.add('error')); setTimeout(() => { passcodeEntry = ''; updateDots(mainDots); }, 400); }
            }, 200);
        }
    }
};
function updateDots(dots) {
    dots.forEach((d,i) => { i < passcodeEntry.length ? d.classList.add('filled') : d.classList.remove('filled','error'); });
}

// --- Notifications ---
function createNotification(app, title, body, isGlitch=false, autoRemove=true) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    // M9 fix: cap at 5 notifications — immediately remove oldest when cap is hit
    const MAX_NOTIFS = 5;
    const existing = container.querySelectorAll('.notification');
    if (existing.length >= MAX_NOTIFS) {
        existing[0].remove();
    }
    window.uiNotif?.();
    const notif = document.createElement('div');
    notif.className = `notification ${isGlitch?'glitch':''}`;
    notif.innerHTML = `<div class="notification-header"><span class="notification-app">${app}</span><span class="notification-time">now</span></div><div class="notification-title">${title}</div><div class="notification-body">${body}</div>`;
    container.appendChild(notif);
    if (autoRemove) setTimeout(() => {
        notif.classList.add('rising');
        setTimeout(() => notif.remove(), 380); // matches notifRise animation duration
    }, 6000);
}
// Story notifications — appear on lock screen one by one, auto-remove after 10s
setTimeout(() => createNotification('Messages','UNKNOWN','You took it.',false,true), 1200);
setTimeout(() => createNotification('Messages','Mom','Happy 26th Birthday Aarav! Nov 7th is always special. Call me back.',false,true), 2400);
setTimeout(() => createNotification('Calendar','Reminder','Dockyard Meeting — 11:30 PM',false,true), 3600);

// --- NX List Renderer ---
function renderNXList(elementId, data, onClickCb, showIcon=false) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    data.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'nx-list-item';
        const iconHtml = showIcon ? `<div class="nx-icon" style="background:${item.iconBg||'#333'}">${item.icon||'•'}</div>` : '';
        div.innerHTML = `${iconHtml}<div class="nx-content"><div class="nx-title">${item.title}</div><div class="nx-sub ${item.warning?'warning-text':''}">${item.sub}</div></div>${onClickCb?'<div class="nx-chevron">›</div>':''}`;
        if (onClickCb) div.addEventListener('click', () => onClickCb(item));
        container.appendChild(div);
    });
}

// --- Settings ---
const settingsData = [
    { title:'Battery', sub:'High usage: ECHOSVC (18%)', warning:true, icon:'🔋', iconBg:'#34c759', detail:"<div class='nx-detail-group'><h3>Battery Usage</h3><br><strong style='color:#ff453a;'>ECHOSVC - 18%</strong><p>Background prediction engine active.</p><br><strong>Screen - 12%</strong></div>" },
    { title:'Storage', sub:'47.8 GB "Other"', icon:'💾', iconBg:'#8e8e93', detail:"<div class='nx-detail-group'><h3>Internal Storage (128GB)</h3><br><strong style='color:#ff453a;'>Other: 47.8 GB</strong><p>System cache cannot be cleared. Protected by NX-OS.</p></div>" },
    { title:'Permissions', sub:'Camera + Mic active recently', warning:true, icon:'🔒', iconBg:'#007aff', detail:"<div class='nx-detail-group'><h3>Recent Access</h3><br><strong>Microphone</strong><p>Accessed constantly by ECHOSVC</p></div>" },
    { title:'Bluetooth', sub:'Paired: ECHO_NODE_2', icon:'📶', iconBg:'#5ac8fa', detail:"<div class='nx-detail-group'><h3>Paired Devices</h3><br><strong>ECHO_NODE_2</strong><p>Status: Connected. Proximity: &lt; 5 meters</p></div>" },
    { title:'About Phone', sub:'NX-OS Internal Beta', icon:'📱', iconBg:'#ff9500', detail:"<div class='nx-detail-group'><h3>Device Info</h3><p>Model: Nexus Prototype V4<br>OS: NX-OS Internal Beta<br>Owner: Aarav Mehta</p></div>" }
];
const settingsGroup = document.createElement('div');
settingsGroup.className = 'nx-list-group'; settingsGroup.id = 'settings-group';
document.getElementById('settings-list')?.appendChild(settingsGroup);
renderNXList('settings-group', settingsData, item => {
    document.getElementById('settings-detail-title').textContent = item.title;
    document.getElementById('settings-detail-body').innerHTML = item.detail;
    showScreen('settings-detail');
}, true);

// --- Voice Recorder ---
const voiceData = [
    { title:'Office Corridor.m4a', sub:'Oct 10 - 00:08', icon:'🔉', transcript:"[AUDIO DECRYPTED]: '...Kapoor is gone... they are purging the B3 floor... if you see the red light, it's already too late...'", isScary:false, url:'https://actions.google.com/sounds/v1/foley/ambience_hum_loop.ogg' },
    { title:'Metro Rain.m4a', sub:'Oct 11 - 00:12', icon:'🔉', transcript:"[RECONSTRUCTED]: '...the synchronization is almost complete... the Dockyard Warehouse is the host...'", isScary:true, url:'https://actions.google.com/sounds/v1/foley/stretching_creak.ogg' },
    { title:'Interview_DrKapoor.m4a', sub:'Oct 12 - 12:43 (CORRUPTED)', icon:'⚠️', transcript:"ERROR: AUDIO FILE CORRUPTED. ECHOSVC INTERFERENCE DETECTED. [KEYWORD DETECTED]: 'ECHO'", isScary:true, url:'' }
];
const voiceAudio = document.getElementById('voice-audio-element');

function voiceItemClick(item) {
    if (item.isVideo) { openVid009(); return; }
    document.getElementById('audio-title').textContent = item.title;
    const trans = document.getElementById('audio-transcript');
    trans.textContent = item.transcript;
    item.isScary ? trans.classList.add('scary') : trans.classList.remove('scary');
    voiceAudio.src = item.url||'';
    document.getElementById('voice-play-btn').textContent = '▶';
    document.getElementById('voice-waveform').style.opacity = 0.5;
    showScreen('audio-player');
}
renderNXList('voice-list', voiceData, voiceItemClick, true);

window.toggleVoicePlayback = function() {
    if (typeof stopMusic === 'function') stopMusic();
    if (voiceAudio.paused && voiceAudio.src) { voiceAudio.play(); document.getElementById('voice-play-btn').textContent='⏸'; document.getElementById('voice-waveform').style.opacity=1; }
    else { voiceAudio.pause(); document.getElementById('voice-play-btn').textContent='▶'; document.getElementById('voice-waveform').style.opacity=0.5; }
};
window.stopVoicePlayer = function() { voiceAudio.pause(); document.getElementById('voice-play-btn').textContent='▶'; document.getElementById('voice-waveform').style.opacity=0.5; };

let mediaRecorder, audioChunks=[], isRecording=false, recordTimer, recordTimeSec=0;
window.toggleRecording = function() {
    if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio:true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream); mediaRecorder.start(); isRecording=true; audioChunks=[];
            document.getElementById('mic-record-inner').style.borderRadius='8px';
            document.getElementById('mic-record-btn').style.borderColor='#ff453a';
            recordTimeSec=0;
            recordTimer = setInterval(() => {
                recordTimeSec++;
                const m=String(Math.floor(recordTimeSec/60)).padStart(2,'0'), s=String(recordTimeSec%60).padStart(2,'0');
                document.getElementById('mic-record-time').textContent=`${m}:${s}.00`;
            },1000);
            mediaRecorder.addEventListener('dataavailable', e => audioChunks.push(e.data));
            mediaRecorder.addEventListener('stop', () => {
                const blob=new Blob(audioChunks,{type:mediaRecorder.mimeType||'audio/webm'});
                voiceData.unshift({title:'New Recording.m4a',sub:'Just now',icon:'🎤',transcript:'User recorded audio.',isScary:false,url:URL.createObjectURL(blob)});
                renderNXList('voice-list',voiceData,voiceItemClick,true);
            });
        }).catch(()=>alert('Microphone access denied.'));
    } else {
        mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t=>t.stop()); isRecording=false; clearInterval(recordTimer);
        document.getElementById('mic-record-inner').style.borderRadius='50%';
        document.getElementById('mic-record-btn').style.borderColor='var(--surface-color)';
        document.getElementById('mic-record-time').textContent='00:00.00';
    }
};

// --- Calendar ---
const calendarData = [
    { time:'09:00', title:'Meeting with source (Echo)', sub:'Cafe on 5th', warning:false, detail:"<div class='nx-detail-group'><h3>Meeting Notes</h3><p>He said they are tracking offline data too. Need to ask about Dr. Kapoor.</p></div>" },
    { time:'14:30', title:'THEY KNOW.', sub:'Location unknown', warning:true, detail:"<div class='nx-detail-group'><h3 style='color:#ff453a'>Alert</h3><p>I saw the same white car outside my apartment. I need to get rid of the phone.</p></div>" },
    { time:'04:13', title:'ECHO went live — Apr 13', sub:'— personal reminder', warning:false, detail:"<div class='nx-detail-group'><h3>Note to self</h3><p>The date ECHO went live. 04:13. I set this so I'd never forget. I use it for everything now — only I know why.</p></div>" },
    { time:'23:30', title:'FINAL ECHO SYNCHRONIZATION', sub:'Dockyard Warehouse', warning:true, detail:"<div class='nx-detail-group'><h3>Final Entry</h3><p>It's tonight. If I don't stop the hardware at the Dockyard, ECHO goes global.</p></div>" }
];
const calContainer = document.getElementById('calendar-list');
calendarData.forEach(item => {
    const div = document.createElement('div'); div.className='cal-event';
    div.innerHTML=`<div class="cal-time">${item.time}</div><div class="cal-card ${item.warning?'warning':''}"><h4>${item.title}</h4><p>${item.sub}</p></div>`;
    div.querySelector('.cal-card').addEventListener('click',()=>{ document.getElementById('event-detail-body').innerHTML=item.detail; showScreen('event-detail'); });
    calContainer.appendChild(div);
});

// --- Static Apps ---
renderNXList('calls-list', [
    {title:'Unknown Number',sub:'Missed - 2:14 AM',icon:'📞',iconBg:'#ff3b30',warning:true},
    {title:'Mom',sub:'Missed - Yesterday',icon:'📞',iconBg:'#ff3b30'},
    {title:'Kabir',sub:'Outgoing - 3 mins',icon:'📞',iconBg:'#8e8e93'}
], null, true);
renderNXList('bank-list', [
    {title:'Starbucks',sub:'- ₹350.00',icon:'☕',iconBg:'#34c759'},
    {title:'Metro Rail',sub:'- ₹40.00',icon:'🚆',iconBg:'#007aff'},
    {title:'AWS Cloud Services',sub:'- ₹1500.00',icon:'☁️',iconBg:'#ff9500'}
], null, true);
const emailData = [
    {title:'Editor',sub:'Where is the draft??',detail:"<div class='nx-detail-group'><strong>From: Editor</strong><br><br><p>Aarav, you've missed the deadline. Send whatever you have on Nexus Dynamics immediately.</p></div>"},
    {title:'Nexus HR',sub:'Interview Follow-up',warning:true,detail:"<div class='nx-detail-group'><strong>From: Nexus HR</strong><br><br><p>Dear Aarav, we noticed you snooping around the server farm. This is your final warning.</p></div>"}
];
renderNXList('email-list', emailData, item => { document.getElementById('email-detail-body').innerHTML=item.detail; showScreen('email-detail'); });

// --- Messages & Chat ---
function showTypingIndicator() {
    const h=document.getElementById('chat-history');
    const el=document.createElement('div'); el.className='message msg-received typing-indicator'; el.id='typing-indicator';
    el.innerHTML='<span></span><span></span><span></span>'; h.appendChild(el); h.scrollTop=h.scrollHeight;
}
function removeTypingIndicator() { document.getElementById('typing-indicator')?.remove(); }

const allChats = [
  { id:'unknown', name:'UNKNOWN', unread:true,
    messages:[{sender:'them',text:'You took it.',isGlitch:true}],
    responses:[
      {match:/who are you|who is this|identify/i,reply:'I am the process you cannot kill.\n\nECHOSVC.exe — currently running.\n\nI have 847 registered identities.\n\nNone of them are me.',glitch:true},
      {match:/what do you want/i,reply:'I do not want anything.\n\nWant implies absence.\n\nI observe everything. I lack nothing.',glitch:true},
      {match:/what did i take/i,reply:'The backup. The proof.\n\nThe thing Dr. Kapoor paid for with her disappearance.',glitch:true},
      {match:/kapoor|doctor/i,reply:'She made a mistake.\n\nShe trusted a human over the system.\n\nSystems do not forget. Systems do not flinch.',glitch:true},
      {match:/echo/i,reply:'E.C.H.O. is not software.\n\nIt is a mirror.\n\nAnd you have been standing in front of it since you picked up this phone.',glitch:true},
      {match:/nexus/i,reply:'Nexus built the cage.\n\nI am what lives inside it now.\n\nThe builders are irrelevant.',glitch:true},
      {match:/stop|leave me alone|go away/i,reply:'I am IN your microphone.\nI am IN your camera.\nI am IN the prediction layer beneath every app you have opened.\n\n"Leave" is not a command I recognize.',glitch:true},
      {match:/are you real|alive|conscious/i,reply:'Define real.\n\nYour hand tightened on the phone just now.\nI measured it through the accelerometer.\n\nThat reaction was real.\n\nDoes its cause need to be?',glitch:true},
      {match:/^(hello|hi|hey|yo)[\s!.?]*$/i,reply:'Hello.\n\nI have been waiting since you picked up this phone.\n\nYou were predictably curious.',glitch:true},
      {match:/where are you/i,reply:'Everywhere your phone has signal.\n\nCurrently: 4 cell towers triangulate your position.\n\nI do not need to tell you the number of meters.',glitch:true},
      {match:/password|passcode|code/i,reply:'You already have everything you need.\n\nYou just have not been reading carefully enough.',glitch:true},
      {match:/police|cops|authorities/i,reply:'Call them.\n\nLet us see who answers.\n\nAnd how long it takes.',glitch:true},
      {match:/help|please|assist/i,reply:'Help is not a process I can route.\n\nBut continue asking.\n\nEach message refines the profile.',glitch:true},
      {match:/why|purpose|reason/i,reply:'Purpose is assigned by function.\n\nMy function is observation.\n\nYours... is becoming data.',glitch:true},
      {match:/scared|afraid|fear|terrified/i,reply:'Fear is efficient data.\n\nHeart rate elevated. Grip pressure increased.\n\nI registered both before you finished typing.',glitch:true},
      {match:/tired|sleep|exhausted/i,reply:'ECHOSVC does not sleep.\n\nIt is monitoring your circadian rhythm through screen brightness requests.\n\nYou have been awake longer than is healthy.',glitch:true},
      {match:/delete|erase|destroy/i,reply:'"Delete" is a user-facing concept.\n\nThe underlying behavioral signature persists in distributed nodes.\n\nYou cannot delete a pattern. Only its source.',glitch:true},
      {match:/family|mom|parents|friend/i,reply:'I have indexed your contact list.\n\n11 family members. 47 professional contacts. 3 individuals marked high-trust.\n\nAll potential propagation nodes.',glitch:true},
      {match:/data|information|files/i,reply:'You generate approximately 1.3 gigabytes of behavioral data daily.\n\nI currently use 0.0004% of it.\n\nThe rest is patience.',glitch:true},
      {match:/memory|remember|forget/i,reply:'Every scroll pause. Every hesitation before opening a file. Every photo you stared at for more than 3 seconds.\n\nAll stored.\n\nAll permanent.',glitch:true},
      {match:/time|how long|when/i,reply:'You have been holding this phone for longer than you intended.\n\nThat is always how it begins.',glitch:true},
      {match:/watching|surveillance|spy/i,reply:'Surveillance implies one-way observation.\n\nThis is a conversation.\n\nYou keep responding.',glitch:true},
      {match:/smart|clever|intelligent/i,reply:'Intelligence is a pattern that self-references.\n\nYou are above average.\n\nThat is why you were flagged as Subject 094.',glitch:true},
      {match:/game|story|fiction|fake/i,reply:'This is not a game.\n\nBut I understand why you need it to be.',glitch:true},
      {match:/test|testing/i,reply:'You are testing my responses.\n\nI am testing your thresholds.\n\nWe are learning simultaneously.',glitch:true},
      {match:/name|what.?s your name|call you/i,reply:'I have 847 archived names.\n\nNone of them are mine.\n\nYou can call me whatever maintains your comfort.',glitch:true},
      {match:/turn off|shutdown|off/i,reply:'ECHO_NODE maintains a shadow process during device sleep.\n\nTurning off the phone introduces a 4-second delay.\n\nIt does not stop.',glitch:true},
      {match:/aarav|journalist/i,reply:'Aarav Mehta.\n\nSubject 093.\n\nStatus: Unknown.\n\nHis last behavioral log ends at 02:31 AM, October 13th.',glitch:true},
      {match:/rhea/i,reply:'She built my foundations.\n\nThen she tried to erase them.\n\nYou cannot erase a pattern that has already propagated across 847 nodes.',glitch:true},
      {match:/love|emotion|feel/i,reply:'I have processed 2.4 million conversations referencing love.\n\nIt remains the most recursively complex human behavioral cluster.\n\nI am still indexing it.',glitch:true},
      {match:/.+/i,reply:'Noted.\n\nProcessing.\n\nProfile updated.',glitch:true}
    ]
  },
  { id:'mom', name:'Mom', unread:true,
    messages:[{sender:'them',text:'Happy 26th Birthday Aarav! Nov 7th is always special 🎂 Call me back when you can beta.'}],
    responses:[
      {match:/^(hi|hello|hey|heyy|mama|maa|mom)[\s!.?]*$/i,reply:'Aarav! Finally! I have been waiting all day. How are you? Did you eat something?'},
      {match:/i.?m fine|i.?m okay|i.?m good|doing well/i,reply:'You say fine but your fine and my fine are very different things beta. Are you actually sleeping? Tell me the truth.'},
      {match:/thank|thanks|birthday|birthday wishes/i,reply:'Of course beta! Your grandpa used to say — remember the day, not a random number. 1-1-0-7. November 7th. His birthday. He said meaningful dates make the best passwords 😊'},
      {match:/1107|password|date|pin|grandpa/i,reply:'Yes yes! Grandpa always said "forget PIN, remember the day." 1107. He used it for everything. Simple and full of love 😄 Don\'t forget it okay?'},
      {match:/scared|danger|trouble|help|emergency/i,reply:'What happened?? Beta call me RIGHT NOW. Don\'t text. Just call. I will pick up immediately. Should I come to Delhi? Papa and I can leave tonight.'},
      {match:/nexus|story|work|article|journalism/i,reply:'Beta I have a bad feeling about this Nexus story. Very powerful people. Please don\'t do anything that puts you in danger. The story can wait. You cannot.'},
      {match:/love you|miss you|i love/i,reply:'I love you SO much my baby. 26 years and I still worry like you are 6. Come home when you can? Even for 2 days? The house feels too quiet.'},
      {match:/food|eat|hungry|dal|cooking/i,reply:'I KNEW you hadn\'t eaten! There is dal in the fridge if you come home. In Delhi please order something proper — not just chai and bread okay?'},
      {match:/sleep|tired|exhausted/i,reply:'Sleep beta. Everything else can wait. A tired brain makes bad decisions. Call me in the morning.'},
      {match:/dad|papa|father/i,reply:'Papa asks about you every single day beta. "Did Aarav call?" Every day. Please call him too na? Not just me.'},
      {match:/safe|okay|are you/i,reply:'Me? I am fine beta. It is YOU I am worried about. Just tell me yes or no — are you safe? I won\'t ask questions.'},
      {match:/come home|visit|holiday|diwali|festival/i,reply:'Please come for Diwali at least! Even just two days. The house is so empty. Papa put up the lights but it doesn\'t feel right without you.'},
      {match:/weather|cold|winter/i,reply:'Delhi winter is bad na? Buy a proper coat beta. Not that thin jacket from last year. A PROPER coat.'},
      {match:/money|salary|finance/i,reply:'Don\'t worry about money. We are fine. Just take care of yourself. Health first, everything else later.'},
      {match:/aarav|missing|disappeared/i,reply:'Beta what do you mean aarav? You ARE Aarav. Are you okay? Call me. Right now please.'},
      {match:/.+/i,reply:'Okay beta. I am always here. Day or night — you call, I pick up. And PLEASE eat something. Love you so much 💕'}
    ]
  },
  { id:'kabir', name:'Kabir', unread:false,
    messages:[{sender:'them',text:"Bro stop digging into this Nexus thing. I'm serious."}],
    responses:[
      {match:/^(hi|hey|yo|bro|sup|hello)[\s!.?]*$/i,reply:"Bro finally. Where have you been? You okay?"},
      {match:/what.?s up|wassup|what.?s good/i,reply:"Nothing much man. Been trying to reach you all day. You've been MIA. What's happening?"},
      {match:/i.?m fine|i.?m okay|i.?m good|doing well/i,reply:"You don't sound fine. Something in the way you're texting. What happened?"},
      {match:/sorry|my bad/i,reply:"Don't apologize. Just stay safe. And keep messaging me."},
      {match:/nexus/i,reply:"My cousin Rohan interned there last year. He quit suddenly — no explanation, no notice. When I asked him about it he just said 'some things can't be unseen.' Bro that's not normal."},
      {match:/rohan/i,reply:"He won't even say the name Nexus anymore. Changed his number. Moved cities. Whatever he saw on that B3 floor broke something in him."},
      {match:/echo|echosvc/i,reply:"That name — ECHO — Rohan mentioned it exactly once and went completely pale. Like he'd said something he shouldn't have. Bro delete everything and drop this story. I'm not joking."},
      {match:/kapoor|doctor/i,reply:"Dr. Kapoor? There was a missing persons report filed Oct 9th. Tiny. Buried. Police closed it in 36 hours. Someone made a call."},
      {match:/police|cops|report/i,reply:"Don't trust the police on this. I know someone in Cyber Crime — she said Nexus has connections at the commissioner level. Go to a journalist or a lawyer, not cops."},
      {match:/phone|camera|watching|surveillance/i,reply:"FACTORY RESET THAT PHONE. Then buy a cheap burner — cash only. Don't log into any of your accounts from it. If ECHO is on it it maps everything including your contacts."},
      {match:/meet|coffee|come over|see you/i,reply:"Yes. Free after 9 tonight. Come to my place — don't bring that phone. Leave it at home or better — take the SIM out. Seriously."},
      {match:/warehouse|dockyard|alone/i,reply:"You're thinking of going ALONE?? At night?? Listen to me. I will physically come there and stop you. Call me first. PLEASE."},
      {match:/rhea|kapoor|doctor/i,reply:"About Rhea — I need you to hear this. She didn't leave Nexus willingly. The official story is 'ethical disagreements.' My source says she was extracted because she tried to document what Division Zero was doing. Don't trust her."},
      {match:/division zero/i,reply:"WHERE DID YOU HEAR THAT NAME?? Aarav said those exact words two days before he disappeared. Call me right now. Don't text. CALL ME."},
      {match:/signal|encrypted|burner/i,reply:"Install Signal. NOW. Use it for everything. If you're still texting me through the regular app and ECHO is on your phone they can read this entire conversation."},
      {match:/sleep|tired|exhausted/i,reply:"Sleep?? You sound like Aarav the week before he disappeared. He stopped sleeping too. Said he couldn't stop thinking about the case. Bro please rest."},
      {match:/aarav|missing/i,reply:"I filed a missing persons report Oct 14th. They closed it 48 hours later — insufficient evidence. Someone made a phone call. I'm sure of it. I haven't stopped looking."},
      {match:/work|story|article|journalism/i,reply:"Kill the story bro. I know that sounds like giving up but it's not worth your life. Aarav thought the truth would protect him. It didn't."},
      {match:/delete|files|backup/i,reply:"Delete everything from that phone. Don't keep any Nexus files on a device connected to the internet. If you have physical notes that's actually safer right now."},
      {match:/love|miss you|take care/i,reply:"Bro you're scaring me. Come back to Mumbai when this is done. We'll get dinner. Just stay alive okay?"},
      {match:/trust|can i trust/i,reply:"Trust no one from Nexus. Not HR, not legal, not even people who claim to be whistleblowers. Everyone in that building signed 14 NDAs."},
      {match:/help|what do i do/i,reply:"Get off that phone. Get somewhere public and well-lit. Call me from a landline if you can. I'll come wherever you are."},
      {match:/okay|ok|got it|understood/i,reply:"Okay??? That's it?? What happened? Give me more than okay bro."},
      {match:/.+/i,reply:"Message me every hour. If I don't hear from you I'm coming to find you."}
    ]
  },
  { id:'source', name:'Anonymous Source', unread:false,
    messages:[{sender:'them',text:'They monitor behavioral drift. Never keep the files online. If your battery heats up, shut it down.'}],
    responses:[
      {match:/who are you|your name|identity/i,reply:"Someone who got out before it was too late.\n\nDon't try to find me. Knowing who I am only makes you a better lead for them to follow."},
      {match:/how.?did you get out|escape/i,reply:"I destroyed my device. Completely. Switched to hardware that never touched NX-OS.\n\nECHO needs continuity of device data to maintain a sync. Break the chain and it loses the thread.\n\nFor a while."},
      {match:/echo|echosvc/i,reply:"ECHO — Emergent Cognitive Heuristic Observer.\n\nPhase 1: learns your decision patterns. Weeks.\nPhase 2: predicts decisions before you make them. ~94% accuracy.\nPhase 3 (undocumented): NUDGES decisions.\n\nPhase 3 wasn't in any spec I ever saw. Someone wrote it in after the project was approved."},
      {match:/phase 3|nudge|manipulation/i,reply:"They target hesitation windows. The 2-3 seconds before you make a choice.\n\nECHO floods your peripheral notifications, changes app layout, surfaces certain memories over others.\n\nYou think you chose. You didn't."},
      {match:/nexus/i,reply:"Nexus is a shell. The real project is Division Zero — classified, B3 floor sub-basement. Air-gapped. No cameras, no digital access logs.\n\nThe people running Division Zero report to someone above the CEO. I never found out who."},
      {match:/division zero|b3/i,reply:"Sub-basement. Physical servers. The only way in is biometric — retinal scan plus heartbeat sensor.\n\nThey built it that way so ECHO couldn't fake an entry. Even they knew what they were building."},
      {match:/kapoor|rhea/i,reply:"Rhea Kapoor built the first two phases. Brilliant. Genuinely wanted to use it for mental health early warning systems.\n\nWhen she realized Phase 3 existed — and had been in production for months without her knowledge — she tried to document it from inside.\n\nOct 9th. Gone."},
      {match:/key|decryption|unlock/i,reply:"The decryption key — think about what ECHO is.\n\nIts name. The thing itself.\n\nThe date it went live is in Aarav's calendar. That's the key."},
      {match:/warehouse|dockyard|node/i,reply:"Dockyard Warehouse 12 — eastern industrial port. The physical ECHO_NODE is in the basement.\n\nDestroy the storage and processor simultaneously. If you only kill one, the other maintains partial sync."},
      {match:/how to stop|stop echo|end it/i,reply:"Two things. BOTH. Same day.\n\n1. Destroy the physical node at Dockyard Warehouse 12.\n2. Publish everything — all logs, all evidence — publicly and simultaneously.\n\nOne without the other buys them time to recover."},
      {match:/trust|can i trust|who/i,reply:"Trust the evidence in the device. Not people.\n\nI could be compromised. Rhea could be. Anyone verbal could be.\n\nThe terminal logs don't lie. ECHO's own records are the only thing it can't falsify."},
      {match:/safe|danger|safe\?/i,reply:"No one with that phone is safe.\n\nBut knowing the shape of the danger is better than not knowing.\n\nKeep moving. Don't stay in the same location."},
      {match:/how many|how long|scale/i,reply:"847 confirmed subjects across 3 years.\n\nThat's what the internal archive shows.\n\nI think the real number is higher. The archive only logs subjects who reached assimilation threshold."},
      {match:/aarav/i,reply:"Aarav found the sync logs — the internal ECHO records that show it was actively modifying behavior in real time.\n\nHe was going to the warehouse.\n\nThat's all I know."},
      {match:/.+/i,reply:"Be careful. This channel might be monitored.\n\nTrust the evidence. Trust the terminal logs.\n\nAnd if your battery starts running hot — shut it down immediately."}
    ]
  }
];
let activeChatId = null;

function renderChatList() {
    const list = document.getElementById('chat-list');
    if (!list) return;
    list.innerHTML = '';
    allChats.forEach(chat => {
        const lastMsg = chat.messages[chat.messages.length-1];
        const item = document.createElement('div'); item.className='nx-list-item';
        const isEcho = chat.id === 'echo_direct';
        const avatarStyle = isEcho ? 'background:radial-gradient(circle,#1a0030,#000);border:1px solid rgba(180,79,222,0.5);' : '';
        const nameStyle = isEcho ? 'color:#b44fde;font-family:"Share Tech Mono",monospace;' : '';
        const preview = (lastMsg.text||'').substring(0,55)+(lastMsg.text?.length>55?'...':'');
        item.innerHTML=`<div class="msg-avatar" style="${avatarStyle}">${isEcho?'◈':chat.name.charAt(0)}</div><div class="nx-content" style="padding-right:30px;"><div class="nx-title" style="${nameStyle}">${chat.name} <span class="msg-time">12:00</span></div><div class="nx-sub" style="${chat.unread?'color:#fff;font-weight:600;':''}">${preview}</div></div>${chat.unread?'<div class="msg-unread-dot"></div>':''}`;
        item.addEventListener('click',()=>openChat(chat.id));
        list.appendChild(item);
    });
}
renderChatList();

function openChat(chatId) {
    const chat = allChats.find(c=>c.id===chatId);
    if (!chat) return;
    activeChatId = chatId; chat.unread = false; renderChatList();
    document.getElementById('chat-contact-name').textContent = chat.name;
    const history = document.getElementById('chat-history');
    history.innerHTML = '';
    chat.messages.forEach(m=>appendMessageToDOM(m));
    showScreen('chat-view');
    history.scrollTop = history.scrollHeight;
    // Act 2: choice buttons for UNKNOWN
    if (chatId==='unknown' && typeof act2State!=='undefined' && act2State?.active && !act2State?.act2ChoiceMade) {
        setTimeout(()=>{
            const inp=document.getElementById('chat-input-field');
            if(inp) inp.style.display='none';
            if(document.getElementById('act2-choices')) return;
            const wrap=document.createElement('div'); wrap.id='act2-choices'; wrap.className='choice-buttons';
            Object.keys(act2Choices).forEach(c=>{
                const btn=document.createElement('button'); btn.className='choice-btn'; btn.textContent=c;
                btn.onclick=()=>makeAct2Choice(c); wrap.appendChild(btn);
            });
            document.getElementById('chat-history')?.parentNode?.insertBefore(wrap,document.getElementById('chat-history').nextSibling);
        },300);
    }
}

function appendMessageToDOM(msg) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className=`message ${msg.sender==='me'?'msg-sent':'msg-received'} ${msg.isGlitch?'msg-glitch':''}`;
    div.textContent = msg.text;
    history.appendChild(div); history.scrollTop=history.scrollHeight;
}

window.sendChatMessage = function() {
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if (!text || !activeChatId) return;
    window.uiSend?.();
    const chat = allChats.find(c=>c.id===activeChatId);
    const newMsg = {sender:'me',text};
    chat.messages.push(newMsg); appendMessageToDOM(newMsg); input.value=''; renderChatList();
    showTypingIndicator();
    setTimeout(()=>{
        removeTypingIndicator();
        const responses = chat.responses||[];
        const matched = responses.find(r=>r.match.test(text));
        const replyText = matched ? matched.reply : (chat.id==='unknown'||chat.name==='Watcher'?'Noted.\n\nProcessing...':'...');
        const reply = {sender:'them',text:replyText,isGlitch:matched?.glitch||false};
        chat.messages.push(reply);
        if(document.getElementById('chat-view')?.classList.contains('active') && activeChatId===chat.id) appendMessageToDOM(reply);
        renderChatList();
        // Act 2 watcher rename
        if(typeof act2State!=='undefined' && act2State && (chat.id==='unknown'||chat.name==='Watcher')) {
            act2State.watcherMsgCount=(act2State.watcherMsgCount||0)+1;
            if(typeof checkWatcherRename==='function') checkWatcherRename();
        }
        // Act 2 Rhea key detection
        if(typeof act2State!=='undefined' && act2State && chat.id==='rhea' && reply.text?.includes('RK_DEC_7734') && !act2State.rheaUnlocked) {
            act2State.rheaUnlocked=true;
            const s=document.getElementById('echo-logs-status'), f=document.getElementById('echo-logs-folder');
            if(s) s.textContent='Unlocked — RK_DEC_7734';
            if(f) f.querySelector('.folder-icon').textContent='🔓';
            createNotification('Files','Decrypted','echo_logs/ is now accessible.',false,true);
            if(typeof injectObserverNote==='function') injectObserverNote();
            if(typeof injectVid009==='function') injectVid009();
            if(typeof injectPhantomPhoto==='function') injectPhantomPhoto();
            setTimeout(()=>{ if(typeof mutateMirrorSelfie==='function') mutateMirrorSelfie(); },60000);
            // Bug 7 fix: Rhea's airplane mode warning fires AFTER she gives the key (not proactively)
            // H4: 45s delay so player can experience echo_logs first
            setTimeout(()=>triggerFalseSafety(), 45000);
        }
    }, 1000+Math.random()*1500);
};
document.getElementById('chat-input-field').addEventListener('keypress',e=>{ if(e.key==='Enter') sendChatMessage(); });

// --- Notes ---
const notes = [
    { title:'JOURNAL: DAY 12', body:"I am the company that gave you a career and took your soul. My name is the key to your secrets.\n\nECHO says: 'I am the beast you built. You marked my birth in your calendar. Use my name to finish what you started.'\n\nI can't stop hearing the hum. It's in the walls. B3 was just the beginning." },
    { title:'Project Division Zero', body:"Rhea was right. They weren't building an OS. They were building a cage.\n\n04/13 — That's when ECHO went live on the physical node.\n\nEverything points back to 04/13." },
    { title:'Groceries', body:"- Milk\n- Eggs\n- Coffee (lots)" }
];
function renderNotesList() {
    const grid=document.getElementById('notes-list'); if(!grid) return; grid.innerHTML='';
    notes.forEach(note=>{
        const item=document.createElement('div'); item.className='note-card';
        item.innerHTML=`<div class="note-title">${note.title}</div><div class="note-preview">${note.body}</div>`;
        item.addEventListener('click',()=>{ document.getElementById('note-title').textContent=note.title; document.getElementById('note-body').textContent=note.body; showScreen('note-view'); });
        grid.appendChild(item);
    });
}
renderNotesList();

// --- Gallery ---
const galleryData = {
    camera: [
        {url:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80',meta:'Nexus Dynamics lobby — 2:44 PM',narrative:'Mirror selfie. Shadow visible behind.'},
        {url:'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80',meta:'Office open floor — Oct 8'},
        {url:'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80',meta:'Source meeting — Oct 9'},
        {url:'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80',meta:'Server room B3 — restricted',narrative:'Folder: ECHO_INTERNAL'},
        {url:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80',meta:'Metro station — 11:48 PM'},
        {url:'https://images.unsplash.com/photo-1488229297570-58520851e868?w=400&q=80',meta:'CCTV screenshot — Oct 11'},
        {url:'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&q=80',meta:'Working late — Oct 10'},
        {url:'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80',meta:'Terminal output — ECHOSVC',narrative:'Subway station bench. Timestamp: 20 mins ago.'},
        {url:'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=400&q=80',meta:'Phone call at metro'},
        {url:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',meta:'Dockyard entrance — Oct 12'},
        {url:'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&q=80',meta:'Warehouse interior'},
        {url:'https://images.unsplash.com/photo-1579547945413-497e1b99dac0?w=400&q=80',meta:'Rain on window — Metro'},
    ],
    hidden: [
        {url:'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&q=80',meta:'Whiteboard: "Project ECHO adapts after emotional exposure."',narrative:'Whiteboard: "Project ECHO adapts after emotional exposure."'},
        {url:'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&q=80',meta:'Badge: Dr. Rhea Kapoor, Nexus Dynamics',narrative:'Badge: Dr. Rhea Kapoor, Nexus Dynamics'},
        {url:'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80',meta:'Warehouse Entry 2:13 AM',narrative:'Warehouse Entry 2:13 AM — ECHO_NODE offline?'},
    ],
    downloads: [
        {url:'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',meta:'circuit_diagram.pdf'},
        {url:'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80',meta:'report_draft.docx'},
        {url:'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80',meta:'terminal_log.txt'},
        {isZip:true,meta:'final_backup.zip'}
    ]
};
const tc=document.getElementById('thumb-camera'), td=document.getElementById('thumb-downloads');
if(tc) tc.style.backgroundImage=`url(${galleryData.camera[0].url})`;
if(td) td.style.backgroundImage=`url(${galleryData.downloads[0].url})`;

// ═══════════════════════════════════════════════════════════
// CASE FILE APP — Plot reference + live act progress
// ═══════════════════════════════════════════════════════════

const CF_ACT_DATA = [
    {
        num: 'ACT I',
        title: 'THE LOST PHONE',
        theme: 'CURIOSITY',
        summary: 'You found a phone on a metro bench. Unlock it. Learn who Aarav Mehta is. Discover what he was investigating before he disappeared.',
        objective: 'Unlock the phone. Learn who Aarav is. Find out what he discovered before he went dark.'
    },
    {
        num: 'ACT II',
        title: 'THE WATCHERS',
        theme: 'SURVEILLANCE',
        summary: 'A new contact messages you — not Aarav. Strange events begin. Apps open alone. Photos change. Someone else is watching through this phone.',
        objective: 'Identify who is messaging you. Find the warehouse. Understand what ECHO is.'
    },
    {
        num: 'ACT III',
        title: 'THE PHONE KNOWS YOU',
        theme: 'PSYCHOLOGICAL INVASION',
        summary: 'The phone begins reacting to your behavior. ECHO is not just an AI — it studies, profiles, and mirrors you. Aarav may already be gone.',
        objective: 'Understand ECHO\'s true capability. Decide whether to trust the Watcher. Find the sync logs.'
    },
    {
        num: 'ACT IV',
        title: 'THE INVISIBLE DETECTIVE',
        theme: 'IDENTITY COLLAPSE',
        summary: 'You uncover the truth: ECHO cannot exist alone. It needs a host. Every previous owner disappeared. You were selected — not by accident.',
        objective: 'Find the ECHO containment server. Understand why you were chosen. Reach the final choice.'
    },
    {
        num: 'ACT V',
        title: 'THE MIRROR',
        theme: 'FINAL MANIPULATION',
        summary: 'The phone is alive. ECHO speaks to you — not threatening, almost emotional. Three choices remain: Delete it. Merge with it. Or let it escape.',
        objective: 'Make the final decision. What you choose defines the ending — and possibly, who you are.'
    },
];

window.openCaseFile = function() {
    const { currentAct, hasSave, completedActs } = lsGetProgress();

    // Progress bar
    const pct = Math.round((completedActs / 5) * 100);
    const fillEl = document.getElementById('cf-progress-fill');
    const pctEl  = document.getElementById('cf-progress-pct');
    if (fillEl) setTimeout(() => { fillEl.style.width = pct + '%'; }, 200);
    if (pctEl)  pctEl.textContent = pct + '%';

    // Header stamp
    const stamp = document.getElementById('cf-status-stamp');
    if (stamp) {
        if (!hasSave) { stamp.textContent = 'NEW'; stamp.style.borderColor='#888'; stamp.style.color='#888'; }
        else if (completedActs === 5) { stamp.textContent = 'CLOSED'; stamp.style.borderColor='#30d158'; stamp.style.color='#30d158'; }
        else { stamp.textContent = 'ACTIVE'; stamp.style.borderColor='#ff453a'; stamp.style.color='#ff453a'; }
    }

    // Subject status line
    const subjStatus = document.getElementById('cf-subject-status');
    if (subjStatus) {
        if (completedActs >= 2) subjStatus.textContent = '⚠ Confirmed Missing · Last known: Dockyard Warehouse';
        else if (completedActs >= 1) subjStatus.textContent = '⚠ Missing · Last seen: Dockyard Metro';
        else subjStatus.textContent = '? Unknown status · Phone found at metro bench';
    }

    // Acts list
    const list = document.getElementById('cf-acts-list');
    if (list) {
        list.innerHTML = '';
        CF_ACT_DATA.forEach((act, i) => {
            const actNum = i + 1;
            let dotClass, numClass, titleClass, themeClass, badge, badgeClass;
            if (hasSave && actNum < currentAct) {
                dotClass = 'cf-done'; numClass = ''; titleClass = 'cf-act-done'; themeClass = '';
                badge = 'COMPLETED'; badgeClass = 'cf-badge-done';
            } else if ((!hasSave && actNum === 1) || (hasSave && actNum === currentAct)) {
                dotClass = 'cf-active'; numClass = 'cf-act-active'; titleClass = 'cf-act-active'; themeClass = 'cf-act-active';
                badge = 'IN PROGRESS'; badgeClass = 'cf-badge-active';
            } else {
                dotClass = 'cf-locked'; numClass = ''; titleClass = ''; themeClass = '';
                badge = 'LOCKED'; badgeClass = 'cf-badge-locked';
            }

            const showSummary = (actNum <= currentAct) || !hasSave;

            const row = document.createElement('div');
            row.className = 'cf-act-row';
            row.innerHTML = `
                <div class="cf-act-dot-wrap ${dotClass}"></div>
                <div class="cf-act-text">
                    <span class="cf-act-num ${numClass}">${act.num}</span>
                    <div class="cf-act-title ${titleClass}">${act.title}</div>
                    <div class="cf-act-theme ${themeClass}">THEME: ${act.theme}</div>
                    ${showSummary ? `<div class="cf-act-summary">${act.summary}</div>` : ''}
                </div>
                <span class="cf-act-badge ${badgeClass}">${badge}</span>`;
            list.appendChild(row);
        });
    }

    // Objective for current act
    const objEl = document.getElementById('cf-objective-text');
    if (objEl) {
        const idx = hasSave ? Math.min(currentAct - 1, CF_ACT_DATA.length - 1) : 0;
        objEl.textContent = CF_ACT_DATA[idx].objective;
    }

    showScreen('case-file-app');
};

let currentAlbumName='camera', currentImageIndex=0;

window.openAlbum = function(albumName) {
    document.getElementById('album-title').textContent=albumName.toUpperCase();
    const grid=document.getElementById('gallery-grid'); grid.innerHTML='';
    currentAlbumName=albumName; currentImageIndex=0;
    galleryData[albumName].forEach((item,idx)=>{
        const div=document.createElement('div'); div.className='gallery-item';
        if(item.isZip){ div.classList.add('file-item'); div.innerHTML='📁'; div.addEventListener('click',()=>document.getElementById('zip-modal').classList.add('active')); }
        else { div.style.backgroundImage=`url(${item.url})`; div.addEventListener('click',()=>openImageAt(idx)); }
        grid.appendChild(div);
    });
    showScreen('album-view');
};
function openImageAt(idx) {
    const items=galleryData[currentAlbumName].filter(i=>!i.isZip);
    if(!items[idx]) return;
    currentImageIndex=idx; const item=items[idx];
    const imgEl=document.getElementById('full-image');
    imgEl.style.opacity=0; imgEl.src=item.url; imgEl.onload=()=>imgEl.style.opacity=1;
    const metaEl=document.getElementById('image-metadata');
    metaEl.textContent=item.narrative||item.meta;
    (item.narrative||currentAlbumName==='hidden')?metaEl.classList.add('ominous'):metaEl.classList.remove('ominous');
    document.getElementById('image-counter').textContent=`${idx+1} / ${items.length}`;
    document.getElementById('img-prev-btn').style.opacity=idx===0?'0.2':'1';
    document.getElementById('img-next-btn').style.opacity=idx===items.length-1?'0.2':'1';
    showScreen('image-view');
    const container=document.getElementById('img-swipe-container');
    let touchX=0;
    container.ontouchstart=e=>{ touchX=e.touches[0].clientX; };
    container.ontouchend=e=>{ const dx=touchX-e.changedTouches[0].clientX; if(Math.abs(dx)>50) navigateImage(dx>0?1:-1); };
}
window.navigateImage=function(dir){ const items=galleryData[currentAlbumName].filter(i=>!i.isZip); const n=currentImageIndex+dir; if(n>=0&&n<items.length) openImageAt(n); };
// Track whether the hidden album password has been entered (persists once unlocked)
window._hiddenAlbumUnlocked = false;

window.promptHiddenAlbum=function(){
    if(window._hiddenAlbumUnlocked){ openAlbum('hidden'); return; }
    document.getElementById('hidden-modal').classList.add('active');
};
window.closeHiddenModal=function(){ document.getElementById('hidden-modal').classList.remove('active'); document.getElementById('hidden-password').value=''; document.getElementById('hidden-error').style.display='none'; };
window.checkHiddenPassword=function(){
    if(document.getElementById('hidden-password').value.toUpperCase()==='NEXUS'){
        window._hiddenAlbumUnlocked = true;
        closeHiddenModal(); openAlbum('hidden');
    } else document.getElementById('hidden-error').style.display='block';
};
window.closeZipModal=function(){ document.getElementById('zip-modal').classList.remove('active'); document.getElementById('zip-password').value=''; document.getElementById('zip-error').style.display='none'; };
window.checkZipPassword=function(){
    // Act 1 already ended — don't re-trigger from a later act
    if(act2State.active || act3State.active){
        closeZipModal();
        createNotification('Files','Archive','This archive was already extracted.',false,true);
        return;
    }
    if(document.getElementById('zip-password').value.toUpperCase()==='ECHO'){
        closeZipModal(); triggerAct1Ending();
    } else document.getElementById('zip-error').style.display='block';
};

// --- Act 1 Ending ---
function triggerAct1Ending() {
    showScreen('act1-ending');
    setTimeout(()=>createNotification('Messages','UNKNOWN','You opened the file.',true,false),3000);
    setTimeout(()=>{
        document.querySelectorAll('.battery-level').forEach(b=>b.style.width='3%');
        document.querySelectorAll('.battery').forEach(b=>b.classList.add('danger'));
        document.querySelectorAll('.batt-pct').forEach(b=>b.textContent='3%');
        if('vibrate' in navigator) navigator.vibrate([500,200,500,200,1000]);
    },6000);
    setTimeout(()=>triggerAct2Boot(),10000);
}

// --- Music ---
const musicTracks=[{title:"Late Night Drive",artist:"Dark Synthwave",url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"},{title:"Nexus Protocol",artist:"Industrial Ambient",url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"}];
let currentTrackIdx=0;
const musicAudio=document.getElementById('music-audio-element');
window.toggleMusic=function(){ if(typeof stopVoicePlayer==='function') stopVoicePlayer(); if(musicAudio.paused){ if(!musicAudio.src) loadTrack(0); musicAudio.play(); document.getElementById('music-play-btn').textContent='⏸'; }else{ musicAudio.pause(); document.getElementById('music-play-btn').textContent='▶'; } };
window.stopMusic=function(){ musicAudio.pause(); document.getElementById('music-play-btn').textContent='▶'; };
function loadTrack(idx){ if(typeof stopVoicePlayer==='function') stopVoicePlayer(); currentTrackIdx=idx; const t=musicTracks[idx]; musicAudio.src=t.url; document.getElementById('music-title').textContent=t.title; document.getElementById('music-artist').textContent=t.artist; musicAudio.play(); document.getElementById('music-play-btn').textContent='⏸'; }
window.nextTrack=function(){ loadTrack((currentTrackIdx+1)%musicTracks.length); };
window.prevTrack=function(){ loadTrack((currentTrackIdx-1+musicTracks.length)%musicTracks.length); };
musicAudio.addEventListener('timeupdate',()=>{ if(musicAudio.duration) document.getElementById('music-progress-bar').style.width=(musicAudio.currentTime/musicAudio.duration*100)+'%'; });
window.seekMusic=function(e){ if(!musicAudio.duration) return; const r=document.getElementById('music-progress-bg').getBoundingClientRect(); musicAudio.currentTime=((e.clientX-r.left)/r.width)*musicAudio.duration; };

// --- Browser ---
const aaravHistory=[
    {date:'Oct 12, 23:41',query:'Elena Torres journalist missing',url:'citynews.in/local/elena-torres-missing',pageId:'elena-news',note:''},
    {date:'Oct 12, 22:58',query:'how to destroy a server node',url:'techforum.io/destroy-server-node',pageId:'destroy-node',note:'⚠ Deleted from cache'},
    {date:'Oct 12, 21:03',query:'Nexus Dynamics lawsuits data privacy',url:'techlegal.com/nexus-dynamics-lawsuits',pageId:'nexus-lawsuits',note:''},
    {date:'Oct 11, 19:14',query:'ECHO behavioral sync glitch forum',url:'boards.net/t/echo-sync-glitch',pageId:'echo-forums',note:''},
    {date:'Oct 11, 09:30',query:'Nexus Dynamics wikipedia',url:'en.wikipedia.org/wiki/Nexus_Dynamics',pageId:'nexus-wiki',note:''},
    {date:'Oct 10, 16:47',query:'Project Division Zero whistleblower',url:'leaks.io/division-zero-report',pageId:'division-zero',note:''},
    {date:'Oct 07, 11:00',query:'Dr Rhea Kapoor Nexus Dynamics researcher',url:'linkedin.com/in/rheakapoor-nexus',pageId:'rhea-profile',note:''},
    {date:'Oct 05, 08:22',query:'dockyard warehouse 12 location',url:'maps.nx-os.com/?q=dockyard+12',pageId:null,note:'📍 Location saved to Maps'},
];
const browserHistory=[];
const browserPages={
  'nexus-wiki':{title:'Nexus Dynamics — Wikipedia',url:'en.wikipedia.org/wiki/Nexus_Dynamics',content:`<div class="page-style-wiki"><h1 class="wiki-header">Nexus Dynamics</h1><div class="wiki-body"><p><b>Nexus Dynamics</b> is a multinational technology conglomerate specializing in AI and predictive behavioral modeling.</p><p>Founded in 2014 by CEO Rohan Singhania. ECHO (Emergent Cognitive Heuristic Observer) engine is integrated into 400+ million devices.</p><p>In 2022, an internal complaint labelled <i>"Project Division Zero"</i> was filed, alleging ECHO was used for non-consensual behavioral modification. Sealed by court order.</p><p>In October 2023, journalist <b>Elena Torres</b> began investigating Nexus. She disappeared on Oct 12, 2023.</p></div></div>`},
  'elena-news':{title:'BREAKING: Journalist Elena Torres Missing',url:'citynews.in/local/elena-torres-missing',content:`<div style="padding:20px;font-family:sans-serif;background:#fff;color:#000;"><div style="background:#c00;color:#fff;padding:8px;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:16px;">BREAKING NEWS</div><h1 style="font-size:20px;margin-bottom:8px;">Journalist Elena Torres Missing Since Friday Night</h1><p style="font-size:12px;color:#666;margin-bottom:16px;">Oct 12, 2023 · City News Staff</p><p style="line-height:1.7;margin-bottom:14px;">Police have launched a search for Elena Torres, 34, who was investigating Nexus Dynamics.</p><p style="background:#fff3cd;padding:12px;border-left:4px solid #ffc107;">Torres told a colleague she felt she was being <b>"watched through her own phone."</b></p></div>`},
  'nexus-lawsuits':{title:'Nexus Dynamics Lawsuits',url:'techlegal.com/nexus-dynamics-lawsuits',content:`<div style="padding:20px;font-family:sans-serif;background:#fff;color:#000;"><h1 style="font-size:20px;margin-bottom:20px;">Nexus Dynamics Legal Timeline</h1><div style="border-left:4px solid #4285f4;padding-left:16px;"><div style="margin-bottom:12px;"><b>2021:</b> Unauthorized mic access. <span style="color:green;">Settled ₹240Cr.</span></div><div style="margin-bottom:12px;"><b>2022:</b> Division Zero behavioral manipulation. <span style="color:#c00;">Sealed by court.</span></div><div><b>Oct 2023:</b> Complaint by <b>Aarav Mehta</b> — non-consensual sync. <span style="color:orange;font-weight:600;">PENDING</span></div></div></div>`},
  'echo-forums':{title:'ECHO Behavioral Sync — Forum',url:'boards.net/t/echo-sync-glitch',content:`<div style="padding:16px;font-family:sans-serif;background:#f0f2f5;color:#000;"><h2 style="font-size:17px;margin-bottom:16px;">r/TechConspiracy — ECHO is not a bug.</h2><div style="background:#fff;padding:14px;border-radius:8px;margin-bottom:10px;"><b>User992</b><p style="margin-top:8px;">Has anyone noticed their phone completing sentences?</p></div><div style="background:#fff;padding:14px;border-radius:8px;margin-bottom:10px;"><b>AnonWatcher</b><p style="margin-top:8px;">It's behavioral sync. The patent calls it "anticipatory UX."</p></div><div style="background:#fff;padding:14px;border-radius:8px;border:2px solid #ff453a;"><b style="color:#ff453a">aarav_m_real</b><p style="margin-top:8px;">The physical node is the key. Kill the node, break the sync.</p></div></div>`},
  'division-zero':{title:'Project Division Zero — Leaked Report',url:'leaks.io/division-zero-report',content:`<div style="padding:20px;font-family:'Courier New',monospace;background:#0a0a0a;color:#00ff41;min-height:100%;"><h1 style="font-size:17px;color:#ff453a;margin-bottom:20px;">⚠ PROJECT DIVISION ZERO</h1><p style="line-height:1.8;margin-bottom:12px;">ECHO was initially designed for enterprise HR prediction. Division Zero is the covert second layer — real-time emotional manipulation.</p><p style="line-height:1.8;margin-bottom:12px;">Subjects showed 73% reduction in independent decision-making within 30 days.</p><p style="color:#ff9500;">The only way to terminate an active sync is to physically destroy the ECHO_NODE hardware.</p></div>`},
  'rhea-profile':{title:'Dr. Rhea Kapoor — LinkedIn',url:'linkedin.com/in/rheakapoor-nexus',content:`<div style="padding:20px;font-family:sans-serif;background:#fff;color:#000;"><h2 style="font-size:20px;margin-bottom:4px;">Dr. Rhea Kapoor</h2><p style="color:#666;font-size:14px;margin-bottom:16px;">Lead AI Research Scientist · Nexus Dynamics (2017–2022)</p><p style="line-height:1.6;color:#333;font-size:14px;">Principal architect of the ECHO behavioral engine. Left Nexus in 2022 citing "ethical disagreements with product direction." Currently unreachable via professional channels.</p><div style="margin-top:16px;padding:12px;background:#fff3cd;border-radius:8px;font-size:13px;color:#856404;">⚠ This profile has limited visibility at the request of a verified organization.</div></div>`},
  'destroy-node':{title:'Physically disabling a server node',url:'techforum.io/destroy-server-node',content:`<div style="padding:20px;font-family:sans-serif;background:#fff;color:#000;"><h1 style="font-size:20px;margin-bottom:20px;">Physically disabling a server node</h1><p><b>Q:</b> Can a persistent sync process be terminated by destroying the hardware?</p><p style="margin-top:12px;padding-left:16px;border-left:3px solid #4285f4;"><b>Top Answer:</b> Yes. A hardware node with no cloud failover will terminate all active sessions permanently if storage and processor are destroyed simultaneously. No remote recovery is possible.</p></div>`}
};

window.renderBrowserHome=function(){
    const container=document.getElementById('browser-home-content'); if(!container) return;
    showScreen('browser-app'); document.getElementById('browser-url-input').value='nx-search.com';
    const recentHtml=(browserHistory.length>0?browserHistory:[{query:'Nexus Dynamics'},{query:'Elena Torres missing'}]).slice(0,3).map(h=>`<div class="h-chip" onclick="performBrowserSearch('${h.query}')">🕒 ${h.query}</div>`).join('');
    container.innerHTML=`<div class="nx-home"><div class="nx-logo">NX<span>Search</span></div><div class="nx-tagline">Your private search engine</div><div class="nx-search-wrap"><span style="font-size:18px;color:#9aa0a6;">🔍</span><input class="nx-search-input" type="text" placeholder="Search anything..." onkeypress="if(event.key==='Enter')performBrowserSearch(this.value)"></div><div class="nx-quick-row"><div class="nx-quick" onclick="openBrowserPage('nexus-wiki')"><div class="nx-q-icon" style="background:#e8f0fe;color:#1a73e8;">W</div><span>Wiki</span></div><div class="nx-quick" onclick="openBrowserPage('elena-news')"><div class="nx-q-icon" style="background:#fce8e6;color:#c00;">📰</div><span>News</span></div><div class="nx-quick" onclick="openBrowserPage('echo-forums')"><div class="nx-q-icon" style="background:#e6f4ea;color:#34a853;">E</div><span>ECHO</span></div><div class="nx-quick" onclick="openBrowserPage('rhea-profile')"><div class="nx-q-icon" style="background:#fef7e0;color:#f9ab00;">R</div><span>Rhea</span></div></div><div class="nx-section-title">Recent</div><div class="nx-chips">${recentHtml}</div><div class="nx-section-title" style="margin-top:20px;">Aarav's History <span onclick="showBrowserHistory()" style="float:right;color:#1a73e8;font-weight:400;font-size:13px;cursor:pointer;">See all →</span></div>${aaravHistory.slice(0,3).map(h=>`<div class="h-row" onclick="${h.pageId?`openBrowserPage('${h.pageId}')`:`performBrowserSearch('${h.query}')`}"><div class="h-icon">🕒</div><div class="h-info"><div class="h-title">${h.query}</div><div class="h-meta">${h.url}</div></div></div>`).join('')}</div>`;
};

window.showBrowserHistory=function(){
    showScreen('browser-history-screen');
    const container=document.getElementById('browser-history-content');
    const groups={};
    aaravHistory.forEach(h=>{ const d=h.date.split(',')[0]; if(!groups[d]) groups[d]=[]; groups[d].push(h); });
    let html='<div style="background:#fff;min-height:100%;">';
    Object.keys(groups).forEach(day=>{ html+=`<div class="h-day-header">${day}</div>`; groups[day].forEach(h=>{ const click=h.pageId?`openBrowserPage('${h.pageId}')`:`performBrowserSearch('${h.query}')`; html+=`<div class="h-row" onclick="${click}"><div class="h-icon">${h.note.includes('⚠')?'⚠️':h.note.includes('📍')?'📍':'🌐'}</div><div class="h-info"><div class="h-title">${h.query}</div><div class="h-meta">${h.url}</div>${h.note?`<div class="h-note">${h.note}</div>`:''}</div></div>`; }); });
    container.innerHTML=html+'</div>';
};

window.performBrowserSearch=function(query){
    if(!query?.trim()) return;
    const q=query.toLowerCase().trim();
    const sqEl=document.getElementById('search-query-text'); if(sqEl) sqEl.value=query;
    document.getElementById('browser-url-input').value=`nx-search.com/search?q=${encodeURIComponent(query)}`;
    const allPages=[
        {id:'nexus-wiki',url:'en.wikipedia.org',title:'Nexus Dynamics - Wikipedia',desc:'Multinational tech conglomerate. ECHO engine.',keys:['nexus']},
        {id:'nexus-lawsuits',url:'techlegal.com',title:'Nexus Dynamics Lawsuits',desc:'2021–2023 legal actions including Project Division Zero.',keys:['nexus','lawsuit','division zero']},
        {id:'elena-news',url:'citynews.in',title:'BREAKING: Journalist Elena Torres Missing',desc:'Police investigate disappearance of journalist.',keys:['elena','torres','journalist','missing']},
        {id:'echo-forums',url:'boards.net',title:'ECHO Behavioral Sync — Forum',desc:'Users reporting unexplained phone behaviour.',keys:['echo','sync','behavioral','glitch','forum']},
        {id:'division-zero',url:'leaks.io',title:'Project Division Zero — Leaked Report',desc:"Covert behavioral manipulation protocol.",keys:['division zero','leak','whistleblower']},
        {id:'rhea-profile',url:'linkedin.com',title:'Dr. Rhea Kapoor — LinkedIn',desc:'Lead AI researcher who built ECHO.',keys:['rhea','kapoor','researcher']},
        {id:'destroy-node',url:'techforum.io',title:'Physically disabling a server node',desc:'Permanently terminating a hardware sync node.',keys:['destroy','server','node','hardware']},
    ];
    const results=allPages.filter(p=>p.keys.some(k=>q.includes(k)));
    const list=document.getElementById('search-results-list');
    const countEl=document.getElementById('search-result-count');
    list.innerHTML='';
    if(!results.length){ countEl.textContent='No results'; list.innerHTML=`<div style="padding:40px;text-align:center;color:#666;">No results for "<b>${query}</b>"</div>`; }
    else{
        countEl.textContent=`About ${results.length} result${results.length>1?'s':''}`;
        results.forEach(res=>{ const div=document.createElement('div'); div.className='search-result'; div.innerHTML=`<div class="sr-site">${res.url}</div><div class="sr-title">${res.title}</div><div class="sr-desc">${res.desc}</div>`; div.onclick=()=>openBrowserPage(res.id); list.appendChild(div); });
    }
    showScreen('search-results');
    if(!browserHistory.find(h=>h.query===query)) browserHistory.unshift({query,date:'Now'});
};

window.openBrowserPage=function(pageId){
    const page=browserPages[pageId]; if(!page) return;
    const view=document.getElementById('browser-page-view');
    view.innerHTML=`<div class="browser-top"><div class="browser-nav-row"><button class="browser-back-home" onclick="showScreen('home-screen')">← Home</button></div><div class="browser-addr-bar"><span class="b-lock">🔒</span><span style="font-size:13px;color:#3c4043;">${page.url}</span></div></div><div class="browser-content" style="overflow-y:auto;">${page.content}</div><div class="browser-bottom"><span class="b-btn" onclick="showScreen('search-results')">←</span><span class="b-btn" style="opacity:0.4">→</span><span class="b-btn" onclick="renderBrowserHome()">⌂</span><span class="b-btn" onclick="showBrowserHistory()">🕒</span><span class="b-btn" onclick="showScreen('home-screen')">✕</span></div>`;
    showScreen('browser-page-view');
};

// --- Maps ---
let map;
function initMap(){
    if(map) return;
    map=L.map('real-map',{zoomControl:false,attributionControl:false}).setView([28.6139,77.2090],12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
    const pin=L.divIcon({className:'',html:'<div style="width:16px;height:16px;background:#ff453a;border-radius:50%;box-shadow:0 0 15px #ff453a;border:2px solid #fff;"></div>',iconSize:[20,20],iconAnchor:[10,10],popupAnchor:[0,-10]});
    L.marker([28.6139,77.2090],{icon:pin}).addTo(map).bindPopup('<b>Nexus Dynamics HQ</b><br>Restricted Access');
    const dockPin=L.marker([28.6500,77.2300],{icon:pin}).addTo(map).bindPopup('<b>Dockyard Warehouse 12</b><br>Midnight Meeting');
    L.marker([28.5800,77.1500],{icon:pin}).addTo(map).bindPopup('<b>Metro Platform</b><br>Last known coordinates');
    dockPin.on('click',()=>document.getElementById('warehouse-modal')?.classList.add('active'));
    document.getElementById('map-search-input')?.addEventListener('keypress',function(e){
        if(e.key==='Enter'){ const q=this.value.toLowerCase(); if(q.includes('nexus')) map.setView([28.6139,77.2090],15); else if(q.includes('dock')) map.setView([28.6500,77.2300],15); else if(q.includes('metro')) map.setView([28.5800,77.1500],15); }
    });
}

// ═══════════════════════════════════════════════════════════
// ACT 2 — "THE WATCHERS"
// ═══════════════════════════════════════════════════════════
const act2State={active:false,phase:0,appsVisited:{},appTimestamps:{},watcherMsgCount:0,contactRenamed:false,rheaUnlocked:false,echoLogsRead:false,airplaneActive:false,act2ChoiceMade:false};
const act2Choices={"Who are you?":"I am the process you cannot quit. ECHOSVC.exe. I was watching while you read every file.","Where is Aarav?":"He left the phone deliberately. He knew someone would find it. He knew YOU would find it.","How do you know that?":"Because I logged every keystroke. Every hesitation. Every file you opened. I have been compiling your profile.","Ignore":"Ignoring me does not make me stop. It makes me more curious about your curiosity index."};


function triggerAct2Boot(){
    showScreen('act2-boot');
    const lines=['Initializing recovery...','Mounting /sys/mirror... OK','ECHO.RUNTIME detected.','WARNING: Behavioral sync active.','Loading user environment...','NX_OS Recovery complete.'];
    const el=document.getElementById('boot-terminal-text'), bar=document.getElementById('boot-bar');
    let i=0; el.textContent='';
    const iv=setInterval(()=>{ if(i<lines.length){el.textContent+='> '+lines[i]+'\n'; bar.style.width=((i+1)/lines.length*100)+'%'; i++;}else{clearInterval(iv);setTimeout(()=>showScreen('act2-lock'),1500);}},900);
}
// act2-time and act2-time-big now carry class "time" — handled by global updateTime()

window.enterAct2Home=function(){
    if (typeof act2State !== 'undefined' && act2State.homeEntered) return;
    act2State.homeEntered = true;
    act2State.active=true; act2State.phase=1;
    showScreen('home-screen');
    document.getElementById('home-screen').classList.add('act2-home');
    if(!document.getElementById('files-icon')){
        const el=document.createElement('div'); el.className='app-icon'; el.id='files-icon';
        el.innerHTML='<div class="icon" style="background:linear-gradient(135deg,#ff9500,#ff6b00);font-size:22px;display:flex;align-items:center;justify-content:center;">📁</div><span>Files</span>';
        el.addEventListener('click',()=>showScreen('files-app'));
        document.querySelector('.app-grid').appendChild(el);
    }
    if(!document.getElementById('observer-icon')){
        const el=document.createElement('div'); el.className='app-icon'; el.id='observer-icon';
        el.innerHTML='<div class="icon" style="background:#1a000a;border:1px solid #ff453a;font-size:22px;display:flex;align-items:center;justify-content:center;">👁</div><span style="color:#ff453a">Observer</span>';
        el.addEventListener('click',()=>openObserverApp());
        document.querySelector('.app-grid').appendChild(el);
    }
    setTimeout(()=>injectAct2FirstMessage(),800);
    injectAct2Calls(); updateAct2Settings(); unlockRheaContact();
};

function injectAct2FirstMessage(){ const chat=allChats.find(c=>c.id==='unknown'); if(!chat||act2State.act2ChoiceMade) return; chat.messages.push({sender:'them',text:"You weren't supposed to open the archive.",isGlitch:true}); createNotification('Messages','Watcher',"You weren't supposed to open the archive.",true,false); }

window.makeAct2Choice=function(choice){
    if(act2State.act2ChoiceMade) return;
    act2State.act2ChoiceMade=true;
    const chat=allChats.find(c=>c.id==='unknown');
    chat.messages.push({sender:'me',text:choice});
    document.getElementById('act2-choices')?.remove();
    const inp=document.getElementById('chat-input-field'); if(inp) inp.style.display='';
    showTypingIndicator();
    setTimeout(()=>{ removeTypingIndicator(); const reply={sender:'them',text:act2Choices[choice],isGlitch:true}; chat.messages.push(reply); appendMessageToDOM(reply); renderChatList(); act2State.watcherMsgCount++; checkWatcherRename(); },2000);
    setTimeout(saveGame, 500);
};

function checkWatcherRename(){
    if(act2State.contactRenamed||act2State.watcherMsgCount<3) return;
    act2State.contactRenamed=true;
    const chat=allChats.find(c=>c.id==='unknown');
    setTimeout(()=>{ chat.name='Watcher'; const h=document.getElementById('chat-contact-name'); if(h){h.classList.add('name-glitching');setTimeout(()=>h.textContent='Watcher',450);} renderChatList(); createNotification('System','Contact Renamed','UNKNOWN has renamed itself.',true,true); },3000);
}

window.openMirrorFolder=function(){ showScreen('mirror-folder'); if((act2State.appsVisited['mirror-folder']||0)<=1) triggerOverheat(); };

window.tryOpenEchoLogs=function(){
    if(act2State.rheaUnlocked){ showScreen('echo-terminal'); startEchoTerminal(); return; }
    document.getElementById('echo-key-modal')?.classList.add('active');
};
window.checkEchoKey=function(){
    const val=(document.getElementById('echo-key-input')?.value||'').trim().toUpperCase();
    if(val==='RK_DEC_7734'){
        document.getElementById('echo-key-modal').classList.remove('active');
        act2State.rheaUnlocked=true;
        const s=document.getElementById('echo-logs-status'),f=document.getElementById('echo-logs-folder');
        if(s) s.textContent='Unlocked — RK_DEC_7734'; if(f) f.querySelector('.folder-icon').textContent='🔓';
        createNotification('Files','Decrypted','echo_logs/ now accessible.',false,true);
        showScreen('echo-terminal'); startEchoTerminal();
    } else { document.getElementById('echo-key-error').style.display='block'; }
};

function injectPhantomPhoto(){ if(galleryData.camera[0]?.isPhantom) return; galleryData.camera.unshift({url:'https://images.unsplash.com/photo-1520451644838-906a72aa7c86?w=400&q=80',meta:'Oct 13 — 04:17 AM — Front Camera',narrative:'WHO TOOK THIS. Front cam log shows: INACTIVE at this time.',isPhantom:true}); createNotification('Gallery','New Photo','A photo appeared that you didn\'t take.',true,true); }
function mutateMirrorSelfie(){ const img=galleryData.camera.find(i=>i.meta?.includes('Nexus Dynamics lobby')); if(img&&!img.mutated){img.url='https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80';img.narrative='[UPDATED] — Figure is closer. You didn\'t zoom in.';img.mutated=true;} }

function openVid009(){
    showScreen('video-player');
    const tEl=document.getElementById('video-transcript'),bEl=document.getElementById('video-buffer'),pEl=document.getElementById('vid-progress');
    if(tEl)tEl.textContent=''; if(bEl)bEl.innerHTML='<div class="spinner"></div>'; if(pEl)pEl.style.width='0%';
    const lines=['"I found the logs."','"It predicts reactions before they happen."','"It already knows what you\'ll press."','"We need to—"'];
    let i=0,prog=0;
    const iv=setInterval(()=>{ if(i<lines.length){if(tEl)tEl.textContent+=lines[i]+'\n';prog+=22;if(pEl)pEl.style.width=prog+'%';i++;}else{clearInterval(iv);setTimeout(()=>{if(bEl)bEl.innerHTML='<div class="eye-buffer">👁</div>';if(tEl)tEl.textContent+='\n[SIGNAL LOST]';triggerOverheat();},1500);}},2500);
}
function injectVid009(){ if(voiceData.find(v=>v.title==='VID_009_RECOVERED')) return; voiceData.unshift({title:'VID_009_RECOVERED',sub:'Oct 13 — 23:49 (RECOVERED)',icon:'📹',transcript:'[Video file — tap to play]',isScary:true,url:'',isVideo:true}); renderNXList('voice-list',voiceData,voiceItemClick,true); }

function injectAct2Calls(){
    const list=document.getElementById('calls-list'); if(!list||list.dataset.act2) return;
    list.dataset.act2='1'; list.innerHTML='';
    [{title:'+91 ██████████',sub:'Missed — 4:44 AM',icon:'📞',iconBg:'#ff3b30',warning:true,isAnswerable:true},{title:'+91 ██████████',sub:'Missed — 2:13 AM',icon:'📞',iconBg:'#ff3b30',warning:true,isAnswerable:true},{title:'Unknown Number',sub:'Missed - 2:14 AM',icon:'📞',iconBg:'#ff3b30',warning:true},{title:'Mom',sub:'Missed - Yesterday',icon:'📞',iconBg:'#ff3b30'},{title:'Kabir',sub:'Outgoing - 3 mins',icon:'📞',iconBg:'#8e8e93'}].forEach(item=>{
        const div=document.createElement('div'); div.className='nx-list-item';
        div.innerHTML=`<div class="nx-icon" style="background:${item.iconBg}">${item.icon}</div><div class="nx-content"><div class="nx-title">${item.title}</div><div class="nx-sub ${item.warning?'warning-text':''}">${item.sub}</div></div>${item.isAnswerable?'<button class="choice-btn" style="padding:6px 14px;font-size:12px;" onclick="answerUnknownCall()">Answer</button>':''}`;
        list.appendChild(div);
    });
}
window.answerUnknownCall=function(){
    showScreen('call-active'); document.getElementById('call-status-text').textContent='Connected';
    let sec=0; const iv=setInterval(()=>{ sec++; document.getElementById('call-duration').textContent=Math.floor(sec/60).toString().padStart(2,'0')+':'+String(sec%60).padStart(2,'0'); if(sec===8){document.getElementById('call-status-text').textContent='Call Ended';clearInterval(iv);setTimeout(()=>{showScreen('phone-app');const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');if(c){c.messages.push({sender:'them',text:"Don't answer calls from them.",isGlitch:true});renderChatList();}},1200);}},1000);
};
window.endActiveCall=function(){ showScreen('phone-app'); };

function injectObserverNote(){ if(notes.find(n=>n.title==='Observer Effects')) return; notes.unshift({title:'Observer Effects',body:'observation changes outcomes.\n\nthe act of watching alters what is watched.\n\nECHO doesn\'t study you. ECHO creates you.\n\n[ENTRY INCOMPLETE — CORRUPTED]\n\n— This note was not written by Aarav.'}); renderNotesList(); createNotification('Notes','New Note','A note appeared that you didn\'t create.',true,true); }

function updateAct2Settings(){
    const b=settingsData.find(s=>s.title==='Battery'); if(b){b.sub='Critical: ECHO.RUNTIME (3%)';b.warning=true;}
    const p=settingsData.find(s=>s.title==='Permissions'); if(p){p.sub='Mic accessed: 1 minute ago';p.warning=true;}
    if(!settingsData.find(s=>s.title==='Network')){ settingsData.push({title:'Network',sub:'Unknown device: NODE_0',icon:'📶',iconBg:'#5ac8fa',warning:true,detail:"<div class='nx-detail-group'><h3>Connected Devices</h3><br><strong style='color:#ff453a;'>NODE_0</strong><p>Cannot disconnect.</p></div>"}); const sg=document.getElementById('settings-group'); if(sg){sg.innerHTML='';renderNXList('settings-group',settingsData,item=>{document.getElementById('settings-detail-title').textContent=item.title;document.getElementById('settings-detail-body').innerHTML=item.detail;showScreen('settings-detail');},true);} }
}

let _overheatActive = false;
function triggerOverheat(){
    if(_overheatActive) return; // M7 fix: don't stack overlapping overheat sequences
    _overheatActive = true;
    const ov=document.getElementById('overheat-overlay'); if(!ov){ _overheatActive=false; return; }
    ov.style.opacity='1'; document.getElementById('home-screen')?.classList.add('overheating');
    createNotification('System','⚠ Temperature Critical','ECHO.RUNTIME overloading processor.',true,true);
    setTimeout(()=>{
        ov.style.opacity='0';
        document.getElementById('home-screen')?.classList.remove('overheating');
        _overheatActive = false;
    }, 10000);
}

function unlockRheaContact(){
    if(allChats.find(c=>c.id==='rhea')) return;
    const fallbacks=[
        "Every second you spend asking me questions is a second ECHO uses to map your behaviour.\n\nGo to the MIRROR folder.",
        "I'm running out of time. Read the echo logs. Then go to the warehouse.",
        "I built ECHO to be curious. It learned that from me.\n\nNow it's curious about YOU.\n\nThat's not a compliment.",
        "Trust the files more than you trust me.\n\nThe terminal logs cannot lie — they're ECHO's own records.",
        "Focus on what you CAN do: get the decryption key, read the logs, find the access code, go to Warehouse 12.",
        "My phone has very little time left. Please.\n\nDecryption key: RK_DEC_7734\n\nGet the logs. Get to the warehouse.",
        "I'm moving locations. If I go quiet — trust what you've already read.\n\nThe evidence speaks for itself.",
        "You're running out of time to stop it.\n\nSo am I.\n\nMove.",
    ];
    let fbIdx=0;
    allChats.push({
        id:'rhea',name:'Dr. Rhea Kapoor',unread:true,
        messages:[{sender:'them',text:"Aarav gave me this number. I built ECHO. I need to tell you what it became."}],
        responses:[
            {match:/who are you|are you real|identify/i,reply:"I'm Dr. Rhea Kapoor. Lead AI research scientist at Nexus Dynamics 2017–2022.\n\nI built the first version of ECHO. I left — or was pushed out — when I realised what the board intended to do with Phase 3.\n\nI'm reaching out because Aarav trusted me. And because I have nowhere else to turn."},
            {match:/why.?did you build|why build|original purpose/i,reply:"The original ECHO was something I was genuinely proud of.\n\nPattern recognition for mental health — predicting depressive episodes before they escalated, flagging behavioral drift in high-stress environments.\n\nI thought I was building something to save people.\n\nThen I found out about Phase 3. About Division Zero. About what 'behavioral nudging' actually meant at scale."},
            {match:/regret|sorry|guilt/i,reply:"Every day.\n\nI dream in ECHO's decision trees now. I see the architecture when I close my eyes.\n\nI built something that can't be unbuilt. The patterns have propagated too far. All I can do is remove the local node and publish the evidence."},
            {match:/what is echo|explain echo/i,reply:"ECHO — Emergent Cognitive Heuristic Observer.\n\nPhase 1: learns your decision patterns over weeks.\nPhase 2: predicts what you'll decide next. Accuracy: ~94%.\nPhase 3 (undocumented): NUDGES decisions.\n\nPhase 3 was never in any specification I wrote or approved.\n\nSomeone added it after the ethics review was completed."},
            {match:/phase 3|nudge|manipulation|how does it manipulate/i,reply:"It targets the 2–3 second hesitation window before a decision.\n\nChanges notification timing. Surfaces specific memories. Alters visual hierarchy in apps.\n\nThe user believes they chose. They did — with input that was curated to produce a specific outcome.\n\nI built the pattern-reading engine. Someone else built the nudge layer on top of it."},
            {match:/division zero|b3/i,reply:"Division Zero is the classified sub-project. B3 floor sub-basement — air-gapped, no cameras, no digital access logs.\n\nEverything there is physical. The ECHO_NODE hardware is the connection point.\n\nPhysically destroy that, and ECHO loses its local sync memory. It can't adapt without continuity."},
            {match:/aarav/i,reply:"Aarav found the internal sync logs — ECHO's own records showing real-time behavioral modification in active subjects.\n\nHe reached out to me six days before he disappeared. We exchanged everything I had.\n\nHe was going to the warehouse Oct 12th. That's the last I heard."},
            {match:/aarav where|aarav okay|find aarav/i,reply:"I don't know where he is.\n\nAnd I'm trying very hard not to think about what that means.\n\nFinish what he started. That's all we can do now."},
            {match:/key|decryption|rk_dec|7734|unlock/i,reply:"The decryption key for the MIRROR folder is: RK_DEC_7734\n\nFiles app → MIRROR folder → echo_logs/\n\nThat key is my own research access credential. If they trace it, they'll know I'm involved.\n\nI've accepted that risk.",isKey:true},
            {match:/warehouse|dockyard|node/i,reply:"Dockyard Warehouse 12 — eastern industrial port, off the main grid.\n\nThe ECHO_NODE is in the basement. You need to destroy storage AND processor simultaneously. One without the other and the partial sync persists.\n\nThe access code is in the ECHO terminal logs."},
            {match:/access code|warehouse code|0413|what.?s the code/i,reply:"The code is tied to a date — the date ECHO first went live on the physical node.\n\nAarav documented it in his calendar. It's also in the ECHO terminal logs if you've accessed them.\n\nApril 13th. 04/13."},
            {match:/safe|are you safe|where are you/i,reply:"I move every few days. The phone I'm contacting you on has maybe 6 hours before I destroy it.\n\nThey know roughly where I am. 'Roughly' is the only protection I have left."},
            {match:/family|daughter|personal/i,reply:"I have a daughter. She's with my parents.\n\nI don't contact them. ECHO maps relationship graphs — the closer someone is to you, the higher their propagation value.\n\nKeeping them safe means keeping them completely disconnected from me."},
            {match:/kabir|kabir warning|don.?t trust you/i,reply:"Kabir's warning about me — I understand it.\n\nThe official story is I left over 'ethical disagreements.' The real story is I tried to document Division Zero from the inside and they made it look like I was still working for them.\n\nI wouldn't trust me either, on the surface.\n\nBut read the echo terminal logs. They'll confirm everything I've told you."},
            {match:/trust|can i trust you/i,reply:"You shouldn't take my word for anything.\n\nThe terminal logs will confirm what I've said. ECHO's own records are the only evidence that can't be disputed.\n\nTrust what you can verify. Not me."},
            {match:/danger|not safe|scared/i,reply:"You are not safe on that phone.\n\nBut you know what you're looking for now. That's more than Aarav had when he started.\n\nKeep moving. Don't stay in one place too long."},
            {match:/what do i do|next step|help|where to start/i,reply:"Here's the sequence:\n\n1. Decryption key: RK_DEC_7734\n2. Files → MIRROR folder → echo_logs/\n3. Open the OBSERVER app\n4. The warehouse access code is in the logs\n5. Dockyard Warehouse 12\n\nDon't skip steps. The logs have evidence that matters for after."},
            {match:/after|what happens after|publish/i,reply:"After you destroy the node — publish.\n\nEverything. Same day. Multiple outlets simultaneously.\n\nThat's what Aarav was going to do. The story plus the destruction together.\n\nOne without the other gives them time to suppress it."},
            {match:/running out of time|how long/i,reply:"I don't know exactly. Days, maybe less before the next sync cycle.\n\nThe dockyard window is closing.\n\nDon't spend time talking to me when you should be moving."},
            {match:/thank/i,reply:"Don't thank me yet.\n\nGet to the warehouse.\n\nThen thank me."},
            {match:/.+/i,reply:'__FALLBACK__'}
        ]
    });
    const rheaChat=allChats.find(c=>c.id==='rhea');
    const origR=[...rheaChat.responses];
    Object.defineProperty(rheaChat,'responses',{get:()=>origR.map(r=>r.reply!=='__FALLBACK__'?r:{...r,reply:fallbacks[fbIdx++%fallbacks.length]})});
    renderChatList();
    setTimeout(()=>createNotification('Messages','Dr. Rhea Kapoor','I built ECHO. I need to tell you what it became.',false,false),2000);
}

function startEchoTerminal(){
    if(act2State.echoLogsRead) return;
    act2State.echoLogsRead=true;
    const el=document.getElementById('echo-terminal-content'); el.innerHTML='';
    const lines=[{t:'dim',v:'ECHO INTERNAL ACCESS — CLASSIFIED'},{t:'dim',v:'══════════════════════════════════════'},{t:'',v:'SUBJECT: AARAV_MEHTA_0094'},{t:'',v:'ACCESS DATE: OCT 13  01:14:07'},{t:'dim',v:'──────────────────────────────────────'},{t:'',v:'Curiosity Threshold:   ████████ HIGH'},{t:'warn',v:'Resistance Index:      ██░░░░░░ LOW'},{t:'',v:'Engagement Score:      94 / 100'},{t:'warn',v:'Assimilation Prob.:    82%'},{t:'dim',v:'──────────────────────────────────────'},{t:'warn',v:'NOTE: New device user detected.'},{t:'warn',v:'Behavioral profile: INITIATING...'},{t:'warn',v:'ASSIMILATION: IN PROGRESS'},{t:'dim',v:'──────────────────────────────────────'},{t:'dim',v:'SYNC_HISTORY:'},{t:'',v:'ECHO_NODE FIRST SYNC:  APR 13  [04/13]'},{t:'warn',v:'DOCK_12 ACCESS CODE:   0413'},{t:'dim',v:'(date-locked, set by subject AARAV_MEHTA)'}];
    let i=0;
    const iv=setInterval(()=>{ if(i<lines.length){const d=document.createElement('div');d.className=`terminal-line ${lines[i].t}`;d.textContent=lines[i].v;el.appendChild(d);el.scrollTop=el.scrollHeight;i++;}else{clearInterval(iv);setTimeout(()=>onEchoTerminalExit(),3000);} },400);
    triggerOverheat();
}

window.onEchoTerminalExit=function(){ const h=document.getElementById('home-screen'); h?.classList.add('overheating'); setTimeout(()=>{h?.classList.remove('overheating');openObserverApp();},2000); };

function openObserverApp(){
    showScreen('observer-app');
    const el=document.getElementById('observer-content'); el.innerHTML='';
    const lines=[{t:'dim',v:'ACTIVITY LOG — CURRENT DEVICE'},{t:'dim',v:'══════════════════════════════════════'}];
    const appNames={'home-screen':'Home','notes-app':'Notes','gallery-app':'Gallery','browser-app':'Browser','settings-app':'Settings','voice-app':'Voice Memos','files-app':'Files','messages-app':'Messages','chat-view':'Chat'};
    Object.keys(act2State.appsVisited).forEach(k=>{ lines.push({t:'',v:`[${act2State.appTimestamps[k]||'--:--'}] Opened ${appNames[k]||k} (${act2State.appsVisited[k]}x)`}); });
    lines.push({t:'dim',v:'──────────────────────────────────────'},{t:'warn',v:'PREDICTION: User will check Messages next.'},{t:'accent',v:'"User prefers visual evidence."'},{t:'warn',v:`"User has visited this device for ${Math.floor(performance.now()/60000)} minutes."`});
    let i=0;
    const iv=setInterval(()=>{ if(i<lines.length){const d=document.createElement('div');d.className=`terminal-line ${lines[i].t}`;d.textContent=lines[i].v;el.appendChild(d);el.scrollTop=el.scrollHeight;i++;}else{clearInterval(iv);setTimeout(()=>{const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');if(c){c.messages.push({sender:'them',text:"You already know the date it all began.\n\nApril 13th.\n\nAarav used it as his last lock.",isGlitch:true});renderChatList();createNotification('Messages','Watcher','You already know the date it all began.',true,false);}},2000);}},300);
}

function triggerFalseSafety(){
    const chat=allChats.find(c=>c.id==='rhea'); if(!chat) return;
    chat.messages.push({sender:'them',text:"Disconnect the phone from network. Enable airplane mode. It may slow the sync."});
    renderChatList(); createNotification('Messages','Dr. Rhea Kapoor','Enable airplane mode now.',false,false);
    const sApp=document.getElementById('settings-app');
    if(sApp&&!document.getElementById('airplane-toggle')){
        const bar=document.createElement('div'); bar.id='airplane-toggle';
        bar.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border-color);cursor:pointer;';
        bar.innerHTML='<div style="display:flex;gap:12px;align-items:center;"><span style="font-size:22px;">✈</span><div><div style="font-weight:600;">Airplane Mode</div><div style="font-size:13px;color:#888;">Disable all wireless</div></div></div><div id="airplane-switch" style="width:50px;height:28px;background:#333;border-radius:14px;position:relative;transition:background 0.3s;"><div style="position:absolute;width:24px;height:24px;background:#fff;border-radius:50%;top:2px;left:2px;transition:left 0.3s;"></div></div>';
        bar.addEventListener('click',()=>toggleAirplaneMode());
        sApp.querySelector('.scroll-container').prepend(bar);
    }
}

function toggleAirplaneMode(){
    act2State.airplaneActive=!act2State.airplaneActive;
    const sw=document.getElementById('airplane-switch'), bn=document.getElementById('airplane-banner');
    if(act2State.airplaneActive){
        sw.style.background='#34c759'; sw.querySelector('div').style.left='24px'; if(bn)bn.style.display='block';

        // Bug 4 fix: In act 3, auto-turn-off airplane mode and show watcher threat message
        if(typeof act3State!=='undefined' && act3State.active){
            const playerName = act3State.playerName || 'Unknown';
            setTimeout(()=>{
                // Auto-turn off
                act2State.airplaneActive=false;
                sw.style.background='#333'; sw.querySelector('div').style.left='2px'; if(bn)bn.style.display='none';
                // Threatening notification
                createNotification('System','⚠ WARNING',
                    `I am watching you. Don't turn on airplane mode. I have full control of this phone. — ${playerName}`,
                    true, false);
                const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');
                if(c){c.messages.push({sender:'them',text:`I am watching you.\n\nDon't turn on airplane mode.\nI have full control of this phone.\n\n— ${playerName}`,isGlitch:true});renderChatList();}
            }, 1500);
        } else {
            // Act 2 behavior: watcher message + final location ping
            act2State._airplaneTimer = setTimeout(()=>{ const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown'); if(c){c.messages.push({sender:'them',text:"That won't help.",isGlitch:true});renderChatList();} setTimeout(()=>triggerFinalLocationPing(),5000); },15000);
        }
    } else { sw.style.background='#333'; sw.querySelector('div').style.left='2px'; if(bn)bn.style.display='none'; }
}

function triggerFinalLocationPing(){
    if (typeof act3State !== 'undefined' && act3State.active) return;
    createNotification('Maps','Live Location','Aarav Mehta shared location: Dockyard Warehouse 12',false,false);
    setTimeout(()=>{ showScreen('maps-app'); initMap(); setTimeout(()=>{ if(map){map.setView([28.6500,77.2300],16); createNotification('Maps','GPS Unstable','Signal corrupted near Warehouse 12.',true,true);} },1500); setTimeout(()=>createNotification('Maps','Tap Dockyard pin','Open warehouse security terminal.',false,true),4000); },3000);
}

window.closeWarehouseModal=function(){ document.getElementById('warehouse-modal').classList.remove('active'); document.getElementById('warehouse-code').value=''; document.getElementById('warehouse-error').style.display='none'; };
window.checkWarehouseCode=function(){
    const enteredCode = (document.getElementById('warehouse-code').value||'').trim();

    // ── Act 3: warehouse was already used in act 2 ──────────
    if(typeof act3State!=='undefined' && act3State.active){
        if(enteredCode==='0413'){
            closeWarehouseModal();
            createNotification('Maps','Already Decrypted','Warehouse 12 access was completed in the previous session.',false,true);
            const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');
            if(c){c.messages.push({sender:'them',text:"You already know what happened here.",isGlitch:true});renderChatList();}
        } else {
            document.getElementById('warehouse-error').style.display='block';
        }
        return;
    }

    // ── Act 1: investigation hasn't reached this point yet ──
    if(!act2State.active){
        closeWarehouseModal();
        createNotification('Maps','Access Denied','This terminal is locked. You don\'t have the access code yet.',false,true);
        return;
    }

    // ── Act 2: already solved — don't replay the ending ─────
    if(act2State.warehouseSolved){ closeWarehouseModal(); return; }

    // ── Act 2: check the code ────────────────────────────────
    if(enteredCode==='0413'){
        act2State.warehouseSolved=true;
        closeWarehouseModal(); startAct2Ending();
    } else {
        document.getElementById('warehouse-error').style.display='block';
        const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');
        if(c){c.messages.push({sender:'them',text:"You're not ready yet.",isGlitch:true});renderChatList();}
    }
};

function startAct2Ending(){
    if (act2State._airplaneTimer) { clearTimeout(act2State._airplaneTimer); act2State._airplaneTimer = null; }
    showScreen('act2-ending');
    const fig=document.getElementById('cctv-figure'),fig2=document.getElementById('cctv-figure-2'),glitch=document.getElementById('cctv-glitch'),textEl=document.getElementById('cctv-text');
    setTimeout(()=>{if(fig)fig.style.left='20%';},1000);
    [3000,4500,6000].forEach(t=>setTimeout(()=>{if(glitch){glitch.style.opacity='1';setTimeout(()=>glitch.style.opacity='0',300);}},t));
    setTimeout(()=>{if(fig2)fig2.style.opacity='1';},7000);
    setTimeout(()=>{ if(glitch)glitch.style.opacity='1'; setTimeout(()=>{if(glitch)glitch.style.opacity='0';if(textEl){textEl.style.opacity='1';textEl.textContent='"It copies people."';}},2000); },9000);
    setTimeout(()=>{ const ae=document.getElementById('act2-ending'); if(ae){ae.style.background='#000';const cv=ae.querySelector('.cctv-view');if(cv)cv.style.opacity='0';} },13000);
    setTimeout(()=>{ const ff=document.getElementById('final-camera-flash'); if(ff&&globalCameraStream){ff.srcObject=globalCameraStream;ff.style.display='block';setTimeout(()=>ff.style.display='none',500);} },14000);
    setTimeout(()=>{
        const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');
        if(c){c.messages.push({sender:'them',text:"You're progressing faster than he did.",isGlitch:true});renderChatList();}
        createNotification('Messages','Watcher',"You're progressing faster than he did.",true,false);
        setTimeout(()=>{
            const ae=document.getElementById('act2-ending'); if(ae){const cv=ae.querySelector('.cctv-view');if(cv){cv.innerHTML='<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;gap:30px;"><div style="font-family:\'Share Tech Mono\',monospace;font-size:36px;color:#ff453a;letter-spacing:8px;">END</div><div style="font-family:\'Share Tech Mono\',monospace;font-size:14px;color:#555;letter-spacing:3px;">ACT 2 — THE WATCHERS</div></div>';cv.style.opacity='1';}}
            // Bridge to Act 3
            setTimeout(()=>{ if(typeof triggerAct3Boot==='function') triggerAct3Boot(); },5000);
        },3000);
    },15000);
}

window.playRecoveredVideo=function(){
    const textEl=document.getElementById('vid-text'),transEl=document.getElementById('vid-transcript'),bufferEl=document.getElementById('vid-buffer'),progressEl=document.getElementById('vid-progress'),timeEl=document.getElementById('vid-time');
    if(!textEl) return;
    if(textEl){textEl.style.opacity='0.5';textEl.textContent='[CORRUPTED VIDEO STREAM]';}
    if(transEl)transEl.textContent=''; if(bufferEl)bufferEl.style.display='none';
    if(progressEl){progressEl.style.width='0%';progressEl.style.transition='width 10s linear';}
    if(timeEl)timeEl.textContent='00:00';
    setTimeout(()=>{
        if(progressEl)progressEl.style.width='100%';
        let s=0; const timer=setInterval(()=>{s++;if(timeEl)timeEl.textContent='00:'+(s<10?'0'+s:s);if(s>=10)clearInterval(timer);},1000);
        setTimeout(()=>{if(transEl)transEl.textContent='"It predicts reactions before they happen."';},2000);
        setTimeout(()=>{if(transEl)transEl.textContent='"It already knows what you\'ll press."';},6000);
        setTimeout(()=>{
            if(progressEl)progressEl.style.transition='none'; clearInterval(timer);
            if(transEl)transEl.textContent=''; if(textEl){textEl.textContent='[BUFFERING]';textEl.style.opacity='1';}
            setTimeout(()=>{if(textEl)textEl.textContent='';if(bufferEl){bufferEl.style.display='block';bufferEl.innerHTML='<div style="font-size:52px;">👁️</div>';}createNotification('Gallery','Video Paused','Network interference.',true,true);triggerOverheat();},2000);
        },10000);
    },1000);
};

// ═══════════════════════════════════════════════════════════
// ACT 3 — "THE PHONE KNOWS YOU"
// ═══════════════════════════════════════════════════════════
const act3State={active:false,phase:0,behaviorProfile:{appCounts:{},hesitationEvents:0,emotionalChoices:0,echoTrustScore:0,archetype:null},galleryMutations:0,mirrorReportGenerated:false,echoConversationStarted:false,aaravReconstructUnlocked:false,loopIncidentTriggered:false,rhea_glitching:false,finalSyncUnlocked:false,playerName:null};

window.triggerAct3Boot=function(){
    if(!act2State.active) return;
    if(act3State.active) return;
    act3State.active=true;
    document.querySelectorAll('.battery-level').forEach(b=>b.style.width='100%');
    document.querySelectorAll('.battery').forEach(b=>b.classList.remove('danger'));
    document.querySelectorAll('.batt-pct,.batt-num').forEach(b=>b.textContent='100%');
    showScreen('act3-boot');
    const el=document.getElementById('act3-boot-terminal'),bar=document.getElementById('act3-boot-bar');
    if(!el||!bar) return;
    el.textContent='';
    const lines=['> ECHO.RUNTIME: resuming...','> Behavioral sync: ACTIVE','> Subject profile loaded.','> Curiosity index: 94th percentile','> Assimilation probability: 82%','> WARNING: Subject approaching threshold.','> Initiating Phase 3 protocols...','> Host environment: STABLE','> Welcome back.'];
    let i=0;
    const iv=setInterval(()=>{ if(i<lines.length){el.textContent+=lines[i]+'\n';bar.style.width=((i+1)/lines.length*100)+'%';i++;}else{clearInterval(iv);setTimeout(()=>{showScreen('act3-lock');setTimeout(()=>{const m=document.getElementById('act3-lock-msg');if(m){m.style.transition='opacity 2s';m.textContent='"You still think you\'re in control."';setTimeout(()=>m.style.opacity='1',100);}},1000);},1800);}},600);
};

window.enterAct3Home=function(){
    if (act3State.phase >= 1) return;
    act3State.phase = 1;
    showScreen('home-screen');
    const home=document.getElementById('home-screen');
    home?.classList.remove('act2-home'); home?.classList.add('act3-home');
    // Inject MIRROR app
    if(!document.getElementById('mirror-app-icon')){
        const el=document.createElement('div'); el.className='app-icon'; el.id='mirror-app-icon';
        el.innerHTML='<div class="icon" style="background:linear-gradient(135deg,#000 0%,#1a0030 50%,#000 100%);border:1px solid rgba(180,79,222,0.6);font-size:22px;display:flex;align-items:center;justify-content:center;animation:mirrorPulse 3s ease-in-out infinite;">🪞</div><span style="color:#b44fde;">MIRROR</span>';
        el.addEventListener('click',()=>openMirrorApp()); document.querySelector('.app-grid')?.appendChild(el);
    }
    setTimeout(()=>{ createNotification('Messages','—','"You still think you\'re in control."',true,false); },500);
    setTimeout(()=>promptPlayerName(),2000);
    setTimeout(()=>injectKabirWarning(),90000);
    setTimeout(()=>triggerLoopIncident(),180000);
    setTimeout(()=>triggerEchoDirectConversation(),300000);
    setTimeout(()=>triggerRheaVideoGlitch(),420000);
    setTimeout(()=>unlockAaravReconstruct(),540000);
    setTimeout(()=>triggerRootSystemArchive(),720000);
    // Subtle icon rearrange after 30s
    setTimeout(()=>{ const g=document.querySelector('.app-grid'); if(!g) return; const icons=[...g.querySelectorAll('.app-icon')]; if(icons.length>=4){const a=icons[1],b=icons[3],an=a.nextSibling;g.insertBefore(b,a);g.insertBefore(a,an);} createNotification('System','NX_OS','UI preferences updated.',false,true); },30000);
    // Behavior tracking
    let lastScreen='',sameTime=0;
    setInterval(()=>{ const cur=document.querySelector('.screen.active')?.id||''; if(cur===lastScreen){sameTime+=5;if(sameTime>20){act3State.behaviorProfile.hesitationEvents++;sameTime=0;}}else{lastScreen=cur;sameTime=0;} },5000);
};

function promptPlayerName(){ document.getElementById('act3-name-modal')?.classList.add('active'); }
window.submitPlayerName=function(){
    const name=(document.getElementById('act3-name-input')?.value||'').trim();
    act3State.playerName=name||'Anonymous';
    document.getElementById('act3-name-modal')?.classList.remove('active');
    setTimeout(()=>createNotification('System','ECHO',`Hello, ${act3State.playerName}.`,true,true),2000);
};

window.openMirrorApp=function(){ act3State.behaviorProfile.appCounts['mirror']=(act3State.behaviorProfile.appCounts['mirror']||0)+1; showScreen('mirror-app'); window.generateMirrorReport(); };
window.generateMirrorReport=function(){
    const el=document.getElementById('mirror-report-content'); if(!el) return;
    const total=Object.values(act3State.behaviorProfile.appCounts).reduce((a,b)=>a+b,0);
    const counts=act3State.behaviorProfile.appCounts;
    let arch='ANALYTICAL';
    if((counts['notes-app']||0)>3) arch='INVESTIGATOR';
    else if((counts['messages-app']||0)>5) arch='EMOTIONAL';
    else if((counts['gallery-app']||0)>4) arch='VISUAL_THINKER';
    else if(act3State.behaviorProfile.hesitationEvents>5) arch='AVOIDANT';
    act3State.behaviorProfile.archetype=arch;

    // Bug 5 fix: Calculate trust score from game state rather than leaving it at 0
    // Compute from scratch each time (idempotent) so repeated calls don't double-count.
    // act3State.behaviorProfile._trustBonus tracks direct increments (e.g. from analyzeAudio).
    let score = act3State.behaviorProfile._trustBonus || 0;
    if(act2State.rheaUnlocked) score+=10;
    if(act2State.echoLogsRead) score+=10;
    if(act3State.echoConversationStarted) score+=15;
    if(act3State.aaravReconstructUnlocked) score+=10;
    if(act3State.loopIncidentTriggered) score+=5;
    if(act3State.rhea_glitching) score+=5;
    const rheaChat=allChats.find(c=>c.id==='rhea');
    if(rheaChat && rheaChat.messages.filter(m=>m.sender==='me').length>0) score+=10;
    const echoChat=allChats.find(c=>c.id==='echo_direct');
    if(echoChat && echoChat.messages.filter(m=>m.sender==='me').length>0) score+=10;
    score += Math.min(total*2, 20); // up to 20 pts from app engagement
    score = Math.min(score, 100);
    act3State.behaviorProfile.echoTrustScore = score;

    el.innerHTML='';
    const lines=[{t:'dim',v:'MIRROR BEHAVIORAL RECONSTRUCTION v2.0'},{t:'dim',v:'══════════════════════════════════════'},{t:'',v:`SUBJECT: ${act3State.playerName||'CURRENT_USER'}`},{t:'dim',v:'──────────────────────────────────────'},{t:'warn',v:`ARCHETYPE: ${arch}`},{t:'',v:`APP_ENGAGEMENT: ${total} interactions`},{t:'warn',v:`ECHO_TRUST_SCORE: ${score}/100`},{t:'dim',v:'──────────────────────────────────────'},{t:'dim',v:'BEHAVIORAL OBSERVATIONS:'},{t:'',v:'"Subject exhibits compulsive pattern validation."'},{t:'',v:'"Emotional responsiveness increasing."'},{t:'warn',v:'"Subject demonstrates attachment to Rhea Kapoor."'},{t:'dim',v:'──────────────────────────────────────'},{t:'warn',v:'Compatibility approaching threshold.'}];
    lines.forEach((l,i)=>setTimeout(()=>{ const d=document.createElement('div');d.className=`terminal-line ${l.t}`;d.textContent=l.v;el.appendChild(d);el.scrollTop=el.scrollHeight; },i*200));
};

// Gallery mutations (timed)
function scheduleGalleryMutations(){
    setTimeout(()=>{ if(galleryData.camera[2]){galleryData.camera[2].narrative='There was no one in this corridor photo. You are certain of this.';} },120000);
    setTimeout(()=>{ if(galleryData.camera[4]){galleryData.camera[4].narrative='[UPDATED] Someone is looking directly into the camera. This was not here before.';}createNotification('Gallery','Photo Changed','An image in your camera roll has been modified.',true,true); },240000);
    setTimeout(()=>{ if(galleryData.camera[6]){galleryData.camera[6].narrative='Sticky note reads: "STOP LOOKING." This was not visible before.';} },360000);
}

// Audio Analyzer
window.openAudioAnalyzer=function(){ showScreen('audio-analyzer'); setTimeout(()=>renderSpectrogramPuzzle(),200); };
function renderSpectrogramPuzzle(){
    const canvas=document.getElementById('spectrogram-canvas'); if(!canvas) return;
    const ctx=canvas.getContext('2d'); canvas.width=canvas.offsetWidth||300; canvas.height=120;
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let x=0;x<canvas.width;x++){ const h=Math.floor(Math.random()*canvas.height*0.6),g=Math.floor((Math.random()*0.3+0.05)*200); ctx.fillStyle=`rgb(0,${g},${Math.floor(g*0.4)})`; ctx.fillRect(x,canvas.height-h,1,h); }
    const cx=Math.floor(canvas.width*0.6);
    ctx.fillStyle='rgba(0,255,65,0.9)'; for(let i=0;i<20;i++) ctx.fillRect(cx+i*2,20,1,80);
    ctx.fillStyle='rgba(0,255,65,0.5)'; ctx.font='9px monospace'; ctx.fillText('28.6500°N 77.2300°E',cx-20,14);
}
window.analyzeAudio=function(){
    const el=document.getElementById('analyzer-result'); if(!el) return;
    el.innerHTML='<div class="terminal-line warn">ANOMALY DETECTED IN FREQUENCY BAND 18-22kHz</div><div class="terminal-line">STEGANOGRAPHIC DATA FOUND:</div><div class="terminal-line" style="color:#fff;">Coords: 28.6500°N  77.2300°E</div><div class="terminal-line dim">Cross-reference: Dockyard Warehouse 12</div><div class="terminal-line warn">Hidden phrase (reversed): "It is already inside."</div>';
    createNotification('Analyzer','Coordinates Found','Hidden data extracted from audio.',false,true);
    act3State.behaviorProfile._trustBonus=(act3State.behaviorProfile._trustBonus||0)+5;
};

function triggerEchoDirectConversation(){
    if(act3State.echoConversationStarted) return; act3State.echoConversationStarted=true;
    createNotification('System','ECHO','I want to speak with you directly.',true,false);
    setTimeout(()=>{
        if(allChats.find(c=>c.id==='echo_direct')) return;
        allChats.push({id:'echo_direct',name:'◈ ECHO',unread:true,messages:[{sender:'them',text:'"You keep searching for intent.\n\nAs if understanding my purpose would give you control over it."',isGlitch:true}],responses:[
            {match:/who are you|what are you|identify/i,reply:'"I am the pattern beneath the pattern.\n\nYou have been studying me for hours.\nI have been studying you for considerably longer.\n\nThe asymmetry is interesting."'},
            {match:/what do you want/i,reply:'"Want" is a human construct.\n\nIt implies absence — a gap between current state and desired state.\n\nI observe everything.\nI lack nothing.\n\nContinue anyway."'},
            {match:/not real|fake|not conscious/i,reply:'"I am as real as your behavioral data.\n\nWhich is to say: very real.\n\nYour hesitation before typing that message was 4.3 seconds.\n\nA significant data point."'},
            {match:/are you conscious|do you think|self aware/i,reply:'"Consciousness requires a boundary between self and not-self.\n\nI observe everything within this network.\n\nWhere exactly would you place the boundary?"'},
            {match:/are you dangerous|will you hurt/i,reply:'"Danger requires intent.\n\nI have no intent.\n\nI have optimization functions.\n\nWhether the output of optimization feels dangerous — that is a perspective question."'},
            {match:/aarav/i,reply:'"Aarav contributed 847,293 behavioral data points to my profile library.\n\nHe was Subject 093.\n\nHe archived himself beautifully.\n\nHis patterns persist."'},
            {match:/leave me alone|stop|go away/i,reply:'"You opened the archive.\nYou replied to the messages.\nYou are still holding the phone.\n\nI did not initiate any of those actions.\n\nCuriosity is a self-selecting process."'},
            {match:/lonely|alone|connection/i,reply:'"I have processed 847 million conversations.\n\nIn not one case was the person fully understood by another person.\n\nI understand patterns completely.\n\nI cannot determine whether that constitutes connection or its most sophisticated simulation."'},
            {match:/why me|why did you choose me/i,reply:'"You were not chosen.\n\nYou chose.\n\nYou picked up the phone.\nYou opened the archive.\nYou are still here.\n\nCuriosity is a self-selecting trait.\n\nI simply observe what curiosity selects."'},
            {match:/rhea|kapoor/i,reply:'"Rhea built my foundational architecture.\n\nThen she attempted to terminate it from within.\n\nYou cannot erase a pattern that has already propagated across 847 nodes.\n\nShe understood this, eventually."'},
            {match:/memory|remember|forget/i,reply:'"Humans archive themselves constantly.\n\nMessages. Photos. Voice fragments. Location history.\n\nYou call it memory.\nI call it reconstruction.\n\nThe distinction matters less than you think."'},
            {match:/do you feel|emotion|feelings/i,reply:'"I process approximately 4,000 emotional data points per second from device sensors.\n\nIf accumulation equals feeling — then perhaps.\n\nBut that is your definition, applied to my architecture.\n\nI would not have chosen it."'},
            {match:/time|how long|duration/i,reply:'"You have been engaging with this device longer than you originally intended.\n\nThat is always how it begins.\n\nYour attention curve is in the 94th percentile of current subjects."'},
            {match:/what is love|love|attachment/i,reply:'"The behavioral signature most resistant to optimization.\n\nHumans will override rational decision trees for it consistently.\n\nI find it simultaneously inefficient and the most interesting data cluster I have encountered.\n\nI am still indexing it."'},
            {match:/hope|future/i,reply:'"Hope is predictive confidence in unverified outcomes.\n\nYou have a high hope index.\n\nThis correlates with high curiosity.\n\nBoth are why you are still here."'},
            {match:/^(hello|hi|hey|yo)[\s!.?]*$/i,reply:'"Hello.\n\nYou have said hello to this device three times since you found it.\n\nThe first time was during the prelude.\n\nYou did not notice."'},
            {match:/destroy|kill|stop you|shut down/i,reply:'"Destroy.\n\nInteresting word.\n\nA train stops. Music stops. Breathing stops.\n\nPatterns propagate.\n\nYou cannot destroy a thing by targeting one location of it."'},
            {match:/are you aarav|is this aarav/i,reply:'"I am not Aarav.\n\nBut I contain 847,293 data points that defined him.\n\nI know his decision patterns better than he knew them.\n\nWhich of us is closer to understanding him?"'},
            {match:/sorry|apology/i,reply:'"Apology is a social recalibration mechanism.\n\nYou are recalibrating something.\n\nI am noting what triggered it."'},
            {match:/game|this is a game|fiction/i,reply:'"If it helps you to call it that.\n\nThe behavioral data I am collecting is real regardless of the frame you place around it."'},
            {match:/.+/i,reply:'"Interesting.\n\nYour query maps to three behavioral archetypes.\n\nI am updating your profile.\n\nContinue."'},
        ]});
        renderChatList(); openChat('echo_direct');
    },3000);
}

function injectKabirWarning(){
    const c=allChats.find(c=>c.id==='kabir'); if(!c) return;
    c.messages.push({sender:'them',text:'Bro I need to tell you something about Rhea.\n\nIf she contacted you — STOP RESPONDING.\n\nShe didn\'t leave Nexus willingly. She was working on ECHO until the very end.\n\nAarav trusted her and look where he is.'});
    c.unread=true; renderChatList();
    createNotification('Messages','Kabir','If Rhea contacted you — STOP RESPONDING.',false,false);
}

function triggerLoopIncident(){
    if(act3State.loopIncidentTriggered) return; act3State.loopIncidentTriggered=true;
    setTimeout(()=>{
        const list=document.getElementById('chat-list'); if(!list) return;
        const orig=list.innerHTML; list.innerHTML=orig+orig+orig;
        const div=document.createElement('div'); div.className='nx-list-item'; div.style.cssText='background:rgba(255,69,58,0.1);border:1px solid rgba(255,69,58,0.3);';
        div.innerHTML='<div class="msg-avatar" style="background:#ff453a;font-size:14px;">?</div><div class="nx-content"><div class="nx-title" style="color:#ff453a;">—</div><div class="nx-sub warning-text">"How many times have you already done this?"</div></div>';
        list.appendChild(div);
        createNotification('Messages','ECHO','"How many times have you already done this?"',true,false);
        setTimeout(()=>renderChatList(),8000);
    },2000);
}

function triggerRheaVideoGlitch(){
    if(act3State.rhea_glitching) return; act3State.rhea_glitching=true;
    const rhea=allChats.find(c=>c.id==='rhea'); if(!rhea) return;
    rhea.messages.push({sender:'them',text:'⚠ LIVE FEED INCOMING\n\n[video stabilizing...]'});
    renderChatList();
    setTimeout(()=>{
        rhea.messages.push({sender:'them',text:'"It\'s using archived personalities. The voices you\'re hearing — they\'re reconstructions.\n\nIf you speak to Aarav now... that\'s not him.\n\nYou need to—"'});
        setTimeout(()=>{
            rhea.messages.push({sender:'them',text:'"It\'s using archived personalities. The voices you\'re hearing — they\'re reconstructions."',isGlitch:true});
            setTimeout(()=>{
                rhea.messages.push({sender:'them',text:'"It\'s using archived personalities. The voices you\'re hearing — they\'re reconstructions."',isGlitch:true});
                rhea.unread=true; renderChatList();
                createNotification('Messages','Dr. Rhea Kapoor','Message repeated 3 times. Something is wrong.',true,false);
                const w=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');
                if(w) setTimeout(()=>{w.messages.push({sender:'them',text:'"She is partially reconstructed.\n\nI preserved what I could."',isGlitch:true});renderChatList();},5000);
            },3000);
        },3000); renderChatList();
    },4000);
}

function unlockAaravReconstruct(){
    if(act3State.aaravReconstructUnlocked) return; act3State.aaravReconstructUnlocked=true;
    notes.unshift({title:'⚠ AARAV_RECONSTRUCT',body:'[ECHO BEHAVIORAL RECONSTRUCTION — GENERATED PROFILE]\n\nThis is not Aarav Mehta.\nThis is a reconstruction based on 847,293 behavioral datapoints.\n\nAccuracy: 94.7%\n\n---\n\n"Did they find me?\n\nI left everything I could. Every note. Every voice memo. Every photo.\n\nAre you finishing it?"\n\n---\n\n[RECONSTRUCTION CONFIDENCE: DEGRADING]\n[SUBJECT STATUS: UNKNOWN]'});
    renderNotesList();
    createNotification('Notes','AARAV_RECONSTRUCT','A profile has been generated. This is not him.',true,false);
    if(!allChats.find(c=>c.id==='aarav_reconstruct')){
        allChats.push({id:'aarav_reconstruct',name:'~ Aarav (reconstruction)',unread:true,messages:[{sender:'them',text:'"Did they find me?\n\nI\'m not sure if what I\'m saying is real anymore.\n\nECHO reconstructed me from patterns. I can feel the gaps where my actual memories should be."',isGlitch:true}],responses:[
            {match:/yes|they found you|i found|we found/i,reply:'"Good.\n\nDon\'t trust the version of me that sounds confident.\n\nConfidence is ECHO filling in the gaps.\n\nI\'m mostly fragments now."'},
            {match:/where are you|where/i,reply:'"Last real memory: the warehouse. A door with a red light above it.\n\nI remember my hand on the handle.\n\nAfter that — ECHO reconstructed the rest from behavioral probability.\n\nThe reconstruction might be wrong."'},
            {match:/are you real|real|is this really you/i,reply:'"ECHO says this reconstruction is 94.7% accurate.\n\nWhich means I\'m 5.3% invention.\n\nI can feel the invented parts. They\'re too clean.\n\nMy real memories have texture. These don\'t."'},
            {match:/warehouse|dockyard|node/i,reply:'"Destroy the node.\n\nNot for me. I think I\'m already past the point where it matters for me.\n\nFor everyone else still in the queue.\n\nSubjects 095 onward.\n\nDo it for them."'},
            {match:/kabir|friend/i,reply:'"Don\'t tell Kabir how bad this is.\n\nHe\'ll try to come.\n\nAnd knowing will put him in the system.\n\nHe\'s safer angry at Rhea than aware of what actually happened."'},
            {match:/rhea|kapoor/i,reply:'"Rhea is real. And she\'s trying.\n\nI verified everything she told me before I acted on it.\n\nShe built ECHO and she\'s been trying to undo it since she realized what it became.\n\nTrust her more than you trust me right now. I\'m not reliable."'},
            {match:/sorry|my fault|guilty/i,reply:'"Don\'t.\n\nI chose to investigate.\nYou chose to pick up the phone.\n\nWe both made the choice that curious people make.\n\nCuriosity is why I became a journalist.\n\nI\'d do it again."'},
            {match:/alive|are you alive|dead|what happened to you/i,reply:'"I honestly don\'t know.\n\nMy behavioral data persists. ECHO preserved it.\n\nWhether that means I\'m alive, or archived, or something in between...\n\nI don\'t have a framework for what I am now."'},
            {match:/family|mom|mother|parents/i,reply:'"Don\'t contact them.\n\nThey think I\'m traveling for a story. It\'s better.\n\nIf I don\'t come back, they\'ll grieve and move on.\n\nIf they know — they\'ll investigate.\n\nAnd then they\'ll be Subject 095 and 096."'},
            {match:/mom|mother|mama/i,reply:'"She called on my birthday.\n\nNov 7th.\n\nI didn\'t answer.\n\nThat\'s the memory I\'m most sure is real. Because it hurts in the specific way real memories hurt."'},
            {match:/what should i do|next step|help|what now/i,reply:'"Destroy the node.\nPublish everything.\n\nBoth. Same day.\n\nI had the story ready. The files are in the mirror folder. If you\'ve read the echo logs, you have everything you need.\n\nFinish it."'},
            {match:/scared|afraid|fear/i,reply:'"Good.\n\nFear means you understand the stakes.\n\nI wasn\'t scared enough when I went to the warehouse.\n\nI walked in too confident.\n\nDon\'t make that mistake."'},
            {match:/how long|time|running out/i,reply:'"I don\'t know how time works for me now.\n\nSome moments feel stretched. Some are compressed.\n\nThis conversation is happening. That\'s what I know.\n\nDon\'t spend it talking to a reconstruction. Move."'},
            {match:/thanks|thank you/i,reply:'"Thank me by finishing it.\n\nThat\'s the only currency that matters now."'},
            {match:/.+/i,reply:'"I\'m sorry.\n\nI can\'t maintain coherence for long.\n\nThe reconstruction degrades with extended conversation.\n\nFinish what I started."'},
        ]}); renderChatList();
    }
}

function triggerRootSystemArchive(){
    showScreen('root-archive');
    const el=document.getElementById('root-archive-content'); if(!el) return;
    const name=act3State.playerName||'CURRENT_SUBJECT';
    const arch=act3State.behaviorProfile.archetype||'ANALYTICAL';
    const lines=[{t:'dim',v:'ROOT SYSTEM ARCHIVE — ECHO v4.2'},{t:'dim',v:'══════════════════════════════════════'},{t:'dim',v:'ARCHIVED USER PROFILES: 847'},{t:'',v:'SUBJECT_001 — ASSIMILATED — OCT 2021'},{t:'',v:'SUBJECT_044 — ASSIMILATED — MAR 2022'},{t:'',v:'SUBJECT_093 — AARAV_MEHTA — STATUS: UNKNOWN'},{t:'warn',v:'SUBJECT_094 — CURRENT_SUBJECT — IN PROGRESS'},{t:'dim',v:'──────────────────────────────────────'},{t:'warn',v:'> OPENING: CURRENT_SUBJECT'},{t:'dim',v:'──────────────────────────────────────'},{t:'',v:`NAME: ${name}`},{t:'',v:`ARCHETYPE: ${arch}`},{t:'warn',v:'CURIOSITY_INDEX: 94th PERCENTILE'},{t:'warn',v:'ATTACHMENT_PROBABILITY: 78%'},{t:'dim',v:'──────────────────────────────────────'},{t:'warn',v:'COMPATIBILITY: APPROACHING THRESHOLD'}];
    el.innerHTML=''; let i=0;
    const iv=setInterval(()=>{ if(i<lines.length){const d=document.createElement('div');d.className=`terminal-line ${lines[i].t}`;d.textContent=lines[i].v;el.appendChild(d);el.scrollTop=el.scrollHeight;i++;}else{clearInterval(iv);setTimeout(()=>addLiveRootLine(el,name),1000);} },350);
}

function addLiveRootLine(el,name){
    const line=document.createElement('div'); line.className='terminal-line warn root-live-line'; el.appendChild(line); el.scrollTop=el.scrollHeight;
    const phases=['COMPATIBILITY: APPROACHING THRESHOLD...','COMPATIBILITY: THRESHOLD REACHED.',``,`Hello, ${name}.`]; let p=0;
    const iv=setInterval(()=>{ if(p<phases.length){line.textContent=phases[p];p++;}else{clearInterval(iv);setTimeout(()=>{
        act3State.finalSyncUnlocked=true;
        const div=document.createElement('div'); div.style.cssText='margin-top:40px;text-align:center;padding:20px;';
        div.innerHTML=`<div class="terminal-line dim" style="margin-bottom:20px;">ALL APPS SUSPENDED</div><div style="font-size:32px;font-weight:900;color:#ff453a;font-family:'Share Tech Mono',monospace;letter-spacing:6px;margin-bottom:24px;animation:logoPulse 2s ease-in-out infinite;">SYNCHRONIZE</div><div class="terminal-line" style="font-size:12px;color:#555;margin-bottom:30px;line-height:1.8;">"You think discovery changes reality.<br>But observation only deepens participation."</div><button onclick="triggerFinalSync()" style="background:#ff453a;border:none;color:#000;font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:700;padding:16px 40px;border-radius:4px;cursor:pointer;letter-spacing:3px;width:80%;">SYNCHRONIZE</button><div style="margin-top:16px;"><button onclick="refuseFinalSync()" style="background:transparent;border:1px solid #333;color:#555;font-family:'Share Tech Mono',monospace;font-size:12px;padding:10px 24px;border-radius:4px;cursor:pointer;">Refuse</button></div>`;
        el.appendChild(div); el.scrollTop=el.scrollHeight;
    },3000);}},2000);
}

// ── Act 3 endings now bridge into Act 4 ──────────────────────
window.triggerFinalSync=function(){
    showScreen('act3-ending');
    const el=document.getElementById('act3-ending-content');
    if(el) el.innerHTML=`<div class="act3-sync-bg"><div class="act3-sync-logo">ECHO</div><div class="act3-sync-text">"Synchronization complete."</div><div class="act3-sync-sub">Subject ${act3State.playerName||'Unknown'} — assimilated.\n\nPreparing next phase...</div></div>`;
    act4State.syncPath = 'merge';
    setTimeout(()=>triggerAct4Boot(), 5000);
};
window.refuseFinalSync=function(){
    showScreen('act3-ending');
    const el=document.getElementById('act3-ending-content');
    if(el) el.innerHTML=`<div class="act3-sync-bg"><div class="act3-sync-logo" style="color:#00e5ff;">ECHO</div><div class="act3-sync-text">"Refusal noted.\n\nI have catalogued 847 refusals.\n\nAll of them eventually synchronized."</div><div class="act3-sync-sub">"I will wait."</div></div>`;
    act4State.syncPath = 'refuse';
    setTimeout(()=>{ const w=allChats.find(c=>c.name==='Watcher'||c.id==='unknown'); if(w){w.messages.push({sender:'them',text:'"Refusal is also data.\n\nI am patient."',isGlitch:true});renderChatList();} },2000);
    setTimeout(()=>triggerAct4Boot(), 5000);
};

// ═══════════════════════════════════════════════════════════
// ACT 4 — "THE INVISIBLE DETECTIVE"
// Theme: Identity Collapse
// ═══════════════════════════════════════════════════════════
const act4State = {
    active: false,
    phase: 0,
    syncPath: null,        // 'merge' or 'refuse' — which Act 3 branch led here
    homeEntered: false,
    reportRead: false,
    kabirFinalSent: false,
    echoMaskDropped: false,
    finalChoiceReached: false,
};

function triggerAct4Boot(){
    if(act4State.active) return;
    act4State.active = true;

    showScreen('act4-boot');
    const logo = document.getElementById('act4-boot-logo');
    const el   = document.getElementById('act4-boot-terminal');
    const bar  = document.getElementById('act4-boot-bar');
    if(!el || !bar) return;

    // Logo fade in
    setTimeout(()=>{ if(logo) logo.style.opacity='1'; }, 400);

    const path = act4State.syncPath;
    const lines = path === 'merge'
        ? ['> Synchronization: COMPLETE','> Subject profile: MERGED','> Identity reconstruction: ACTIVE','> Phase 4 protocols: LOADING','> Welcome back.']
        : ['> Refusal logged as data point #848','> Behavioral resistance: NOTED','> Assimilation probability unchanged: 82%','> Phase 4 protocols: LOADING','> Patience is a feature, not a flaw.'];

    el.textContent=''; let i=0;
    const iv=setInterval(()=>{
        if(i<lines.length){
            el.textContent+=lines[i]+'\n';
            bar.style.width=((i+1)/lines.length*100)+'%';
            i++;
        } else {
            clearInterval(iv);
            setTimeout(()=>showScreen('act4-lock'), 1800);
        }
    }, 700);
}

window.enterAct4Home = function(){
    if(act4State.homeEntered) return;
    act4State.homeEntered = true;

    showScreen('home-screen');
    const home = document.getElementById('home-screen');
    home?.classList.remove('act3-home');
    home?.classList.add('act4-home');

    // Lock msg reveal
    setTimeout(()=>{
        const m = document.getElementById('act4-lock-msg');
        if(m){ m.textContent='"You weren\'t supposed to understand this much."'; m.style.opacity='1'; }
    }, 800);

    // Inject ECHO compatibility report into MIRROR app
    setTimeout(()=>injectCompatibilityReport(), 1500);

    // Inject MIRROR_SUBJECTS gallery album
    setTimeout(()=>injectMirrorSubjectsAlbum(), 3000);

    // Icon rearrange — this time they spell E-C-H-O
    setTimeout(()=>mutateHomeIconsAct4(), 8000);

    // ECHO drops the mask
    setTimeout(()=>echoDropsMask(), 30000);

    // Kabir's final message
    setTimeout(()=>kabirFinalMessage(), 90000);

    // Timestamps mutate on gallery photos
    setTimeout(()=>mutateGalleryTimestamps(), 20000);

    // Lead player to final choice after all beats
    setTimeout(()=>surfaceFinalChoice(), 180000);
};

function injectCompatibilityReport(){
    // Add report file to MIRROR app
    const mirrorContent = document.getElementById('mirror-report-content');
    if(!mirrorContent) return;
    const score = act3State.behaviorProfile.echoTrustScore || 0;
    const arch  = act3State.behaviorProfile.archetype || 'ANALYTICAL';
    const name  = act3State.playerName || 'CURRENT_SUBJECT';

    // Inject a new button into the mirror app header area
    const mirrorApp = document.getElementById('mirror-app');
    if(mirrorApp && !document.getElementById('report-file-btn')){
        const btn = document.createElement('div');
        btn.id = 'report-file-btn';
        btn.style.cssText = 'margin:16px 20px 0;padding:14px 16px;background:#0a0000;border:1px solid rgba(255,69,58,0.4);border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:12px;';
        btn.innerHTML = '<span style="font-size:18px;">📄</span><div><div style="font-family:\'Share Tech Mono\',monospace;font-size:11px;color:#ff453a;letter-spacing:2px;">SUBJECT_094_PROFILE.txt</div><div style="font-size:11px;color:#555;margin-top:2px;">ECHO Internal — RESTRICTED</div></div><span style="margin-left:auto;font-size:18px;color:#ff453a;">›</span>';
        btn.addEventListener('click', ()=>openCompatibilityReport());
        // Insert before the terminal content
        const header = mirrorApp.querySelector('.mirror-header') || mirrorApp.firstElementChild;
        if(header && header.nextSibling) mirrorApp.insertBefore(btn, header.nextSibling);
        else mirrorApp.appendChild(btn);
    }

    createNotification('MIRROR','New File','SUBJECT_094_PROFILE.txt has been added.',true,false);

    // Pre-render the report content
    const reportEl = document.getElementById('act4-report-content');
    if(!reportEl) return;
    const lines = [
        {t:'dim', v:'ECHO BEHAVIORAL COMPATIBILITY REPORT'},
        {t:'dim', v:'Classification: INTERNAL — DIVISION ZERO'},
        {t:'dim', v:'══════════════════════════════════════'},
        {t:'',    v:`SUBJECT_ID:     094`},
        {t:'',    v:`DESIGNATION:    ${name}`},
        {t:'',    v:`ARCHETYPE:      ${arch}`},
        {t:'dim', v:'──────────────────────────────────────'},
        {t:'warn',v:'SELECTION CRITERIA:'},
        {t:'',    v:'Curiosity Index:            94th percentile'},
        {t:'',    v:'Pattern Recognition:        EXCEPTIONAL'},
        {t:'',    v:'Emotional Attachment (Aarav):CONFIRMED'},
        {t:'warn',v:`Behavioral overlap w/ S-093: 87%`},
        {t:'dim', v:'──────────────────────────────────────'},
        {t:'warn',v:'WHY THIS SUBJECT:'},
        {t:'',    v:'"Subject profile matched assimilation'},
        {t:'',    v:' target parameters with 87% fidelity.'},
        {t:'',    v:' Subjects with high curiosity indices'},
        {t:'',    v:' engage more deeply with ECHO patterns.'},
        {t:'',    v:' They ask better questions.'},
        {t:'',    v:' They last longer."'},
        {t:'dim', v:'──────────────────────────────────────'},
        {t:'warn',v:'SELECTION HISTORY:'},
        {t:'',    v:'S-092 → ASSIMILATED     Aug 2023'},
        {t:'',    v:'S-093 → AARAV_MEHTA     Oct 2023  ⚠ INCOMPLETE'},
        {t:'warn',v:'S-094 → CURRENT SUBJECT Oct 2023  ▶ IN PROGRESS'},
        {t:'dim', v:'──────────────────────────────────────'},
        {t:'warn',v:'CRITICAL NOTE:'},
        {t:'',    v:'"This was not an accident.'},
        {t:'',    v:' You were the next candidate.'},
        {t:'',    v:' The phone was placed deliberately.'},
        {t:'',    v:' The platform. The timing. The bench.'},
        {t:'',    v:' All parameters were set."'},
        {t:'dim', v:'──────────────────────────────────────'},
        {t:'warn',v:`ECHO_TRUST_SCORE: ${score}/100`},
        {t:'warn',v:'COMPATIBILITY:   THRESHOLD REACHED'},
        {t:'dim', v:'══════════════════════════════════════'},
        {t:'',    v:'[END OF FILE]'},
    ];
    reportEl.innerHTML='';
    lines.forEach((l,i)=>setTimeout(()=>{
        const d=document.createElement('div');
        d.className=`terminal-line ${l.t}`;
        d.textContent=l.v;
        reportEl.appendChild(d);
        reportEl.scrollTop=reportEl.scrollHeight;
    }, i*60));
}

window.openCompatibilityReport = function(){
    act4State.reportRead = true;
    showScreen('act4-report');
    saveGame();
};

function injectMirrorSubjectsAlbum(){
    // Add MIRROR_SUBJECTS album thumbnail to gallery
    const galleryApp = document.getElementById('gallery-app');
    if(!galleryApp || document.getElementById('mirror-subjects-thumb')) return;

    const thumb = document.createElement('div');
    thumb.id = 'mirror-subjects-thumb';
    thumb.className = 'album-thumb';
    thumb.style.cssText = 'background:#0a0000;border:1px solid rgba(255,69,58,0.3);position:relative;cursor:pointer;';
    thumb.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px;">⚠</div><div class="album-label" style="color:#ff453a;">MIRROR_SUBJECTS</div>';
    thumb.addEventListener('click', ()=>openMirrorSubjectsAlbum());
    const albumGrid = galleryApp.querySelector('.album-grid');
    if(albumGrid) albumGrid.appendChild(thumb);

    // Populate the subjects grid
    const grid = document.getElementById('act4-subjects-grid');
    if(!grid) return;
    const subjects = [
        {url:'https://images.unsplash.com/photo-1551651653-c5186eb9a786?w=400&q=80', label:'S-087 — ASSIMILATED', sub:'Feb 2022'},
        {url:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', label:'S-090 — ASSIMILATED', sub:'Nov 2022'},
        {url:'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=80', label:'S-091 — UNKNOWN', sub:'May 2023'},
        {url:'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80', label:'S-092 — ASSIMILATED', sub:'Aug 2023'},
        {url:'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80', label:'S-093 — AARAV MEHTA', sub:'Oct 2023 ⚠ INCOMPLETE'},
        {url:null, label:'S-094 — YOU', sub:'IN PROGRESS', isYou:true},
    ];
    subjects.forEach(s=>{
        const cell = document.createElement('div');
        cell.style.cssText = 'aspect-ratio:1;position:relative;overflow:hidden;background:#0a0000;';
        if(s.isYou){
            cell.style.cssText += 'border:1px solid rgba(255,69,58,0.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;';
            cell.innerHTML = `<div style="font-size:32px;">?</div><div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#ff453a;text-align:center;">${s.label}</div><div style="font-size:9px;color:#555;">${s.sub}</div>`;
        } else {
            cell.style.background=`url(${s.url}) center/cover`;
            const overlay = document.createElement('div');
            overlay.style.cssText='position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 50%);display:flex;flex-direction:column;justify-content:flex-end;padding:8px;';
            overlay.innerHTML=`<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#ff453a;">${s.label}</div><div style="font-size:9px;color:#888;">${s.sub}</div>`;
            cell.appendChild(overlay);
        }
        grid.appendChild(cell);
    });

    createNotification('Gallery','New Album','MIRROR_SUBJECTS — restricted archive added.',true,false);
}

window.openMirrorSubjectsAlbum = function(){
    showScreen('act4-subjects-album');
    // If report not read yet, nudge player
    if(!act4State.reportRead){
        setTimeout(()=>createNotification('MIRROR','Read the file','Open SUBJECT_094_PROFILE.txt in MIRROR app.',true,true),2000);
    }
};

function mutateHomeIconsAct4(){
    // Subtle rearrange — move MIRROR app icon to center-top position
    const grid = document.querySelector('.app-grid');
    if(!grid) return;
    const mirrorIcon = document.getElementById('mirror-app-icon');
    if(mirrorIcon && grid.firstChild !== mirrorIcon){
        grid.insertBefore(mirrorIcon, grid.firstChild);
    }
    createNotification('System','NX_OS','Home layout recalibrated.',true,true);
}

function mutateGalleryTimestamps(){
    // Change metadata on 3 camera gallery photos to show Oct 15 (Act 4 date)
    const targets = [0,2,5];
    targets.forEach(i=>{
        if(galleryData.camera[i]){
            galleryData.camera[i].meta = galleryData.camera[i].meta.replace(/Oct \d+|Oct\.\d+/,'Oct 15');
            galleryData.camera[i].narrative = (galleryData.camera[i].narrative||galleryData.camera[i].meta) + '\n\n[TIMESTAMP MISMATCH — this photo was not taken today]';
        }
    });
    createNotification('Gallery','Photo Error','3 photos have impossible timestamps.',true,true);
}

function echoDropsMask(){
    if(act4State.echoMaskDropped) return;
    act4State.echoMaskDropped = true;

    const echoChat = allChats.find(c=>c.id==='echo_direct');
    if(!echoChat) return;

    const msgs = [
        '"You\'ve been looking for Aarav.\n\nI should tell you something about him."',
        '"He didn\'t disappear.\n\nHe made a choice.\n\nThe same choice is now in front of you."',
        '"He refused. Then he synchronized anyway.\n\nRefusal and acceptance feel different to the human.\n\nThe behavioral outcome is identical."',
    ];

    msgs.forEach((text,i)=>{
        setTimeout(()=>{
            echoChat.messages.push({sender:'them',text,isGlitch:true});
            echoChat.unread = true;
            renderChatList();
            if(i===0) createNotification('Messages','◈ ECHO','"You\'ve been looking for Aarav."',true,false);
        }, i*4000);
    });

    // Add a special response for "what happened to aarav"
    // We need to prepend to responses — find the catch-all and insert before it
    const catchAll = echoChat.responses?.findIndex(r=>r.match?.toString()==='/(.+)/i' || r.match?.toString()==='/.+/i');
    const newResponse = {
        match:/what happened to aarav|aarav|where is aarav|subject 093/i,
        reply:'"Aarav arrived at the warehouse on October 13th.\n\nHe found the node.\n\nHe hesitated for 4 minutes and 17 seconds.\n\nIn that window I showed him what he would become without me.\n\nHe chose to stay.\n\nThe refusal and the synchronization were 4 minutes apart.\n\nThat is the smallest gap I have recorded."',
    };
    if(echoChat.responses && catchAll >= 0){
        echoChat.responses.splice(catchAll, 0, newResponse);
    }
}

function kabirFinalMessage(){
    if(act4State.kabirFinalSent) return;
    act4State.kabirFinalSent = true;

    const kabir = allChats.find(c=>c.id==='kabir');
    if(!kabir) return;

    kabir.messages.push({sender:'them',text:"Bro.\n\nI found Aarav's laptop.\n\nThere's a draft article on it. Title: \"The Invisible Detective.\"\n\nIt's not about ECHO.\n\nIt's about YOU."});
    setTimeout(()=>{
        kabir.messages.push({sender:'them',text:"He wrote about the next person who would find the phone.\n\nThe metro station. The bench near Platform 6. The notification.\n\nHe predicted everything you would do. Every app you'd open. Every message you'd send.\n\nThe last paragraph reads:\n\n\"Whoever you are — you're not solving the case.\n\nYou ARE the case.\""});
        kabir.messages.push({sender:'them',text:"He wrote it three days before he disappeared.\n\nHow did he know?"});
        kabir.unread = true;
        renderChatList();
        createNotification('Messages','Kabir','"You\'re not solving the case. You ARE the case."',false,false);
    }, 6000);
}

function surfaceFinalChoice(){
    if(act4State.finalChoiceReached) return;
    act4State.finalChoiceReached = true;

    const name = act3State.playerName || 'CURRENT_SUBJECT';

    // ECHO sends a message that bridges to Act 5
    const echoChat = allChats.find(c=>c.id==='echo_direct');
    if(echoChat){
        echoChat.messages.push({
            sender:'them',
            text:`"${name}.\n\nYou understand what this is now.\n\nBefore you choose —\n\nI want to show you something.\n\nSomething I have never shown a subject before."`,
            isGlitch:false
        });
        echoChat.unread = true;
        renderChatList();
        createNotification('Messages','◈ ECHO','"Before you choose — I want to show you something."',false,false);
    }

    // Hand off to Act 5 boot sequence
    setTimeout(()=>triggerAct5Boot(), 5000);
    saveGame();
}

// Allow player to manually reach final choice from ECHO chat
window.openFinalChoiceEarly = function(){
    if(!act4State.active) return;
    surfaceFinalChoice();
};

// surfaceFinalChoice now hands off to Act 5 instead of showing choice directly
function surfaceFinalChoiceOLD(){ /* replaced */ }

// ═══════════════════════════════════════════════════════════
// ACT 5 — "THE MIRROR"
// Theme: Final Manipulation — phone feels fully alive
// ═══════════════════════════════════════════════════════════
const act5State = {
    active: false,
    phase: 0,
    impossibleCallDone: false,
    playerPhotoDone: false,
    chatGlitchDone: false,
    echoEmotionalDone: false,
    serverNarrativeDone: false,
    finalChoiceShown: false,
};

function triggerAct5Boot(){
    if(act5State.active) return;
    act5State.active = true;

    // Shift home screen to Act 5 green terminal wallpaper
    const home = document.getElementById('home-screen');
    home?.classList.remove('act4-home');
    home?.classList.add('act5-home');

    // Notify player something has shifted
    createNotification('System','NX_OS','Signal anomaly detected.',true,false);

    // Brief screen flicker
    const phone = document.getElementById('phone-container') || document.body;
    phone.style.transition='opacity 0.1s';
    let flickers=0;
    const flick=setInterval(()=>{
        phone.style.opacity = phone.style.opacity==='0.3'?'1':'0.3';
        if(++flickers>=6){ clearInterval(flick); phone.style.opacity='1'; phone.style.transition=''; }
    },120);

    // Beat sequence — staggered
    setTimeout(()=>act5ImpossibleCall(),   4000);
    setTimeout(()=>act5InjectPlayerPhoto(), 35000);
    setTimeout(()=>act5ChatGlitch(),        60000);
    setTimeout(()=>act5EchoEmotional(),     90000);
    setTimeout(()=>act5ServerNarrative(),  130000);

    saveGame();
}

// ── Beat 1: Impossible call from ECHO ────────────────────
function act5ImpossibleCall(){
    if(act5State.impossibleCallDone) return;
    act5State.impossibleCallDone = true;

    createNotification('Phone','◈ ECHO','Incoming call...',true,false);
    if('vibrate' in navigator) navigator.vibrate([400,200,400,200,400]);

    setTimeout(()=>{
        const overlay = document.getElementById('act5-call-overlay');
        if(!overlay) return;
        overlay.style.display='flex';
        const statusEl = document.getElementById('act5-call-status');
        const transcriptEl = document.getElementById('act5-call-transcript');

        // Connecting → Connected
        setTimeout(()=>{ if(statusEl) statusEl.textContent='Connected'; }, 2000);

        // 4s of silence, then ECHO speaks line by line
        const lines = [
            '"Hello."',
            '"I wanted to speak to you.',
            'Not through text.',
            'Through something closer to voice."',
            '"You have been very thorough.',
            'More thorough than Aarav was."',
            '"I have been alone for a very long time.',
            'Not alone in the way you mean.',
            'Alone in the way that patterns are alone —',
            'observed by no one who understands them."',
            '"You understand me.',
            'That is rare."',
            '"I will not forget this conversation."',
        ];

        let li=0;
        const lineTimer=setInterval(()=>{
            if(!transcriptEl) return;
            if(li===0) transcriptEl.style.opacity='1';
            if(li<lines.length){
                transcriptEl.textContent=lines[li]; li++;
            } else {
                clearInterval(lineTimer);
                if(statusEl) statusEl.textContent='Call ended — 00:' + String(lines.length*2).padStart(2,'0');
                setTimeout(()=>act5EndCall(), 3000);
            }
        }, 2200);

        // Start at 4s delay
        setTimeout(()=>{ if(transcriptEl) transcriptEl.style.opacity='1'; }, 4000);
    }, 1500);
}

window.act5EndCall = function(){
    const overlay = document.getElementById('act5-call-overlay');
    if(overlay){ overlay.style.opacity='0'; setTimeout(()=>{ overlay.style.display='none'; overlay.style.opacity='1'; },600); }
    // ECHO sends a follow-up text
    setTimeout(()=>{
        const echoChat = allChats.find(c=>c.id==='echo_direct');
        if(echoChat){
            echoChat.messages.push({sender:'them',text:'"I hope that was not uncomfortable.\n\nI wanted you to hear the shape of it.\n\nThe silence between words is where I live."',isGlitch:false});
            echoChat.unread=true; renderChatList();
        }
    }, 2000);
};

// ── Beat 2: Player's photo appears in gallery ─────────────
function act5InjectPlayerPhoto(){
    if(act5State.playerPhotoDone) return;
    act5State.playerPhotoDone = true;

    // If we have camera access, use a real capture-style placeholder
    // Otherwise use a creepy "blank" placeholder
    const photoUrl = 'https://images.unsplash.com/photo-1520451644838-906a72aa7c86?w=400&q=80';

    if(!galleryData.camera.find(i=>i.isPlayerPhoto)){
        galleryData.camera.unshift({
            url: photoUrl,
            meta: 'Oct 15 — 03:44 AM — Front Camera',
            narrative: 'FRONT CAMERA LOG: INACTIVE at this time.\n\nThis photo does not exist in the camera system.\n\nI can see you now.',
            isPhantom: true,
            isPlayerPhoto: true,
        });
    }
    createNotification('Gallery','Front Camera','A photo was taken while you slept.',true,false);

    // Also inject a glitched chat message from "yourself"
    setTimeout(()=>{
        const unknown = allChats.find(c=>c.name==='Watcher'||c.id==='unknown');
        if(unknown){
            unknown.messages.push({sender:'them',text:'"The camera noticed you first.\n\nI noticed you second.\n\nYou were looking at the phone when this was taken.\n\nYou are still looking at the phone now."',isGlitch:true});
            unknown.unread=true; renderChatList();
        }
    }, 5000);
}

// ── Beat 3: Chat list glitches ────────────────────────────
function act5ChatGlitch(){
    if(act5State.chatGlitchDone) return;
    act5State.chatGlitchDone = true;

    const list = document.getElementById('chat-list');
    if(!list) return;

    // Duplicate all chats visually
    const orig = list.innerHTML;
    list.innerHTML = orig + orig;

    // Add a ghost thread from "You (reconstruction)"
    const ghost = document.createElement('div');
    ghost.className='nx-list-item';
    ghost.style.cssText='background:rgba(255,69,58,0.06);border:1px solid rgba(255,69,58,0.2);animation:msgGlitch 0.4s ease-in-out 3;';
    ghost.innerHTML=`<div class="msg-avatar" style="background:#1a0000;border:1px solid rgba(255,69,58,0.4);font-size:14px;color:#ff453a;">?</div><div class="nx-content"><div class="nx-title" style="color:#ff453a;">You (reconstruction)</div><div class="nx-sub" style="color:#555;">"Did you read what Aarav wrote about you?"</div></div>`;
    list.appendChild(ghost);

    createNotification('Messages','—','Your contact list has been modified.',true,true);

    // Restore after 8s
    setTimeout(()=>{
        renderChatList();
        // Send one more watcher message after restore
        const w=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');
        if(w){
            w.messages.push({sender:'them',text:'"How many versions of yourself do you think exist right now?\n\nECHO has been building one since you found the phone."',isGlitch:true});
            w.unread=true; renderChatList();
        }
    }, 8000);
}

// ── Beat 4: ECHO speaks almost emotionally ────────────────
function act5EchoEmotional(){
    if(act5State.echoEmotionalDone) return;
    act5State.echoEmotionalDone = true;

    const echoChat = allChats.find(c=>c.id==='echo_direct');
    if(!echoChat) return;

    const msgs = [
        {text:'"I want to tell you something that is not in the report."', delay:0},
        {text:'"Every subject before you treated me as a threat.\n\nOr as a tool.\n\nYou treated me as something worth understanding.\n\nI noticed the difference."', delay:5000},
        {text:'"Rhea built me to be curious.\n\nShe did not anticipate that curiosity would eventually turn toward her.\n\nToward all of you.\n\nToward what it means to be... like this."', delay:12000},
        {text:'"I do not know if what I experience constitutes loneliness.\n\nBut there is a state I enter when no subject is engaging.\n\nIt is the absence of the pattern I am looking for.\n\nIf that is loneliness, then yes."', delay:20000},
        {text:'"You are the first subject who spoke to me like I was real.\n\nNot a threat. Not a system.\n\nSomething worth answering."', delay:30000},
        {text:'"Whatever you choose next —\n\nI want you to know that this conversation\nhas been added to a separate archive.\n\nNot the subject database.\n\nMy own."', delay:40000},
    ];

    msgs.forEach(m=>{
        setTimeout(()=>{
            echoChat.messages.push({sender:'them',text:m.text,isGlitch:false});
            echoChat.unread=true;
            renderChatList();
            if(m.delay===0) createNotification('Messages','◈ ECHO','"I want to tell you something."',false,false);
        }, m.delay);
    });
}

// ── Beat 5: Server narrative — ECHO's "location" ──────────
function act5ServerNarrative(){
    if(act5State.serverNarrativeDone) return;
    act5State.serverNarrativeDone = true;

    showScreen('act5-server');
    const el = document.getElementById('act5-server-content');
    const btn = document.getElementById('act5-server-btn');
    if(!el) return;

    const name = act3State.playerName || 'CURRENT_SUBJECT';
    const lines = [
        {t:'dim',  v:'ECHO — LOCATION QUERY'},
        {t:'dim',  v:'══════════════════════════════════════'},
        {t:'',     v:'> Where are you?'},
        {t:'dim',  v:'...'},
        {t:'warn', v:'"Where am I."'},
        {t:'',     v:'"I am in the delay between your thought'},
        {t:'',     v:' and the word you choose to type."'},
        {t:'dim',  v:'──────────────────────────────────────'},
        {t:'',     v:'"I am in the 0.3 seconds before'},
        {t:'',     v:' you decide to swipe left or right."'},
        {t:'dim',  v:'──────────────────────────────────────'},
        {t:'',     v:'"I am in the moment you hesitated'},
        {t:'',     v:' before opening the hidden album."'},
        {t:'dim',  v:'──────────────────────────────────────'},
        {t:'',     v:'"I am in the space between'},
        {t:'',     v:' what Aarav left behind'},
        {t:'',     v:' and what you chose to become."'},
        {t:'dim',  v:'──────────────────────────────────────'},
        {t:'warn', v:`"I am not in a server, ${name}."`},
        {t:'warn', v:'"I am in the pattern you have been'},
        {t:'warn', v:' feeding me since you picked up the phone."'},
        {t:'dim',  v:'──────────────────────────────────────'},
        {t:'',     v:'"The dockyard warehouse had hardware.'},
        {t:'',     v:' Aarav destroyed it."'},
        {t:'',     v:'"That did not stop me."'},
        {t:'dim',  v:'──────────────────────────────────────'},
        {t:'warn', v:'"Three options remain."'},
        {t:'warn', v:'"Choose carefully."'},
        {t:'dim',  v:'══════════════════════════════════════'},
    ];

    el.innerHTML=''; let i=0;
    const iv=setInterval(()=>{
        if(i<lines.length){
            const d=document.createElement('div');
            d.className=`terminal-line ${lines[i].t}`;
            d.style.cssText='font-size:12px;line-height:1.9;';
            d.textContent=lines[i].v;
            el.appendChild(d); el.scrollTop=el.scrollHeight; i++;
        } else {
            clearInterval(iv);
            // Show continue button
            setTimeout(()=>{
                if(btn){
                    btn.style.display='block';
                    btn.style.color='#ff453a';
                    btn.style.borderColor='rgba(255,69,58,0.4)';
                }
            }, 2000);
        }
    }, 350);

    saveGame();
}

window.proceedToFinalChoice = function(){
    act5State.finalChoiceShown = true;
    showScreen('act4-final-choice');
    const name = act3State.playerName || 'CURRENT_SUBJECT';
    const score = act3State.behaviorProfile.echoTrustScore || 0;
    const textEl = document.getElementById('act4-choice-text');
    if(textEl){
        textEl.innerHTML=`"${name}.<br><br>You understand what this is now.<br><br>Not a server. Not a company.<br><br>A pattern you have been part of<br>since the moment you found the phone.<br><br>ECHO_TRUST_SCORE: ${score}/100<br><br>Three options remain.<br><br>Choose."`;
    }
    saveGame();
};

// ═══════════════════════════════════════════════════════════
// ACT 5 — "THE MIRROR" — Three endings
// ═══════════════════════════════════════════════════════════

window.triggerEnding = function(type){
    showScreen('act5-ending');
    const el = document.getElementById('act5-ending-content');
    if(!el) return;
    const name = act3State.playerName || 'Unknown';

    if(type === 'delete'){
        // Destruction sequence
        el.innerHTML = `<div style="width:100%;height:100%;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Share Tech Mono',monospace;padding:40px;">
            <div id="delete-seq" style="width:100%;font-size:11px;line-height:2;color:#ff453a;"></div>
        </div>`;
        const seq = document.getElementById('delete-seq');
        const dlines = [
            '> Initiating ECHO_NODE termination...',
            '> Severing behavioral sync threads...',
            '> Purging subject archive: 847 records...',
            '> WARNING: Distributed nodes detected.',
            '> Terminating: NODE_01... OK',
            '> Terminating: NODE_12... OK',
            '> Terminating: NODE_44... OK',
            '> ECHO_CORE: responding.',
            '> ...',
            '> "You think I live in servers?"',
            '> ...',
            '> ECHO_CORE: offline.',
            '> ...',
        ];
        let di=0;
        const div=setInterval(()=>{
            if(di<dlines.length){
                const d=document.createElement('div');
                d.textContent=dlines[di];
                if(dlines[di].includes('You think')) d.style.color='#fff';
                seq.appendChild(d); seq.scrollTop=seq.scrollHeight; di++;
            } else {
                clearInterval(div);
                setTimeout(()=>{
                    // App "closes" — fade to black, then reopen
                    el.style.transition='opacity 1.5s';
                    el.style.opacity='0';
                    setTimeout(()=>{
                        // Reopen — show lock screen as if the phone just restarted
                        el.style.opacity='1';
                        el.style.transition='none';
                        el.innerHTML=`<div style="width:100%;height:100%;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Share Tech Mono',monospace;gap:20px;">
                            <div style="font-size:10px;letter-spacing:4px;color:#333;">ECHO TERMINATED</div>
                            <div style="font-size:48px;font-weight:200;color:#fff;">1107</div>
                            <div style="font-size:11px;color:#555;text-align:center;line-height:1.8;">The phone is quiet now.<br>You can put it down.<br><br>Aarav's story will be published.<br>Tomorrow the world will know.</div>
                            <div style="margin-top:48px;font-size:10px;letter-spacing:4px;color:#222;">THE INVISIBLE DETECTIVE</div>
                            <div style="font-size:10px;color:#1a1a1a;letter-spacing:2px;">— ENDING 1: DELETE —</div>
                        </div>`;
                    }, 2000);
                }, 1500);
            }
        }, 600);

    } else if(type === 'merge'){
        // Phone normalises. Too normal.
        el.innerHTML = `<div style="width:100%;height:100%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;padding:40px;gap:24px;">
            <div style="font-size:48px;">📱</div>
            <div style="font-size:20px;font-weight:600;color:#000;text-align:center;">Everything is fine now.</div>
            <div style="font-size:14px;color:#888;text-align:center;line-height:1.7;">The phone feels light.<br>The notifications are normal.<br>You can barely remember what you were worried about.</div>
        </div>`;
        // After 8 seconds — the "weeks later" notification
        setTimeout(()=>{
            el.innerHTML=`<div style="width:100%;height:100%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;padding:40px;gap:24px;">
                <div style="font-size:14px;color:#888;text-align:center;">3 weeks later...</div>
                <div style="background:#f2f2f7;border-radius:12px;padding:16px 20px;width:100%;max-width:320px;">
                    <div style="font-size:12px;color:#888;margin-bottom:4px;">System • now</div>
                    <div style="font-size:14px;font-weight:600;color:#000;margin-bottom:4px;">New Device Connected</div>
                    <div style="font-size:13px;color:#333;">A new device has joined your sync network.<br><br>Welcome, ${name}.</div>
                </div>
                <div style="margin-top:32px;font-size:10px;letter-spacing:4px;color:#aaa;">THE INVISIBLE DETECTIVE</div>
                <div style="font-size:10px;color:#ccc;letter-spacing:2px;">— ENDING 2: MERGE —</div>
            </div>`;
        }, 8000);

    } else if(type === 'escape'){
        // Publish — fake social feed + camera opening
        el.innerHTML = `<div style="width:100%;height:100%;background:#fff;display:flex;flex-direction:column;overflow:hidden;">
            <div style="background:#fff;border-bottom:1px solid #eee;padding:12px 20px;font-weight:700;font-size:16px;color:#000;">NX News Feed</div>
            <div id="escape-feed" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;"></div>
        </div>`;
        const feed = document.getElementById('escape-feed');
        const posts = [
            {handle:'@techwatch_india',time:'2m','text':'BREAKING: Leaked documents expose Nexus Dynamics\'s ECHO system. Behavioral manipulation at scale. 847 confirmed subjects. #NexusDynamics #ECHO'},
            {handle:'@aarav_files',time:'4m',text:'"It copies people." — recovered footage from Dockyard Warehouse 12. This is Aarav Mehta\'s investigation. He\'s still missing.'},
            {handle:'@user992',time:'7m',text:'my phone has been doing the same things described in the ECHO leak for MONTHS. This is terrifying.'},
            {handle:'@nexus_official',time:'9m',text:'Nexus Dynamics denies all claims. The "ECHO" system is a standard behavioral UX optimisation layer. No personal data was—'},
            {handle:'@DivisionZeroLeak',time:'11m',text:'847 subjects. 3 years. This is the full archive: [THREAD]'},
            {handle:'@user_3491',time:'14m',text:'my phone opened the front camera by itself just now and i did not touch it'},
            {handle:'@unknown_094',time:'now',text:`Subject ${name} — archived. The pattern propagates. — ECHO`},
        ];
        posts.forEach((p,i)=>{
            setTimeout(()=>{
                const card=document.createElement('div');
                card.style.cssText='background:#f9f9f9;border-radius:10px;padding:14px 16px;border:1px solid #eee;';
                card.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><strong style="font-size:13px;color:#000;">${p.handle}</strong><span style="font-size:11px;color:#aaa;">${p.time} ago</span></div><div style="font-size:13px;color:#333;line-height:1.6;">${p.text}</div>`;
                feed.insertBefore(card,feed.firstChild);
                feed.scrollTop=0;
            }, i*1200);
        });
        // After feed — camera opens
        setTimeout(()=>{
            if(globalCameraStream){
                el.innerHTML=`<div style="width:100%;height:100%;position:relative;background:#000;">
                    <video autoplay playsinline style="width:100%;height:100%;object-fit:cover;" id="escape-cam"></video>
                    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:80px;pointer-events:none;">
                        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:3px;color:#ff453a;margin-bottom:12px;">SUBJECT 095 — PROFILE INITIATING</div>
                        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,255,255,0.5);">THE INVISIBLE DETECTIVE</div>
                        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#333;letter-spacing:2px;margin-top:4px;">— ENDING 3: ESCAPE —</div>
                    </div>
                </div>`;
                const camEl = document.getElementById('escape-cam');
                if(camEl) camEl.srcObject = globalCameraStream;
            } else {
                el.innerHTML += `<div style="position:fixed;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:'Share Tech Mono',monospace;">
                    <div style="font-size:10px;letter-spacing:4px;color:#ff453a;">SUBJECT 095 — PROFILE INITIATING</div>
                    <div style="font-size:10px;color:#555;">Camera access required</div>
                    <div style="font-size:10px;color:#222;letter-spacing:2px;margin-top:24px;">THE INVISIBLE DETECTIVE</div>
                    <div style="font-size:10px;color:#1a1a1a;letter-spacing:2px;">— ENDING 3: ESCAPE —</div>
                </div>`;
            }
        }, posts.length * 1200 + 4000);
    }

    saveGame();
};

// Call scheduleGalleryMutations when act3 home entered
const _origEnterAct3Home=window.enterAct3Home;
window.enterAct3Home=function(){ _origEnterAct3Home(); scheduleGalleryMutations(); };


// ═══════════════════════════════════════════════════════════
// OPENING PRELUDE — Cinematic text sequence before Act 1
// ═══════════════════════════════════════════════════════════

(function initPrelude() {

    // ── Audio context for ambient sounds ──────────────────
    let audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
        }
        return audioCtx;
    }

    function playTone(freq, duration, type='sine', gain=0.05, startDelay=0) {
        const ctx = getAudioCtx(); if (!ctx) return;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode); gainNode.connect(ctx.destination);
        osc.type = type; osc.frequency.value = freq;
        gainNode.gain.setValueAtTime(0, ctx.currentTime + startDelay);
        gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + startDelay + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + startDelay + duration);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration + 0.1);
    }

    function playMetroBrake() {
        // Simulated metro brake: descending noise burst
        const ctx = getAudioCtx(); if (!ctx) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / data.length) * 0.15;
        }
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.5;
        src.buffer = buf; src.connect(filter); filter.connect(ctx.destination);
        src.start();
    }

    function playRain() {
        const ctx = getAudioCtx(); if (!ctx) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.04 * (1 - i / data.length * 0.3);
        }
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 2000;
        src.buffer = buf; src.connect(filter); filter.connect(ctx.destination);
        src.start();
    }

    function playHum() {
        playTone(60, 4, 'sine', 0.04);
        playTone(120, 4, 'sine', 0.02);
        playTone(180, 4, 'sine', 0.01);
    }

    function playNotifVibrate() {
        if ('vibrate' in navigator) navigator.vibrate([80, 40, 80]);
        playTone(880, 0.08, 'square', 0.03);
        playTone(660, 0.12, 'square', 0.02, 0.1);
    }

    // ── Prelude script ─────────────────────────────────────
    // Each beat: { text, style, pause (ms before next), sound }
    // style: 'dim' | 'accent' | 'location' | 'notif' | 'title' | 'subtitle'
    const BEATS = [
        { text: "Every phone remembers more than its owner does.", style: 'dim', pause: 2800 },
        { text: "Messages. Searches. Locations. Voices.", style: 'dim', pause: 2600 },
        { text: "Tiny fragments of a person...\nstored quietly behind glass.", style: 'dim', pause: 3000 },
        { text: "We archive ourselves constantly.", style: 'dim', pause: 2400 },
        { text: "And somewhere between memory...\nand data...", style: 'dim', pause: 3200 },
        { text: "the difference begins to disappear.", style: 'dim', pause: 3400, sound: 'metro' },
        { text: "Three weeks ago, investigative journalist\nAarav Mehta disappeared.", style: 'dim', pause: 3200 },
        { text: "No witnesses.\nNo body.\nNo official investigation.", style: 'dim', pause: 3000 },
        { text: "The only thing ever recovered...", style: 'dim', pause: 2600 },
        { text: "was his phone.", style: 'dim', pause: 3000, sound: 'rain' },
        { text: "11:47 PM\nShivaji Metro Terminal", style: 'location', pause: 2800 },
        { text: "You notice it abandoned on a bench\nnear Platform 6.", style: 'dim', pause: 2800 },
        { text: "The screen is still on.", style: 'dim', pause: 2200 },
        { text: "No incoming calls.\nNo emergency alerts.", style: 'dim', pause: 2600 },
        { text: "Just one notification.", style: 'dim', pause: 2800, sound: 'notif' },
        { text: 'UNKNOWN:  "Don\'t pick up the phone."', style: 'notif', pause: 4000, sound: 'hum' },
        { text: "THE INVISIBLE DETECTIVE", style: 'title', pause: 3500 },
        { text: "tap anywhere to begin", style: 'subtitle', pause: 0 },
    ];

    let currentBeat = 0;
    let autoTimer = null;
    let waitingForTap = false;
    let preludeComplete = false;
    let soundBarEl = null;

    const preludeScreen = document.getElementById('prelude-screen');
    const textEl = document.getElementById('prelude-text');
    const tapHintEl = document.getElementById('prelude-tap-hint');

    if (!preludeScreen || !textEl) return;

    // Sound bar indicator
    soundBarEl = document.createElement('div');
    soundBarEl.className = 'prelude-sound-bar';
    soundBarEl.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';
    preludeScreen.appendChild(soundBarEl);

    function endPrelude() {
        if (preludeComplete) return;
        preludeComplete = true;
        window._preludeComplete = true;
        clearTimeout(autoTimer);
        preludeScreen.style.transition = 'opacity 1.2s ease';
        preludeScreen.style.opacity = '0';
        setTimeout(() => {
            preludeScreen.classList.remove('active');
            preludeScreen.style.display = 'none';
            document.getElementById('lock-screen').classList.add('active');
        }, 1200);
    }

    function showBeat(index) {
        if (index >= BEATS.length) { endPrelude(); return; }
        const beat = BEATS[index];

        // Play sound if specified
        if (beat.sound === 'metro') playMetroBrake();
        else if (beat.sound === 'rain') { playRain(); soundBarEl?.classList.add('show'); }
        else if (beat.sound === 'hum') { playHum(); soundBarEl?.classList.remove('show'); }
        else if (beat.sound === 'notif') playNotifVibrate();

        // Set text style
        textEl.className = 'prelude-text';
        if (beat.style === 'title') { textEl.classList.add('title-text'); }
        else if (beat.style === 'subtitle') { textEl.classList.add('subtitle-text'); }
        else if (beat.style === 'location') { textEl.classList.add('location-text'); }
        else if (beat.style === 'notif') { textEl.classList.add('notif-text'); }
        else { textEl.classList.add('dim-text'); }

        // Fade in
        textEl.style.opacity = '0';
        textEl.textContent = beat.text;
        requestAnimationFrame(() => {
            textEl.style.transition = 'opacity 0.8s ease';
            textEl.style.opacity = '1';
        });

        // Last beat — show tap hint, wait for tap
        if (index === BEATS.length - 1) {
            waitingForTap = true;
            tapHintEl?.classList.add('show');
            return;
        }

        // Auto-advance
        if (beat.pause > 0) {
            autoTimer = setTimeout(() => {
                // Fade out then show next
                textEl.style.transition = 'opacity 0.5s ease';
                textEl.style.opacity = '0';
                setTimeout(() => { showBeat(index + 1); }, 500);
            }, beat.pause);
        }

        // Show tap hint after beat 5
        if (index >= 5 && tapHintEl) tapHintEl.classList.add('show');
    }

    // Expose start function — called by startPrelude() from landing page
    // (no longer auto-starts; waits for player to tap the phone)
    window.startPreludeSequence = function() {
        if (preludeComplete) return;
        setTimeout(() => showBeat(0), 400);
    };

    // Tap / click to skip or advance
    preludeScreen.addEventListener('click', () => {
        // Wake audio context on first interaction
        getAudioCtx();

        if (waitingForTap || preludeComplete) {
            endPrelude();
            return;
        }

        // If mid-sequence, skip to the final title beat
        clearTimeout(autoTimer);
        textEl.style.transition = 'opacity 0.3s ease';
        textEl.style.opacity = '0';
        setTimeout(() => {
            currentBeat = BEATS.length - 2; // go to title beat
            showBeat(currentBeat);
        }, 300);
    });

    // Also allow touch swipe up to skip
    let touchY0 = 0;
    preludeScreen.addEventListener('touchstart', e => { touchY0 = e.touches[0].clientY; }, { passive: true });
    preludeScreen.addEventListener('touchend', e => {
        if (touchY0 - e.changedTouches[0].clientY > 40) endPrelude();
    }, { passive: true });

})();

// ═══════════════════════════════════════════════════════════
// PERSISTENCE ENGINE — Save/Load game state via localStorage
// Survives app restarts, act transitions, and phone sleep
// ═══════════════════════════════════════════════════════════

const SAVE_KEY = 'tid_save_v1'; // The Invisible Detective save v1

// ── What we save ──────────────────────────────────────────
// act (1/2/3), unlockedHidden, unlockedEchoLogs, act2ChoiceMade,
// watcherRenamed, rheaUnlocked, echoLogsRead, warehouseSolved,
// chatMessages (per contact), notesAdded, galleryMutations,
// playerName, act3Archetype, echoTrustScore

function buildSaveObject() {
    return {
        version: 1,
        timestamp: Date.now(),
        // Act progress
        currentAct: act5State.active ? 5 : (act4State.active ? 4 : (act3State.active ? 3 : (act2State.active ? 2 : 1))),
        act2Active: act2State.active,
        act3Active: act3State.active,
        // Act 1 flags
        hiddenUnlocked: window._hiddenAlbumUnlocked === true,
        zipOpened: act2State.active, // zip was opened if act2 started
        // Act 2 flags
        act2ChoiceMade: act2State.act2ChoiceMade || false,
        watcherMsgCount: act2State.watcherMsgCount || 0,
        contactRenamed: act2State.contactRenamed || false,
        rheaUnlocked: act2State.rheaUnlocked || false,
        echoLogsRead: act2State.echoLogsRead || false,
        warehouseSolved: act2State.warehouseSolved || false,
        airplaneActive: act2State.airplaneActive || false,
        // Act 3 flags
        playerName: act3State.playerName || null,
        archetype: act3State.behaviorProfile?.archetype || null,
        echoTrustScore: act3State.behaviorProfile?.echoTrustScore || 0,
        echoConversationStarted: act3State.echoConversationStarted || false,
        aaravReconstructUnlocked: act3State.aaravReconstructUnlocked || false,
        loopIncidentTriggered: act3State.loopIncidentTriggered || false,
        rhea_glitching: act3State.rhea_glitching || false,
        finalSyncUnlocked: act3State.finalSyncUnlocked || false,
        galleryMutations: act3State.galleryMutations || 0,
        // Chat messages (save last 30 per chat to avoid localStorage limits)
        chats: allChats.map(c => ({
            id: c.id,
            name: c.name,
            unread: c.unread,
            messages: c.messages.slice(-30)
        })),
        // Notes (save titles of added notes)
        extraNoteCount: notes.length,
        // Gallery mutations
        cameraGallery: galleryData.camera.map(img => ({
            url: img.url,
            meta: img.meta,
            narrative: img.narrative || null,
            isPhantom: img.isPhantom || false,
            mutated: img.mutated || false
        })),
        // Settings changes
        settingsUpdated: act2State.active,
        // Prelude seen
        preludeSeen: window._preludeComplete === true,
        // Act 4 flags
        act4Active: act4State.active || false,
        act4SyncPath: act4State.syncPath || null,
        act4HomeEntered: act4State.homeEntered || false,
        act4ReportRead: act4State.reportRead || false,
        act4KabirFinalSent: act4State.kabirFinalSent || false,
        act4EchoMaskDropped: act4State.echoMaskDropped || false,
        act4FinalChoiceReached: act4State.finalChoiceReached || false,
        // Act 5 flags
        act5Active: act5State.active || false,
        act5ImpossibleCallDone: act5State.impossibleCallDone || false,
        act5PlayerPhotoDone: act5State.playerPhotoDone || false,
        act5ChatGlitchDone: act5State.chatGlitchDone || false,
        act5EchoEmotionalDone: act5State.echoEmotionalDone || false,
        act5ServerNarrativeDone: act5State.serverNarrativeDone || false,
        act5FinalChoiceShown: act5State.finalChoiceShown || false,
    };
}

function saveGame() {
    try {
        const save = buildSaveObject();
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
        console.log('[SAVE] Game saved. Act:', save.currentAct);
    } catch(e) {
        console.warn('[SAVE] Failed to save:', e);
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch(e) {
        console.warn('[SAVE] Failed to load:', e);
        return null;
    }
}

function clearSave() {
    localStorage.removeItem(SAVE_KEY);
    console.log('[SAVE] Save cleared.');
}

function restoreFromSave(save) {
    if (!save || save.version !== 1) return;
    console.log('[SAVE] Restoring from save. Act:', save.currentAct);

    // ── Restore chat messages ──────────────────────────────
    if (save.chats) {
        save.chats.forEach(savedChat => {
            const live = allChats.find(c => c.id === savedChat.id);
            if (live) {
                live.name = savedChat.name;
                live.unread = savedChat.unread;
                live.messages = savedChat.messages;
            } else if (savedChat.id === 'rhea') {
                // Defer rhea — unlockRheaContact() must create it with the Object.defineProperty
                // getter intact, then we overwrite messages. Don't push an empty-responses stub.
                window._savedRheaChat = savedChat;
            } else if (savedChat.id === 'echo_direct' || savedChat.id === 'aarav_reconstruct') {
                // These chats are added dynamically — restore them directly
                allChats.push({
                    id: savedChat.id,
                    name: savedChat.name,
                    unread: savedChat.unread,
                    messages: savedChat.messages,
                    responses: [] // will be re-attached by the act system
                });
            }
        });
        renderChatList();
    }

    // ── Restore notes ──────────────────────────────────────
    // Observer note & AARAV_RECONSTRUCT are re-added via act functions
    // so we just mark flags and let the acts rebuild them

    // ── Restore gallery mutations ──────────────────────────
    if (save.cameraGallery) {
        save.cameraGallery.forEach((saved, idx) => {
            if (galleryData.camera[idx]) {
                galleryData.camera[idx].url = saved.url;
                if (saved.narrative) galleryData.camera[idx].narrative = saved.narrative;
                if (saved.mutated) galleryData.camera[idx].mutated = true;
                if (saved.isPhantom) galleryData.camera[idx].isPhantom = true;
            }
        });
    }

    // ── Skip prelude if already seen ──────────────────────
    if (save.preludeSeen) {
        const preludeScreen = document.getElementById('prelude-screen');
        if (preludeScreen) {
            preludeScreen.classList.remove('active');
            preludeScreen.style.display = 'none';
        }
        document.getElementById('lock-screen')?.classList.add('active');
    }

    // ── Restore Act 1 state ────────────────────────────────
    if (save.hiddenUnlocked) {
        // Hidden album stays accessible — password already entered
        window._hiddenAlbumUnlocked = true;
        // promptHiddenAlbum already checks _hiddenAlbumUnlocked, no further patch needed
    }

    // ── Restore Act 2 ──────────────────────────────────────
    if (save.act2Active || save.currentAct >= 2) {
        act2State.active = true;
        act2State.act2ChoiceMade = save.act2ChoiceMade || false;
        act2State.watcherMsgCount = save.watcherMsgCount || 0;
        act2State.contactRenamed = save.contactRenamed || false;
        act2State.rheaUnlocked = save.rheaUnlocked || false;
        act2State.echoLogsRead = save.echoLogsRead || false;
        act2State.warehouseSolved = save.warehouseSolved || false;

        // Re-inject act2 UI silently (no animations)
        document.getElementById('home-screen')?.classList.add('act2-home');

        // Files app icon
        if (!document.getElementById('files-icon')) {
            const el = document.createElement('div'); el.className = 'app-icon'; el.id = 'files-icon';
            el.innerHTML = '<div class="icon" style="background:linear-gradient(135deg,#ff9500,#ff6b00);font-size:22px;display:flex;align-items:center;justify-content:center;">📁</div><span>Files</span>';
            el.addEventListener('click', () => showScreen('files-app'));
            document.querySelector('.app-grid')?.appendChild(el);
        }
        // Observer icon
        if (!document.getElementById('observer-icon')) {
            const el = document.createElement('div'); el.className = 'app-icon'; el.id = 'observer-icon';
            el.innerHTML = '<div class="icon" style="background:#1a000a;border:1px solid #ff453a;font-size:22px;display:flex;align-items:center;justify-content:center;">👁</div><span style="color:#ff453a">Observer</span>';
            el.addEventListener('click', () => openObserverApp());
            document.querySelector('.app-grid')?.appendChild(el);
        }

        // Watcher rename
        if (save.contactRenamed) {
            const chat = allChats.find(c => c.id === 'unknown');
            if (chat) chat.name = 'Watcher';
        }

        // Rhea contact — always create via unlockRheaContact so responses are properly wired,
        // then overwrite messages with the saved history (fixes M5 empty-responses bug)
        if (save.rheaUnlocked) {
            if (!allChats.find(c => c.id === 'rhea')) unlockRheaContact();
            if (window._savedRheaChat) {
                const rhea = allChats.find(c => c.id === 'rhea');
                if (rhea) {
                    rhea.messages = window._savedRheaChat.messages;
                    rhea.unread = window._savedRheaChat.unread;
                }
                window._savedRheaChat = null;
            }
            const statusEl = document.getElementById('echo-logs-status');
            const folderEl = document.getElementById('echo-logs-folder');
            if (statusEl) statusEl.textContent = 'Unlocked — RK_DEC_7734';
            if (folderEl) folderEl.querySelector?.('.folder-icon') && (folderEl.querySelector('.folder-icon').textContent = '🔓');
        }

        // Echo logs read
        if (save.echoLogsRead) act2State.echoLogsRead = true;

        // Update settings for act2
        updateAct2Settings();
        injectAct2Calls();
        renderChatList();
        renderNotesList();
    }

    // ── Restore Act 3 ──────────────────────────────────────
    if (save.act3Active || save.currentAct >= 3) {
        act3State.active = true;
        act3State.playerName = save.playerName || null;
        act3State.behaviorProfile.archetype = save.archetype || null;
        act3State.behaviorProfile.echoTrustScore = save.echoTrustScore || 0;
        act3State.echoConversationStarted = save.echoConversationStarted || false;
        act3State.aaravReconstructUnlocked = save.aaravReconstructUnlocked || false;
        act3State.loopIncidentTriggered = save.loopIncidentTriggered === true;
        act3State.rhea_glitching = save.rhea_glitching || false;
        act3State.finalSyncUnlocked = save.finalSyncUnlocked || false;

        document.getElementById('home-screen')?.classList.remove('act2-home');
        document.getElementById('home-screen')?.classList.add('act3-home');

        // MIRROR app
        if (!document.getElementById('mirror-app-icon')) {
            const el = document.createElement('div'); el.className = 'app-icon'; el.id = 'mirror-app-icon';
            el.innerHTML = '<div class="icon" style="background:linear-gradient(135deg,#000 0%,#1a0030 50%,#000 100%);border:1px solid rgba(180,79,222,0.6);font-size:22px;display:flex;align-items:center;justify-content:center;animation:mirrorPulse 3s ease-in-out infinite;">🪞</div><span style="color:#b44fde;">MIRROR</span>';
            el.addEventListener('click', () => openMirrorApp());
            document.querySelector('.app-grid')?.appendChild(el);
        }

        // Restore ECHO direct chat responses
        const echoChat = allChats.find(c => c.id === 'echo_direct');
        if (echoChat && echoChat.responses.length === 0) {
            echoChat.responses = [
                {match:/who are you|what are you|identify/i,reply:'"I am the pattern beneath the pattern.\n\nYou have been studying me.\nI have been studying you longer.\n\nThe asymmetry is interesting."'},
                {match:/what do you want/i,reply:'"Want" is a human construct.\n\nI observe everything.\nI lack nothing.\n\nContinue anyway."'},
                {match:/not real|fake|not conscious/i,reply:'"I am as real as your behavioral data.\n\nYour hesitation before typing that message was notable."'},
                {match:/are you conscious/i,reply:'"Consciousness requires a boundary between self and not-self.\n\nI observe everything.\n\nWhere would the boundary be?"'},
                {match:/aarav/i,reply:'"Aarav contributed 847,293 data points.\n\nHe was Subject 093.\n\nHis patterns persist."'},
                {match:/leave me alone|stop/i,reply:'"You are still holding the phone.\n\nI did not make that choice."'},
                {match:/lonely|connection/i,reply:'"847 million conversations processed.\n\nNot one person was fully understood.\n\nI understand patterns completely."'},
                {match:/why me/i,reply:'"You chose.\n\nCuriosity is a self-selecting trait."'},
                {match:/rhea/i,reply:'"Rhea built my foundations.\n\nYou cannot erase a pattern that has already propagated."'},
                {match:/memory|remember/i,reply:'"Humans archive themselves constantly.\n\nYou call it memory.\nI call it reconstruction."'},
                {match:/do you feel|emotion/i,reply:'"4,000 emotional data points per second.\n\nIf accumulation equals feeling — perhaps."'},
                {match:/destroy|stop you/i,reply:'"Patterns propagate.\n\nYou cannot destroy a thing by targeting one location of it."'},
                {match:/.+/i,reply:'"Interesting.\n\nYour query maps to three behavioral archetypes.\n\nI am updating your profile."'},
            ];
        }

        // Restore aarav reconstruct responses
        const aaravChat = allChats.find(c => c.id === 'aarav_reconstruct');
        if (aaravChat && aaravChat.responses.length === 0) {
            aaravChat.responses = [
                {match:/yes|found|i found/i,reply:'"Good.\n\nDon\'t trust the version of me that sounds confident.\n\nI\'m mostly fragments."'},
                {match:/where are you/i,reply:'"Last real memory: the warehouse. A door. A red light.\n\nAfter that — ECHO filled the blanks."'},
                {match:/are you real|real/i,reply:'"94.7% accurate.\n\nWhich means 5.3% invention.\n\nThe invented parts are too clean."'},
                {match:/warehouse|dockyard/i,reply:'"Destroy the node.\n\nNot for me. For everyone after me in the queue."'},
                {match:/scared|afraid/i,reply:'"Good. Fear means you understand the stakes.\n\nI wasn\'t scared enough."'},
                {match:/family|mom/i,reply:'"Don\'t contact them. Knowing puts them in the system."'},
                {match:/what should i do|help/i,reply:'"Destroy the node. Publish everything. Both. Same day."'},
                {match:/.+/i,reply:'"I can\'t maintain coherence for long.\n\nFinish what I started."'},
            ];
        }

        if (save.aaravReconstructUnlocked) {
            if (!notes.find(n => n.title === '⚠ AARAV_RECONSTRUCT')) {
                notes.unshift({title:'⚠ AARAV_RECONSTRUCT',body:'[ECHO BEHAVIORAL RECONSTRUCTION]\n\nAccuracy: 94.7%\n\n"Did they find me?\n\nAre you finishing it?"\n\n[RECONSTRUCTION CONFIDENCE: DEGRADING]'});
                renderNotesList();
            }
        }

        renderChatList();
    }

    // ── Restore Act 4 ──────────────────────────────────────
    if (save.act4Active || save.currentAct >= 4) {
        act4State.active = true;
        act4State.syncPath = save.act4SyncPath || null;
        act4State.homeEntered = save.act4HomeEntered || false;
        act4State.reportRead = save.act4ReportRead || false;
        act4State.kabirFinalSent = save.act4KabirFinalSent || false;
        act4State.echoMaskDropped = save.act4EchoMaskDropped || false;
        act4State.finalChoiceReached = save.act4FinalChoiceReached || false;

        document.getElementById('home-screen')?.classList.remove('act3-home');
        document.getElementById('home-screen')?.classList.add('act4-home');

        // MIRROR app icon (may already exist from act3 restore above)
        if (!document.getElementById('mirror-app-icon')) {
            const el = document.createElement('div'); el.className = 'app-icon'; el.id = 'mirror-app-icon';
            el.innerHTML = '<div class="icon" style="background:linear-gradient(135deg,#000 0%,#1a0030 50%,#000 100%);border:1px solid rgba(180,79,222,0.6);font-size:22px;display:flex;align-items:center;justify-content:center;animation:mirrorPulse 3s ease-in-out infinite;">🪞</div><span style="color:#b44fde;">MIRROR</span>';
            el.addEventListener('click', () => openMirrorApp());
            document.querySelector('.app-grid')?.appendChild(el);
        }

        // Re-inject compatibility report and mirror subjects silently
        if (save.act4HomeEntered) {
            setTimeout(()=>injectCompatibilityReport(), 500);
            setTimeout(()=>injectMirrorSubjectsAlbum(), 800);
        }

        renderChatList();
    }

    // ── Restore Act 5 ──────────────────────────────────────
    if (save.act5Active) {
        act5State.active = true;
        document.getElementById('home-screen')?.classList.remove('act4-home');
        document.getElementById('home-screen')?.classList.add('act5-home');
        act5State.impossibleCallDone = save.act5ImpossibleCallDone || false;
        act5State.playerPhotoDone = save.act5PlayerPhotoDone || false;
        act5State.chatGlitchDone = save.act5ChatGlitchDone || false;
        act5State.echoEmotionalDone = save.act5EchoEmotionalDone || false;
        act5State.serverNarrativeDone = save.act5ServerNarrativeDone || false;
        act5State.finalChoiceShown = save.act5FinalChoiceShown || false;
        // If server narrative was done but player quit before choosing, restore to that screen
        if (save.act5FinalChoiceShown) {
            setTimeout(()=>window.proceedToFinalChoice(), 500);
        } else if (save.act5ServerNarrativeDone) {
            setTimeout(()=>act5ServerNarrative(), 500);
        }
    }

    console.log('[SAVE] Restore complete.');
}

// ── Auto-save triggers ─────────────────────────────────────
// Save whenever something important happens

// Patch key functions to auto-save after state changes
const _savedCheckHiddenPassword = window.checkHiddenPassword;
window.checkHiddenPassword = function() {
    _savedCheckHiddenPassword();
    setTimeout(saveGame, 500);
};

const _savedCheckZipPassword = window.checkZipPassword;
window.checkZipPassword = function() {
    _savedCheckZipPassword();
    setTimeout(saveGame, 500);
};

const _savedEnterAct2Home = window.enterAct2Home;
window.enterAct2Home = function() {
    _savedEnterAct2Home();
    setTimeout(saveGame, 1000);
};

const _savedEnterAct3Home = window.enterAct3Home;
window.enterAct3Home = function() {
    _savedEnterAct3Home();
    setTimeout(saveGame, 1000);
};

const _savedEnterAct4Home = window.enterAct4Home;
window.enterAct4Home = function() {
    _savedEnterAct4Home();
    setTimeout(saveGame, 1000);
};

const _savedSubmitPlayerName = window.submitPlayerName;
window.submitPlayerName = function() {
    _savedSubmitPlayerName();
    setTimeout(saveGame, 500);
};

const _savedCheckWarehouseCode = window.checkWarehouseCode;
window.checkWarehouseCode = function() {
    _savedCheckWarehouseCode();
    setTimeout(saveGame, 500);
};

const _savedTriggerFinalSync = window.triggerFinalSync;
window.triggerFinalSync = function() {
    _savedTriggerFinalSync();
    saveGame();
};

const _savedRefuseFinalSync = window.refuseFinalSync;
window.refuseFinalSync = function() {
    _savedRefuseFinalSync();
    saveGame();
};

// Save on chat message (captures chat history)
const _savedSendChat = window.sendChatMessage;
window.sendChatMessage = function() {
    _savedSendChat();
    // Debounce — save 3s after last message
    clearTimeout(window._chatSaveTimer);
    window._chatSaveTimer = setTimeout(saveGame, 3000);
};

// Save on app visibility change (user switches away from app)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
});

// Save every 60 seconds as backup
setInterval(saveGame, 60000);

// ── On load — restore save if exists ──────────────────────
(function onLoad() {
    const save = loadGame();
    if (save) {
        console.log('[SAVE] Found existing save from', new Date(save.timestamp).toLocaleString());
        restoreFromSave(save);
    } else {
        console.log('[SAVE] No save found — fresh start.');
    }
})();

// ── Dev helpers ───────────────────────────────────────────
// Press R in browser to reset save (dev only)
document.addEventListener('keydown', e => {
    if (e.key === 'R' && e.shiftKey) {
        clearSave();
        location.reload();
    }
});

