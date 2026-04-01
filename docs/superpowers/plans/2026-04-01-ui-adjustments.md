# UI Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 approved UI changes: chat stats button relocation, buddy tab reorder + badge color fix, goal form public/coop toggle coupling, frequency bottom sheet picker, and milestone section redesign.

**Architecture:** All changes are mobile-only. The goal form changes are the most involved — a new `FrequencyPickerModal` component is extracted from the inline chip logic, and milestone state management is updated to support edit mode. The chat and buddy changes are small surgical edits.

**Tech Stack:** React Native, Expo Router, TanStack Query, Zustand, `@expo/vector-icons` (MaterialCommunityIcons), RN `Modal`

---

## File Map

| File | Status | Change |
|---|---|---|
| `mobile/features/chat/components/ChatInput.tsx` | Modify | Add `onStatsPress` prop + stats button in message row |
| `mobile/features/chat/screens/ChatScreen.tsx` | Modify | Remove stats button from header, pass `onStatsPress` to `ChatInput` |
| `mobile/features/buddies/screens/BuddiesScreen.tsx` | Modify | Reorder TABS array, change badge color to `#ef4444` |
| `mobile/features/goals/components/FrequencyPickerModal.tsx` | **Create** | Bottom sheet modal for frequency + sub-pickers |
| `mobile/features/goals/screens/GoalsScreen.tsx` | Modify | Public/coop coupling, milestone redesign, wire up `FrequencyPickerModal` |

---

## Task 1: Chat — Move Stats Button to Input Bar

**Files:**
- Modify: `mobile/features/chat/components/ChatInput.tsx`
- Modify: `mobile/features/chat/screens/ChatScreen.tsx`

- [ ] **Step 1: Update `ChatInput` to accept and render the stats button**

Replace the entire file `mobile/features/chat/components/ChatInput.tsx`:

```tsx
import { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FS, FW, LH } from '../../../theme/typography';

interface Props {
  message: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onRetry: () => void;
  isSending: boolean;
  sendError: boolean;
  paddingBottom: number;
  colors: any;
  onStatsPress?: () => void;
}

export function ChatInput({
  message,
  onChangeText,
  onSend,
  onRetry,
  isSending,
  sendError,
  paddingBottom,
  colors,
  onStatsPress,
}: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[s.inputArea, { paddingBottom: paddingBottom + 12 }]}>
      {sendError && (
        <View style={s.sendErrorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#FF6B6B" />
          <Text style={s.sendErrorText}>Couldn't send. </Text>
          <TouchableOpacity onPress={onRetry}>
            <Text style={s.sendErrorRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={s.messageRow}>
        {onStatsPress && (
          <TouchableOpacity
            style={[s.statsBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={onStatsPress}
            accessibilityLabel="View goal stats"
          >
            <MaterialCommunityIcons name="chart-bar" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TextInput
          style={s.messageInput}
          value={message}
          onChangeText={onChangeText}
          placeholder="How's your progress?"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, (!message.trim() || isSending) && s.sendBtnDisabled]}
          onPress={onSend}
          disabled={!message.trim() || isSending}
        >
          {isSending
            ? <ActivityIndicator color="#fff" size="small" />
            : <MaterialCommunityIcons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  inputArea:       { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, paddingHorizontal: 12 },
  sendErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 8 },
  sendErrorText:   { fontSize: FS.secondary, lineHeight: LH.secondary, color: '#FF6B6B' },
  sendErrorRetry:  { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.primary, fontWeight: FW.bold, textDecorationLine: 'underline' },
  messageRow:      { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  statsBtn:        { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  messageInput:    { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, fontSize: FS.body, lineHeight: LH.body, color: colors.text, maxHeight: 100 },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
```

- [ ] **Step 2: Remove stats button from header in `ChatScreen.tsx` and wire up `onStatsPress`**

In `mobile/features/chat/screens/ChatScreen.tsx`, find the `<View style={s.headerRight}>` block (around line 425) and replace it:

**Old:**
```tsx
        <View style={s.headerRight}>
          <ActivityBadge level={conn.activity_level} small />
          {isBuddyView && (
            <TouchableOpacity
              onPress={() => setStatsVisible(true)}
              style={s.statsBtn}
              accessibilityLabel="View goal stats"
            >
              <MaterialCommunityIcons name="chart-bar" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
```

