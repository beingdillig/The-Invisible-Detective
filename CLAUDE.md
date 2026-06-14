# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Testing
```bash
npm test                    # Run all unit tests (Jest)
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npm run test:ci             # CI mode (no watching, forceExit)
npx jest tests/foo.test.js  # Run a single test file
npm run test:e2e            # Playwright E2E tests (requires server on :3737)
npm run test:e2e:ui         # Playwright interactive UI mode
npm run test:all            # Unit + E2E
```

E2E tests need a static server running: `npx serve . -l 3737`

### Android Build & Deploy
```bash
./deploy.sh build           # Build signed AAB only
./deploy.sh internal        # Build + upload to Play Store Internal Testing
./deploy.sh alpha           # Promote Internal → Alpha (Closed Testing)
./deploy.sh beta            # Promote Alpha → Beta (Open Testing)
./deploy.sh production      # Promote Beta → Production
npx cap sync android        # Sync web assets to native Android project
```

Fastlane directly:
```bash
bundle exec fastlane android build [version_code:N]
bundle exec fastlane android deploy_internal [version_code:N]
bundle exec fastlane android promote_beta
bundle exec fastlane android promote_production
```

## Architecture

**The Invisible Detective** is a psychological thriller narrative game. The web app is wrapped with Capacitor for Android distribution.

- **No framework** — vanilla JS, HTML5, CSS3
- **No backend** — game state lives entirely in `localStorage`
- **Web → Android** via Capacitor bridge; `www/` is the web dir that gets synced into the native project

### Core files

| File | Purpose |
|------|---------|
| `script.js` (~5300 lines) | Monolithic game engine: act state machine (Prelude → Acts 1–5), battery system, screen transitions, localStorage persistence, in-game apps, audio (Web Audio API), modal guards |
| `index.html` (~1550 lines) | Complete game UI — phone frame emulation, all screens (splash, lock, passcode, home, apps, modals), Leaflet.js map |
| `style.css` (~2230 lines) | iOS-inspired dark theme, glass-morphism, CSS variable theming, animation keyframes |
| `act1.txt` | Narrative content for Act 1 |

### Testing layers

- **Unit tests** (`tests/*.test.js`) — Jest + jsdom; covers act logic, audio, UI components, save/restore, guards. Loaded via `tests/helpers/load-game.js` which uses manual Babel instrumentation to capture coverage for eval'd code.
- **E2E tests** (`e2e/*.spec.js`) — Playwright on Pixel 5 viewport (393×851), baseURL `http://localhost:3737`, **serial execution** because tests share localStorage state.

Coverage thresholds (enforced in CI): 50% statements, 42% branches, 42% functions, 55% lines.

### Android / Capacitor

- App ID: `com.beingdillig.invisibledetective`
- Min SDK 24 (Android 7.0), compile/target SDK 36
- `versionCode` is derived from git commit count (passed as `-Pversion_code=N`)
- `versionName` is in the `VERSION` file
- Signing keystore: `release.jks` locally; CI reads `KEYSTORE_FILE_BASE64` from GitHub Secrets
- ProGuard is disabled

### CI/CD (GitHub Actions)

Pipeline in `.github/workflows/android-release.yml` triggers on push to `main`:
1. Compute `versionCode` from git commit count
2. Jest unit tests → coverage gate
3. Playwright E2E tests
4. Copy web assets to `www/` → `npx cap sync android`
5. Build signed AAB (Java 21, Android SDK, Fastlane)
6. Upload to Play Store Internal Testing
7. Archive AAB artifact (60-day retention)

Play Store track progression: **Internal → Alpha (Closed) → Beta (Open) → Production**
