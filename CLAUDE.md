# GoalBuddy — Development Guide

## Mobile Engineering Standards (MANDATORY)

All code must follow `/mobile_engineering_standards_v2.md`. Key rules:

- **Screen states**: Every screen handles Loading, Empty, Content, Error states
- **Styles**: Always `useMemo(() => makeStyles(colors), [colors])` — never call `makeStyles` bare in render
- **Optimistic updates**: Mutations update local cache immediately; roll back on error
- **Error UX**: Specific + recoverable — "Couldn't send. [Retry]" not "Something went wrong"
- **Lists**: `FlatList` for any list that may grow; `ScrollView` only for fixed-length content
- **Selectors**: Always use Zustand selectors `useStore(s => s.field)` — never destructure whole store
- **Data flow**: UI → hooks → services → api → backend. Never reverse. Never fetch inside render.
- **Server state vs UI state**: Never mix. TanStack Query owns server data; local `useState` owns ephemeral UI.

## Project Structure
- `mobile/` — Expo (SDK 55) React Native app with Expo Router file-based routing
- `server/` — Express + TypeScript backend, PostgreSQL database
- API base: `http://10.0.2.2:3000` (Android emulator localhost alias)

## Running the App
```bash
# Server
cd server && ./node_modules/.bin/ts-node src/app.ts

# Mobile
cd mobile && npx expo start

# Restart both emulators with the correct bundle
adb -s emulator-5554 shell am force-stop host.exp.exponent && adb -s emulator-5556 shell am force-stop host.exp.exponent && sleep 1
adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent
adb -s emulator-5556 shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent
```

## Test Accounts
- `bagelbogel@bagelbogel.com` / `1234` (display: bagelbogel)
- `bogelbagel@bogelbagel.com` / (unknown) (display: bogelbagel)

---

# Mobile UI/UX Design Principles for React Native

A reference guide covering core principles for building polished, accessible, and platform-consistent mobile experiences.

---

## 1. Touch Targets

- Minimum tappable area: **44×44 pt (iOS)** / **48×48 dp (Android)** — even if the visual element is smaller.
- Use `hitSlop` in React Native to expand the touch area without changing the visual size.
- Never place two interactive targets closer than **8dp** apart to avoid mis-taps.

## 2. Spacing & Layout

- Use an **8pt grid system** as the base unit (4pt for micro-adjustments).
- Screen edge padding: **16dp** horizontal margins as a baseline; **24dp** for content-heavy screens.
- Consistent internal padding within cards: **12–16dp** vertical, **16dp** horizontal.
- White space is a UX feature, not wasted space.

## 3. Typography Hierarchy

- Maximum **3 type scales** per screen: heading, body, caption/label.
- Minimum body font size: **16sp**; captions no smaller than **12sp**.
- Line height: **1.4–1.6× the font size** for body text.
- Font weight contrast (700 heading / 400 body) carries more hierarchy than size alone.
- Reserve ALL CAPS for short labels/badges only.

## 4. Feedback Patterns

- Every interactive element must give **immediate visual feedback** within **100ms**.
- Use **loading skeletons** for content-heavy screens, not spinners.
- Toast/snackbar: **3–4 seconds**, bottom-anchored on Android, top on iOS.
- Error states must be **inline and specific** with a recovery action.

## 5. Navigation Patterns

- **Bottom tab bar**: 3–5 destinations, always label + icon (icon-only fails accessibility).
- **Stack navigation**: for drill-down flows; always provide a clear back affordance.
- **Modal/Sheet**: for transient tasks. Use action sheets for simple choices, not full-screen modals.
- Avoid deep nesting (>3 levels). Enable swipe-to-dismiss on all modals/sheets.

## 6. Status Bar Handling

- Use luminance of the background color to determine `barStyle`: light bg → `dark-content`, dark bg → `light-content`.
- On Android, set `translucent={false}` to prevent content being obscured.
- Use `react-native-safe-area-context` (`SafeAreaView`) on every screen — never hardcode status bar height.

## 7. Dark Mode

- Design both themes from day one.
- Use semantic color tokens (background, card, text, border, etc.) — never hardcode hex values in components.
- Pure black (`#000`) causes eye strain — prefer `#121212`–`#1C1C1E` for dark backgrounds.
- Elevation in dark mode = **lighter surface tones**, not just shadows.

## 8. Chat Bubble Conventions

- **Sent**: right-aligned, brand/primary color background, white text.
- **Received**: left-aligned, neutral surface background, primary text color.
- Border radius **16–20dp**; flatten the "tail" corner to ~4dp to indicate direction.
- Show **timestamps per group**, not per bubble. Only show avatar for received messages, once per consecutive group.

## 9. Badge Design

- Minimum size **16×16dp**, always circular for counts.
- Count display: exact for 1–99, then "99+".
- Badge color: high-contrast red for notifications; semantic colors (green, yellow) for status.
- Position at **top-right corner** of the host element, slightly overlapping.

## 10. List & Card Design

- List item min height: **48dp** (single-line), **64dp** (two-line), **88dp** (avatar+two-line).
- Use whitespace between items instead of dividers where possible.
- Card padding: **16dp** all sides; content must never touch card edges.
- Use `FlatList` with `keyExtractor`; implement `getItemLayout` for fixed-height rows.

## 11. Accessibility

- All interactive elements need `accessibilityLabel` — especially icon-only buttons.
- Minimum contrast ratio: **4.5:1** for normal text, **3:1** for large text (WCAG AA).
- Never block system font size increases.

## 12. Animation & Motion

- UI transitions: **150–300ms**. Under 100ms feels broken; over 400ms feels sluggish.
- Use `react-native-reanimated` for complex animations.
- Always provide a no-animation fallback for `reduceMotion` accessibility setting.

## 13. Forms & Input

- Always use the correct `keyboardType` per field.
- Validate **on blur**, not on every keystroke.
- Use `KeyboardAvoidingView` with `behavior="padding"` (iOS) or `"height"` (Android).

## 14. Empty & Error States

- Every list/feed needs a designed **empty state**: illustration + message + CTA.
- Error states must be **actionable** — never a dead end.

## 15. Platform Consistency

- Respect platform conventions (iOS swipe-back, Android back gesture/button, material ripple).
- Test on **real devices** — emulators miss scroll feel, haptics, and keyboard behavior.