**New:**
```tsx
        <View style={s.headerRight}>
          <ActivityBadge level={conn.activity_level} small />
        </View>
```

Then find the `<ChatInput` usage (around line 491) and add `onStatsPress`:

**Old:**
```tsx
        <ChatInput
          message={message}
          onChangeText={(t) => { setMessage(t); setSendError(false); }}
          onSend={handleSend}
          onRetry={handleRetry}
          isSending={sendMutation.isPending}
          sendError={sendError}
          paddingBottom={insets.bottom}
          colors={colors}
        />
```

**New:**
```tsx
        <ChatInput
          message={message}
          onChangeText={(t) => { setMessage(t); setSendError(false); }}
          onSend={handleSend}
          onRetry={handleRetry}
          isSending={sendMutation.isPending}
          sendError={sendError}
          paddingBottom={insets.bottom}
          colors={colors}
          onStatsPress={isBuddyView ? () => setStatsVisible(true) : undefined}
        />
```

Also remove the unused `statsBtn` style from `makeStyles` at the bottom of `ChatScreen.tsx` (the `statsBtn: { padding: 6 }` line).

- [ ] **Step 3: Verify on emulator**

Open a coaching connection chat (where `isBuddyView` is true). Confirm:
- Header no longer shows the chart icon
- Input bar shows a green-bordered chart icon on the left
- Tapping it still opens the stats modal
- For my-goal chats (`isBuddyView` false), no stats button appears anywhere

- [ ] **Step 4: Commit**

```bash
cd /Users/baselabdel-rahman/Coding/goalbuddy
git add mobile/features/chat/components/ChatInput.tsx mobile/features/chat/screens/ChatScreen.tsx
git commit -m "feat: move chat stats button from header to input bar"
```

---

## Task 2: Buddy Tabs — Reorder + Badge Color

**Files:**
- Modify: `mobile/features/buddies/screens/BuddiesScreen.tsx`

- [ ] **Step 1: Reorder the TABS array**

In `mobile/features/buddies/screens/BuddiesScreen.tsx`, find lines 129–133:

**Old:**
```tsx
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'my_goals', label: 'My Goals' },
    { key: 'coaching', label: 'Coaching' },
    { key: 'coop', label: 'Co-op' },
  ];
```

**New:**
```tsx
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'my_goals', label: 'My Goals' },
    { key: 'coop', label: 'Co-op' },
    { key: 'coaching', label: 'Coaching' },
  ];
```

- [ ] **Step 2: Change badge background from primary green to red**

Find the badge rendering (lines 179–183):

**Old:**
```tsx
                {badge > 0 && (
                  <View style={[s.tabBadge, { backgroundColor: colors.primary }]}>
                    <Text style={s.tabBadgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                )}
```

**New:**
```tsx
                {badge > 0 && (
                  <View style={[s.tabBadge, { backgroundColor: '#ef4444' }]}>
                    <Text style={s.tabBadgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                )}
```

- [ ] **Step 3: Verify on emulator**

Navigate to Buddies tab. Confirm:
- Tab order is `My Goals | Co-op | Coaching`
- If any connection has unread messages, the badge appears as a red pill on the correct tab
- Tapping the tab clears the badge (existing `markSubTabSeen` logic handles this)

- [ ] **Step 4: Commit**

```bash
cd /Users/baselabdel-rahman/Coding/goalbuddy
git add mobile/features/buddies/screens/BuddiesScreen.tsx
git commit -m "feat: reorder buddy tabs to My Goals | Co-op | Coaching, red unread badge"
```

---

## Task 3: Goal Form — Public/Coop Toggle Coupling

**Files:**
- Modify: `mobile/features/goals/screens/GoalsScreen.tsx`

- [ ] **Step 1: Update the public toggle — remove the `disabled` prop**

Find the public toggle `TouchableOpacity` (around line 1188). It currently has `disabled={newCoopOpen}`. Remove that prop and the related `activeOpacity`:

