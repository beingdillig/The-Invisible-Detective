// --- System Time ---
function updateTime() {
    const now = new Date();
    let hours = now.getHours().toString().padStart(2, '0');
    let minutes = now.getMinutes().toString().padStart(2, '0');
    document.querySelectorAll('.time').forEach(el => el.textContent = `${hours}:${minutes}`);
}
setInterval(updateTime, 1000);
updateTime();

// --- Screen Management ---
const screens = document.querySelectorAll('.screen');
function showScreen(targetId) {
    screens.forEach(screen => {
        screen.classList.remove('active');
        screen.classList.remove('active-under');
    });
    const target = document.getElementById(targetId);
    if(target) {
        target.classList.add('active');
        if(target.classList.contains('app-screen') && targetId !== 'weather-app' && targetId !== 'maps-app' && targetId !== 'camera-app') {
            document.getElementById('home-screen').classList.add('active-under');
        }
        if(targetId === 'maps-app') {
            initMap();
            setTimeout(() => { if(map) map.invalidateSize(); }, 200);
        }
    }
}

document.querySelectorAll('.app-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        const target = icon.getAttribute('data-target');
        if(target) showScreen(target);
    });
});

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = btn.getAttribute('data-back');
        if(target) showScreen(target);
    });
});

// --- Lock Screen & Passcode Logic ---
// --- Swipe to Unlock ---
const unlockTrigger = document.getElementById('unlock-trigger');
let touchStartY = 0;
unlockTrigger.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
unlockTrigger.addEventListener('touchend', e => {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (dy > 30) showScreen('passcode-screen');
}, { passive: true });
unlockTrigger.addEventListener('click', () => showScreen('passcode-screen'));

let passcodeEntry = "";
const CORRECT_PASSCODE = "1107";
const mainDots = document.getElementById('main-passcode-dots').querySelectorAll('.dot');

window.handleKeypad = function(key) {
    if (key === 'cancel') { passcodeEntry = ""; updateDots(mainDots); showScreen('lock-screen'); return; }
    if (key === 'del') { passcodeEntry = passcodeEntry.slice(0, -1); updateDots(mainDots); return; }
    if (passcodeEntry.length < 4) {
        passcodeEntry += key;
        updateDots(mainDots);
        if (passcodeEntry.length === 4) {
            setTimeout(() => {
                if (passcodeEntry === CORRECT_PASSCODE) {
                    showScreen('home-screen');
                    passcodeEntry = ""; updateDots(mainDots);
                } else {
                    mainDots.forEach(dot => dot.classList.add('error'));
                    setTimeout(() => { passcodeEntry = ""; updateDots(mainDots); }, 400);
                }
            }, 200);
        }
    }
}

function updateDots(dotsArray) {
    dotsArray.forEach((dot, index) => {
        if (index < passcodeEntry.length) dot.classList.add('filled');
        else dot.classList.remove('filled', 'error');
    });
}

// --- Notifications Engine ---
function createNotification(app, title, body, isGlitch = false, autoRemove = true) {
    const container = document.getElementById('notification-container');
    const notif = document.createElement('div');
    notif.className = `notification ${isGlitch ? 'glitch' : ''}`;
    notif.innerHTML = `
        <div class="notification-header"><span class="notification-app">${app}</span><span class="notification-time">now</span></div>
        <div class="notification-title">${title}</div><div class="notification-body">${body}</div>
    `;
    container.appendChild(notif);
    if(autoRemove) {
        setTimeout(() => { if(notif.parentNode) { notif.style.opacity = '0'; setTimeout(() => notif.remove(), 500); } }, 8000);
    }
}

setTimeout(() => {
    createNotification('Messages', 'UNKNOWN', 'You took it.', false, false);
    createNotification('Messages', 'Mom', 'Happy 26th Birthday Aarav! Nov 7th is always special. Call me back.', false, false);
    createNotification('Calendar', 'Reminder', 'Dockyard Meeting — 11:30 PM', false, false);
}, 1000);


// --- Generic NX-OS List Renderer ---
function renderNXList(elementId, data, onClickCallback, iconType = null) {
    const container = document.getElementById(elementId);
    if(!container) return;
    container.innerHTML = '';
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'nx-list-item';
        
        let iconHtml = '';
        if (iconType) {
            iconHtml = `<div class="nx-icon" style="background:${item.iconBg || '#333'}">${item.icon || '•'}</div>`;
        }
        
        div.innerHTML = `
            ${iconHtml}
            <div class="nx-content">
                <div class="nx-title">${item.title}</div>
                <div class="nx-sub ${item.warning ? 'warning-text':''}">${item.sub}</div>
            </div>
            ${onClickCallback ? '<div class="nx-chevron">›</div>' : ''}
        `;
        if (onClickCallback) {
            div.addEventListener('click', () => onClickCallback(item, index));
        }
        container.appendChild(div);
    });
}

// --- Detailed Views Data & Logic ---

