#!/bin/bash
# Restart Metro with cleared cache and open on both Android emulators.
# Emulators should already be logged in:
#   emulator-5554 → bagelbogel@bagelbogel.com
#   emulator-5556 → bogelbagel@bogelbagel.com

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$PROJECT_DIR/mobile"
PKG="com.goalbuddy.app"

# Kill existing Metro
kill $(lsof -ti:8081) 2>/dev/null || true
sleep 1

# Start Android emulators if not already running
if ! adb devices | grep -q "emulator-5554"; then
  echo "Starting Medium_Phone_2 (emulator-5554)..."
  emulator -avd Medium_Phone_2 -no-snapshot-load > /tmp/emulator-5554.log 2>&1 &
fi

if ! adb devices | grep -q "emulator-5556"; then
  echo "Starting Medium_Phone_API_36 (emulator-5556)..."
  emulator -avd Medium_Phone_API_36 -no-snapshot-load > /tmp/emulator-5556.log 2>&1 &
fi

# Start Metro in background
cd "$MOBILE_DIR"
npx expo start --reset-cache >> /tmp/metro.log 2>&1 &
METRO_PID=$!
echo "Metro started (PID $METRO_PID), log at /tmp/metro.log"

# Give Metro a moment to bind, then launch app on both emulators
sleep 4
adb -s emulator-5554 shell monkey -p "$PKG" 1 > /dev/null 2>&1 || true
adb -s emulator-5556 shell monkey -p "$PKG" 1 > /dev/null 2>&1 || true

echo "Done. Both emulators should be launching the app."
echo ""
echo "Accounts:"
echo "  emulator-5554 → bagelbogel@bagelbogel.com"
echo "  emulator-5556 → bogelbagel@bogelbagel.com"
echo ""
echo "If either emulator is not yet booted, wait ~30s and run:"
echo "  adb -s emulator-5554 shell monkey -p $PKG 1"
echo "  adb -s emulator-5556 shell monkey -p $PKG 1"