**Old:**
```tsx
            <TouchableOpacity
              style={[s.publicRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setNewIsPublic(!newIsPublic)}
              disabled={newCoopOpen}
              activeOpacity={newCoopOpen ? 1 : 0.8}
            >
```

**New:**
```tsx
            <TouchableOpacity
              style={[s.publicRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setNewIsPublic((v) => !v)}
              activeOpacity={0.8}
            >
```

Also update the icon and label inside the public toggle — they currently also check `newCoopOpen` which is no longer needed since coop forces public to be true when visible. Simplify to just check `newIsPublic`:

**Old:**
```tsx
              <MaterialCommunityIcons
                name={newIsPublic || newCoopOpen ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={newIsPublic || newCoopOpen ? colors.primary : colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.publicLabel, { color: colors.text }]}>{newIsPublic || newCoopOpen ? 'Public' : 'Private'}</Text>
                <Text style={[s.publicSub, { color: colors.textSecondary }]}>
                  {newIsPublic || newCoopOpen ? 'Others can discover and buddy up' : 'Only visible to you'}
                </Text>
              </View>
              <View style={[s.toggle, { backgroundColor: newIsPublic || newCoopOpen ? colors.primary : colors.border }]}>
                <View style={[s.toggleThumb, (newIsPublic || newCoopOpen) && s.toggleThumbOn]} />
              </View>
```

**New:**
```tsx
              <MaterialCommunityIcons
                name={newIsPublic ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={newIsPublic ? colors.primary : colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.publicLabel, { color: colors.text }]}>{newIsPublic ? 'Public' : 'Private'}</Text>
                <Text style={[s.publicSub, { color: colors.textSecondary }]}>
                  {newIsPublic ? 'Others can discover and buddy up' : 'Only visible to you'}
                </Text>
              </View>
              <View style={[s.toggle, { backgroundColor: newIsPublic ? colors.primary : colors.border }]}>
                <View style={[s.toggleThumb, newIsPublic && s.toggleThumbOn]} />
              </View>
```

- [ ] **Step 2: Conditionally render coop toggle and add placeholder**

Replace the entire coop toggle block (lines 1210–1232) with this conditional rendering:

**Old:**
```tsx
            <TouchableOpacity
              style={[s.publicRow, { backgroundColor: colors.card, borderColor: newCoopOpen ? colors.primary : colors.border }]}
              onPress={() => {
                const next = !newCoopOpen;
                setNewCoopOpen(next);
                if (next) setNewIsPublic(true);
              }}
            >
              <MaterialCommunityIcons
                name="account-multiple-outline"
                size={20}
                color={newCoopOpen ? colors.primary : colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.publicLabel, { color: colors.text }]}>Co-op Goal</Text>
                <Text style={[s.publicSub, { color: colors.textSecondary }]}>
                  {newCoopOpen ? 'You and a buddy work on this goal together' : 'Share ownership of this goal with a buddy'}
                </Text>
              </View>
              <View style={[s.toggle, { backgroundColor: newCoopOpen ? colors.primary : colors.border }]}>
                <View style={[s.toggleThumb, newCoopOpen && s.toggleThumbOn]} />
              </View>
            </TouchableOpacity>
```

**New:**
```tsx
            {newIsPublic ? (
              <TouchableOpacity
                style={[s.publicRow, { backgroundColor: colors.card, borderColor: newCoopOpen ? colors.primary : colors.border }]}
                onPress={() => setNewCoopOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="account-multiple-outline"
                  size={20}
                  color={newCoopOpen ? colors.primary : colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[s.publicLabel, { color: colors.text }]}>Co-op Goal</Text>
                  <Text style={[s.publicSub, { color: colors.textSecondary }]}>
                    {newCoopOpen ? 'You and a buddy work on this goal together' : 'Share ownership of this goal with a buddy'}
                  </Text>
                </View>
                <View style={[s.toggle, { backgroundColor: newCoopOpen ? colors.primary : colors.border }]}>
                  <View style={[s.toggleThumb, newCoopOpen && s.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={s.coopHiddenHint}>
                <Text style={s.coopHiddenHintText}>Co-op option appears when Public is turned on</Text>
              </View>
            )}
```