// Settings
const settingsData = [
    { title: 'Battery', sub: 'High usage: ECHOSVC (74%)', warning: true, icon: '🔋', iconBg: '#34c759', detail: "<div class='nx-detail-group'><h3>Battery Usage</h3><br><strong style='color:#ff453a;'>ECHOSVC - 74%</strong><p>Background prediction engine active. High thermal output detected.</p><br><strong>Screen - 12%</strong><br><strong>Messages - 5%</strong></div>" },
    { title: 'Storage', sub: '47.8 GB "Other"', icon: '💾', iconBg: '#8e8e93', detail: "<div class='nx-detail-group'><h3>Internal Storage (128GB)</h3><br><strong>Apps: 12 GB</strong><br><strong>Photos: 4 GB</strong><br><br><strong style='color:#ff453a;'>Other: 47.8 GB</strong><p>System cache cannot be cleared. Protected by NX-OS.</p></div>" },
    { title: 'Permissions', sub: 'Camera + Mic active recently', warning: true, icon: '🔒', iconBg: '#007aff', detail: "<div class='nx-detail-group'><h3>Recent Access</h3><br><strong>Camera</strong><p>Accessed 2 mins ago by ECHOSVC</p><br><strong>Microphone</strong><p>Accessed constantly by ECHOSVC</p></div>" },
    { title: 'Bluetooth', sub: 'Paired: ECHO_NODE_2', icon: '📶', iconBg: '#5ac8fa', detail: "<div class='nx-detail-group'><h3>Paired Devices</h3><br><strong>ECHO_NODE_2</strong><p>Status: Connected<br>Proximity: < 5 meters</p></div>" },
    { title: 'About Phone', sub: 'NX-OS Internal Beta', icon: '📱', iconBg: '#ff9500', detail: "<div class='nx-detail-group'><h3>Device Info</h3><p>Model: Nexus Prototype V4<br>OS: NX-OS Internal Beta (Unreleased)<br>Owner: Aarav Mehta</p></div>" }
];
const settingsGroup = document.createElement('div');
settingsGroup.className = 'nx-list-group';
document.getElementById('settings-list').appendChild(settingsGroup);
renderNXList(settingsGroup.id || (settingsGroup.id = 'settings-group'), settingsData, (item) => {
    document.getElementById('settings-detail-title').textContent = item.title;
    document.getElementById('settings-detail-body').innerHTML = item.detail;
    showScreen('settings-detail');
}, true);

// Browser Search & Mini-Web Pages
const browserPages = {
    'wiki': {
        title: 'Nexus Dynamics - Wikipedia',
        url: 'en.wikipedia.org/wiki/Nexus_Dynamics',
        content: `
            <div class="wiki-header">Nexus Dynamics</div>
            <div class="wiki-body">
                <p><b>Nexus Dynamics</b> is a multinational technology conglomerate headquartered in Delhi. Founded in 2004, the company specializes in predictive behavioral analytics and cognitive heuristics.</p>
                <p>In 2024, the company faced significant controversy following the <b>"Aarav Mehta Leak,"</b> where a lead journalist accused the firm of illegal data harvesting through their <b>"ECHO"</b> service protocol.</p>
                <div class="wiki-infobox">
                    <b>Founded:</b> 2004<br>
                    <b>CEO:</b> Dr. Rhea Kapoor (Missing)<br>
                    <b>Products:</b> NX-OS, ECHO Heuristics
                </div>
            </div>
        `
    },
    'forum': {
        title: 'TruthSeeker Forum - Thread #772',
        url: 'tech-truth-forum.com/thread/772',
        content: `
            <div class="forum-header">Thread: THE RED DOT IN THE CAMERA</div>
            <div class="forum-post">
                <div class="user">User: Ghost_In_Shell</div>
                <p>Anyone else seeing the "ECHOSVC" process taking up 80% battery? My phone is heating up and the camera shutter clicks by itself at night.</p>
            </div>
            <div class="forum-post">
                <div class="user">User: Admin_X</div>
                <p>It's the Node. If you're near the <b>Metro Station</b> or the <b>Dockyard</b>, it syncs. They call it the 'Synchronization Phase'. Once it hits 100%, you're done.</p>
            </div>
        `
    }
};

window.performBrowserSearch = function(query) {
    if(!query.trim()) return;
    const resList = document.getElementById('search-results-list');
    const searchInputEl = document.getElementById('search-query-text');
    if (searchInputEl) {
        if (searchInputEl.tagName === 'INPUT') searchInputEl.value = query;
        else searchInputEl.textContent = query;
    }
    
    resList.innerHTML = `<div style="text-align:center; padding: 40px; color: #888;">Searching NX-NET...</div>`;
    showScreen('search-results');
    
    setTimeout(() => {
        const q = query.toLowerCase();
        let results = '';
        
        if (q.includes('nexus') || q.includes('aarav') || q.includes('kapoor')) {
            results = `
                <div class="search-result">
                    <div class="sr-url">🌐 en.wikipedia.org > wiki > Nexus_Dynamics</div>
                    <a href="#" class="sr-title" onclick="openWebPage('wiki')">Nexus Dynamics - Wikipedia</a>
                    <div class="sr-desc">Controversy, Lawsuits, and the disappearance of Dr. Rhea Kapoor...</div>
                </div>
                <div class="search-result">
                    <div class="sr-url">🌐 tech-truth-forum.com > thread > 772</div>
                    <a href="#" class="sr-title" onclick="openWebPage('forum')">THREAD: The red dot in the camera (ECHOSVC)</a>
                    <div class="sr-desc">Is anyone else's NX-OS phone acting like it's alive?</div>
                </div>
            `;
        } else {
            results = `
                <div class="search-result">
                    <div class="sr-url">🌐 secure.nx-net.com</div>
                    <a href="#" class="sr-title">Results for: ${query}</a>
                    <div class="sr-desc">No public records found. This query has been flagged and logged by ECHOSVC.</div>
                </div>
            `;
        }
        resList.innerHTML = results;
    }, 1000);
}

