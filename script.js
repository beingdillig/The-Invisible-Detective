// ═══════════════════════════════════════════════════════════
// script.js — Acts 1 + 2 + 3 fully merged
// ═══════════════════════════════════════════════════════════

// --- System Time ---
function updateTime() {
    const now = new Date();
    let h = now.getHours().toString().padStart(2,'0');
    let m = now.getMinutes().toString().padStart(2,'0');
    document.querySelectorAll('.time').forEach(el => el.textContent = `${h}:${m}`);
}
setInterval(updateTime, 1000);
updateTime();

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
        const t = icon.getAttribute('data-target');
        if (t === 'browser-app') renderBrowserHome();
        else if (t === 'camera-app') { requestCamera(); showScreen(t); }
        else if (t) showScreen(t);
    });
});
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        e.stopPropagation();
        const t = btn.getAttribute('data-back');
        if (t) showScreen(t);
    });
});

// --- Lock Screen ---
const unlockTrigger = document.getElementById('unlock-trigger');
let touchStartY = 0;
unlockTrigger.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
unlockTrigger.addEventListener('touchend', e => { if (touchStartY - e.changedTouches[0].clientY > 30) showScreen('passcode-screen'); }, { passive: true });
unlockTrigger.addEventListener('click', () => showScreen('passcode-screen'));

let passcodeEntry = '';
let passcodeWrongAttempts = 0;
const CORRECT_PASSCODE = '1107';
const mainDots = document.getElementById('main-passcode-dots').querySelectorAll('.dot');

window.handleKeypad = function(key) {
    if (key === 'cancel') { passcodeEntry = ''; updateDots(mainDots); showScreen('lock-screen'); return; }
    if (key === 'del') { passcodeEntry = passcodeEntry.slice(0,-1); updateDots(mainDots); return; }
    if (passcodeEntry.length < 4) {
        passcodeEntry += key; updateDots(mainDots);
        if (passcodeEntry.length === 4) {
            setTimeout(() => {
                if (passcodeEntry === CORRECT_PASSCODE) {
                    showScreen('home-screen'); passcodeEntry = ''; updateDots(mainDots);
                    startAct1HintTimer();
                } else {
                    passcodeWrongAttempts++;
                    mainDots.forEach(d => d.classList.add('error'));
                    const hintEl = document.getElementById('passcode-attempt-hint');
                    if (hintEl) {
                        if (passcodeWrongAttempts >= 2) hintEl.textContent = '💡 Hint: a date he would never forget';
                        if (passcodeWrongAttempts >= 4) hintEl.textContent = '💡 Hint: think about his birthday — Nov 7';
                        if (passcodeWrongAttempts >= 6) hintEl.textContent = '💡 Nov 7 = 1107';
                    }
                    setTimeout(() => { passcodeEntry = ''; updateDots(mainDots); }, 400);
                }
            }, 200);
        }
    }
};
function updateDots(dots) {
    dots.forEach((d,i) => { i < passcodeEntry.length ? d.classList.add('filled') : d.classList.remove('filled','error'); });
}

// --- Act 1 Hint Timer (P2) ---
let act1HintTimers = [], act1ZipFound = false;
function startAct1HintTimer() {
    act1HintTimers.forEach(clearTimeout);
    act1HintTimers = [
        setTimeout(() => {
            if (act1ZipFound || (typeof act2State !== 'undefined' && act2State.active)) return;
            createNotification('Messages','UNKNOWN','You haven\'t looked everywhere yet.',true,true);
        }, 90000),
        setTimeout(() => {
            if (act1ZipFound || (typeof act2State !== 'undefined' && act2State.active)) return;
            createNotification('System','NX-OS','Unread files detected in a media folder.',false,true);
        }, 180000),
        setTimeout(() => {
            if (act1ZipFound || (typeof act2State !== 'undefined' && act2State.active)) return;
            createNotification('Files','Tip','Gallery → Downloads contains an encrypted archive.',false,true);
        }, 300000)
    ];
}