- [ ] **Step 3: Update `handleAddGoal` to use `newIsPublic && newCoopOpen` for submission**

Find `handleAddGoal` (around line 1073). The line that builds the API call currently reads:
```ts
        isPublic: newCoopOpen ? true : newIsPublic, coopOpen: newCoopOpen,
```

Replace with:
```ts
        isPublic: newCoopOpen ? true : newIsPublic,
        coopOpen: newIsPublic && newCoopOpen,
```

- [ ] **Step 4: Add the `coopHiddenHint` styles to `makeStyles`**

Find the `makeStyles` function at the bottom of `GoalsScreen.tsx`. Add these two style entries inside `StyleSheet.create({...})` alongside the other goal form styles (near `publicRow`, `publicLabel`, `publicSub`):

```ts
  coopHiddenHint:     { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  coopHiddenHintText: { fontSize: FS.caption, lineHeight: LH.caption, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },
```

- [ ] **Step 5: Verify on emulator**

Open the New Goal form. Confirm:
- Default state (Public ON): co-op toggle is visible
- Toggle Public OFF: co-op toggle disappears, replaced by italic hint text
- Toggle Public ON again: co-op toggle reappears in previous state
- Turn co-op ON then toggle public OFF → ON: co-op is still ON when public comes back

- [ ] **Step 6: Commit**

```bash
cd /Users/baselabdel-rahman/Coding/goalbuddy
git add mobile/features/goals/screens/GoalsScreen.tsx
git commit -m "feat: hide co-op toggle when goal is not public, preserve coop state"
```

---

## Task 4: Create `FrequencyPickerModal` Component

**Files:**
- Create: `mobile/features/goals/components/FrequencyPickerModal.tsx`

- [ ] **Step 1: Create the component file**

Create `mobile/features/goals/components/FrequencyPickerModal.tsx`:

```tsx
import { useMemo } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FS, FW, LH } from '../../../theme/typography';
import { useThemeStore } from '../../../store/themeStore';
import type { MilestoneFrequency } from '../types';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

const FREQUENCIES: { key: MilestoneFrequency; label: string; hint?: string }[] = [
  { key: 'daily',       label: 'Daily' },
  { key: 'x_weekly',    label: 'X days / week',  hint: '→ pick 1–6' },
  { key: 'weekly',      label: 'Weekly' },
  { key: 'monthly',     label: 'Monthly' },
  { key: 'custom_days', label: 'Custom days',    hint: '→ pick days' },
  { key: 'once',        label: 'Once' },
];

interface Props {
  visible: boolean;
  frequency: MilestoneFrequency;
  daysPerWeek: number;
  customDays: number[];
  onSelect: (freq: MilestoneFrequency, daysPerWeek: number, customDays: number[]) => void;
  onClose: () => void;
}

export function FrequencyPickerModal({ visible, frequency, daysPerWeek, customDays, onSelect, onClose }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Frequency</Text>
          <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {FREQUENCIES.map((f) => {
            const selected = frequency === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.option, selected && { backgroundColor: colors.primary }]}
                onPress={() => onSelect(f.key, daysPerWeek, customDays)}
                activeOpacity={0.8}
              >
                <Text style={[s.optionText, selected && s.optionTextSelected]}>{f.label}</Text>
                {f.hint && !selected && (
                  <Text style={s.optionHint}>{f.hint}</Text>
                )}
                {selected && (
                  <MaterialCommunityIcons name="check" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            );
          })}

          {frequency === 'x_weekly' && (
            <View style={s.subPicker}>
              <Text style={s.subPickerLabel}>Days per week</Text>
              <View style={s.chipRow}>
                {[1, 2, 3, 4, 5, 6].map((n) => {
                  const sel = daysPerWeek === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[s.chip, sel && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => onSelect('x_weekly', n, customDays)}
                    >
                      <Text style={[s.chipText, { color: sel ? '#fff' : colors.text }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {frequency === 'custom_days' && (
            <View style={s.subPicker}>
              <Text style={s.subPickerLabel}>Pick days</Text>
              <View style={s.chipRow}>
                {DAY_NUMBERS.map((n, i) => {
                  const sel = customDays.includes(n);
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[s.chip, sel && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => {
                        const next = sel
                          ? customDays.filter((d) => d !== n)
                          : [...customDays, n].sort((a, b) => a - b);
                        onSelect('custom_days', daysPerWeek, next);
                      }}
                    >
                      <Text style={[s.chipText, { color: sel ? '#fff' : colors.text }]}>{DAY_LABELS[i]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity style={[s.doneBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.background },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:             { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text },
  closeBtn:          { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content:           { padding: 16, gap: 8, paddingBottom: 32 },
  option:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.card, borderRadius: 12 },
  optionText:        { fontSize: FS.body, lineHeight: LH.body, color: colors.text, fontWeight: FW.medium },
  optionTextSelected:{ color: '#fff' },
  optionHint:        { fontSize: FS.caption, lineHeight: LH.caption, color: colors.textSecondary },
  subPicker:         { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 10 },
  subPickerLabel:    { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold, color: colors.text },
  chipRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:              { width: 40, height: 40, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  chipText:          { fontSize: FS.secondary, fontWeight: FW.semibold },
  doneBtn:           { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneBtnText:       { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold, color: '#fff' },
});
```

