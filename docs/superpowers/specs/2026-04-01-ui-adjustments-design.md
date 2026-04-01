# UI Adjustments Design — Chat, Buddy Tabs, Goal Form

**Date:** 2026-04-01
**Status:** Approved

---

## Overview

Five UI improvements across three screens: Chat, Buddy Tabs, and the New Goal form. All mockups were reviewed and approved during brainstorming.

---

## 1. Chat Screen — Stats Button Relocation

**Change:** Move the 📊 stats button from the top-right header to the bottom-left of the input bar.

**Current:** Stats icon sits in the green header row alongside the buddy's name/goal.
**Proposed:** Header is clean (name + goal only). Stats icon is a 36×36 tappable button in the input bar to the left of the text input field, styled with a light green background and green border.

**Files affected:**
- `mobile/features/chat/screens/ChatScreen.tsx` (or equivalent chat screen file)

**Implementation notes:**
- Header: remove the stats `TouchableOpacity`
- Input bar: add stats button before the `TextInput`, same row as send button
- Button style: `background: colors.primaryLight`, `border: 1.5px solid colors.primary`, `borderRadius: 10`, `width: 36`, `height: 36`
- Stats button behavior unchanged — same navigation/modal target as before

---

## 2. Buddy Tabs — Reorder + Unread Badge

**Changes:**
1. Reorder tabs from `My Goals | Coaching | Co-op` → `My Goals | Co-op | Coaching`
2. Add `+x` unread badge to tab labels that have new messages

**Badge behavior:**
- Badge shows when there are unread messages in that tab's connections
- Resets to 0 when the user taps that tab
- Caps at `9+` if over 9 unread (matching existing card-level badge logic)
- Badge displayed inline in the tab label: `"Coaching +3"` styled as a small red pill (`#ef4444`)

**Files affected:**
- `mobile/features/buddies/screens/BuddiesScreen.tsx` — tab order, badge rendering
- `mobile/store/` — unread count tracking per tab (already tracked via `subTabLastSeen` in Zustand; use existing counts)

**Implementation notes:**
- Reorder the tab array: index 0 = `my_goals`, index 1 = `coop`, index 2 = `coaching`
- For the badge: read unread counts from the Zustand buddy store per tab key
- Badge pill: `backgroundColor: '#ef4444'`, `color: '#fff'`, `fontSize: FS.caption - 2`, `paddingHorizontal: 5`, `paddingVertical: 1`, `borderRadius: 8`
- Badge appears in the tab header text, not as a top-right corner dot

---

## 3. Goal Form — Public/Coop Toggle Coupling

**Change:** The "Open to Co-op" toggle is hidden when "Public Goal" is OFF. It appears only when Public is ON. Turning Public back OFF hides it again (and implicitly resets `coop_open` to false).

**Current:** Both toggles always visible independently.
**Proposed:** Co-op is conditionally rendered based on `isPublic` state.

**Files affected:**
- `mobile/features/goals/components/NewGoalForm.tsx` (or wherever goal creation form lives)

**Implementation notes:**
- Local state: `isPublic: boolean`, `isCoopOpen: boolean`
- When `isPublic` toggles OFF: set `isCoopOpen = false`, hide co-op row
- Placeholder when co-op is hidden:
  ```
  "Co-op option appears when Public is turned on"
  ```
  Styled as a small grey italic hint (`color: colors.textSecondary`, `fontStyle: 'italic'`, `fontSize: FS.caption`)
- Co-op row animates in/out (simple conditional render is acceptable; fade is a nice-to-have)
- This enforces the product rule: `coop_open: true` requires `is_public: true`

---

## 4. Goal Form — Milestone Section Redesign

**Changes:**
1. Formatting fix: milestone section is clearly readable with proper spacing
2. Frequency options open a bottom sheet / modal picker (not inline select)
3. At least 1 milestone required before the Save button is enabled
4. Each existing milestone shows Edit (✏️) and Delete (✕) buttons
5. Save is disabled and shows a tooltip/hint if 0 milestones exist

### 4a. Milestone List Item

Each saved milestone shows:
```
[ Daily badge ] [ "Go for a 30-min run"  flex:1 ] [ ✏️ ] [ ✕ ]
```
- Container: `background: colors.primaryLight`, `border: 1px solid #d0e8d8`, `borderRadius: 10`, `paddingHorizontal: 12`, `paddingVertical: 10`
- Frequency badge: green pill (`background: colors.primary`, `color: #fff`, `fontSize: 10`, `borderRadius: 6`)
- Text: `fontSize: FS.secondary`, `fontWeight: FW.medium`, `color: colors.text`
- Edit button: white bg, grey border, 26×26, `borderRadius: 6`
- Delete button: white bg, red border (`#f5c6cb`), 26×26, `borderRadius: 6`, red X

### 4b. Add Milestone Form

Dashed border container (`border: 1.5px dashed #ccc`, `borderRadius: 10`, `background: colors.card`, `padding: 12`):
- Text input for milestone description (`placeholder: "e.g. Go for a 30-min run"`)
- Frequency selector row: tapping opens the frequency bottom sheet
  - Shows current selection on the right (`"Daily ›"` in `colors.primary`)
- "+ Add Milestone" button (full width, `colors.primary` background)

### 4c. Frequency Bottom Sheet Picker

A modal/bottom sheet with 6 options. Each option is a full-width tappable row:
1. **Daily** — single tap to select
2. **X days / week** — sub-picker appears in the same sheet (1–6 stepper or radio)
3. **Weekly**
4. **Monthly**
5. **Custom days** — Mon–Sun toggles appear in the same sheet
6. **Once**

Selected option is highlighted in `colors.primary` with a white checkmark.

**Implementation approach:** Use React Native `Modal` with `presentationStyle="pageSheet"` or a third-party bottom sheet (if already used in the codebase — check existing usage first).

### 4d. Required Milestone Gate

- Section header shows `* required` in red next to "Milestones" and `"at least 1"` hint on the right
- Save button is disabled (`opacity: 0.5`, non-tappable) if `milestones.length === 0`
- No toast needed — the `* required` label and disabled button are sufficient

### 4e. Edit Flow

Tapping ✏️ on an existing milestone:
- Populates the add form below with that milestone's text + frequency
- Changes "+ Add Milestone" button to "Update Milestone"
- On submit: replaces the edited milestone in the list

---

## 5. Shared Implementation Notes

- All new styles follow `useMemo(() => makeStyles(colors), [colors])` pattern (engineering standard)
- No new third-party libraries unless a bottom sheet library is already present
- All changes are mobile-only (no server changes required)
- Milestone data structure: `{ id: string, description: string, frequency: FrequencyType }` where `FrequencyType` covers all 6 options

---

## Files To Touch

| File | Change |
|---|---|
| `mobile/features/chat/screens/ChatScreen.tsx` | Move stats button to input bar |
| `mobile/features/buddies/screens/BuddiesScreen.tsx` | Reorder tabs, add unread badges |
| `mobile/features/goals/screens/NewGoalScreen.tsx` (or form component) | Public/coop coupling, milestone redesign |
| Possibly `mobile/features/goals/components/FrequencyPicker.tsx` | New component for bottom sheet |
| Possibly `mobile/features/goals/components/MilestoneItem.tsx` | New component for milestone rows |

---

## Out of Scope

- Server-side changes (all changes are UI-only)
- Notification or push changes
- Milestone ordering / drag-to-reorder
- Animated transitions between toggle states (nice-to-have, not required)