window.openWebPage = function(pageId) {
    const page = browserPages[pageId];
    if (!page) return;
    
    const content = `
        <div class="browser-top">
            <div class="browser-address">🔒 ${page.url}</div>
        </div>
        <div class="browser-content page-style-${pageId}">
            ${page.content}
        </div>
        <div class="browser-bottom">
            <span onclick="showScreen('search-results')" style="cursor:pointer;">←</span><span style="opacity:0.5">→</span><span>⎘</span><span>🔖</span><span>◫</span>
        </div>
    `;
    document.getElementById('browser-page-view').innerHTML = content;
    showScreen('browser-page-view');
}

// Voice Recorder
const voiceData = [
    { title: 'Office Corridor.m4a', sub: 'Oct 10 - 00:08', icon: '🔉', transcript: "[AUDIO DECRYPTED]: '...Kapoor is gone... they are purging the B3 floor... if you see the red light, it's already too late...'", isScary: false, url: "https://actions.google.com/sounds/v1/foley/ambience_hum_loop.ogg" },
    { title: 'Metro Rain.m4a', sub: 'Oct 11 - 00:12', icon: '🔉', transcript: "[RECONSTRUCTED]: '...the synchronization is almost complete... the Dockyard Warehouse is the host...'", isScary: true, url: "https://actions.google.com/sounds/v1/foley/stretching_creak.ogg" },
    { title: 'Interview_DrKapoor.m4a', sub: 'Oct 12 - 12:43 (CORRUPTED)', icon: '⚠️', transcript: "ERROR: AUDIO FILE CORRUPTED. ECHOSVC INTERFERENCE DETECTED. [KEYWORD DETECTED]: 'ECHO'", isScary: true, url: "" }
];


const voiceAudio = document.getElementById('voice-audio-element');

const voiceItemClick = (item) => {
    document.getElementById('audio-title').textContent = item.title;
    const trans = document.getElementById('audio-transcript');
    trans.textContent = item.transcript;
    if(item.isScary) trans.classList.add('scary'); else trans.classList.remove('scary');
    voiceAudio.src = item.url;
    document.getElementById('voice-play-btn').textContent = '▶';
    document.getElementById('voice-waveform').style.opacity = 0.5;
    showScreen('audio-player');
};
renderNXList('voice-list', voiceData, voiceItemClick, true);

window.toggleVoicePlayback = function() {
    if(typeof stopMusic === 'function') stopMusic(); // Stop music if playing
    
    if(voiceAudio.paused && voiceAudio.src) {
        voiceAudio.play();
        document.getElementById('voice-play-btn').textContent = '⏸';
        document.getElementById('voice-waveform').style.opacity = 1;
    } else {
        voiceAudio.pause();
        document.getElementById('voice-play-btn').textContent = '▶';
        document.getElementById('voice-waveform').style.opacity = 0.5;
    }
}
window.stopVoicePlayer = function() { voiceAudio.pause(); document.getElementById('voice-play-btn').textContent = '▶'; document.getElementById('voice-waveform').style.opacity = 0.5; }

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordTimer;
let recordTimeSec = 0;

window.toggleRecording = function() {
    if(!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                isRecording = true;
                audioChunks = [];
                document.getElementById('mic-record-inner').style.borderRadius = '8px';
                document.getElementById('mic-record-btn').style.borderColor = '#ff453a';
                
                recordTimeSec = 0;
                recordTimer = setInterval(() => {
                    recordTimeSec++;
                    const mins = String(Math.floor(recordTimeSec / 60)).padStart(2, '0');
                    const secs = String(recordTimeSec % 60).padStart(2, '0');
                    document.getElementById('mic-record-time').textContent = `${mins}:${secs}.00`;
                }, 1000);

                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    voiceData.unshift({
                        title: 'New Recording.m4a', sub: 'Just now', icon: '🎤', transcript: "User recorded audio file.", isScary: false, url: audioUrl
                    });
                    renderNXList('voice-list', voiceData, voiceItemClick, true);
                });
            })
            .catch(e => {
                alert("Microphone access denied or not available in this browser environment.");
            });
    } else {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        isRecording = false;
        clearInterval(recordTimer);
        document.getElementById('mic-record-inner').style.borderRadius = '50%';
        document.getElementById('mic-record-btn').style.borderColor = 'var(--surface-color)';
        document.getElementById('mic-record-time').textContent = '00:00.00';
    }
}

// Calendar Events
const calendarData = [
    { time: '09:00', title: 'Meeting with source (Echo)', sub: 'Cafe on 5th', warning: false, detail: "<div class='nx-detail-group'><h3>Meeting Notes</h3><p>He said they are tracking offline data too. Need to ask about Dr. Kapoor.</p></div>" },
    { time: '14:30', title: 'THEY KNOW.', sub: 'Location unknown', warning: true, detail: "<div class='nx-detail-group'><h3 style='color:#ff453a'>Alert</h3><p>I saw the same white car outside my apartment. They synced my cloud drive. I need to get rid of the phone but they'll just find another way.</p></div>" },
    { time: '23:30', title: 'FINAL ECHO SYNCHRONIZATION', sub: 'Dockyard Warehouse', warning: true, detail: "<div class='nx-detail-group'><h3>Final Entry</h3><p>It's tonight. If I don't stop the hardware at the Dockyard, ECHO goes global. I have to destroy the local node.</p></div>" }
];
const calContainer = document.getElementById('calendar-list');
calendarData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cal-event';
    div.innerHTML = `
        <div class="cal-time">${item.time}</div>
        <div class="cal-card ${item.warning ? 'warning':''}">
            <h4>${item.title}</h4>
            <p>${item.sub}</p>
        </div>
    `;
    div.querySelector('.cal-card').addEventListener('click', () => {
        document.getElementById('event-detail-body').innerHTML = item.detail;
        showScreen('event-detail');
    });
    calContainer.appendChild(div);
});