- [ ] **Step 2: Verify the file exists with no TypeScript errors**

Run:
```bash
cd /Users/baselabdel-rahman/Coding/goalbuddy/mobile
npx tsc --noEmit 2>&1 | grep FrequencyPickerModal
```

Expected: no output (no errors for this file).

- [ ] **Step 3: Commit**

```bash
cd /Users/baselabdel-rahman/Coding/goalbuddy
git add mobile/features/goals/components/FrequencyPickerModal.tsx
git commit -m "feat: add FrequencyPickerModal bottom sheet for milestone frequency selection"
```

---

## Task 5: Goal Form — Milestone Section Redesign

**Files:**
- Modify: `mobile/features/goals/screens/GoalsScreen.tsx`

This task wires up `FrequencyPickerModal`, adds edit/delete to milestone rows, makes milestones required, and fixes the save to pass `daysPerWeek`/`customDays`.

- [ ] **Step 1: Import `FrequencyPickerModal`**

At the top of `GoalsScreen.tsx`, find the existing imports from `../components/` and add:

```ts
import { FrequencyPickerModal } from '../components/FrequencyPickerModal';
```

- [ ] **Step 2: Add new state variables for edit mode and frequency picker**

Find the state declarations in `GoalsScreen` (around line 1059–1062, the `msTitle`, `msFreq`, `msDaysPerWeek`, `msCustomDays` lines). Add two new state variables after them:

```ts
  const [msEditingId, setMsEditingId] = useState<string | null>(null);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
```

- [ ] **Step 3: Update `handleCloseAdd` to reset new state**

Find `handleCloseAdd` (around line 1067). Add resets for the two new state variables:

**Old:**
```ts
  const handleCloseAdd = useCallback(() => {
    setShowAdd(false);
    setNewTitle(''); setNewCategory(''); setNewDescription(''); setNewIsPublic(true); setNewCoopOpen(false);
    setDraftMilestones([]); setMsTitle(''); setMsFreq('once');
  }, []);
```

**New:**
```ts
  const handleCloseAdd = useCallback(() => {
    setShowAdd(false);
    setNewTitle(''); setNewCategory(''); setNewDescription(''); setNewIsPublic(true); setNewCoopOpen(false);
    setDraftMilestones([]); setMsTitle(''); setMsFreq('daily');
    setMsDaysPerWeek(3); setMsCustomDays([1, 2, 3, 4, 5]);
    setMsEditingId(null); setShowFreqPicker(false);
  }, []);
```

- [ ] **Step 4: Fix `handleAddGoal` to pass `daysPerWeek` and `customDays` to the API**

Find the `createMilestoneApi` call inside `handleAddGoal` (line ~1085):

**Old:**
```ts
        await Promise.all(draftMilestones.map((ms) => createMilestoneApi(newGoal.id, ms.title, ms.frequency)));
```

**New:**
```ts
        await Promise.all(draftMilestones.map((ms) =>
          createMilestoneApi(newGoal.id, ms.title, ms.frequency, ms.daysPerWeek, ms.customDays)
        ));
```

