# GoalBuddy Feature Catalog

> **Maintenance:** This document is the source of truth for all user-facing product features.
> It must be kept in sync with the codebase. Any time a feature is added, changed, or removed,
> update this file in the same commit. See `CLAUDE.md` § Feature Catalog for the update rule.

---

## 1. Authentication & Account Management

### Login & Registration
- Email + password registration (display name, username required)
- Email + password login
- Google OAuth login (PKCE-verified, Expo auth redirect)
- JWT token persisted to AsyncStorage; auto-restored on launch
- Logout clears token and returns to login screen

### User Profile
- View own profile: display name, username, bio, avatar, theme, notification frequency
- Edit display name, bio, avatar URL
- 8 built-in themes: `sage`, `ocean`, `sand`, `rose` (light) · `midnight`, `charcoal`, `forest`, `plum` (dark)
- Custom dark-mode theme: color picker for primary, accent, background
- Notification frequency: instant / daily / weekly / none

---

## 2. Goals

### Creation & Management
- Create goal: title, category, optional description, optional target date
- Goal categories (8): Workout, Study, Career, Health, Creative, Finance, Social, Other
- Edit goal: title, description, target date, status
- Delete goal
- Goal statuses: active, completed, archived

### Visibility & Collaboration Modes
- **Make Public:** toggle `is_public`; requires ≥ 1 milestone
- **Co-op Mode:** toggle `coop_open` (forces `is_public: true`); enables strangers to join and receive an exact copy of the goal
- Co-op and public are coupled — turning off public also disables co-op

### Goal Templates
- Create a new goal from any existing public goal; copies title, category, description, and all milestones

### Business Rules
- One buddy/co-op partner per goal (DB-enforced)
- Goal must have ≥ 1 milestone before it can be made public or co-op
- `coop_open: true` forces `is_public: true` — cannot be decoupled

---

## 3. Milestones & Progress Tracking

### Frequency Options
| Frequency | Behavior |
|---|---|
| Once | Single completion; marked via PATCH |
| Daily | Log once per calendar day |
| Weekly | Log once per calendar week |
| Monthly | Log once per calendar month |
| X-Weekly | Log N times per week (1–7 days/week) |
| Custom Days | Log on specified days of the week (e.g. Mon, Wed, Fri) |

### Schedule Modes
- **Open-ended:** no start/end date; ongoing
- **Time-bound with start date only:** upcoming/active state awareness; no finite denominator
- **Time-bound with start + end date (inclusive):** finite program; shows expected sessions, remaining sessions, % complete

### Milestone Management
- Create milestone: title, description, due date, frequency, schedule mode, start/end dates
- Edit milestone: all fields patchable
- Log progress: marks current period complete (idempotent — double-log returns `logged: false`)
- Undo log: removes current-period log entry
- Delete milestone

### Milestone Stats (per milestone)
- Current streak (consecutive periods completed)
- Total sessions completed (all-time)
- Total expected sessions (open-ended: rolling; finite: derived from date range + frequency)
- For finite milestones only: total expected, sessions remaining, % complete

### Validation Rules
- `time_bound` requires `start_date`
- `end_date` must be ≥ `start_date` when both present
- `x_weekly` requires `days_per_week` (1–7)
- `custom_days` requires at least one weekday selected

---

## 4. Buddy Mode (Accountability Partnership)

### Finding Buddies
- **Swipe Deck:** select a goal → swipe right to like, left to pass on candidates in same category
- **Public Goal Search:** keyword search + category filter + buddy-status filter (unmatched only / all)
- Mutual swipe creates instant connection (haptic feedback + match modal)
- If your goal already has an accepted buddy, deck is locked

### Buddy Connection Lifecycle
- `pending` → `accepted` (via accept) or `declined`
- Both users see shared goal stats once accepted
- Connection type: `accountability`

### Buddy Features (Active Connection)
- Buddy card: name, avatar, activity level badge, streak, milestones completed, overdue count
- View buddy's per-milestone stats: streak, completion rate, skip rate
- Deadline warnings in chat: alert + countdown + progress bar when milestone due within 24h
- Activity level badge: `very_active`, `active`, `occasional`

---

## 5. Co-op Mode (Joint Goal)

- **Publish as Co-op:** set `coop_open: true` on a goal with milestones
- **Join Co-op:** from Finder (swipe or search) → creates an exact copy of the goal for joiner
- Both users track their own copy independently; stats shown side-by-side in chat
- Connection type: `coop`
- Same chat, deadline warnings, and stats features as Buddy Mode

