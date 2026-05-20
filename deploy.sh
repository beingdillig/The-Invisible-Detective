#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# The Invisible Detective — Local CI/CD Pipeline
# Usage:
#   ./deploy.sh build              → build signed AAB only
#   ./deploy.sh internal           → build + upload to Play Store (Internal)
#   ./deploy.sh alpha              → promote Internal → Alpha
#   ./deploy.sh beta               → promote Alpha   → Beta
#   ./deploy.sh production         → promote Beta    → Production
# ─────────────────────────────────────────────────────────────────────────────

set -e

# ── Environment ───────────────────────────────────────────────────────────────
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Sync web assets before every build ───────────────────────────────────────
echo "🔄  Syncing web assets → www/ ..."
mkdir -p www
cp index.html script.js style.css www/
[ -f act1.txt ] && cp act1.txt www/ || true
[ -f game_description.txt ] && cp game_description.txt www/ || true

echo "🔄  Running: npx cap sync android ..."
npx cap sync android

# ── Version helpers ──────────────────────────────────────────────────────────
# Pull versionName from android/app/build.gradle
VERSION=$(grep 'versionName' android/app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
TRACK="${1:-build}"
TIMESTAMP=$(date '+%Y%m%d-%H%M')
AAB_SRC="android/app/build/outputs/bundle/release/app-release.aab"
AAB_DEST="releases/v${VERSION}-${TRACK}-${TIMESTAMP}.aab"

copy_aab_to_releases() {
  mkdir -p releases
  cp "$AAB_SRC" "$AAB_DEST"
  echo "📦  Saved → $AAB_DEST"
}

# ── Fastlane ─────────────────────────────────────────────────────────────────
LANE="$TRACK"

case "$LANE" in
  build)
    echo "🏗️   Building signed AAB ..."
    fastlane android build
    AAB_DEST="releases/v${VERSION}-build-${TIMESTAMP}.aab"
    copy_aab_to_releases
    echo "✅  AAB → $AAB_DEST"
    ;;
  internal)
    echo "🚀  Building & deploying to Internal Testing ..."
    fastlane android deploy_internal
    AAB_DEST="releases/v${VERSION}-internal-${TIMESTAMP}.aab"
    copy_aab_to_releases
    echo "✅  Uploaded to Play Store → Internal Testing"
    ;;
  alpha)
    echo "📤  Promoting Internal → Alpha ..."
    fastlane android promote_alpha
    echo "✅  Promoted to Alpha"
    ;;
  beta)
    echo "📤  Promoting Alpha → Beta ..."
    fastlane android promote_beta
    echo "✅  Promoted to Beta"
    ;;
  production)
    echo "🌍  Promoting Beta → Production ..."
    fastlane android promote_production
    echo "✅  Live on Production!"
    ;;
  *)
    echo "Usage: ./deploy.sh [build|internal|alpha|beta|production]"
    exit 1
    ;;
esac