- [ ] **Step 5: Replace the milestone section in the form JSX**

Find the entire milestones section in the Add Goal Modal JSX (lines ~1234–1289). Replace everything from the `{/* Milestones section */}` comment through the closing `</View>` of `msDraftAddForm` with:

```tsx
            {/* Milestones section */}
            <View style={s.msSectionHeader}>
              <View style={s.msSectionHeaderLeft}>
                <Text style={[s.inputLabel, { color: colors.text, marginTop: 0 }]}>Milestones</Text>
                <Text style={s.msRequired}>* required</Text>
              </View>
              <Text style={[s.msAtLeast, { color: colors.textSecondary }]}>at least 1</Text>
            </View>

            {draftMilestones.map((ms) => (
              <View key={ms.id} style={[s.msDraftRow, { backgroundColor: colors.primaryLight, borderColor: '#d0e8d8' }]}>
                <View style={[s.msDraftFreqBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[s.msDraftFreqText, { color: '#fff' }]}>{FREQ_LABELS[ms.frequency]}</Text>
                </View>
                <Text style={[s.msDraftTitle, { color: colors.text }]} numberOfLines={1}>{ms.title}</Text>
                <View style={s.msDraftActions}>
                  <TouchableOpacity
                    style={[s.msDraftActionBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      setMsTitle(ms.title);
                      setMsFreq(ms.frequency);
                      setMsDaysPerWeek(ms.daysPerWeek ?? 3);
                      setMsCustomDays(
                        ms.customDays ? ms.customDays.split(',').map(Number) : [1, 2, 3, 4, 5]
                      );
                      setMsEditingId(ms.id);
                    }}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.msDraftActionBtn, { borderColor: '#f5c6cb' }]}
                    onPress={() => setDraftMilestones((prev) => prev.filter((m) => m.id !== ms.id))}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={[s.msDraftAddForm, { backgroundColor: colors.background, borderColor: '#ccc', borderStyle: 'dashed' }]}>
              <TextInput
                style={[s.msDraftInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                value={msTitle}
                onChangeText={setMsTitle}
                placeholder="e.g. Go for a 30-min run"
                placeholderTextColor={colors.textSecondary}
              />

              <TouchableOpacity
                style={[s.msFreqRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowFreqPicker(true)}
                activeOpacity={0.8}
              >
                <View style={s.msFreqRowLeft}>
                  <MaterialCommunityIcons name="repeat" size={16} color={colors.textSecondary} />
                  <Text style={[s.msFreqRowLabel, { color: colors.text }]}>Frequency</Text>
                </View>
                <View style={s.msFreqRowRight}>
                  <Text style={[s.msFreqRowValue, { color: colors.primary }]}>{FREQ_LABELS[msFreq]}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.msDraftAddBtn, { backgroundColor: msTitle.trim() ? colors.primary : colors.border }]}
                onPress={() => {
                  if (!msTitle.trim()) return;
                  const customDaysStr = msFreq === 'custom_days' ? msCustomDays.sort((a, b) => a - b).join(',') : undefined;
                  if (msEditingId) {
                    setDraftMilestones((prev) =>
                      prev.map((m) =>
                        m.id === msEditingId
                          ? { ...m, title: msTitle.trim(), frequency: msFreq, daysPerWeek: msFreq === 'x_weekly' ? msDaysPerWeek : undefined, customDays: customDaysStr }
                          : m
                      )
                    );
                    setMsEditingId(null);
                  } else {
                    setDraftMilestones((prev) => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        title: msTitle.trim(),
                        frequency: msFreq,
                        daysPerWeek: msFreq === 'x_weekly' ? msDaysPerWeek : undefined,
                        customDays: customDaysStr,
                      },
                    ]);
                  }
                  setMsTitle('');
                  setMsFreq('daily');
                  setMsDaysPerWeek(3);
                  setMsCustomDays([1, 2, 3, 4, 5]);
                }}
                disabled={!msTitle.trim()}
              >
                <MaterialCommunityIcons name={msEditingId ? 'check' : 'plus'} size={16} color="#fff" />
                <Text style={s.msDraftAddBtnText}>{msEditingId ? 'Update Milestone' : '+ Add Milestone'}</Text>
              </TouchableOpacity>
            </View>

            <FrequencyPickerModal
              visible={showFreqPicker}
              frequency={msFreq}
              daysPerWeek={msDaysPerWeek}
              customDays={msCustomDays}
              onSelect={(freq, dpw, cd) => {
                setMsFreq(freq);
                setMsDaysPerWeek(dpw);
                setMsCustomDays(cd);
              }}
              onClose={() => setShowFreqPicker(false)}
            />
```