---

## 6. Chat & Check-Ins

### Check-In Messages
- Send message with optional mood emoji
- Optional: associate check-in with a specific milestone
- Paginated history (20 messages per page); infinite scroll loads older messages
- Messages grouped by sender and time with friendly date headers (Today, Yesterday, etc.)

### Real-Time Delivery
- Socket.io: `connection:{connectionId}` room per chat
- Events: `join_connection`, `leave_connection`, `new_checkin`
- JWT-authenticated socket handshake

### Offline Support
- Unsent check-ins queued in MMKV storage
- Auto-retry on app resume when connection restored
- Message status indicators: pending / sent / failed
- Queue survives app restarts

### Chat Features
- Deadline warning card: shows when either partner's milestone is due soon
- Stats side panel: buddy's milestone stats and overall completion metrics
- Stats button in input bar to open stats panel

---

## 7. Finder & Discovery

### Swipe Deck
- Pick goal → see candidates in same category
- Candidate card: name, username, avatar, bio, activity level badge, streak, total check-ins, shared categories
- Swipe right = buddy request; swipe left = pass
- Haptic feedback: medium on like, light on pass
- Real-time mutual match detection

### Public Goal Search
- Search by title (keyword)
- Filter by category
- Filter by buddy status (unmatched only / all)
- Result card: goal title, creator, description, activity level, streak, milestone count, co-op flag
- One-tap join from results

---

## 8. Wins / Milestone Feed

- Timeline of recent milestone completions from self + buddies/co-op partners
- Win card: milestone title, completion date, goal category icon, goal title, author name + avatar
- Own wins vs. buddy wins distinguished (`is_me` flag)
- Pull-to-refresh
- Badge on Wins tab when new wins available
- Empty state with encouraging copy

---

## 9. Buddies Tab

- List of accepted buddy and co-op connections
- Grouped by buddy name (multiple goals with same buddy shown together)
- Buddy card: name, avatar, goal title, activity badge, streak, milestones completed, overdue count
- Badge on tab: unread check-ins + pending requests
- Tap card → open chat
- **Buddy Requests screen:** full-screen list of incoming pending requests; accept or decline

---

## 10. Settings

| Setting | Options |
|---|---|
| Display name | Free text |
| Username | Unique identifier |
| Bio | Short description |
| Avatar | URL |
| Theme | 8 presets + custom dark |
| Notification frequency | Instant / Daily / Weekly / None |
| Sign out | Clears session |

---

## 11. Gamification & Engagement

- **Streaks:** consecutive period completions per milestone; shown on buddy cards and in stats
- **Completion rate:** % of expected sessions completed; shown in stats panel
- **Activity badges:** `very_active`, `active`, `occasional` derived from recent completion data
- **Deadline alerts:** urgency cards in chat when milestone due within 24h
- **Wins feed:** public celebration of completions for you and buddies
- **Response rate:** buddy messaging responsiveness metric
- **Haptic feedback:** on swipe match, primary button actions, destructive actions

---

## 12. Real-Time & Infrastructure

- Socket.io for live check-in delivery (no polling)
- Push notification token management (per user, per device)
- Notification frequency throttling per user preference
- Offline message queue (MMKV) with auto-retry

---

## 13. Navigation Structure

### Tab Bar (5 tabs)
| Tab | Screen |
|---|---|
| Wins | Milestone completion feed |
| Finder | Swipe deck + public goal search |
| Goals | My goals list (home) |
| Buddies | Buddy connections + badge |
| Settings | Profile, theme, logout |

### Additional Screens
| Screen | Access |
|---|---|
| Chat | Tap buddy card in Buddies tab |
| Buddy Requests | Tap pending badge or button in Buddies tab |
| Login / Register | Unauthenticated launch |

---

## 14. Core Data Models (Summary)

| Model | Key Fields |
|---|---|
| User | display_name, username, bio, avatar_url, theme, notification_frequency |
| Goal | title, category, description, target_date, status, is_public, coop_open |
| Milestone | title, frequency, days_per_week, custom_days, schedule_mode, start_date, end_date, due_date |
| Connection | status, connection_type (accountability/coop), goal_id, buddy_id |
| Milestone Log | milestone_id, user_id, period_start, note |
| Check-In | message, mood, author_id, connection_id |