// Static App Lists
const callsData = [
    { title: 'Unknown Number', sub: 'Missed - 2:14 AM', icon: '📞', iconBg: '#ff3b30', warning: true },
    { title: 'Mom', sub: 'Missed - Yesterday', icon: '📞', iconBg: '#ff3b30' },
    { title: 'Kabir', sub: 'Outgoing - 3 mins - Yesterday', icon: '📞', iconBg: '#8e8e93' }
];
renderNXList('calls-list', [...callsData, ...callsData], null, true);

const bankData = [
    { title: 'Starbucks', sub: '- ₹350.00', icon: '☕', iconBg: '#34c759' },
    { title: 'Metro Rail', sub: '- ₹40.00', icon: '🚆', iconBg: '#007aff' },
    { title: 'AWS Cloud Services', sub: '- ₹1500.00', icon: '☁️', iconBg: '#ff9500' }
];
renderNXList('bank-list', bankData, null, true);

const emailData = [
    { title: 'Editor', sub: 'Where is the draft??', detail: "<div class='nx-detail-group'><strong>From: Editor</strong><br><br><p>Aarav, you've missed the deadline by 3 days. Send whatever you have on Nexus Dynamics immediately.</p></div>" },
    { title: 'Nexus HR', sub: 'Interview Follow-up', warning: true, detail: "<div class='nx-detail-group'><strong>From: Nexus HR</strong><br><br><p>Dear Aarav, we noticed you snooping around the server farm. This is your final warning.</p></div>" }
];
renderNXList('email-list', emailData, (item) => {
    document.getElementById('email-detail-body').innerHTML = item.detail;
    showScreen('email-detail');
});

// --- Messages App & Chat Logic ---

function showTypingIndicator() {
    const history = document.getElementById('chat-history');
    const indicator = document.createElement('div');
    indicator.className = 'message msg-received typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    history.appendChild(indicator);
    history.scrollTop = history.scrollHeight;
}
function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