- [ ] **Step 6: Update Save button to require at least 1 milestone**

Find the Save button (around line 1291):

**Old:**
```tsx
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }, (!newTitle || !newCategory) && { opacity: 0.5 }]}
              onPress={handleAddGoal}
              disabled={!newTitle || !newCategory || addMutation.isPending}
            >
              {addMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>
                    Save Goal{draftMilestones.length > 0 ? ` + ${draftMilestones.length} milestone${draftMilestones.length > 1 ? 's' : ''}` : ''}
                  </Text>}
            </TouchableOpacity>
```

**New:**
```tsx
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }, (!newTitle || !newCategory || draftMilestones.length === 0) && { opacity: 0.5 }]}
              onPress={handleAddGoal}
              disabled={!newTitle || !newCategory || draftMilestones.length === 0 || addMutation.isPending}
            >
              {addMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>
                    Save Goal + {draftMilestones.length} milestone{draftMilestones.length !== 1 ? 's' : ''}
                  </Text>}
            </TouchableOpacity>
```

- [ ] **Step 7: Add new styles to `makeStyles`**

In the `makeStyles` function at the bottom of `GoalsScreen.tsx`, add these styles alongside the existing `msDraft*` styles:

```ts
  msSectionHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  msSectionHeaderLeft:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  msRequired:         { fontSize: FS.caption, lineHeight: LH.caption, color: '#ef4444', fontWeight: FW.semibold },
  msAtLeast:          { fontSize: FS.caption, lineHeight: LH.caption },
  msDraftActions:     { flexDirection: 'row', gap: 6 },
  msDraftActionBtn:   { width: 26, height: 26, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  msFreqRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  msFreqRowLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msFreqRowLabel:     { fontSize: FS.secondary, lineHeight: LH.secondary },
  msFreqRowRight:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  msFreqRowValue:     { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  msDraftAddBtnText:  { color: '#fff', fontSize: FS.secondary, fontWeight: FW.semibold },
```

Also update `msDraftAddBtn` to use `flexDirection: 'row'` and `gap: 6` so the icon and text sit side by side. Find the existing `msDraftAddBtn` style and replace it:

**Old (wherever it is):**
```ts
  msDraftAddBtn: { ... }
```

Find the line with `msDraftAddBtn` in `makeStyles` and replace with:
```ts
  msDraftAddBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
```

- [ ] **Step 8: Verify on emulator**

Open the New Goal form. Confirm:
- Milestones section header shows `* required` in red and `at least 1` hint
- Save button is disabled (greyed) when no milestones are added
- Frequency row shows current selection and opens `FrequencyPickerModal` on tap
- In picker: Daily/Weekly/Monthly/Once are single-tap; X days/week shows 1–6 chips; Custom days shows M–S toggles
- Adding a milestone: shows as a row with green frequency badge, edit (pencil) and delete (X) icons
- Tapping edit: populates the form inputs with that milestone's data, button changes to "Update Milestone"
- Tapping Update: replaces the item in place, form resets
- Save button enables and shows count once ≥1 milestone is added

- [ ] **Step 9: Commit**

```bash
cd /Users/baselabdel-rahman/Coding/goalbuddy
git add mobile/features/goals/screens/GoalsScreen.tsx
git commit -m "feat: milestone section redesign — frequency picker modal, edit/delete, required gate"
```

---

## Post-Implementation

- [ ] Push all commits:

```bash
cd /Users/baselabdel-rahman/Coding/goalbuddy
git push
```

- [ ] Do a full smoke test on the emulator covering all 5 changes end-to-end
