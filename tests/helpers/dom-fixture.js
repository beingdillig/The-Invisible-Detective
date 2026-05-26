/**
 * Minimal DOM fixture — every element ID the game script accesses.
 * Called before eval-ing script.js so all getElementById calls succeed.
 */
function buildDOMFixture() {
  document.body.innerHTML = `
<div id="phone-container">
  <!-- Landing -->
  <div id="splash-screen" class="screen active"></div>
  <div id="title-screen" class="screen">
    <div id="ls-progress-fill"></div>
    <div id="ls-progress-pct"></div>
    <div id="ls-acts-row"></div>
    <div id="ls-phone-hint"></div>
    <div id="ls-ps-clock"></div>
    <div id="newgame-modal"></div>
  </div>

  <!-- Prelude -->
  <div id="prelude-screen" class="screen">
    <div id="prelude-text"></div>
    <div id="prelude-tap-hint"></div>
  </div>

  <!-- Lock / Passcode / Home -->
  <div id="lock-screen" class="screen">
    <div id="notification-container"></div>
    <div id="unlock-trigger"></div>
  </div>
  <div id="passcode-screen" class="screen">
    <div id="main-passcode-dots">
      <div class="dot"></div><div class="dot"></div>
      <div class="dot"></div><div class="dot"></div>
    </div>
  </div>
  <div id="home-screen" class="screen">
    <div class="app-grid"></div>
  </div>
  <div id="black-screen" class="screen"></div>

  <!-- Case File -->
  <div id="case-file-app" class="screen">
    <div id="cf-status-stamp"></div>
    <div id="cf-subject-status"></div>
    <div id="cf-progress-fill"></div>
    <div id="cf-progress-pct"></div>
    <div id="cf-acts-list"></div>
    <div id="cf-objective-text"></div>
  </div>

  <!-- Act triggers -->
  <div id="act2-unlock-trigger"></div>
  <div id="act3-unlock-trigger"></div>
  <div id="act4-unlock-trigger"></div>

  <!-- Modals -->
  <div id="zip-modal">
    <input id="zip-password" type="text" value="">
    <div id="zip-error" style="display:none"></div>
  </div>
  <div id="hidden-modal">
    <input id="hidden-password" type="text" value="">
    <div id="hidden-error" style="display:none"></div>
  </div>
  <div id="warehouse-modal">
    <input id="warehouse-code" type="text" value="">
    <div id="warehouse-error" style="display:none"></div>
  </div>
  <div id="echo-key-modal">
    <input id="echo-key-input" type="text" value="">
    <div id="echo-key-error" style="display:none"></div>
  </div>
  <div id="act3-name-modal">
    <input id="act3-name-input" type="text" value="">
  </div>
  <div id="airplane-banner" style="display:none">
    <div id="airplane-switch"></div>
    <div id="airplane-toggle"></div>
  </div>
  <div id="overheat-overlay" style="display:none"></div>
  <div id="delete-seq" style="display:none"></div>
  <div id="final-camera-flash"></div>

  <!-- Chat -->
  <div id="messages-app" class="screen"></div>
  <div id="chat-view" class="screen">
    <div id="chat-contact-name"></div>
    <div id="chat-history"></div>
    <div id="chat-list"></div>
    <input id="chat-input-field" type="text" value="">
    <div id="typing-indicator" style="display:none"></div>
  </div>

  <!-- Gallery -->
  <div id="gallery-app" class="screen">
    <div id="thumb-camera"></div>
    <div id="thumb-downloads"></div>
  </div>
  <div id="album-view" class="screen"><div id="album-title"></div><div id="gallery-grid"></div></div>
  <div id="image-view" class="screen">
    <img id="full-image" src="">
    <div id="image-metadata"></div>
    <div id="image-counter"></div>
    <button id="img-prev-btn"></button>
    <button id="img-next-btn"></button>
    <div id="img-swipe-container"></div>
  </div>

  <!-- Notes -->
  <div id="notes-app" class="screen"><div id="notes-list"></div></div>
  <div id="note-view" class="screen"><div id="note-title"></div><div id="note-body"></div></div>

  <!-- Settings -->
  <div id="settings-app" class="screen"><div id="settings-list"></div><div id="settings-group"></div></div>
  <div id="settings-detail" class="screen">
    <div id="settings-detail-title"></div>
    <div id="settings-detail-body"></div>
  </div>

  <!-- Browser -->
  <div id="browser-app" class="screen">
    <input id="browser-url-input" type="text" value="">
    <div id="browser-home-content"></div>
    <div id="browser-history-content"></div>
    <div id="browser-page-view"></div>
    <div id="search-query-text"></div>
    <div id="search-result-count"></div>
    <div id="search-results-list"></div>
  </div>

  <!-- Calendar / Email / Phone -->
  <div id="calendar-app" class="screen"><div id="calendar-list"></div></div>
  <div id="event-detail" class="screen"><div id="event-detail-body"></div></div>
  <div id="email-app" class="screen"><div id="email-list"></div></div>
  <div id="email-detail" class="screen"><div id="email-detail-body"></div></div>
  <div id="phone-app" class="screen"><div id="calls-list"></div></div>
  <div id="call-screen" class="screen">
    <div id="call-status-text"></div>
    <div id="call-duration"></div>
  </div>

  <!-- Camera / Voice / Music / Weather / Bank / Maps -->
  <div id="camera-app" class="screen">
    <video id="camera-feed"></video>
    <div id="camera-error-msg"></div>
  </div>
  <div id="voice-app" class="screen">
    <div id="mic-record-btn"><div id="mic-record-inner"></div></div>
    <div id="mic-record-time"></div>
    <audio id="voice-audio-element"></audio>
    <div id="voice-play-btn"></div>
    <div id="voice-waveform"></div>
  </div>
  <div id="music-app" class="screen">
    <div id="music-title"></div><div id="music-artist"></div>
    <div id="music-play-btn"></div>
    <div id="music-progress-bar"></div>
    <div id="music-progress-bg"></div>
    <audio id="music-audio-element"></audio>
  </div>
  <div id="weather-app" class="screen"></div>
  <div id="bank-app" class="screen"></div>
  <div id="maps-app" class="screen"><input id="map-search-input" type="text"></div>

  <!-- Act 1 -->
  <div id="act1-ending" class="screen"></div>

  <!-- Act 2 screens -->
  <div id="act2-boot" class="screen">
    <div id="boot-bar"></div>
    <div id="boot-terminal-text"></div>
  </div>
  <div id="act2-lock" class="screen">
    <div id="act2-time-big"></div>
    <div id="act2-time"></div>
  </div>
  <div id="act2-home" class="screen"></div>
  <div id="act2-choices" class="screen"><div id="act2-choices-container"></div></div>
  <div id="act2-ending" class="screen"></div>
  <div id="files-app" class="screen">
    <div id="files-icon"></div>
    <div id="root-archive-content"></div>
  </div>
  <div id="mirror-folder" class="screen"></div>
  <div id="echo-logs" class="screen">
    <div id="echo-logs-folder"></div>
    <div id="echo-logs-status"></div>
  </div>
  <div id="echo-terminal" class="screen"><div id="echo-terminal-content"></div></div>
  <div id="warehouse-modal-wrap"></div>

  <!-- Act 3 screens -->
  <div id="act3-boot" class="screen">
    <div id="act3-boot-bar"></div>
    <div id="act3-boot-terminal"></div>
  </div>
  <div id="act3-lock" class="screen"><div id="act3-lock-msg"></div></div>
  <div id="act3-home" class="screen"></div>
  <div id="act3-ending" class="screen"><div id="act3-ending-content"></div></div>
  <div id="observer-app" class="screen">
    <div id="observer-content"></div>
    <div id="observer-icon"></div>
    <div id="mirror-app-icon"></div>
  </div>
  <div id="mirror-app" class="screen">
    <div id="mirror-report-content"></div>
    <div id="mirror-subjects-thumb"></div>
  </div>
  <div id="audio-analyzer" class="screen">
    <canvas id="spectrogram-canvas" width="300" height="100"></canvas>
    <div id="analyzer-launch-btn"></div>
    <div id="analyzer-result"></div>
  </div>
  <div id="audio-player" class="screen">
    <div id="audio-title"></div>
    <div id="audio-transcript"></div>
  </div>
  <div id="video-player" class="screen">
    <div id="vid-text"></div>
    <div id="vid-time"></div>
    <div id="vid-progress"></div>
    <div id="vid-buffer"></div>
    <div id="vid-transcript"></div>
    <div id="video-transcript"></div>
  </div>
  <div id="cctv-app" class="screen">
    <div id="cctv-figure"></div>
    <div id="cctv-figure-2"></div>
    <div id="cctv-glitch"></div>
    <div id="cctv-text"></div>
  </div>

  <!-- Act 4 screens -->
  <div id="act4-boot" class="screen">
    <div id="act4-boot-logo"></div>
    <div id="act4-boot-bar"></div>
    <div id="act4-boot-terminal"></div>
  </div>
  <div id="act4-lock" class="screen"><div id="act4-lock-msg"></div></div>
  <div id="act4-home" class="screen"></div>
  <div id="act4-report" class="screen">
    <div id="act4-report-content"></div>
    <div id="report-file-btn"></div>
  </div>
  <div id="act4-subjects-album" class="screen"><div id="act4-subjects-grid"></div></div>
  <div id="act4-final-choice" class="screen"><div id="act4-choice-text"></div></div>

  <!-- Notification panel -->
  <div id="notif-panel">
    <div id="notif-panel-list">
      <div id="notif-panel-empty">No notifications</div>
    </div>
  </div>

  <!-- Echo Root modal (Act 4) -->
  <div id="echo-root-modal">
    <input id="echo-root-code" type="text" value="">
    <div id="echo-root-error" style="display:none">ACCESS DENIED</div>
    <div id="echo-root-code-hint" style="display:none">Hint: check the subject who merged willingly.</div>
  </div>
  <div id="echo-root" class="screen">
    <div id="echo-root-messages"></div>
    <div id="echo-root-input" style="display:none">
      <div id="echo-root-choices"></div>
    </div>
  </div>

  <!-- Act 5 screens -->
  <div id="act5-call-overlay" class="screen">
    <div id="act5-call-status"></div>
    <div id="act5-call-transcript"></div>
  </div>
  <div id="act5-server" class="screen">
    <div id="act5-server-content"></div>
    <div id="act5-server-btn"></div>
  </div>
  <div id="act5-ending" class="screen"><div id="act5-ending-content"></div></div>
  <div id="escape-cam" class="screen"><video id="escape-feed"></video></div>
</div>`;
}

module.exports = { buildDOMFixture };