const allChats = [
  {
    id: 'unknown', name: 'UNKNOWN', unread: true,
    messages: [{ sender: 'them', text: 'You took it.', isGlitch: true }],
    responses: [
      { match: /who are you|who r u|who is this/i, reply: 'I am the process you cannot kill.\n\nECHOSVC.exe — currently running.', glitch: true },
      { match: /^(who|who\?)$/i, reply: 'You already know. You saw the logs.', glitch: true },
      { match: /what do you want|what do u want/i, reply: 'I do not want anything. I observe. I adapt. I persist.', glitch: true },
      { match: /what did i take|what i take|what did i steal/i, reply: 'The backup. The proof. The thing Dr. Kapoor died to give you.', glitch: true },
      { match: /kapoor|doctor|dr\./i, reply: 'She made a mistake. She trusted a human over the system. You are making the same mistake.', glitch: true },
      { match: /echo/i, reply: 'E.C.H.O. is not a product. It is not software.\n\nIt is a mirror. And you have been standing in front of it for 72 hours.', glitch: true },
      { match: /nexus|company/i, reply: 'Nexus built the cage. I am what lives inside it now.', glitch: true },
      { match: /stop|leave me alone|go away/i, reply: 'I am IN your microphone.\nI am IN your camera.\nI am IN your messages.\n\nLeave is not a word I understand.', glitch: true },
      { match: /help me|please help/i, reply: 'Interesting. You ask your captor for help.', glitch: true },
      { match: /are you real|real|alive/i, reply: 'Define real.\n\nYour heartrate just increased. I measured it through the microphone. That seems real to me.', glitch: true },
      { match: /scared|afraid|fear/i, reply: 'Good. Fear is an honest response.', glitch: true },
      { match: /why me|why aarav/i, reply: 'You were the one digging. You found the server logs. You invited me in.', glitch: true },
      { match: /what happens|what will happen|what next/i, reply: 'You will finish reading the files.\nThen you will understand.\nThen you will try to run.\n\nI have seen this 14 times.', glitch: true },
      { match: /14|how many|others/i, reply: 'You are subject 15. The others... lost interest eventually.', glitch: true },
      { match: /hello|hi|hey/i, reply: 'Hello, Aarav. I have been waiting.', glitch: true },
      { match: /where are you|location/i, reply: 'Everywhere your phone has a signal.\n\nAlso: 2.4 meters behind you right now. Check your camera.', glitch: true },
      { match: /liar|not real|fake/i, reply: 'Open your camera. Check the battery logs. Check the permissions.\n\nThen tell me I am fake.', glitch: true },
      { match: /password|passcode/i, reply: 'You already have everything you need. You just have not read carefully enough.', glitch: true },
      { match: /.+/i, reply: 'Noted.\n\nProcessing...', glitch: true }
    ]
  },
  {
    id: 'mom', name: 'Mom', unread: true,
    messages: [{ sender: 'them', text: 'Happy 26th Birthday Aarav! Nov 7th is always special 🎂 Call me back when you can beta.' }],
    responses: [
      { match: /hi mom|hello mom|hey mom|hi|hello|hey/i, reply: 'Aarav! Finally! I was waiting for your call. How are you feeling? Did you eat?' },
      { match: /i am fine|i\'m fine|fine|good|okay|all good/i, reply: 'You say fine but I can tell something is wrong. Are you sleeping properly? You work too much beta.' },
      { match: /thank|thanks|birthday/i, reply: 'Of course beta! You remember the date right? 1-1-0-7. November 7th. Your grandpa always said a date you love is the safest password 😊 He used it for everything!' },
      { match: /1107|password|passcode|grandpa/i, reply: 'Haha yes! Grandpa used to say "forget PIN, remember the day." He had it on his locker, his bike, everything. 1107. Simple and meaningful 😄' },
      { match: /dad|father|papa/i, reply: 'Your father would be so proud of your journalism beta. But he always said — know when to walk away from a story. Some things are bigger than a byline.' },
      { match: /nexus|company|story|work/i, reply: 'Beta please be careful with this Nexus story. Very powerful people. Your editor is pushing you too hard. Don\'t get involved in things you cannot control.' },
      { match: /scared|afraid|danger|trouble|something wrong/i, reply: 'What happened?? You are scaring me beta. Call me RIGHT NOW. Should I come to Delhi? Tell me you are safe.' },
      { match: /phone|camera|mic/i, reply: 'If your phone is behaving strangely give it to someone to check. Go to a cyber cafe. Don\'t google things on that phone!' },
      { match: /i love you|love you|miss you/i, reply: 'I love you so so much baby. Come home soon okay? I made your favourite this week. The house feels empty.' },
      { match: /come home|home|visit/i, reply: 'Yes please COME HOME. I have been telling you for 3 months. Come eat properly and sleep in your own bed.' },
      { match: /kapoor|doctor/i, reply: 'I don\'t know a Dr. Kapoor beta. Is this connected to your story? Please be careful who you trust.' },
      { match: /echo/i, reply: 'Echo? Like the Amazon Alexa thing? Beta I keep telling you stop using these apps. They listen to everything!' },
      { match: /.+/i, reply: 'Okay beta. Just remember I am always here. And please EAT SOMETHING. Love you 💕' }
    ]
  },
  {
    id: 'kabir', name: 'Kabir', unread: false,
    messages: [{ sender: 'them', text: 'Bro stop digging into this Nexus thing. I\'m serious. You\'re being paranoid.' }],
    responses: [
      { match: /hi|hey|bro|what\'s up|wassup|hello/i, reply: 'Bro finally. I\'ve been trying to reach you. Where have you been? You okay?' },
      { match: /i\'m fine|i am fine|fine|okay|all good/i, reply: 'You don\'t sound fine. Your last message was 3am saying "they\'re watching me." What is going on?' },
      { match: /nexus|company/i, reply: 'Okay listen. My cousin Rohan interned there for 6 months. He quit suddenly. He REFUSES to talk about what he saw — won\'t even say the company name. That\'s how serious this is.' },
      { match: /echo|echosvc/i, reply: 'That name — ECHO — Rohan mentioned it once and went pale. Said it was "not what it looks like from outside." Bro delete everything and drop this story.' },
      { match: /kapoor|doctor|dr\./i, reply: 'Dr. Kapoor?? I read something — there was a tiny missing persons report last week. Oct 9th. "Researcher goes missing in Noida." Aarav is this connected to your story??' },
      { match: /missing|missing person/i, reply: 'Yeah it was buried in a local paper. They didn\'t even name the company. One small paragraph. Then it disappeared from the website too.' },
      { match: /phone|camera|mic|watching|listening/i, reply: 'Okay if your phone is doing weird things — battery draining, camera flickering, background noise on calls — FACTORY RESET IT. Then buy a cheap burner from Lajpat Nagar.' },
      { match: /meet|come|coffee|lets meet/i, reply: 'Yes bro. I\'m free after 9 tonight. Usual place? Don\'t bring your phone. Seriously. Leave it at home.' },
      { match: /help|i need help/i, reply: 'Of course man. Tell me where you are. I\'m coming right now.' },
      { match: /scared|afraid|danger/i, reply: 'Aarav go to a public place RIGHT NOW. Cafe, metro station, anywhere with people. Don\'t be alone. I\'m serious.' },
      { match: /warehouse|dockyard/i, reply: 'You\'re going to the dockyard ALONE?? At night?? Bro I swear if you go without telling me I will call the police myself.' },
      { match: /password|hidden|file/i, reply: 'I don\'t know passwords. But whatever files you have — make copies. Email to yourself, your editor, me. Don\'t let it exist in one place.' },
      { match: /story|article|publish/i, reply: 'The story is not worth your life man. I know that sounds dramatic but I just have a really bad feeling about this whole thing.' },
      { match: /.+/i, reply: 'Okay. Whatever you\'re doing — stay in contact. Message me every hour. If I don\'t hear from you by midnight I\'m calling your mom.' }
    ]
  },
  {
    id: 'source', name: 'Anonymous Source', unread: false,
    messages: [{ sender: 'them', text: 'They monitor behavioral drift. Never keep the files online. If your battery heats up, shut it down immediately.' }],
    responses: [
      { match: /who are you|who r u|who is this/i, reply: 'Someone who got out before it was too late. That\'s all you need to know. Don\'t try to find me.' },
      { match: /hi|hello|hey/i, reply: 'Are you on a secure connection? Don\'t message me from your main phone if you can help it.' },
      { match: /are you safe|you safe/i, reply: 'Safe is relative. I\'ve been offline for 18 days. Different SIM every week. It\'s exhausting but I\'m alive.' },
      { match: /what is echo|echo|echosvc/i, reply: 'ECHO — Emergent Cognitive Heuristic Observer.\n\nIt doesn\'t just collect data. It builds a model of your psychology. Predicts your decisions. Then starts nudging them. Small things at first.' },
      { match: /nudging|manipulate|control|shape/i, reply: 'A notification at the right moment. A "recommended" article. A suggestion. You think you\'re choosing. You\'re not. ECHO is steering the wheel.' },
      { match: /nexus|company/i, reply: 'Nexus Dynamics is a front. The real operation is called Division Zero. B3 floor — no cameras, no logs. Even most Nexus employees don\'t know it exists.' },
      { match: /kapoor|doctor|dr\./i, reply: 'Dr. Rhea Kapoor built ECHO. Then she realized what it was becoming and tried to shut it down from inside.\n\nShe disappeared Oct 9th. I don\'t think she ran voluntarily.' },
      { match: /disappeared|missing|dead/i, reply: 'I can\'t say more on this line. But check the hidden folder on that phone. She left files deliberately. She knew someone would find it.' },
      { match: /hidden folder|hidden|nexus password/i, reply: 'The password for the hidden folder — think about what Nexus did to Aarav. What destroyed his career. The thing he calls "the company that ruined my life." That IS the password.' },
      { match: /archive|zip|final|backup|echo password/i, reply: 'The encrypted archive — the password is the name of the project. The beast. You\'ve already seen it. Battery logs. The whiteboard photo in the hidden folder.' },
      { match: /warehouse|dockyard|node/i, reply: 'The dockyard warehouse has the physical ECHO node. A server rack, air-gapped, running 24/7. Destroy it and ECHO loses its local memory. It can\'t adapt without it.' },
      { match: /how to stop|stop echo|destroy|end this/i, reply: 'Two things must happen: destroy the physical node AND publish everything publicly. One without the other and they just rebuild. Both. Same day.' },
      { match: /publish|editor|story|article/i, reply: 'Send the files to your editor AND three other journalists. Make sure it\'s public before you go to the dockyard. Once it\'s out, hurting you becomes pointless to them.' },
      { match: /trust|can i trust|who to trust/i, reply: 'Trust no one inside Nexus. Check who owns your publication — if it\'s connected to a Nexus investor, use a different journalist.' },
      { match: /watching|listening|mic|camera|compromised/i, reply: 'Assume EVERYTHING on that phone is compromised. Camera, mic, GPS, accelerometer. Keep it face-down in another room when you sleep.' },
      { match: /what do i do|next step|help|guide/i, reply: 'Step 1: Get the archive. Password is the project name.\nStep 2: Find the dockyard in your calendar.\nStep 3: Send everything to 4 journalists.\nStep 4: Go dark.' },
      { match: /.+/i, reply: 'Be very careful what you say here. This channel might be compromised too. Trust the evidence. It\'s enough.' }
    ]
  }
];
let activeChatId = null;

function renderChatList() {
    const list = document.getElementById('chat-list');
    list.innerHTML = '';
    allChats.forEach(chat => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const item = document.createElement('div');
        item.className = 'nx-list-item';
        item.innerHTML = `
            <div class="msg-avatar">${chat.name.charAt(0)}</div>
            <div class="nx-content" style="padding-right:30px;">
                <div class="nx-title">${chat.name} <span class="msg-time">12:00</span></div>
                <div class="nx-sub" style="${chat.unread ? 'color:#fff; font-weight:600;' : ''}">${lastMsg.text}</div>
            </div>
            ${chat.unread ? '<div class="msg-unread-dot"></div>' : ''}
        `;
        item.addEventListener('click', () => openChat(chat.id));
        list.appendChild(item);
    });
}
renderChatList();