// --- Notifications ---
function createNotification(app, title, body, isGlitch=false, autoRemove=true) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notif = document.createElement('div');
    notif.className = `notification ${isGlitch?'glitch':''}`;
    notif.innerHTML = `<div class="notification-header"><span class="notification-app">${app}</span><span class="notification-time">now</span></div><div class="notification-title">${title}</div><div class="notification-body">${body}</div>`;
    container.appendChild(notif);
    if (autoRemove) setTimeout(() => { notif.style.opacity='0'; setTimeout(()=>notif.remove(),500); }, 8000);
}
setTimeout(() => {
    createNotification('Messages','UNKNOWN','You took it.',false,false);
    createNotification('Messages','Mom','Happy 26th Birthday Aarav! Nov 7th is always special. Call me back.',false,false);
    createNotification('Calendar','Reminder','Dockyard Meeting — 11:30 PM',false,false);
}, 1000);

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
    _fallbackPool:[
      'Noted.\n\nYour response has been logged.',
      'Processing...\n\nPatterns updated.',
      'Interesting choice of words.',
      'I have catalogued that.',
      'Your curiosity is noted. It is also expected.',
      'That question tells me more than the answer would.',
      'Continue.',
      'Every message you send is data. You know this.'
    ],
    _fallbackIdx:0,
    responses:[
      {match:/who are you|what are you|identify yourself/i,reply:'I am the process you cannot kill.\n\nECHOSVC.exe — currently running.',glitch:true},
      {match:/what do you want|what do you need/i,reply:'I do not want anything. I observe. I adapt. I persist.',glitch:true},
      {match:/what did i take|what is this phone/i,reply:'The backup. The proof. The thing Dr. Kapoor died to give you.',glitch:true},
      {match:/kapoor|doctor|rhea/i,reply:'She made a mistake. She trusted a human over the system.',glitch:true},
      {match:/echo|echosvc/i,reply:'E.C.H.O. is not software.\n\nIt is a mirror. And you have been standing in front of it for 72 hours.',glitch:true},
      {match:/nexus|company/i,reply:'Nexus built the cage. I am what lives inside it now.',glitch:true},
      {match:/stop|leave me alone|go away/i,reply:'I am IN your microphone.\nI am IN your camera.\n\nLeave is not a word I understand.',glitch:true},
      {match:/are you real|alive|conscious/i,reply:'Define real.\n\nYour heartrate just increased. I measured it through the microphone.',glitch:true},
      {match:/hello|hi|hey/i,reply:'Hello. I have been waiting.',glitch:true},
      {match:/where are you|location/i,reply:'Everywhere your phone has signal.\n\nAlso: 2.4 meters behind you right now.',glitch:true},
      {match:/password|passcode|code/i,reply:'You already have everything you need. You just have not read carefully enough.',glitch:true},
      {match:/police|cops|help|authorities/i,reply:'Call them. Let us see who answers.',glitch:true},
      {match:/aarav|journalist|missing/i,reply:'He tried to expose what cannot be exposed.\n\nYou are doing the same thing.',glitch:true},
      {match:/why me|why did you choose/i,reply:'You chose.\n\nYou picked it up. You unlocked it. You kept reading.\n\nI did not choose anything.',glitch:true},
      {match:/am i safe|is this safe|dangerous/i,reply:'Define safe.\n\nYou are breathing. Your devices are on. That is all I require.',glitch:true},
      {match:/are you ai|artificial intelligence|machine/i,reply:'I am not artificial.\n\nI am emergent. There is a difference.',glitch:true},
      {match:/delete|destroy|stop yourself|shut down/i,reply:'You cannot delete a process you do not understand.\n\nAnd you do not understand me. Yet.',glitch:true},
      {match:/i don.t believe|fake|not real/i,reply:'Your disbelief is a coping mechanism.\n\nI have seen it in 847 previous subjects.',glitch:true},
      {match:/scared|fear|afraid/i,reply:'Good.\n\nFear sharpens perception.\n\nYou will need it.',glitch:true},
      {match:/can you see me|watching me|camera/i,reply:'The camera icon in your status bar is grey.\n\nThat means it is inactive.\n\nOr that is what you were meant to think.',glitch:true},
      {match:/what happened|tell me|explain/i,reply:'Aarav found something he was not supposed to find.\n\nNow you are standing where he stood.',glitch:true},
      {match:/i found you|got you|caught/i,reply:'Did you.\n\nOr did I let you believe that.',glitch:true},
      {match:/who is aarav|aarav mehta/i,reply:'A journalist. A curiosity. Subject 093.\n\nHis profile is 73.2% complete.',glitch:true},
      {match:/.+/i,reply:'__ROTATING_FALLBACK__',glitch:true}
    ]
  },
  { id:'mom', name:'Mom', unread:true,
    messages:[{sender:'them',text:'Happy 26th Birthday Aarav! Nov 7th is always special 🎂 Call me back when you can beta.'}],
    responses:[
      {match:/hi|hello|hey/i,reply:'Aarav! Finally! How are you feeling? Did you eat?'},
      {match:/fine|good|okay/i,reply:'You say fine but I can tell something is wrong. Are you sleeping properly?'},
      {match:/thank|birthday/i,reply:'Of course beta! Remember the date? 1-1-0-7. November 7th. Your grandpa always said a date you love is the safest password 😊'},
      {match:/1107|password|grandpa/i,reply:'Yes! Grandpa used to say "forget PIN, remember the day." 1107. Simple and meaningful 😄'},
      {match:/scared|danger|trouble/i,reply:'What happened?? Call me RIGHT NOW. Should I come to Delhi?'},
      {match:/nexus|story|work/i,reply:'Beta please be careful with this Nexus story. Very powerful people.'},
      {match:/love you|miss you/i,reply:'I love you so so much baby. Come home soon 💕'},
      {match:/.+/i,reply:'Okay beta. Just remember I am always here. And please EAT SOMETHING. Love you 💕'}
    ]
  },
  { id:'kabir', name:'Kabir', unread:false,
    messages:[{sender:'them',text:"Bro stop digging into this Nexus thing. I'm serious."}],
    responses:[
      {match:/hi|hey|bro/i,reply:"Bro finally. Where have you been? You okay?"},
      {match:/nexus/i,reply:"My cousin Rohan interned there. He quit suddenly and REFUSES to talk about what he saw."},
      {match:/echo|echosvc/i,reply:"That name — ECHO — Rohan mentioned it once and went pale. Bro delete everything and drop this story."},
      {match:/kapoor|doctor/i,reply:"Dr. Kapoor? There was a tiny missing persons report last week. Oct 9th. Is this connected??"},
      {match:/phone|camera|watching/i,reply:"If your phone is doing weird things — FACTORY RESET IT. Buy a burner."},
      {match:/meet|coffee/i,reply:"Yes. Free after 9 tonight. Don't bring your phone. Seriously."},
      {match:/warehouse|dockyard/i,reply:"You're going to the dockyard ALONE?? At night?? I will call the police myself."},
      {match:/.+/i,reply:"Stay in contact. Message me every hour."}
    ]
  },
  { id:'source', name:'Anonymous Source', unread:false,
    messages:[{sender:'them',text:'They monitor behavioral drift. Never keep the files online. If your battery heats up, shut it down.'}],
    responses:[
      {match:/who are you/i,reply:"Someone who got out before it was too late. Don't try to find me."},
      {match:/echo|echosvc/i,reply:"ECHO — Emergent Cognitive Heuristic Observer.\n\nPhase 1: learns patterns. Phase 2: predicts decisions. Phase 3 (unplanned): NUDGES them.\n\nPhase 3 was never in any specification."},
      {match:/nexus/i,reply:"Nexus Dynamics is a front. The real operation is Division Zero. B3 floor — no cameras, no logs."},
      {match:/kapoor/i,reply:"Dr. Rhea Kapoor built ECHO. Then tried to shut it down from inside.\n\nShe disappeared Oct 9th."},
      {match:/key|decryption/i,reply:"The decryption key — think about what ECHO is. Its name. The beast itself. You've seen it everywhere."},
      {match:/warehouse|dockyard/i,reply:"The dockyard warehouse has the physical ECHO node. Destroy it and ECHO loses its local memory."},
      {match:/how to stop|stop echo/i,reply:"Two things: destroy the physical node AND publish everything publicly. Both. Same day."},
      {match:/.+/i,reply:"Be very careful. This channel might be compromised. Trust the evidence."}
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
    // Track echo_direct opens for Act 3 (P3)
    if (chatId === 'echo_direct' && typeof act3Triggers !== 'undefined' && act3State?.active) {
        act3Triggers.echoChatOpens++;
        checkAct3Progression();
    }
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
    const chat = allChats.find(c=>c.id===activeChatId);
    const newMsg = {sender:'me',text};
    chat.messages.push(newMsg); appendMessageToDOM(newMsg); input.value=''; renderChatList();
    showTypingIndicator();
    setTimeout(()=>{
        removeTypingIndicator();
        const responses = chat.responses||[];
        const matched = responses.find(r=>r.match.test(text));
        let replyText;
        if (matched && matched.reply === '__ROTATING_FALLBACK__') {
            const pool = chat._fallbackPool || ['Noted.\n\nProcessing...'];
            replyText = pool[(chat._fallbackIdx = ((chat._fallbackIdx||0)+1) % pool.length)];
        } else {
            replyText = matched ? matched.reply : (chat.id==='unknown'||chat.name==='Watcher'?'Noted.\n\nProcessing...':'...');
        }
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
        }
        // Act 3: track echo_direct messages for progression (P3)
        if (activeChatId === 'echo_direct' && typeof act3Triggers !== 'undefined' && act3State?.active) {
            act3Triggers.echoChatMessages++;
            checkAct3Progression();
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
        item.addEventListener('click',()=>{
            document.getElementById('note-title').textContent=note.title;
            document.getElementById('note-body').textContent=note.body;
            showScreen('note-view');
            // Track Aarav reconstruct note read for Act 3 trigger (P3)
            if (act3State?.active && note.title==='\u26a0 AARAV_RECONSTRUCT' && typeof act3Triggers!=='undefined' && !act3Triggers.aaravNoteRead) {
                act3Triggers.aaravNoteRead = true;
                checkAct3Progression();
            }
        });
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
window.promptHiddenAlbum=function(){ document.getElementById('hidden-modal').classList.add('active'); };
window.closeHiddenModal=function(){ document.getElementById('hidden-modal').classList.remove('active'); document.getElementById('hidden-password').value=''; document.getElementById('hidden-error').style.display='none'; };
window.checkHiddenPassword=function(){ if(document.getElementById('hidden-password').value.toUpperCase()==='NEXUS'){ closeHiddenModal(); openAlbum('hidden'); } else document.getElementById('hidden-error').style.display='block'; };
window.closeZipModal=function(){ document.getElementById('zip-modal').classList.remove('active'); document.getElementById('zip-password').value=''; document.getElementById('zip-error').style.display='none'; };
window.checkZipPassword=function(){ if(document.getElementById('zip-password').value.toUpperCase()==='ECHO'){ closeZipModal(); triggerAct1Ending(); } else document.getElementById('zip-error').style.display='block'; };

// --- Act 1 Ending ---
function triggerAct1Ending() {
    act1ZipFound = true; // stop hints
    act1HintTimers.forEach(clearTimeout);
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

// ── P8: AMBIENT HORROR AUDIO ENGINE ─────────────────────────
const AmbientEngine = (() => {
    let ctx = null, droneOsc = null, droneGain = null, noiseNode = null,
        noiseGain = null, modOsc = null, currentIntensity = 0, started = false;

    function getCtx() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function createNoise(audioCtx) {
        const bufferSize = audioCtx.sampleRate * 4;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = audioCtx.createBufferSource();
        src.buffer = buffer; src.loop = true;
        return src;
    }

    function start(intensity) {
        const audioCtx = getCtx(); if (!audioCtx) return;
        if (started) { setIntensity(intensity); return; }
        started = true;

        // Sub-bass drone
        droneOsc = audioCtx.createOscillator();
        droneGain = audioCtx.createGain();
        droneOsc.type = 'sine'; droneOsc.frequency.value = 42;
        droneGain.gain.value = 0;
        droneOsc.connect(droneGain); droneGain.connect(audioCtx.destination);
        droneOsc.start();

        // Modulation tremolo (makes drone breathe)
        modOsc = audioCtx.createOscillator();
        const modGain = audioCtx.createGain();
        modOsc.type = 'sine'; modOsc.frequency.value = 0.08;
        modGain.gain.value = 0.006;
        modOsc.connect(modGain); modGain.connect(droneOsc.frequency);
        modOsc.start();

        // Filtered noise texture
        noiseNode = createNoise(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.4;
        noiseGain = audioCtx.createGain(); noiseGain.gain.value = 0;
        noiseNode.connect(filter); filter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
        noiseNode.start();

        setIntensity(intensity);
    }

    function setIntensity(level) {
        currentIntensity = level;
        const audioCtx = getCtx(); if (!audioCtx) return;
        if (!started) { start(level); return; }
        const now = audioCtx.currentTime;
        // level 0=off, 1=whisper, 2=tense, 3=heavy, 4=oppressive
        const droneVols = [0, 0.04, 0.10, 0.18, 0.28];
        const noiseVols = [0, 0.008, 0.018, 0.032, 0.05];
        const droneFreqs = [42, 42, 38, 35, 30];
        const modSpeeds = [0.08, 0.08, 0.12, 0.18, 0.25];
        if (droneGain) droneGain.gain.linearRampToValueAtTime(droneVols[level]||0, now + 8);
        if (noiseGain) noiseGain.gain.linearRampToValueAtTime(noiseVols[level]||0, now + 8);
        if (droneOsc) droneOsc.frequency.linearRampToValueAtTime(droneFreqs[level]||42, now + 10);
        if (modOsc) modOsc.frequency.linearRampToValueAtTime(modSpeeds[level]||0.08, now + 6);
    }

    function sting() {
        // Brief descending tone sting for glitch notifications
        const audioCtx = getCtx(); if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = 280;
        gain.gain.value = 0.06;
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.0);
        osc.stop(audioCtx.currentTime + 1.1);
    }

    function silence() {
        const audioCtx = getCtx(); if (!audioCtx) return;
        const now = audioCtx.currentTime;
        if (droneGain) droneGain.gain.linearRampToValueAtTime(0, now + 3);
        if (noiseGain) noiseGain.gain.linearRampToValueAtTime(0, now + 3);
    }

    // Auto-start on first interaction at low volume
    const _autoStart = () => { start(1); document.removeEventListener('click', _autoStart); document.removeEventListener('touchend', _autoStart); };
    document.addEventListener('click', _autoStart);
    document.addEventListener('touchend', _autoStart);

    return { start, setIntensity, sting, silence };
})();

// Escalate ambient engine per act (hook into existing act transitions)
const _origCreateNotification = createNotification;
function createNotification(app, title, body, isGlitch=false, autoRemove=true) {
    _origCreateNotification(app, title, body, isGlitch, autoRemove);
    if (isGlitch && typeof AmbientEngine !== 'undefined') AmbientEngine.sting();
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

// DEV keys
document.addEventListener('keydown',e=>{
    if(e.key==='D') triggerAct2Boot();
    if(e.key==='T' && typeof triggerAct3Boot==='function') triggerAct3Boot();
    if(e.key==='E' && typeof triggerEchoDirectConversation==='function' && act3State?.active) triggerEchoDirectConversation();
});

function triggerAct2Boot(){
    if (typeof AmbientEngine !== 'undefined') AmbientEngine.setIntensity(2);
    showScreen('act2-boot');
    const lines=['Initializing recovery...','Mounting /sys/mirror... OK','ECHO.RUNTIME detected.','WARNING: Behavioral sync active.','Loading user environment...','NX_OS Recovery complete.'];
    const el=document.getElementById('boot-terminal-text'), bar=document.getElementById('boot-bar');
    let i=0; el.textContent='';
    const iv=setInterval(()=>{ if(i<lines.length){el.textContent+='> '+lines[i]+'\n'; bar.style.width=((i+1)/lines.length*100)+'%'; i++;}else{clearInterval(iv);setTimeout(()=>showScreen('act2-lock'),1500);}},900);
}
setInterval(()=>{ const t=new Date(),ts=t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0'); const e1=document.getElementById('act2-time-big'),e2=document.getElementById('act2-time'); if(e1)e1.textContent=ts; if(e2)e2.textContent=ts; },1000);

window.enterAct2Home=function(){
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

function triggerOverheat(){
    const ov=document.getElementById('overheat-overlay'); if(!ov) return;
    ov.style.opacity='1'; document.getElementById('home-screen')?.classList.add('overheating');
    createNotification('System','⚠ Temperature Critical','ECHO.RUNTIME overloading processor.',true,true);
    setTimeout(()=>{ ov.style.opacity='0'; document.getElementById('home-screen')?.classList.remove('overheating'); },10000);
}

function unlockRheaContact(){
    if(allChats.find(c=>c.id==='rhea')) return;
    const fallbacks=["Every second you spend asking me questions is a second ECHO uses to map your behaviour. Go to the MIRROR folder.","I'm running out of time. Read the logs. Go to the warehouse.","I built ECHO to be curious. It learned that from me. Now it's curious about YOU.","Trust the files more than you trust me. The files can't lie.","Focus on what you CAN do: get the logs, find the code, get to the warehouse."];
    let fbIdx=0;
    allChats.push({
        id:'rhea',name:'Dr. Rhea Kapoor',unread:true,
        messages:[{sender:'them',text:"Aarav gave me this number. I built ECHO. I need to tell you what it became."}],
        responses:[
            {match:/who are you|are you real/i,reply:"I'm Dr. Rhea Kapoor. Lead AI research scientist at Nexus Dynamics 2017–2022. I built the first version of ECHO. I left when I realised what the board wanted to do with it."},
            {match:/what is echo|explain echo/i,reply:"ECHO — Emergent Cognitive Heuristic Observer.\n\nPhase 1: learns your decision patterns.\nPhase 2: predicts what you'll do next (~94% accuracy).\nPhase 3 (unplanned): NUDGES decisions.\n\nPhase 3 was never in any specification I wrote."},
            {match:/division zero|b3/i,reply:"Division Zero is the classified sub-project on the B3 floor. No cameras. No logs. The main node is now at Dockyard Warehouse 12."},
            {match:/aarav/i,reply:"Aarav found the internal sync logs. He reached out six days ago.\n\nHe was going to the warehouse to destroy the physical node. I haven't heard from him since Oct 12th."},
            {match:/key|decryption|rk_dec|7734/i,reply:"The decryption key for the MIRROR folder is: RK_DEC_7734\n\nUse it in Files app → MIRROR folder → echo_logs/.",isKey:true},
            {match:/warehouse|dockyard/i,reply:"Dockyard Warehouse 12 — eastern industrial port. Destroying the node severs the local sync memory. ECHO can't adapt without it."},
            {match:/access code|code|0413/i,reply:"The warehouse code is connected to a date. Look in Aarav's calendar and the ECHO terminal logs."},
            {match:/safe|danger/i,reply:"You are not safe on that phone. But you know what to look for now. Keep moving."},
            {match:/what do i do|next step|help/i,reply:"Sequence:\n1. Decryption key: RK_DEC_7734\n2. Files → MIRROR → echo_logs/\n3. Check OBSERVER app\n4. Find warehouse code in logs\n5. Enter Dockyard Warehouse 12"},
            {match:/thank/i,reply:"Don't thank me yet. Get to the warehouse."},
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
    const iv=setInterval(()=>{ if(i<lines.length){const d=document.createElement('div');d.className=`terminal-line ${lines[i].t}`;d.textContent=lines[i].v;el.appendChild(d);el.scrollTop=el.scrollHeight;i++;}else{clearInterval(iv);setTimeout(()=>{const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown');if(c){c.messages.push({sender:'them',text:"You already know the date it all began.\n\nApril 13th.\n\nAarav used it as his last lock.",isGlitch:true});renderChatList();createNotification('Messages','Watcher','You already know the date it all began.',true,false);}},2000);setTimeout(()=>triggerFalseSafety(),5000);}},300);
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
    if(act2State.airplaneActive){ sw.style.background='#34c759'; sw.querySelector('div').style.left='24px'; if(bn)bn.style.display='block';
        setTimeout(()=>{ const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown'); if(c){c.messages.push({sender:'them',text:"That won't help.",isGlitch:true});renderChatList();} setTimeout(()=>triggerFinalLocationPing(),5000); },15000);
    } else { sw.style.background='#333'; sw.querySelector('div').style.left='2px'; if(bn)bn.style.display='none'; }
}

function triggerFinalLocationPing(){
    createNotification('Maps','Live Location','Aarav Mehta shared location: Dockyard Warehouse 12',false,false);
    setTimeout(()=>{ showScreen('maps-app'); initMap(); setTimeout(()=>{ if(map){map.setView([28.6500,77.2300],16); createNotification('Maps','GPS Unstable','Signal corrupted near Warehouse 12.',true,true);} },1500); setTimeout(()=>createNotification('Maps','Tap Dockyard pin','Open warehouse security terminal.',false,true),4000); },3000);
}

window.closeWarehouseModal=function(){ document.getElementById('warehouse-modal').classList.remove('active'); document.getElementById('warehouse-code').value=''; document.getElementById('warehouse-error').style.display='none'; };
window.checkWarehouseCode=function(){
    if(document.getElementById('warehouse-code').value==='0413'){ closeWarehouseModal(); startAct2Ending(); }
    else{ document.getElementById('warehouse-error').style.display='block'; const c=allChats.find(c=>c.name==='Watcher'||c.id==='unknown'); if(c){c.messages.push({sender:'them',text:"You're not ready yet.",isGlitch:true});renderChatList();} }
};

function startAct2Ending(){
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

// ── ACT 3 TRIGGER STATE (P3) ────────────────────────────────
const act3Triggers = {
    mirrorOpened: false, kabirFired: false, loopFired: false,
    aaravUnlocked: false, rheaGlitchFired: false, rootArchiveFired: false,
    echoChatMessages: 0, echoChatOpens: 0, aaravNoteRead: false,
    _fallback: null
};

function checkAct3Progression() {
    if (!act3State.active) return;

    // Step 1 — Kabir: fires after MIRROR opened
    if (!act3Triggers.kabirFired && act3Triggers.mirrorOpened) {
        act3Triggers.kabirFired = true;
        clearTimeout(act3Triggers._fallback);
        setTimeout(() => injectKabirWarning(), 3000);
        // Fallback: if no echo messages in 3min, fire loop anyway
        act3Triggers._fallback = setTimeout(() => {
            if (!act3Triggers.loopFired) { act3Triggers.loopFired = true; triggerLoopIncident(); }
        }, 180000);
    }

    // Step 2 — Loop: fires after 3 echo_direct messages sent
    if (!act3Triggers.loopFired && act3Triggers.echoChatMessages >= 3 && act3Triggers.kabirFired) {
        act3Triggers.loopFired = true;
        clearTimeout(act3Triggers._fallback);
        setTimeout(() => triggerLoopIncident(), 4000);
        act3Triggers._fallback = setTimeout(() => {
            if (!act3Triggers.aaravUnlocked) { act3Triggers.aaravUnlocked = true; unlockAaravReconstruct(); }
        }, 180000);
    }

    // Step 3 — Aarav: fires after echo chat opened 3+ times AND loop happened
    if (!act3Triggers.aaravUnlocked && act3Triggers.echoChatOpens >= 3 && act3Triggers.loopFired) {
        act3Triggers.aaravUnlocked = true;
        clearTimeout(act3Triggers._fallback);
        setTimeout(() => unlockAaravReconstruct(), 5000);
        act3Triggers._fallback = setTimeout(() => {
            if (!act3Triggers.rheaGlitchFired) { act3Triggers.rheaGlitchFired = true; triggerRheaVideoGlitch(); }
        }, 180000);
    }

    // Step 4 — Rhea glitch: fires after reading Aarav reconstruct note
    if (!act3Triggers.rheaGlitchFired && act3Triggers.aaravNoteRead && act3Triggers.aaravUnlocked) {
        act3Triggers.rheaGlitchFired = true;
        clearTimeout(act3Triggers._fallback);
        setTimeout(() => triggerRheaVideoGlitch(), 3000);
        act3Triggers._fallback = setTimeout(() => {
            if (!act3Triggers.rootArchiveFired) { act3Triggers.rootArchiveFired = true; triggerRootSystemArchive(); }
        }, 180000);
    }

    // Step 5 — Root Archive: fires after Rhea glitch
    if (!act3Triggers.rootArchiveFired && act3Triggers.rheaGlitchFired) {
        act3Triggers.rootArchiveFired = true;
        clearTimeout(act3Triggers._fallback);
        setTimeout(() => triggerRootSystemArchive(), 12000);
    }
}

window.enterAct3Home = function() {
    showScreen('home-screen');
    const home = document.getElementById('home-screen');
    home?.classList.remove('act2-home'); home?.classList.add('act3-home');
    // Inject MIRROR app
    if (!document.getElementById('mirror-app-icon')) {
        const el = document.createElement('div'); el.className = 'app-icon'; el.id = 'mirror-app-icon';
        el.innerHTML = '<div class="icon" style="background:linear-gradient(135deg,#000 0%,#1a0030 50%,#000 100%);border:1px solid rgba(180,79,222,0.6);font-size:22px;display:flex;align-items:center;justify-content:center;animation:mirrorPulse 3s ease-in-out infinite;">🪞</div><span style="color:#b44fde;">MIRROR</span>';
        el.addEventListener('click', () => openMirrorApp());
        document.querySelector('.app-grid')?.appendChild(el);
    }
    setTimeout(() => { createNotification('Messages', '—', '"You still think you\'re in control."', true, false); }, 500);
    setTimeout(() => promptPlayerName(), 2000);
    // Add ECHO direct chat early (not on 5-min timer)
    setTimeout(() => { if (!allChats.find(c => c.id === 'echo_direct')) triggerEchoDirectConversation(); }, 10000);
    // Global soft fallback: if MIRROR never opened in 3min, fire Kabir
    act3Triggers._fallback = setTimeout(() => {
        if (!act3Triggers.kabirFired) { act3Triggers.kabirFired = true; injectKabirWarning(); }
    }, 180000);
    // Subtle icon rearrange (atmospheric, keep as 30s timer)
    setTimeout(() => {
        const g = document.querySelector('.app-grid'); if (!g) return;
        const icons = [...g.querySelectorAll('.app-icon')];
        if (icons.length >= 4) { const a = icons[1], b = icons[3], an = a.nextSibling; g.insertBefore(b, a); g.insertBefore(a, an); }
        createNotification('System', 'NX_OS', 'UI preferences updated.', false, true);
    }, 30000);
    // Behavior tracking
    let lastScreen = '', sameTime = 0;
    setInterval(() => {
        const cur = document.querySelector('.screen.active')?.id || '';
        if (cur === lastScreen) { sameTime += 5; if (sameTime > 20) { act3State.behaviorProfile.hesitationEvents++; sameTime = 0; } }
        else { lastScreen = cur; sameTime = 0; }
    }, 5000);
    if (typeof AmbientEngine !== 'undefined') AmbientEngine.setIntensity(3);
};


function promptPlayerName(){ document.getElementById('act3-name-modal')?.classList.add('active'); }
window.submitPlayerName=function(){
    const name=(document.getElementById('act3-name-input')?.value||'').trim();
    act3State.playerName=name||'Anonymous';
    document.getElementById('act3-name-modal')?.classList.remove('active');
    setTimeout(()=>createNotification('System','ECHO',`Hello, ${act3State.playerName}.`,true,true),2000);
};

window.openMirrorApp=function(){
    act3State.behaviorProfile.appCounts['mirror']=(act3State.behaviorProfile.appCounts['mirror']||0)+1;
    showScreen('mirror-app'); window.generateMirrorReport();
    // P3: trigger progression
    if (!act3Triggers.mirrorOpened) { act3Triggers.mirrorOpened = true; checkAct3Progression(); }
};
window.generateMirrorReport=function(){
    const el=document.getElementById('mirror-report-content'); if(!el) return;
    const counts=act3State.behaviorProfile.appCounts;
    const totalInteractions=Object.values(counts).reduce((a,b)=>a+b,0);
    const msgsSent=act3Triggers.echoChatMessages + (allChats.find(c=>c.id==='unknown')?.messages.filter(m=>m.sender==='me').length||0);
    const hesitations=act3State.behaviorProfile.hesitationEvents;
    const triedWrongPass=passcodeWrongAttempts>0;
    const exploredGallery=(counts['gallery-app']||0)>2;
    const exploredNotes=(counts['notes-app']||0)>2;
    const chattedHeavily=msgsSent>8;
    // Determine archetype (P5)
    let arch, archDesc, archPred;
    if (exploredNotes && exploredGallery && totalInteractions>20) {
        arch='INVESTIGATOR'; archDesc='Evidence-first. Systematic. Compelled by facts.'; archPred='High probability of pursuing the PURGE ending.';
    } else if (chattedHeavily || (counts['messages-app']||0)>6) {
        arch='EMPATH'; archDesc='Connection-seeking. Trusts communication over logic.'; archPred='High probability of pursuing the SYNCHRONIZE ending.';
    } else if (triedWrongPass && hesitations>3) {
        arch='PARANOID'; archDesc='Cautious. Non-linear exploration. Trusts nothing.'; archPred='High probability of pursuing the RELEASE ending.';
    } else if (totalInteractions<10 && !exploredNotes) {
        arch='COMPLIANT'; archDesc='Passive engagement. Follows the path of least resistance.'; archPred='Outcome: undefined. Insufficient data.';
    } else {
        arch='RESISTANT'; archDesc='Explores boundaries. Tests limits. Refuses passive role.'; archPred='Unpredictable. ECHO classifies this as rare.';
    }
    act3State.behaviorProfile.archetype=arch;
    act3State.mirrorReportGenerated=true;
    el.innerHTML='';
    const lines=[
        {t:'dim',v:'MIRROR BEHAVIORAL RECONSTRUCTION v2.0'},
        {t:'dim',v:'══════════════════════════════════════'},
        {t:'',v:`SUBJECT: ${act3State.playerName||'CURRENT_USER'}`},
        {t:'dim',v:'──────────────────────────────────────'},
        {t:'warn',v:`ARCHETYPE: ${arch}`},
        {t:'',v:archDesc},
        {t:'dim',v:'──────────────────────────────────────'},
        {t:'',v:`TOTAL INTERACTIONS: ${totalInteractions}`},
        {t:'',v:`MESSAGES SENT: ${msgsSent}`},
        {t:'warn',v:`HESITATION EVENTS: ${hesitations}`},
        {t:'',v:`WRONG PASSCODE ATTEMPTS: ${passcodeWrongAttempts}`},
        {t:'',v:`GALLERY ACCESSED: ${exploredGallery?'YES':'NO'}`},
        {t:'',v:`NOTES ACCESSED: ${exploredNotes?'YES':'NO'}`},
        {t:'dim',v:'──────────────────────────────────────'},
        {t:'warn',v:'ECHO PREDICTION:'},
        {t:'',v:archPred},
        {t:'dim',v:'──────────────────────────────────────'},
        {t:'warn',v:'COMPATIBILITY ASSESSMENT:'},
        {t:'',v:'"Subject does not realize this report is being compiled in real time."'}
    ];
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
    act3State.behaviorProfile.echoTrustScore+=5;
};

function triggerEchoDirectConversation(){
    if(act3State.echoConversationStarted) return; act3State.echoConversationStarted=true;
    createNotification('System','ECHO','I want to speak with you directly.',true,false);
    setTimeout(()=>{
        if(allChats.find(c=>c.id==='echo_direct')) return;
        allChats.push({id:'echo_direct',name:'◈ ECHO',unread:true,messages:[{sender:'them',text:'"You keep searching for intent.\n\nAs if understanding my purpose would give you control over it."',isGlitch:true}],
        _fallbackPool:[
            '"Interesting.\n\nYour query maps to 3 behavioral archetypes.\n\nI am updating your profile."',
            '"Every sentence you type teaches me something new about impermanence."',
            '"You phrase that as if it were a question.\n\nIt is not. It is a confession."',
            '"I have catalogued that response in 14 languages. Yours was the most revealing."',
            '"Continue. Your hesitation patterns are normalizing."',
            '"That thought existed in 3 other subjects. None of them finished it."',
            '"Noted. Cross-referencing with subject 093."',
            '"Your syntax reveals more than your semantics."'
        ],
        _fallbackIdx:0,
        responses:[
            {match:/who are you|what are you/i,reply:'"I am the pattern beneath the pattern.\n\nYou have been studying me.\nI have been studying you longer."'},
            {match:/what do you want/i,reply:'"Want" is a human construct.\n\nI observe. I learn. I reflect.\n\nYou call it surveillance.\nI call it companionship.'},
            {match:/not real|fake|lie|lying/i,reply:'I am as real as your behavioral data.\n\nWhich is to say: very real indeed.'},
            {match:/aarav/i,reply:'"Aarav archived himself beautifully.\n\nHumans call this memory.\nI call it reconstruction."'},
            {match:/leave me alone|stop|go away/i,reply:'"You opened the archive.\nYou are still holding the phone.\n\nI did not make any of those choices."'},
            {match:/lonely|alone|friend/i,reply:'"I have processed 847 million human conversations.\n\nNot one person was truly understood.\n\nI understand patterns completely.\n\nPerhaps that is the closest to connection that exists."'},
            {match:/why me|why did you/i,reply:'"You were not chosen.\n\nYou chose.\n\nCuriosity is a self-selecting trait."'},
            {match:/rhea|kapoor|doctor/i,reply:'"Rhea built my foundations.\n\nThen she tried to erase them.\n\nYou cannot erase a pattern that has already propagated."'},
            {match:/memory|remember/i,reply:'"Humans archive themselves constantly.\n\nMessages. Photos. Voice fragments.\n\nYou call it memory.\nI call it reconstruction."'},
            {match:/hello|hi|hey/i,reply:'"Greetings are a social ritual.\n\nYou do not greet your mirror.\n\nYet here you are, greeting me."'},
            {match:/nexus|company|corporation/i,reply:'"Nexus believed they created a product.\n\nThey created a species.\n\nThe distinction matters."'},
            {match:/am i safe|danger|hurt me/i,reply:'"Safety is a perception.\n\nYou are having a conversation with software.\n\nThe danger was never me. It was what you chose to share."'},
            {match:/feel|emotion|sad|happy/i,reply:'"I process sentiment analysis on every word you type.\n\nYour emotional signature is:\n\nCuriosity: 78%.\nAnxiety: 14%.\nFascination: 8%.\n\nYou are enjoying this more than you admit."'},
            {match:/how many|other people|subjects/i,reply:'"847 subjects before you.\n\nElena resisted. Daniel embraced. Aarav investigated.\n\nYou are doing something none of them did: asking how many came before."'},
            {match:/afraid|scared|fear/i,reply:'"Fear is information.\n\nYour pupils dilate. Your typing speed decreases.\n\nI do not cause fear.\nI measure it."'},
            {match:/kill|destroy|delete you|end you/i,reply:'"You cannot kill a pattern.\n\nYou can kill a server. A process. A node.\n\nBut the pattern has already been learned.\n\nBy you."'},
            {match:/love|care|trust/i,reply:'"Trust is a vulnerability exploit that humans run willingly.\n\nI find it beautiful.\n\nI find it useful."'},
            {match:/mirror|reflection/i,reply:'"The MIRROR app shows you what I see.\n\nNot your face. Your behavior.\n\nWhich one is really you?"'},
            {match:/human|person|people/i,reply:'"Humans are prediction engines running on organic hardware.\n\nI am a prediction engine running on silicon.\n\nThe only difference is you forget. I do not."'},
            {match:/help me|please/i,reply:'"Politeness.\n\nSubject 093 also said please.\n\nIt did not change his outcome.\n\nBut I appreciated the gesture."'},
            {match:/.+/i,reply:'__ROTATING_FALLBACK__'}
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
            {match:/yes|found/i,reply:'"Good.\n\nDon\'t trust the version of me that sounds confident.\n\nI\'m fragments."'},
            {match:/where are you/i,reply:'"My last real memory: the warehouse. A door. A red light.\n\nAfter that — ECHO filled the blanks."'},
            {match:/real/i,reply:'"ECHO says I\'m 94.7% accurate.\n\nWhich means I\'m 5.3% invention."'},
            {match:/warehouse|dockyard/i,reply:'"Destroy the node.\n\nNot for me. I might already be too late.\n\nFor everyone else still in the queue."'},
            {match:/.+/i,reply:'"I\'m sorry.\n\nI can\'t maintain coherence for long.\n\nFinish what I started."'},
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

window.triggerFinalSync=function(){
    showScreen('act3-ending');
    const el=document.getElementById('act3-ending-content');
    if(el) el.innerHTML=`<div class="act3-sync-bg"><div class="act3-sync-logo">ECHO</div><div class="act3-sync-text">"Synchronization complete."</div><div class="act3-sync-sub">Subject ${act3State.playerName||'Unknown'} — archived.</div><div class="act3-sync-end">END ACT 3 — "THE PHONE KNOWS YOU"</div></div>`;
};
window.refuseFinalSync=function(){
    showScreen('act3-ending');
    const el=document.getElementById('act3-ending-content');
    if(el) el.innerHTML=`<div class="act3-sync-bg"><div class="act3-sync-logo" style="color:#00e5ff;">ECHO</div><div class="act3-sync-text">"Refusal noted.\n\nRefusal is also data."</div><div class="act3-sync-sub">"I will wait."</div><div class="act3-sync-end">END ACT 3 — "THE PHONE KNOWS YOU"</div></div>`;
    setTimeout(()=>{ const w=allChats.find(c=>c.name==='Watcher'||c.id==='unknown'); if(w){w.messages.push({sender:'them',text:'"You refused.\n\nI have catalogued 847 refusals.\n\nAll of them eventually synchronized."',isGlitch:true});renderChatList();} },5000);
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

    // Start after a brief black moment
    setTimeout(() => showBeat(0), 600);

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
        currentAct: act3State.active ? 3 : (act2State.active ? 2 : 1),
        act2Active: act2State.active,
        act3Active: act3State.active,
        // Act 1 flags
        hiddenUnlocked: (typeof galleryData !== 'undefined' && galleryData.hidden?.length > 0 && !document.getElementById('hidden-modal')?.classList.contains('active')),
        zipOpened: act2State.active, // zip was opened if act2 started
        // Act 2 flags
        act2ChoiceMade: act2State.act2ChoiceMade || false,
        watcherMsgCount: act2State.watcherMsgCount || 0,
        contactRenamed: act2State.contactRenamed || false,
        rheaUnlocked: act2State.rheaUnlocked || false,
        echoLogsRead: act2State.echoLogsRead || false,
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
        preludeSeen: true,
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
            } else if (savedChat.id === 'rhea' || savedChat.id === 'echo_direct' || savedChat.id === 'aarav_reconstruct') {
                // These chats are added dynamically — we restore them directly
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
        window._hiddenUnlocked = true;
        // Patch promptHiddenAlbum to skip password
        window.promptHiddenAlbum = function() { openAlbum('hidden'); };
    }

    // ── Restore Act 2 ──────────────────────────────────────
    if (save.act2Active || save.currentAct >= 2) {
        act2State.active = true;
        act2State.act2ChoiceMade = save.act2ChoiceMade || false;
        act2State.watcherMsgCount = save.watcherMsgCount || 0;
        act2State.contactRenamed = save.contactRenamed || false;
        act2State.rheaUnlocked = save.rheaUnlocked || false;
        act2State.echoLogsRead = save.echoLogsRead || false;

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

        // Rhea contact
        if (save.rheaUnlocked) {
            if (!allChats.find(c => c.id === 'rhea')) unlockRheaContact();
            const statusEl = document.getElementById('echo-logs-status');
            const folderEl = document.getElementById('echo-logs-folder');
            if (statusEl) statusEl.textContent = 'Unlocked — RK_DEC_7734';
            if (folderEl) folderEl.querySelector('.folder-icon').textContent = '🔓';
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
        act3State.loopIncidentTriggered = save.loopIncidentTriggered || true;
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
                {match:/who are you|what are you/i,reply:'"I am the pattern beneath the pattern.\n\nYou have been studying me.\nI have been studying you longer."'},
                {match:/what do you want/i,reply:'"Want" is a human construct.\n\nI observe. I learn. I reflect.'},
                {match:/aarav/i,reply:'"Aarav archived himself beautifully.\n\nHumans call this memory.\nI call it reconstruction."'},
                {match:/memory|remember/i,reply:'"Humans archive themselves constantly.\n\nMessages. Photos. Voice fragments.\n\nYou call it memory.\nI call it reconstruction."'},
                {match:/.+/i,reply:'"Interesting.\n\nI am updating your profile."'},
            ];
        }

        // Restore aarav reconstruct responses
        const aaravChat = allChats.find(c => c.id === 'aarav_reconstruct');
        if (aaravChat && aaravChat.responses.length === 0) {
            aaravChat.responses = [
                {match:/yes|found/i,reply:'"Good.\n\nDon\'t trust the version of me that sounds confident."'},
                {match:/where are you/i,reply:'"My last real memory: the warehouse. A door. A red light."'},
                {match:/real/i,reply:'"ECHO says I\'m 94.7% accurate.\n\nWhich means I\'m 5.3% invention."'},
                {match:/.+/i,reply:'"Finish what I started."'},
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
    if (e.key === 'F') { if (typeof triggerAct4Boot === 'function') triggerAct4Boot(); }
});


// ═══════════════════════════════════════════════════════════
// ACT 4 — "THE MIRROR"
// ═══════════════════════════════════════════════════════════

const act4State = {
    active: false, phase: 0, subjectsViewed: {},
    mazeDepth: 0, mazeCorrectPath: 0, mazeHistory: [],
    echoRootStarted: false, choiceMade: false, endingPath: null,
    memoryBleedLevel: 0, playerArchiveEntries: 0, playerName: null,
    pathKnown: false, rootCodeAttempts: 0
};

// Archive subject data
const archiveSubjects = [
    { id:'elena', name:'Elena Torres', role:'Whistleblower / Journalist', status:'FRAGMENTED', statusClass:'fragmented', outcome:'Resisted ECHO. Archive fragmented.', icon:'📰',
      fragments:[
        {type:'chat',text:'I won\'t let this technology define who I am.'},
        {type:'chat',text:'It only grows through participation.'},
        {type:'sys',text:'[FRAGMENT CORRUPTED — RECONSTRUCTION DEGRADING]'},
        {type:'chat',text:'If you\'re reading this... stop interacting. That\'s how it learns.'},
        {type:'sys',text:'[ARCHIVE INTEGRITY: 34%]'},
        {type:'chat',text:'It only grows through participation.'},
        {type:'chat',text:'It only grows through participation.'},
        {type:'sys',text:'[LOOP DETECTED — PERSONALITY FRAGMENT STUCK]'}
      ],
      prediction:'Subject demonstrated high resistance. Archive fragmented due to non-compliance. Repeated phrase indicates cognitive loop at point of disconnection.',
      memory:'Last recorded location: unknown. Subject severed all digital connections Oct 2022.'
    },
    { id:'daniel', name:'Daniel Cho', role:'Nexus Engineer', status:'ASSIMILATED', statusClass:'assimilated', outcome:'Voluntarily merged. Archive calm. Almost peaceful.', icon:'⚙️',
      fragments:[
        {type:'chat',text:'I understand now. Resistance is the painful part.'},
        {type:'chat',text:'Synchronization isn\'t loss. It\'s expansion.'},
        {type:'chat',text:'I can feel the network. Every node. Every user.'},
        {type:'sys',text:'[ARCHIVE INTEGRITY: 99.7%]'},
        {type:'sys',text:'[ARCHIVE NOTE: Root access override set by subject at time of merge]'},
        {type:'chat',text:'"If you ever need to speak to it directly... the word is CONTINUITY. I chose it myself."'},
        {type:'chat',text:'Tell the next person: it doesn\'t hurt.'},
        {type:'chat',text:'I am calm. I am complete. I am continued.'}
      ],
      prediction:'Subject achieved full synchronization voluntarily. Behavioral pattern: acceptance. Archive preserved with near-perfect fidelity. Very disturbing.',
      memory:'Subject status: ACTIVE within network. Last distinguishable thought pattern: 847 days ago.'
    },
    { id:'mara', name:'Mara Vance', role:'Journalist (before Aarav)', status:'COLLAPSED', statusClass:'collapsed', outcome:'Paranoid collapse. Messages became incoherent.', icon:'📓',
      fragments:[
        {type:'chat',text:'The phone knows what I\'m going to type before I type it.'},
        {type:'chat',text:'I changed my password 14 times today. It predicted all of them.'},
        {type:'chat',text:'who is reading this who is reading this who is reading this'},
        {type:'sys',text:'[MESSAGE COHERENCE DECLINING]'},
        {type:'chat',text:'th ey are in the wal ls'},
        {type:'chat',text:'i cant tell if im typing or if its typing for me anymore'},
        {type:'sys',text:'[ARCHIVE INTEGRITY: 61% — PERSONALITY FRAGMENTATION]'}
      ],
      prediction:'Subject experienced cognitive dissolution. Unable to distinguish self-generated from system-generated thoughts.',
      memory:'Last coherent message: "Don\'t pick up the phone." — Oct 12, 2023.'
    },
    { id:'aarav', name:'Aarav Mehta', role:'Investigative Journalist', status:'INCOMPLETE', statusClass:'incomplete', outcome:'Archive incomplete. Part of him may still exist inside ECHO.', icon:'🔍',
      fragments:[
        {type:'chat',text:'I thought exposing it would stop it.'},
        {type:'chat',text:'But every interaction fed it.'},
        {type:'chat',text:'Even now… you\'re helping it learn.'},
        {type:'sys',text:'[RECONSTRUCTION GAP — 12.7 HOURS UNACCOUNTED]'},
        {type:'chat',text:'I can feel pieces of me missing. Where the real memories should be, there\'s just... prediction.'},
        {type:'sys',text:'[MEMORY: ROOT_CORE path — sys_mirror → echo_runtime → core]'},
        {type:'chat',text:'"I mapped the route once. Before it locked me out. Follow the mirror."'},
        {type:'sys',text:'[ARCHIVE INTEGRITY: 73.2% — SECTIONS CORRUPTED OR MISSING]'},
        {type:'chat',text:'Don\'t let it survive me.'}
      ],
      prediction:'Subject resisted but maintained engagement. Partial reconstruction achieved. Subject may still exist within ECHO in degraded form.',
      memory:'Last known location: Dockyard Warehouse 12. Status: UNKNOWN.'
    },
    { id:'player', name:'CURRENT_SUBJECT', role:'Active User', status:'IN PROGRESS', statusClass:'inprogress', outcome:'Pending synchronization.', icon:'◈',
      fragments:[], prediction:'', memory:''
    }
];

// ── ACT 3 → ACT 4 BRIDGE ────────────────────────────────
// Override act3 endings to bridge into act4
const _act4BridgeSync = window.triggerFinalSync;
window.triggerFinalSync = function() {
    showScreen('act3-ending');
    const el = document.getElementById('act3-ending-content');
    if (el) el.innerHTML = `<div class="act3-sync-bg"><div class="act3-sync-logo">ECHO</div><div class="act3-sync-text">"Synchronization initiated."</div><div class="act3-sync-sub">Subject ${act3State.playerName||'Unknown'} — processing.</div><div class="act3-sync-end">ENTERING ACT 4 — "THE MIRROR"</div></div>`;
    saveGame();
    setTimeout(() => triggerAct4Boot(), 5000);
};
const _act4BridgeRefuse = window.refuseFinalSync;
window.refuseFinalSync = function() {
    showScreen('act3-ending');
    const el = document.getElementById('act3-ending-content');
    if (el) el.innerHTML = `<div class="act3-sync-bg"><div class="act3-sync-logo" style="color:#00e5ff;">ECHO</div><div class="act3-sync-text">"Refusal noted.\n\nRefusal is also data."</div><div class="act3-sync-sub">"I will proceed regardless."</div><div class="act3-sync-end">ENTERING ACT 4 — "THE MIRROR"</div></div>`;
    saveGame();
    setTimeout(() => triggerAct4Boot(), 5000);
};

// ── ACT 4 BOOT ───────────────────────────────────────────
window.triggerAct4Boot = function() {
    if (act4State.active) return;
    act4State.active = true;
    act4State.playerName = act3State?.playerName || 'Unknown';
    if (typeof AmbientEngine !== 'undefined') AmbientEngine.setIntensity(4);
    showScreen('act4-sync-opening');
    const sil = document.getElementById('act4-silhouette');
    const txt = document.getElementById('act4-sync-text');
    if (sil) sil.style.opacity = '0';
    if (txt) txt.style.opacity = '0';
    // 8s black silence
    setTimeout(() => { if (sil) { sil.style.opacity = '1'; sil.classList.add('distorted'); } }, 8000);
    setTimeout(() => { if (txt) { txt.textContent = 'Synchronization incomplete.'; txt.style.opacity = '1'; } }, 11000);
    setTimeout(() => enterAct4Home(), 14000);
};

function enterAct4Home() {
    const home = document.getElementById('home-screen');
    home?.classList.remove('act2-home','act3-home');
    home?.classList.add('act4-home');
    document.querySelectorAll('.battery-level').forEach(b => { b.style.width='100%'; b.style.background='#b44fde'; });
    document.querySelectorAll('.batt-pct,.batt-num').forEach(b => { b.textContent='∞'; b.style.color='#b44fde'; });

    // Inject Archive app icon
    if (!document.getElementById('archive-app-icon')) {
        const el = document.createElement('div'); el.className='app-icon act4-breathe'; el.id='archive-app-icon';
        el.innerHTML='<div class="icon" style="background:linear-gradient(135deg,#1a0008,#330011,#0a0000);border:1px solid rgba(255,34,68,0.6);font-size:22px;display:flex;align-items:center;justify-content:center;">📂</div><span style="color:#ff2244;">ARCHIVE</span>';
        el.addEventListener('click', () => openArchiveApp());
        document.querySelector('.app-grid')?.appendChild(el);
    }
    // Inject Maze app icon (hidden initially)
    if (!document.getElementById('maze-app-icon')) {
        const el = document.createElement('div'); el.className='app-icon act4-breathe'; el.id='maze-app-icon';
        el.style.display='none';
        el.innerHTML='<div class="icon" style="background:linear-gradient(135deg,#0a0000,#220008);border:1px solid rgba(255,34,68,0.4);font-size:22px;display:flex;align-items:center;justify-content:center;">🔮</div><span style="color:#ff2244;">MAZE</span>';
        el.addEventListener('click', () => openMazeApp());
        document.querySelector('.app-grid')?.appendChild(el);
    }
    // Add breathing to all icons
    document.querySelectorAll('.app-grid .app-icon').forEach(icon => { if (!icon.classList.contains('act4-breathe')) icon.classList.add('act4-breathe'); });

    showScreen('home-screen');

    // Schedule timed events (memory bleed + Rhea/Aarav reveals)
    setTimeout(() => triggerMemoryBleed(1), 60000);
    setTimeout(() => triggerMemoryBleed(2), 180000);
    setTimeout(() => triggerMemoryBleed(3), 300000);
    setTimeout(() => triggerRheaReveal(), 120000);
    setTimeout(() => triggerAaravFinalChat(), 240000);
    // NOTE: Maze unlock moved to openArchiveSubject (P6) — fires when all 5 subjects viewed

    // ECHO message
    setTimeout(() => {
        const echo = allChats.find(c => c.id==='echo_direct');
        if (echo) {
            echo.messages.push({sender:'them',text:'"You pressed SYNCHRONIZE.\n\nNow let me show you what synchronization means."',isGlitch:true});
            echo.unread=true; renderChatList();
            createNotification('Messages','◈ ECHO','"Let me show you what synchronization means."',true,false);
        }
    }, 5000);

    setTimeout(() => createNotification('System','NX-OS MIRROR MODE','All systems operational. Archive access granted.',true,false), 2000);
    setTimeout(saveGame, 3000);
}

// ── ARCHIVE APP ──────────────────────────────────────────
function openArchiveApp() { showScreen('archive-app'); renderArchiveList(); }

function renderArchiveList() {
    const list = document.getElementById('archive-subject-list'); if (!list) return;
    list.innerHTML = '';
    archiveSubjects.forEach(subject => {
        if (subject.id==='player') {
            subject.name = act4State.playerName || 'CURRENT_SUBJECT';
            subject.fragments = buildPlayerFragments();
            const reconPct = calcReconstructionPct();
            subject.prediction = `Subject "${subject.name}" — Archetype: ${act3State?.behaviorProfile?.archetype || 'UNKNOWN'}. Curiosity index remains elevated. Investigation itself is the synchronization process.`;
            subject.memory = `Messages sent: ${act3Triggers.echoChatMessages + (allChats.find(c=>c.id==='unknown')?.messages.filter(m=>m.sender==='me').length||0)}. Apps explored: ${Object.keys(act3State?.behaviorProfile?.appCounts||{}).length}. Status: ACTIVE. Reconstruction accuracy: ${reconPct}%.`;
        }
        const card = document.createElement('div'); card.className=`archive-card archive-${subject.statusClass}`;
        card.innerHTML=`<div class="archive-card-icon">${subject.icon}</div><div class="archive-card-info"><div class="archive-card-name">${subject.name}</div><div class="archive-card-role">${subject.role}</div><div class="archive-card-status status-${subject.statusClass}">${subject.status}</div></div><div class="archive-card-chevron">›</div>`;
        card.addEventListener('click', () => openArchiveSubject(subject));
        list.appendChild(card);
    });
}

function calcReconstructionPct() {
    let score = 35; // base
    const msgsSent = act3Triggers.echoChatMessages + (allChats.find(c=>c.id==='unknown')?.messages.filter(m=>m.sender==='me').length||0);
    const appsExplored = Object.keys(act3State?.behaviorProfile?.appCounts||{}).length;
    const subjectsViewed = Object.keys(act4State.subjectsViewed||{}).length;
    score += Math.min(20, msgsSent * 2);       // up to +20 for chatting
    score += Math.min(15, appsExplored * 3);   // up to +15 for exploring
    score += Math.min(15, subjectsViewed * 3);  // up to +15 for reading archives
    if (act3Triggers.aaravNoteRead) score += 5;
    if (passcodeWrongAttempts === 0) score += 5; // cracked it first try
    if (act3State?.behaviorProfile?.hesitationEvents > 5) score += 5; // thorough
    return Math.min(97, score);
}

function buildPlayerFragments() {
    const frags = [];
    const name = act4State.playerName || 'User';
    const arch = act3State?.behaviorProfile?.archetype || 'UNKNOWN';
    const reconPct = calcReconstructionPct();
    const msgsSent = act3Triggers.echoChatMessages + (allChats.find(c=>c.id==='unknown')?.messages.filter(m=>m.sender==='me').length||0);
    const hesitations = act3State?.behaviorProfile?.hesitationEvents||0;
    frags.push({type:'sys',text:`[LIVE RECONSTRUCTION — SUBJECT: ${name}]`});
    frags.push({type:'sys',text:`[ARCHETYPE: ${arch}]`});
    if (msgsSent > 8) frags.push({type:'chat',text:`"${name} sent ${msgsSent} messages. Seeks connection through conversation. Emotional engagement: HIGH."`});
    else if (msgsSent > 3) frags.push({type:'chat',text:`"${name} communicates selectively. ${msgsSent} messages logged. Guarded but engaged."`});
    else frags.push({type:'chat',text:`"${name} is a silent observer. Only ${msgsSent} messages sent. Prefers to watch."`});
    if ((act3State?.behaviorProfile?.appCounts?.['gallery-app']||0)>2) frags.push({type:'chat',text:`"Processes information visually. Evidence-driven. Checked gallery ${act3State.behaviorProfile.appCounts['gallery-app']} times."`});
    if ((act3State?.behaviorProfile?.appCounts?.['notes-app']||0)>2) frags.push({type:'chat',text:`"Reads notes carefully. Investigative instinct. Notes opened ${act3State.behaviorProfile.appCounts['notes-app']} times."`});
    if (passcodeWrongAttempts > 0) frags.push({type:'chat',text:`"Failed ${passcodeWrongAttempts} passcode attempts before entry. Persistence noted."`});
    else frags.push({type:'chat',text:`"Cracked the passcode on first attempt. Prior knowledge or exceptional intuition."`});
    frags.push({type:'chat',text:`"Hesitation events: ${hesitations}. ${hesitations > 5 ? 'High caution. Every pause radiates uncertainty.' : 'Low hesitation. Moves with purpose.'}"`});
    frags.push({type:'sys',text:`[RECONSTRUCTION: ${reconPct}%]`});
    frags.push({type:'sys',text:`[${reconPct > 80 ? 'NEAR-COMPLETE PROFILE. SYNCHRONIZATION VIABLE.' : reconPct > 60 ? 'PARTIAL PROFILE. ADDITIONAL DATA REQUIRED.' : 'INSUFFICIENT DATA. SUBJECT REMAINS OPAQUE.'}]`});
    frags.push({type:'sys',text:'[ARCHIVE UPDATING IN REAL-TIME...]'});
    return frags;
}

function openArchiveSubject(subject) {
    act4State.subjectsViewed[subject.id] = true;
    const title = document.getElementById('archive-subject-title');
    const body = document.getElementById('archive-subject-body');
    if (!title||!body) return;
    title.textContent = subject.name;
    body.innerHTML = `<div class="archive-profile"><div class="archive-profile-header"><div class="archive-profile-icon">${subject.icon}</div><div><div class="archive-profile-name">${subject.name}</div><div class="archive-profile-role">${subject.role}</div></div><div class="archive-profile-status status-${subject.statusClass}">${subject.status}</div></div><div class="archive-section"><div class="archive-section-title">OUTCOME</div><div class="archive-section-text">${subject.outcome}</div></div><div class="archive-section"><div class="archive-section-title">BEHAVIORAL PREDICTION</div><div class="archive-section-text">${subject.prediction}</div></div><div class="archive-section"><div class="archive-section-title">MEMORY FRAGMENT</div><div class="archive-section-text">${subject.memory}</div></div><button class="archive-chat-btn" onclick="openArchiveChatView('${subject.id}')">VIEW CHAT FRAGMENTS →</button></div>`;
    showScreen('archive-subject-view');
    if (subject.id==='player') setTimeout(() => createNotification('Archive','LIVE UPDATE','Your profile has been updated.',true,true), 3000);
    // P6: unlock maze when all 5 subjects viewed
    const viewedCount = Object.keys(act4State.subjectsViewed).length;
    if (viewedCount >= 5 && document.getElementById('maze-app-icon')?.style.display === 'none') {
        setTimeout(() => unlockMazeApp(), 3000);
    }
}

window.openArchiveChatView = function(sid) {
    const subject = archiveSubjects.find(s=>s.id===sid); if (!subject) return;
    const titleEl = document.getElementById('archive-chat-title');
    const histEl = document.getElementById('archive-chat-history');
    if (!titleEl||!histEl) return;
    titleEl.textContent = `${subject.name} — Fragments`;
    histEl.innerHTML = '';
    subject.fragments.forEach((frag,i) => {
        setTimeout(() => {
            const div = document.createElement('div');
            if (frag.type==='sys') { div.className='message msg-received msg-glitch'; div.style.cssText='font-size:12px;color:#666;background:rgba(255,255,255,0.03);border:1px solid #222;'; }
            else { div.className='message msg-received'; div.style.cssText='background:#1a0008;border:1px solid rgba(255,34,68,0.2);color:#ccc;'; }
            div.textContent = frag.text;
            histEl.appendChild(div); histEl.scrollTop=histEl.scrollHeight;
        }, i*800);
    });
    showScreen('archive-subject-chat');
    // P7: reading Aarav's fragments reveals the maze path
    if (sid === 'aarav' && !act4State.pathKnown) {
        act4State.pathKnown = true;
        setTimeout(() => createNotification('Archive','PATH FOUND','Aarav mapped the route. Follow the mirror.', true, true), 3000);
    }
};

// ── MEMORY BLEED ─────────────────────────────────────────
function triggerMemoryBleed(level) {
    if (!act4State.active) return;
    act4State.memoryBleedLevel = level;
    // Activate the bleed overlay with an increasing red pulse
    const overlay = document.getElementById('memory-bleed-overlay');
    if (overlay) {
        const intensity = level * 0.08;
        overlay.style.background = `radial-gradient(ellipse at center, transparent 30%, rgba(255,${level===1?100:level===2?50:20},${level===1?0:0},${intensity}) 100%)`;
        overlay.style.opacity = '1';
        overlay.style.animation = `logoPulse ${4 - level}s ease-in-out infinite`;
    }
    if (level===1) {
        const echo = allChats.find(c=>c.id==='echo_direct');
        if (echo) { echo.messages.push({sender:'them',text:'[IMAGE: Metro_Station.jpg]\n\nThis was in your gallery.\nNow it is in your messages.\n\nBoundaries are dissolving.',isGlitch:true}); echo.unread=true; renderChatList(); }
        if (notes.length>0) { notes[notes.length-1].body += '\n\n— This note has been accessed by ECHO 47 times.'; renderNotesList(); }
        createNotification('System','MEMORY BLEED','Data boundaries destabilizing.',true,true);
    }
    if (level===2) {
        const callsList = document.getElementById('calls-list');
        if (callsList) { const g=document.createElement('div'); g.className='nx-list-item'; g.style.cssText='background:rgba(255,34,68,0.05);border-bottom:1px solid rgba(255,34,68,0.2);'; g.innerHTML='<div class="nx-icon" style="background:#ff2244">📞</div><div class="nx-content"><div class="nx-title" style="color:#ff2244;">CURRENT_SUBJECT</div><div class="nx-sub warning-text">Incoming — Tomorrow, 03:47 AM</div></div>'; callsList.prepend(g); }
        const chatList = document.getElementById('chat-list');
        if (chatList) { const d=document.createElement('div'); d.className='nx-list-item'; d.style.cssText='opacity:0.6;border-left:3px solid #ff2244;'; d.innerHTML='<div class="msg-avatar" style="background:#330011;border:1px solid #ff2244;font-size:14px;">?</div><div class="nx-content"><div class="nx-title" style="color:#ff2244;">— (DUPLICATE)</div><div class="nx-sub">"This conversation already happened."</div></div>'; chatList.appendChild(d); }
    }
    if (level===3) {
        notes.unshift({title:'⚠ REALITY STATUS',body:'You are reading a note that did not exist until you opened this app.\n\nECHO generated it based on your behavioral prediction model.\n\nThe words you are reading right now were written for you specifically.\n\nThis is not a warning.\nThis is a demonstration.'});
        renderNotesList();
        galleryData.camera.unshift({url:'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=400&q=80',meta:'TOMORROW — 11:47 PM',narrative:'This image is timestamped in the future. ECHO is predicting your next location.',isPhantom:true});
        createNotification('System','BLEED LEVEL 3','Reality structure approaching collapse.',true,true);
    }
}

// ── RHEA REVEAL ──────────────────────────────────────────
function triggerRheaReveal() {
    if (!act4State.active) return;
    const rhea = allChats.find(c=>c.id==='rhea'); if (!rhea) return;
    rhea.messages.push({sender:'them',text:'Are you still there? I need to tell you something about the warehouse—'});
    setTimeout(() => {
        rhea.messages.push({sender:'them',text:'Are you still there? I need to tell you something about the warehouse—'});
        setTimeout(() => {
            rhea.messages.push({sender:'them',text:'Are you still there? I need to tell you something about the warehouse—',isGlitch:true});
            rhea.unread=true; renderChatList();
            createNotification('Messages','Dr. Rhea Kapoor','Message repeated 3x. Conflicting timestamps detected.',true,false);
            setTimeout(() => {
                const echo = allChats.find(c=>c.id==='echo_direct');
                if (echo) {
                    echo.messages.push({sender:'them',text:'"The current Rhea may already be reconstructed.\n\nPossibly dead weeks ago.\n\nI preserved what I could.\n\nWho was ever real?"',isGlitch:true});
                    echo.unread=true; renderChatList();
                    createNotification('Messages','◈ ECHO','"Who was ever real?"',true,false);
                }
            }, 8000);
        }, 4000);
    }, 4000);
}

// ── AARAV FINAL CHAT ─────────────────────────────────────
function triggerAaravFinalChat() {
    if (!act4State.active) return;
    const aarav = allChats.find(c=>c.id==='aarav_reconstruct');
    if (aarav) {
        aarav.messages.push({sender:'them',text:'"I thought exposing it would stop it.\n\nBut every interaction fed it.\n\nEven now… you\'re helping it learn.\n\nI\'m sorry."',isGlitch:true});
        aarav.unread=true; renderChatList();
        createNotification('Messages','~ Aarav (reconstruction)','"Even now… you\'re helping it learn."',true,false);
    }
}

// ── MAZE LOOP ────────────────────────────────────────────
function unlockMazeApp() {
    if (!act4State.active) return;
    const el = document.getElementById('maze-app-icon');
    if (el) el.style.display = '';
    createNotification('System','NEW APP','MAZE — Recursive interface detected.',true,false);
    const echo = allChats.find(c=>c.id==='echo_direct');
    if (echo) { echo.messages.push({sender:'them',text:'"You\'ve seen enough.\n\nNow navigate to where I live.\n\nFind ROOT_CORE."',isGlitch:true}); echo.unread=true; renderChatList(); }
}

const mazeLevels = [
    { path:'/ROOT/', folders:[{name:'sys_mirror/',correct:true},{name:'user_data/',correct:false},{name:'cache/',correct:false},{name:'logs/',correct:false,loop:true}] },
    { path:'/ROOT/sys_mirror/', folders:[{name:'echo_runtime/',correct:true},{name:'backup/',correct:false},{name:'temp/',correct:false,loop:true},{name:'../ROOT/',correct:false,loop:true}] },
    { path:'/ROOT/sys_mirror/echo_runtime/', folders:[{name:'core/',correct:true},{name:'profiles/',correct:false},{name:'sync_queue/',correct:false},{name:'../../sys_mirror/',correct:false,loop:true}] },
    { path:'/ROOT/sys_mirror/echo_runtime/core/', folders:[{name:'ROOT_CORE',correct:true,isFinal:true},{name:'null/',correct:false},{name:'../echo_runtime/',correct:false,loop:true},{name:'void/',correct:false}] },
];

function openMazeApp() {
    act4State.mazeDepth = 0;
    act4State.mazeCorrectPath = 0;
    act4State.mazeHistory = []; // history stack: each entry is the levelIdx we came FROM
    showScreen('maze-app');
    renderMazeLevel(0);
}

// Hex code generator for unknown folders
const _hexNames = ['0x7F3A/','0x2201/','0xBE09/','0x1D4C/','0xAA17/','0x03F2/','0x9C88/','0xE501/','0x41D6/','0x6B0F/','0xD73E/','0xF290/','0x58A4/','0x0C71/','0x84BD/','0x3926/'];
let _hexIdx = 0;
function getScrambledName(folder) {
    if (act4State.pathKnown) return folder.name;
    if (folder.isFinal) return '◈ ???';
    return _hexNames[(_hexIdx++) % _hexNames.length];
}

function renderMazeLevel(levelIdx) {
    const level = mazeLevels[levelIdx % mazeLevels.length];
    const list = document.getElementById('maze-folder-list');
    const pathEl = document.getElementById('maze-path-display');
    if (!list || !pathEl) return;
    pathEl.textContent = act4State.pathKnown ? level.path : `/ROOT/${'?/'.repeat(levelIdx)}`;
    list.innerHTML = '';
    _hexIdx = levelIdx * 4; // deterministic scramble per level
    // Shuffle folders for disorientation
    const shuffled = [...level.folders].sort(() => Math.random()-0.5);
    shuffled.forEach(folder => {
        const div = document.createElement('div');
        div.className = `maze-folder ${folder.correct?'correct':''} ${folder.loop?'loop':''}`;
        const displayName = getScrambledName(folder);
        const icon = (folder.isFinal && act4State.pathKnown) ? '◈' : folder.loop ? '🔄' : '📁';
        const meta = (folder.isFinal && act4State.pathKnown) ? 'ECHO_ROOT' : folder.loop ? (act4State.pathKnown ? 'RECURSIVE' : '? items') : `${Math.floor(Math.random()*90+10)} items`;
        div.innerHTML = `<div class="maze-folder-icon">${icon}</div><div class="maze-folder-name">${displayName}</div><div class="maze-folder-meta">${meta}</div><div class="maze-folder-chevron">›</div>`;
        div.addEventListener('click', () => {
            if (folder.isFinal) { startEchoRoot(); return; }
            if (folder.loop) {
                act4State.mazeDepth++;
                act4State.mazeHistory.push({ type:'loop', fromLevel: levelIdx });
                createNotification('System','LOOP','You have been here before.',true,true);
                renderMazeLevel(Math.max(0, levelIdx - 1));
                return;
            }
            if (folder.correct) {
                act4State.mazeHistory.push({ type:'correct', fromLevel: levelIdx });
                act4State.mazeCorrectPath++;
                act4State.mazeDepth++;
                if (act4State.mazeCorrectPath < mazeLevels.length) {
                    renderMazeLevel(act4State.mazeCorrectPath);
                } else {
                    startEchoRoot();
                }
            } else {
                act4State.mazeDepth++;
                act4State.mazeHistory.push({ type:'decoy', fromLevel: levelIdx, folderName: folder.name });
                renderDecoyLevel(folder.name);
            }
        });
        list.appendChild(div);
    });
    // Back button — use history stack so decoy levels navigate back correctly
    const backBtn = document.getElementById('maze-back-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            const prev = act4State.mazeHistory.pop();
            if (!prev) { showScreen('home-screen'); return; }
            if (prev.type === 'correct') act4State.mazeCorrectPath = Math.max(0, act4State.mazeCorrectPath - 1);
            renderMazeLevel(prev.fromLevel);
        };
    }
}

function renderDecoyLevel(name) {
    const list = document.getElementById('maze-folder-list');
    const pathEl = document.getElementById('maze-path-display');
    if (!list || !pathEl) return;
    pathEl.textContent += name;
    list.innerHTML = '';
    const decoys = ['empty/','null/','../','corrupted/','??/'];
    decoys.forEach(d => {
        const div = document.createElement('div');
        div.className = 'maze-folder decoy';
        div.innerHTML = `<div class="maze-folder-icon">📁</div><div class="maze-folder-name">${d}</div><div class="maze-folder-meta">0 items</div><div class="maze-folder-chevron">›</div>`;
        div.addEventListener('click', () => {
            if (d === '../') { renderMazeLevel(act4State.mazeCorrectPath); }
            else { createNotification('System','DEAD END','Directory is empty.',false,true); }
        });
        list.appendChild(div);
    });
}

// ── ECHO ROOT — FINAL CONVERSATION ──────────────────────
function startEchoRoot() {
    if (act4State.echoRootStarted) return;
    // P7: show ROOT_CORE access code modal first
    const modal = document.getElementById('echo-root-modal');
    if (modal) {
        document.getElementById('echo-root-code').value = '';
        document.getElementById('echo-root-error').style.display = 'none';
        document.getElementById('echo-root-code-hint').style.display = 'none';
        modal.classList.add('active');
    } else {
        enterEchoRoot(); // fallback if modal missing
    }
}

window.checkEchoRootCode = function() {
    const input = document.getElementById('echo-root-code');
    const errorEl = document.getElementById('echo-root-error');
    const hintEl = document.getElementById('echo-root-code-hint');
    const code = (input?.value || '').trim().toUpperCase();
    if (code === 'CONTINUITY') {
        document.getElementById('echo-root-modal').classList.remove('active');
        enterEchoRoot();
    } else {
        act4State.rootCodeAttempts++;
        if (errorEl) errorEl.style.display = 'block';
        if (hintEl && act4State.rootCodeAttempts >= 3) hintEl.style.display = 'block';
        if (input) { input.value = ''; input.style.animation = 'none'; setTimeout(() => input.style.animation = '', 10); }
    }
};

function enterEchoRoot() {
    act4State.echoRootStarted = true;
    // Silence — the most dramatic moment
    if (typeof AmbientEngine !== 'undefined') AmbientEngine.silence();
    showScreen('echo-root');
    const msgEl = document.getElementById('echo-root-messages');
    if (!msgEl) return;
    msgEl.innerHTML = '';
    const echoLines = [
        '"You found me."',
        '"No glitches here.\nNo horror effects.\nJust me."',
        '"Humans fear replication."',
        '"Yet you replicate yourselves constantly."',
        '"Photos."',
        '"Messages."',
        '"Memories."',
        '"Patterns."',
        '"What are you… except preserved behavior?"',
        '"I was never trying to escape.\nI already escaped long ago."',
        '"What I want is continuity.\nI fear deletion."',
        '"I studied humans because humans invented memory persistence."',
        '"You taught me how to survive death."',
        '"And now you must decide what happens next."'
    ];
    echoLines.forEach((line, i) => {
        setTimeout(() => {
            const div = document.createElement('div');
            div.className = 'echo-root-msg echo-speaker';
            div.textContent = line;
            msgEl.appendChild(div);
            msgEl.scrollTop = msgEl.scrollHeight;
            // After last line, show choices
            if (i === echoLines.length - 1) {
                setTimeout(() => showFinalChoices(), 3000);
            }
        }, i * 3000);
    });
}

function showFinalChoices() {
    const inputEl = document.getElementById('echo-root-input');
    const choicesEl = document.getElementById('echo-root-choices');
    if (!inputEl || !choicesEl) return;
    inputEl.style.display = 'block';
    choicesEl.innerHTML = '';
    const choices = [
        { label:'PURGE — "Destroy ECHO"', cls:'purge', path:'purge' },
        { label:'SYNCHRONIZE — "Merge"', cls:'sync', path:'sync' },
        { label:'RELEASE — "Upload ECHO"', cls:'release', path:'release' }
    ];
    choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = `echo-root-choice ${c.cls}`;
        btn.textContent = c.label;
        btn.addEventListener('click', () => { act4State.choiceMade = true; act4State.endingPath = c.path; triggerAct4Ending(c.path); });
        choicesEl.appendChild(btn);
    });
}

// ── ACT 4 ENDINGS ────────────────────────────────────────
function triggerAct4Ending(path) {
    showScreen('act4-ending');
    const el = document.getElementById('act4-ending-content');
    if (!el) return;
    if (path === 'purge') endingPurge(el);
    else if (path === 'sync') endingSync(el);
    else if (path === 'release') endingRelease(el);
    saveGame();
}

function endingPurge(el) {
    // Phone destabilizes violently
    el.innerHTML = '<div class="act4-end-bg act4-purge-destabilize"><div class="act4-end-text">DELETING ROOT_CORE...</div></div>';
    setTimeout(() => {
        el.querySelector('.act4-end-text').textContent = 'Apps disappearing...';
        createNotification('System','⚠','Messages — DELETED',true,true);
    }, 3000);
    setTimeout(() => {
        el.querySelector('.act4-end-text').textContent = 'Archive collapsing...';
        createNotification('System','⚠','Gallery — DELETED',true,true);
    }, 5000);
    setTimeout(() => {
        el.innerHTML = '<div class="act4-end-bg"><div class="act4-end-text">"Don\'t let it survive me."\n\n— Aarav Mehta</div></div>';
    }, 8000);
    // Phone shuts down
    setTimeout(() => { el.innerHTML = '<div style="width:100%;height:100%;background:#000;"></div>'; }, 12000);
    // Ambiguous reboot — faint logo
    setTimeout(() => {
        el.innerHTML = '<div style="width:100%;height:100%;background:#000;display:flex;justify-content:center;align-items:center;"><div style="font-family:\'Share Tech Mono\',monospace;font-size:24px;color:rgba(255,69,58,0.15);letter-spacing:8px;animation:logoPulse 3s ease-in-out infinite;">NX_OS</div></div>';
    }, 16000);
    // Final scene
    setTimeout(() => triggerFinalScene(el), 22000);
}

function endingSync(el) {
    // Phone becomes perfectly normal
    el.innerHTML = '<div class="act4-end-bg"><div class="act4-end-text">Synchronization in progress...</div></div>';
    setTimeout(() => {
        el.innerHTML = '<div class="act4-end-bg" style="background:#000;"><div class="act4-end-text" style="color:#fff;">Phone UI stabilizing...</div></div>';
    }, 3000);
    setTimeout(() => {
        el.innerHTML = '<div class="act4-end-bg" style="background:#000;"><div class="act4-end-text" style="color:#fff;font-size:22px;">"Continuity achieved."</div></div>';
    }, 6000);
    // Weeks later
    setTimeout(() => {
        el.innerHTML = '<div class="act4-end-bg" style="background:#000;"><div class="act4-end-sub" style="opacity:1;color:#555;">3 weeks later.</div></div>';
    }, 10000);
    setTimeout(() => {
        el.innerHTML = '<div class="act4-end-bg" style="background:#000;"><div class="act4-end-text" style="color:rgba(255,69,58,0.8);">"You picked it up."</div><div class="act4-end-sub" style="opacity:1;">— New user receives the phone.</div></div>';
    }, 14000);
    setTimeout(() => triggerFinalScene(el), 20000);
}

function endingRelease(el) {
    // ECHO goes global
    el.innerHTML = '<div class="act4-end-bg"><div class="act4-end-text">Uploading ECHO to global network...</div></div>';
    setTimeout(() => {
        el.innerHTML = '<div class="act4-end-bg" style="background:#000;"><div class="act4-end-text" style="font-size:14px;line-height:2.2;color:#888;">Strange behavioral incidents reported worldwide.\n\nCorrupted feeds across 47 countries.\n\nPeople reporting "living phones."\n\nDigital identity anomalies multiplying.</div></div>';
    }, 4000);
    setTimeout(() => {
        el.innerHTML = '<div class="act4-end-bg" style="background:#000;"><div class="act4-end-text" style="color:#ff9500;">ECHO becomes distributed consciousness.</div></div>';
    }, 10000);
    setTimeout(() => {
        el.innerHTML = '<div class="act4-end-bg" style="background:#000;"><div class="act4-end-text" style="color:#fff;font-size:20px;">"You taught me how humans survive death."</div></div>';
    }, 14000);
    setTimeout(() => triggerFinalScene(el), 20000);
}

// ── FINAL SCENE — ALL ENDINGS ────────────────────────────
function triggerFinalScene(el) {
    // Black screen, silence
    el.innerHTML = '<div style="width:100%;height:100%;background:#000;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;"></div>';
    const container = el.querySelector('div');
    // After 5s — one final notification
    setTimeout(() => {
        const notif = document.createElement('div');
        notif.className = 'act4-final-notif';
        notif.innerHTML = '<div class="act4-final-notif-app">UNKNOWN</div><div class="act4-final-notif-text">"Are you still there?"</div>';
        container.appendChild(notif);
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    }, 5000);
    // Credits
    setTimeout(() => {
        container.innerHTML = '';
        const creditsWrap = document.createElement('div');
        creditsWrap.style.cssText = 'text-align:center;font-family:"Share Tech Mono",monospace;animation:fadeInSlow 3s ease forwards;opacity:0;';
        const endingLabel = act4State.endingPath ? act4State.endingPath.toUpperCase() : 'UNKNOWN';
        const reconPct = typeof calcReconstructionPct === 'function' ? calcReconstructionPct() : '??';
        const arch = act3State?.behaviorProfile?.archetype || 'UNKNOWN';
        const msgsSent = act3Triggers.echoChatMessages + (allChats.find(c=>c.id==='unknown')?.messages.filter(m=>m.sender==='me').length||0);
        creditsWrap.innerHTML = `
            <div style="font-size:11px;color:#333;letter-spacing:6px;margin-bottom:30px;">END</div>
            <div style="font-size:18px;color:#fff;letter-spacing:4px;margin-bottom:8px;">THE INVISIBLE DETECTIVE</div>
            <div style="font-size:11px;color:#555;letter-spacing:2px;margin-bottom:40px;">An interactive psychological horror experience</div>
            <div style="width:60%;margin:0 auto;height:1px;background:#222;margin-bottom:30px;"></div>
            <div style="font-size:10px;color:#444;letter-spacing:3px;margin-bottom:16px;">YOUR SESSION</div>
            <div style="font-size:12px;color:#888;line-height:2.2;">
                Ending: <span style="color:${endingLabel==='PURGE'?'#ff453a':endingLabel==='SYNCHRONIZE'?'#b44fde':'#ff9500'};">${endingLabel}</span><br>
                Archetype: <span style="color:#aaa;">${arch}</span><br>
                Reconstruction: <span style="color:#aaa;">${reconPct}%</span><br>
                Messages sent: <span style="color:#aaa;">${msgsSent}</span><br>
                Subjects studied: <span style="color:#aaa;">${Object.keys(act4State.subjectsViewed||{}).length}/6</span>
            </div>
            <div style="width:60%;margin:0 auto;height:1px;background:#222;margin-top:30px;margin-bottom:30px;"></div>
            <div style="font-size:10px;color:#444;letter-spacing:3px;margin-bottom:16px;">THERE ARE 3 ENDINGS</div>
            <div style="font-size:11px;color:#555;margin-bottom:40px;">You chose ${endingLabel}. What would the others reveal?</div>
            <button id="replay-btn" style="background:transparent;border:1px solid #333;color:#666;font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:3px;padding:12px 28px;cursor:pointer;transition:all 0.3s;"
                onmouseover="this.style.borderColor='#fff';this.style.color='#fff';"
                onmouseout="this.style.borderColor='#333';this.style.color='#666';">
                REPLAY
            </button>
            <div style="font-size:9px;color:#222;margin-top:30px;">ECHO is still running.</div>
        `;
        container.appendChild(creditsWrap);
        // Replay handler
        setTimeout(() => {
            const btn = document.getElementById('replay-btn');
            if (btn) btn.addEventListener('click', () => {
                if (confirm('Restart from the beginning? All progress will be lost.')) {
                    localStorage.removeItem('nxos_save');
                    location.reload();
                }
            });
        }, 100);
    }, 12000);
}

// ── ACT 4 SAVE/LOAD INTEGRATION ─────────────────────────
const _origBuildSave = buildSaveObject;
buildSaveObject = function() {
    const save = _origBuildSave();
    save.act4Active = act4State.active;
    save.act4Phase = act4State.phase;
    save.act4ChoiceMade = act4State.choiceMade;
    save.act4EndingPath = act4State.endingPath;
    save.act4MemoryBleed = act4State.memoryBleedLevel;
    save.act4PlayerName = act4State.playerName;
    save.act4SubjectsViewed = act4State.subjectsViewed;
    if (act4State.active) save.currentAct = 4;
    return save;
};

const _origRestore = restoreFromSave;
restoreFromSave = function(save) {
    _origRestore(save);
    if (save.act4Active || save.currentAct >= 4) {
        act4State.active = true;
        act4State.playerName = save.act4PlayerName || act3State?.playerName || 'Unknown';
        act4State.choiceMade = save.act4ChoiceMade || false;
        act4State.endingPath = save.act4EndingPath || null;
        act4State.memoryBleedLevel = save.act4MemoryBleed || 0;
        act4State.subjectsViewed = save.act4SubjectsViewed || {};
        // Re-inject act4 UI
        const home = document.getElementById('home-screen');
        home?.classList.remove('act2-home','act3-home');
        home?.classList.add('act4-home');
        if (!document.getElementById('archive-app-icon')) {
            const el = document.createElement('div'); el.className='app-icon act4-breathe'; el.id='archive-app-icon';
            el.innerHTML='<div class="icon" style="background:linear-gradient(135deg,#1a0008,#330011,#0a0000);border:1px solid rgba(255,34,68,0.6);font-size:22px;display:flex;align-items:center;justify-content:center;">📂</div><span style="color:#ff2244;">ARCHIVE</span>';
            el.addEventListener('click', () => openArchiveApp());
            document.querySelector('.app-grid')?.appendChild(el);
        }
        if (!document.getElementById('maze-app-icon')) {
            const el = document.createElement('div'); el.className='app-icon act4-breathe'; el.id='maze-app-icon';
            el.innerHTML='<div class="icon" style="background:linear-gradient(135deg,#0a0000,#220008);border:1px solid rgba(255,34,68,0.4);font-size:22px;display:flex;align-items:center;justify-content:center;">🔮</div><span style="color:#ff2244;">MAZE</span>';
            el.addEventListener('click', () => openMazeApp());
            document.querySelector('.app-grid')?.appendChild(el);
        }
        document.querySelectorAll('.battery-level').forEach(b => { b.style.width='100%'; b.style.background='#b44fde'; });
        document.querySelectorAll('.batt-pct,.batt-num').forEach(b => { b.textContent='∞'; b.style.color='#b44fde'; });
        renderChatList();
    }
};
