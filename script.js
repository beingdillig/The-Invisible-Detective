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
document.getElementById('unlock-trigger').addEventListener('click', () => { showScreen('passcode-screen'); });

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

// Browser Search Results
const browserGroup = document.createElement('div');
browserGroup.className = 'nx-list-group';
document.getElementById('browser-list').appendChild(browserGroup);

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
        resList.innerHTML = `
            <div class="search-result"><div class="sr-url">🌐 secure.nx-net.com</div><a href="#" class="sr-title">Results for: ${query}</a><div class="sr-desc">No public records found. This query has been flagged and logged by ECHOSVC.</div></div>
            <div class="search-result"><div class="sr-url">🌐 archive.org</div><a href="#" class="sr-title">Behavioral Models in AI</a><div class="sr-desc">Article removed due to copyright claim by Nexus Dynamics.</div></div>
        `;
    }, 1000);
}

// Voice Recorder
const voiceData = [
    { title: 'Office Corridor.m4a', sub: 'Oct 10 - 00:08', icon: '🔉', transcript: "[Footsteps echoing]\n[Door opens]\nUnknown Woman: 'What are you doing here? Delete that. Now.'", isScary: false, url: "https://actions.google.com/sounds/v1/foley/footsteps_on_wood_floor.ogg" },
    { title: 'Metro Rain.m4a', sub: 'Oct 11 - 00:12', icon: '🔉', transcript: "[Heavy rain sound]\n[Deep mechanical humming]\nWhisper: '...he knows... he's looking right at us...'", isScary: true, url: "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg" },
    { title: 'Interview_DrKapoor.m4a', sub: 'Oct 12 - 12:43 (CORRUPTED)', icon: '⚠️', transcript: "ERROR: AUDIO FILE CORRUPTED. ECHOSVC INTERFERENCE DETECTED.", isScary: true, url: "" }
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
    { time: '23:30', title: 'END IT.', sub: 'Metro Platform', warning: true, detail: "<div class='nx-detail-group'><h3>Final Plan</h3><p>Go to the metro. Leave the phone. It needs a host. If I leave it, maybe it'll let me go.</p></div>" }
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
const allChats = [
    { id: 'unknown', name: 'UNKNOWN', unread: true, messages: [{ sender: 'them', text: 'You took it.', isGlitch: true }] },
    { id: 'mom', name: 'Mom', unread: true, messages: [{ sender: 'them', text: 'Happy 26th Birthday Aarav! Nov 7th is always special. Call me back.' }] },
    { id: 'kabir', name: 'Kabir', unread: false, messages: [{ sender: 'them', text: 'Bro stop digging into this. You are being paranoid.' }] },
    { id: 'source', name: 'Anonymous Source', unread: false, messages: [{ sender: 'them', text: 'They monitor behavioral drift. Never keep the files online. If your battery heats up, shut it down.' }] }
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
        renderChatList(); // update preview
        
        // Setup for LLM hook
        if (activeChatId === 'unknown') {
            setTimeout(() => {
                const reply = { sender: 'them', text: `I am reading everything you type.`, isGlitch: true };
                chat.messages.push(reply);
                if(document.getElementById('chat-view').classList.contains('active') && activeChatId === 'unknown') {
                    appendMessageToDOM(reply);
                }
                renderChatList();
            }, 2000);
        }
    }
}
document.getElementById('chat-input-field').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendChatMessage();
});

// --- Notes App ---
const notes = [
    { title: 'If something happens to me', body: 'I am not crazy. The predictive models aren\'t just for ads. They are mapping psychological profiles in real-time.\n\nECHO knows before you do.\nIt learns from obser—' },
    { title: 'Passcodes', body: 'Locker: 4421\nLaptop: aM_89!x\nHidden Files: The company that ruined my life.\nArchive: The name of the beast.' },
    { title: 'Groceries', body: '- Milk\n- Eggs\n- Coffee (lots)' }
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
    camera: Array(56).fill(0).map((_, i) => ({ url: `https://picsum.photos/seed/${i}/200/200`, meta: 'IMG_' + i + '.jpg',
        narrative: i === 12 ? 'Mirror selfie. Shadow visible behind.' : i === 19 ? 'Folder: ECHO_INTERNAL' : i === 52 ? 'Subway station bench. Timestamp: 20 mins ago.' : null
    })),
    hidden: [
        { url: `https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=200&q=80`, meta: 'Whiteboard: "Project ECHO adapts after emotional exposure."' },
        { url: `https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200&q=80`, meta: 'Badge: Dr. Rhea Kapoor, Nexus Dynamics' },
        { url: `https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=200&q=80`, meta: 'Warehouse Entry 2:13 AM' }
    ],
    downloads: Array(19).fill(0).map((_, i) => ({ url: `https://picsum.photos/seed/dl${i}/200/200`, meta: 'Download' }))
};
galleryData.downloads.push({ isZip: true, meta: 'final_backup.zip' });

document.getElementById('thumb-camera').style.backgroundImage = `url(${galleryData.camera[0].url})`;
document.getElementById('thumb-downloads').style.backgroundImage = `url(${galleryData.downloads[0].url})`;

window.openAlbum = function(albumName) {
    document.getElementById('album-title').textContent = albumName.toUpperCase();
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';
    galleryData[albumName].forEach(item => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        if (item.isZip) {
            div.classList.add('file-item');
            div.innerHTML = '📁';
            div.addEventListener('click', () => { document.getElementById('zip-modal').classList.add('active'); });
        } else {
            div.style.backgroundImage = `url(${item.url})`;
            div.addEventListener('click', () => {
                document.getElementById('full-image').src = item.url;
                const metaEl = document.getElementById('image-metadata');
                metaEl.textContent = item.narrative ? item.narrative : item.meta;
                item.narrative || albumName === 'hidden' ? metaEl.classList.add('ominous') : metaEl.classList.remove('ominous');
                showScreen('image-view');
            });
        }
        grid.appendChild(div);
    });
    showScreen('album-view');
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