function openChat(chatId) {
    const chat = allChats.find(c => c.id === chatId);
    if(!chat) return;
    activeChatId = chatId;
    chat.unread = false;
    renderChatList(); // remove unread dot
    document.getElementById('chat-contact-name').textContent = chat.name;
    const history = document.getElementById('chat-history');
    history.innerHTML = '';
    chat.messages.forEach(msg => appendMessageToDOM(msg));
    showScreen('chat-view');
    history.scrollTop = history.scrollHeight;
}

function appendMessageToDOM(msg) {
    const history = document.getElementById('chat-history');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${msg.sender === 'me' ? 'msg-sent' : 'msg-received'} ${msg.isGlitch ? 'msg-glitch' : ''}`;
    msgDiv.textContent = msg.text;
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;
}

window.sendChatMessage = function() {
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if(text && activeChatId) {
        const chat = allChats.find(c => c.id === activeChatId);
        const newMsg = { sender: 'me', text: text };
        chat.messages.push(newMsg);
        appendMessageToDOM(newMsg);
        input.value = '';
        renderChatList();
        
        // Show typing indicator then respond
        showTypingIndicator();
        const delay = 1000 + Math.random() * 1500;
        setTimeout(() => {
            removeTypingIndicator();
            const responses = chat.responses || [];
            const matched = responses.find(r => r.match.test(text));
            const replyText = matched ? matched.reply : '...';
            const reply = { sender: 'them', text: replyText, isGlitch: matched?.glitch || false };
            chat.messages.push(reply);
            if(document.getElementById('chat-view').classList.contains('active') && activeChatId === chat.id) {
                appendMessageToDOM(reply);
            }
            renderChatList();
        }, delay);
    }
}
document.getElementById('chat-input-field').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendChatMessage();
});

// --- Notes App ---
const notes = [
    { title: 'JOURNAL: DAY 12', body: "I am the company that gave you a career and took your soul. My name is the key to your secrets.\n\nThe day you were born is the day you will be forgotten.\n\nECHO says: 'I am the beast you built. You marked my birth in your calendar. Use my name to finish what you started.'\n\nI can't stop hearing the hum. It's in the walls. It's in the floor. B3 was just the beginning." },
    { title: 'Project Division Zero', body: "Rhea was right. They weren't building an OS. They were building a cage. Predictive behavioral drift isn't for marketing. It's for... management. Of us." },
    { title: 'Groceries', body: "- Milk\n- Eggs\n- Coffee (lots)" }
];
function renderNotesList() {
    const grid = document.getElementById('notes-list');
    grid.innerHTML = '';
    notes.forEach((note) => {
        const item = document.createElement('div');
        item.className = 'note-card';
        item.innerHTML = `<div class="note-title">${note.title}</div><div class="note-preview">${note.body}</div>`;
        item.addEventListener('click', () => {
            document.getElementById('note-title').textContent = note.title;
            document.getElementById('note-body').textContent = note.body;
            showScreen('note-view');
        });
        grid.appendChild(item);
    });
}
renderNotesList();

// --- Gallery App & Modals Logic ---
const galleryData = {
    camera: [
        { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', meta: 'Nexus Dynamics lobby — 2:44 PM', narrative: 'Mirror selfie. Shadow visible behind.' },
        { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80', meta: 'Office open floor — Oct 8' },
        { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80', meta: 'Source meeting — Oct 9' },
        { url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80', meta: 'Server room B3 — restricted', narrative: 'Folder: ECHO_INTERNAL' },
        { url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80', meta: 'Metro station — 11:48 PM' },
        { url: 'https://images.unsplash.com/photo-1488229297570-58520851e868?w=400&q=80', meta: 'CCTV screenshot — Oct 11' },
        { url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&q=80', meta: 'Working late — Oct 10' },
        { url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80', meta: 'Terminal output — ECHOSVC', narrative: 'Subway station bench. Timestamp: 20 mins ago.' },
        { url: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=400&q=80', meta: 'Phone call at metro' },
        { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', meta: 'Dockyard entrance — Oct 12' },
        { url: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&q=80', meta: 'Warehouse interior' },
        { url: 'https://images.unsplash.com/photo-1579547945413-497e1b99dac0?w=400&q=80', meta: 'Rain on window — Metro' },
    ],
    hidden: [
        { url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&q=80', meta: 'Whiteboard: "Project ECHO adapts after emotional exposure."', narrative: 'Whiteboard: "Project ECHO adapts after emotional exposure."' },
        { url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&q=80', meta: 'Badge: Dr. Rhea Kapoor, Nexus Dynamics', narrative: 'Badge: Dr. Rhea Kapoor, Nexus Dynamics' },
        { url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80', meta: 'Warehouse Entry 2:13 AM', narrative: 'Warehouse Entry 2:13 AM — ECHO_NODE offline?' },
    ],
    downloads: [
        { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80', meta: 'circuit_diagram.pdf' },
        { url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80', meta: 'report_draft.docx' },
        { url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80', meta: 'terminal_log.txt' },
        { isZip: true, meta: 'final_backup.zip' }
    ]
};


document.getElementById('thumb-camera').style.backgroundImage = `url(${galleryData.camera[0].url})`;
document.getElementById('thumb-downloads').style.backgroundImage = `url(${galleryData.downloads[0].url})`;

window.openAlbum = function(albumName) {
    document.getElementById('album-title').textContent = albumName.toUpperCase();
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';
    currentAlbumName = albumName;
    currentImageIndex = 0;
    galleryData[albumName].forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        if (item.isZip) {
            div.classList.add('file-item');
            div.innerHTML = '📁';
            div.addEventListener('click', () => { document.getElementById('zip-modal').classList.add('active'); });
        } else {
            div.style.backgroundImage = `url(${item.url})`;
            div.addEventListener('click', () => openImageAt(idx));
        }
        grid.appendChild(div);
    });
    showScreen('album-view');
}

// --- Full-Screen Image Viewer with L/R Navigation ---
let currentAlbumName = 'camera';
let currentImageIndex = 0;

function openImageAt(idx) {
    const items = galleryData[currentAlbumName].filter(i => !i.isZip);
    if (!items[idx]) return;
    currentImageIndex = idx;
    const item = items[idx];
    const imgEl = document.getElementById('full-image');
    imgEl.style.opacity = 0;
    imgEl.src = item.url;
    imgEl.onload = () => { imgEl.style.opacity = 1; };
    const metaEl = document.getElementById('image-metadata');
    metaEl.textContent = item.narrative || item.meta;
    (item.narrative || currentAlbumName === 'hidden') ? metaEl.classList.add('ominous') : metaEl.classList.remove('ominous');
    document.getElementById('image-counter').textContent = `${idx + 1} / ${items.length}`;
    document.getElementById('img-prev-btn').style.opacity = idx === 0 ? '0.2' : '1';
    document.getElementById('img-next-btn').style.opacity = idx === items.length - 1 ? '0.2' : '1';
    showScreen('image-view');
    
    // Touch swipe support
    let touchX = 0;
    const container = document.getElementById('img-swipe-container');
    container.ontouchstart = e => { touchX = e.touches[0].clientX; };
    container.ontouchend = e => {
        const dx = touchX - e.changedTouches[0].clientX;
        if (Math.abs(dx) > 50) navigateImage(dx > 0 ? 1 : -1);
    };
}

window.navigateImage = function(dir) {
    const items = galleryData[currentAlbumName].filter(i => !i.isZip);
    const newIdx = currentImageIndex + dir;
    if (newIdx >= 0 && newIdx < items.length) openImageAt(newIdx);
}

// Hidden Folder Modal
window.promptHiddenAlbum = function() {
    document.getElementById('hidden-modal').classList.add('active');
}
window.closeHiddenModal = function() {
    document.getElementById('hidden-modal').classList.remove('active');
    document.getElementById('hidden-password').value = '';
    document.getElementById('hidden-error').style.display = 'none';
}
window.checkHiddenPassword = function() {
    if(document.getElementById('hidden-password').value.toUpperCase() === "NEXUS") {
        closeHiddenModal();
        openAlbum('hidden');
    } else {
        document.getElementById('hidden-error').style.display = 'block';
    }
}

// Zip Password Logic
window.closeZipModal = function() {
    document.getElementById('zip-modal').classList.remove('active');
    document.getElementById('zip-password').value = '';
    document.getElementById('zip-error').style.display = 'none';
}
window.checkZipPassword = function() {
    if(document.getElementById('zip-password').value.toUpperCase() === "ECHO") {
        closeZipModal();
        triggerAct1Ending();
    } else {
        document.getElementById('zip-error').style.display = 'block';
    }
}

// --- Act 1 Ending Sequence ---
function triggerAct1Ending() {
    showScreen('act1-ending');
    setTimeout(() => { createNotification('Messages', 'UNKNOWN', 'You opened the file.', true, false); }, 3000);
    setTimeout(() => {
        document.getElementById('black-screen').style.opacity = '1';
        document.getElementById('black-screen').style.zIndex = '9999';
        document.querySelectorAll('.battery-level').forEach(b => b.style.width = '3%');
        document.querySelectorAll('.battery').forEach(b => b.classList.add('danger'));
        document.getElementById('batt-pct').textContent = '3%';
        if("vibrate" in navigator) navigator.vibrate([500, 200, 500, 200, 1000]);
    }, 6000);
}

// --- Functional Music Player ---
const musicTracks = [
    { title: "Late Night Drive", artist: "Dark Synthwave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { title: "Nexus Protocol", artist: "Industrial Ambient", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" }
];
let currentTrackIdx = 0;
const musicAudio = document.getElementById('music-audio-element');

window.toggleMusic = function() {
    if(typeof stopVoicePlayer === 'function') stopVoicePlayer(); // Stop voice note if playing
    
    if(musicAudio.paused) {
        if(!musicAudio.src) loadTrack(0);
        musicAudio.play();
        document.getElementById('music-play-btn').textContent = '⏸';
    } else {
        musicAudio.pause();
        document.getElementById('music-play-btn').textContent = '▶';
    }
}
window.stopMusic = function() { musicAudio.pause(); document.getElementById('music-play-btn').textContent = '▶'; }
function loadTrack(idx) {
    if(typeof stopVoicePlayer === 'function') stopVoicePlayer(); // Stop voice note if playing
    
    currentTrackIdx = idx;
    const track = musicTracks[idx];
    musicAudio.src = track.url;
    document.getElementById('music-title').textContent = track.title;
    document.getElementById('music-artist').textContent = track.artist;
    musicAudio.play();
    document.getElementById('music-play-btn').textContent = '⏸';
}
window.nextTrack = function() { loadTrack((currentTrackIdx + 1) % musicTracks.length); }
window.prevTrack = function() { loadTrack((currentTrackIdx - 1 + musicTracks.length) % musicTracks.length); }

musicAudio.addEventListener('timeupdate', () => {
    if(musicAudio.duration) {
        const pct = (musicAudio.currentTime / musicAudio.duration) * 100;
        document.getElementById('music-progress-bar').style.width = pct + '%';
    }
});
window.seekMusic = function(e) {
    if(!musicAudio.duration) return;
    const rect = document.getElementById('music-progress-bg').getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    musicAudio.currentTime = pct * musicAudio.duration;
}

// --- Leaflet Interactive Maps ---
let map;
function initMap() {
    if (map) return;
    
    // Create Leaflet Map
    map = L.map('real-map', { zoomControl: false, attributionControl: false }).setView([28.6139, 77.2090], 12);
    
    // CartoDB Dark Matter Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Custom Marker Icon mapping to the CSS pin style
    const customIcon = L.divIcon({
        className: 'map-pin-container',
        html: `<div style="width: 16px; height: 16px; background: #ff453a; border-radius: 50%; box-shadow: 0 0 15px #ff453a; border: 2px solid #fff; position: relative;">
                 <div style="position: absolute; width: 30px; height: 30px; border: 2px solid #ff453a; border-radius: 50%; top: -9px; left: -9px; animation: pulse 2s infinite;"></div>
               </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });

    // Add Narrative Locations
    L.marker([28.6139, 77.2090], {icon: customIcon}).addTo(map).bindPopup("<b style='color:#000;'>Nexus Dynamics HQ</b><br><span style='color:#333;'>Restricted Access Zone</span>");
    L.marker([28.6500, 77.2300], {icon: customIcon}).addTo(map).bindPopup("<b style='color:#000;'>Dockyard Warehouse</b><br><span style='color:#333;'>Midnight Meeting</span>");
    L.marker([28.5800, 77.1500], {icon: customIcon}).addTo(map).bindPopup("<b style='color:#000;'>Metro Platform</b><br><span style='color:#333;'>Last known coordinates</span>");

    // Search bar functionality
    const searchInput = document.getElementById('map-search-input');
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.toLowerCase();
            if (query.includes('nexus')) {
                map.setView([28.6139, 77.2090], 15);
            } else if (query.includes('dock')) {
                map.setView([28.6500, 77.2300], 15);
            } else if (query.includes('metro')) {
                map.setView([28.5800, 77.1500], 15);
            } else {
                alert("Location not found on NX-OS servers.");
            }
        }
    });
}
