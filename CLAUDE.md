# GoalBuddy — Development Guide (v2026.3)

> This is the primary reference for any AI agent or developer working on this codebase.
> Read this file before touching any code. For detailed engineering rules see `engineering_standards.md`.

---

## 1. Product Vision

GoalBuddy helps people complete their goals by combining gamification with social accountability, making goal tracking motivating, simple, and social.

**Core modes:**
- **Buddy Mode** — Two users each pursue their own separate goal in the same category. They coach each other: viewing each other's stats, sending nudges, suggesting milestone adjustments, and providing accountability through social pressure.
- **Co-op Mode** — One user publishes a public goal with milestones; another joins and gets an exact copy of that goal. Both pursue the same objective together and hold each other accountable.
- **Discover / Finder** — Users find partners via search (public goals browse) or a swipe-style deck that recommends compatible partners by goal category.

**UX philosophy:** Lightweight and fast. Interactions are designed to take seconds — mark progress, send a nudge, check a streak — then get out of the app. Gamification (streaks, completion rates, activity badges) is visible but never overwhelming. The interface is calm and focused, not cluttered.

**Non-negotiable product rules:**
- One buddy/co-op partner per goal (enforced at DB level)
- A goal must have at least one milestone before it can be made public or co-op
- `coop_open: true` forces `is_public: true` — they are coupled
- Buddy Mode connections use `connection_type = 'accountability'`; Co-op connections use `connection_type = 'coop'`

---

## 2. System Architecture

### Stack
| Layer | Technology |
|---|---|
| Mobile | Expo SDK 55, Expo Router (file-based), React Native |
| Server state | TanStack Query v5 + Query Key Factories |
| Client state | Zustand (unified store with slices) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL — raw SQL via `query()` helper in `server/src/db/index.ts` |
| Auth | JWT (Bearer token) + Passport.js (Google OAuth) |
| Real-time | Socket.io — connection rooms for live check-ins |
| Offline | MMKV via Zustand slices (auth, theme, notification state) |
| Shared types | `shared/types/index.ts` — source of truth for cross-stack interfaces |

### Key architectural rules
- **No ORM.** The codebase uses raw SQL via `query()`. Do not suggest or introduce Prisma or Drizzle.
- **Data flow direction:** `UI → hooks → api.ts → Express routes → DB`. Never reverse. Never fetch inside a component body.
- **Server state vs. client state:** TanStack Query owns all server data. Zustand owns only UI/session state (auth, theme, notifications). Never put server data in Zustand.
- **Shared types are the contract.** When adding a new server response field, update `shared/types/index.ts` first, then the route, then the mobile type.

### API client
- File: `mobile/lib/api.ts`
- Base URL: `http://10.0.2.2:3000` (Android emulator localhost)
- Auth: Bearer token read from AsyncStorage via `getToken()`
- All requests go through `apiFetch(path, options)` — never call `fetch` directly in feature code

### Socket.io (real-time)
- Initialized in `server/src/socket/index.ts`
- JWT-authenticated handshake
- Rooms: `connection:{connectionId}` — joined when a user opens a chat screen
- Events: `join_connection`, `leave_connection`
- Purpose: live check-in delivery in the Chat screen without polling

### QueryClient defaults (`app/_layout.tsx`)
- `staleTime: 2 min` — data stays fresh for 2 minutes, no refetch on screen revisit
- `gcTime: 10 min` — unused cache retained for 10 minutes
- `retry: 1`

---

## 3. Screens & Component Hierarchy

### Routing structure (`mobile/app/`)
```
app/
├── index.tsx                  — Splash/redirect: checks auth, sends to (auth) or (tabs)
├── _layout.tsx                — Root layout: QueryClientProvider, theme load, auth restore
├── (auth)/
│   ├── _layout.tsx            — Auth stack (no tab bar)
│   ├── login.tsx              — Login screen
│   └── register.tsx           — Register screen
├── (tabs)/
│   ├── _layout.tsx            — Tab bar config (5 tabs, icons, badge on Buddies)
│   ├── milestones.tsx         — Tab 1 (leftmost): Wins/milestones feed
│   ├── finder.tsx             — Tab 2: Swipe deck / public goal search
│   ├── goals.tsx              — Tab 3 (center/home): My goals list
│   ├── buddies.tsx            — Tab 4: Buddy connections list (badge = unread + pending)
│   └── settings.tsx           — Tab 5: Profile, theme, logout
├── buddy-requests.tsx         — Full-screen pending request list
└── chat/
    └── [id].tsx               — Full-screen 1-on-1 chat (dynamic route, no tab bar)
```
Tab files are thin shells — they import and render from `features/*/screens/`.

### Feature modules (`mobile/features/`)
Each feature follows the same structure: `api.ts` | `hooks.ts` | `types.ts` | `screens/` | `components/`

| Feature | Screen | Key components |
|---|---|---|
| `auth` | LoginScreen, RegisterScreen | — |
| `goals` | GoalsScreen | GoalCard |
| `finder` | FinderScreen | SwipeCard |
| `buddies` | BuddiesScreen | BuddyCard, BuddyRequestsView |
| `chat` | ChatScreen | MessageBubble, ChatInput |
| `milestones` | MilestonesScreen | WinCard |
| `settings` | SettingsScreen | — |

### Shared UI primitives (`mobile/components/ui/`)
These exist — use them, don't recreate them.

| Component | Purpose |
|---|---|
| `ScreenState` | Empty and error states. Props: `type` ('empty'\|'error'), `title`, `message`, `icon`, `onRetry`, `retryLabel` |
| `Skeleton` | Animated shimmer placeholder. Props: `width`, `height`, `borderRadius`, `style` |
| `CardSkeleton` | Pre-built card-shaped skeleton with avatar + two lines |
| `ActivityBadge` | Colored dot/label showing activity level ('very_active', 'active', 'occasional'). Also in `shared/components/` — use the one in `components/ui/` |
| `CategoryIcon` | Goal category icon (wraps MaterialCommunityIcons with category key mapping) |

### Component responsibility rules
- **Screen files** orchestrate layout, data fetching hooks, and navigation. No business logic.
- **Feature components** (e.g. `GoalCard`, `SwipeCard`) are domain-aware — they know about goal/buddy types.
- **UI primitives** (`components/ui/`) are domain-agnostic — they take generic props, no API awareness.
- **Do not** create a new shared component without adding it to this list.

---

## 4. Design System

### Typography — `mobile/theme/typography.ts`
Always import `FS`, `FW`, `LH`, or `Typography` objects. Never hardcode font size numbers.

```
FS.display = 32    FW.regular  = '400'    LH.display  = 44
FS.title   = 24    FW.medium   = '500'    LH.title    = 34
FS.section = 20    FW.semibold = '600'    LH.section  = 28
FS.body    = 16    FW.bold     = '700'    LH.body     = 22
FS.secondary = 14                         LH.secondary = 20
FS.caption = 12                           LH.caption   = 17
```

### Colors — `mobile/lib/constants.ts`
Always use theme colors via `useThemeStore(s => s.colors)`. Never hardcode hex values except for semantic one-offs (e.g. error red `#EF4444`, warning amber `#F59E0B`).

Semantic color roles: `background`, `card`, `primary`, `primaryLight`, `accent`, `accentLight`, `text`, `textSecondary`, `border`, `white`

8 built-in themes: `sage`, `ocean`, `sand`, `rose` (light) · `midnight`, `charcoal`, `forest`, `plum` (dark)

### Spacing scale
Based on a 4px base grid. Use these values — do not introduce arbitrary numbers.

| Token | Value | Use |
|---|---|---|
| `xs` | 4 | Icon-to-text gap, tight inline spacing |
| `sm` | 8 | Badge padding, compact rows |
| `md` | 12 | Default component gap |
| `lg` | 16 | Card padding, screen horizontal padding |
| `xl` | 24 | Section separation |
| `xxl` | 32 | Screen-level padding, large vertical gaps |

Common exceptions: `paddingVertical: 10` for buttons/pills, `paddingHorizontal: 14` for chat bubbles.

### Border radius conventions
| Context | Value |
|---|---|
| Tags, badges, chips | 6–8 |
| Buttons, inputs, small cards | 12 |
| Cards, sheets, modals | 16 |
| Chat bubbles | 18 |
| Circular avatars | `width / 2` (full circle) |

### Icon library
`@expo/vector-icons` → `MaterialCommunityIcons` exclusively. Type icons with:
```ts
type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
```

### UI copy tone
- Empty states: Warm and encouraging. "No check-ins yet. Say hello!" not "No data found."
- Errors: Specific and actionable. "Couldn't load goals — check your connection." with a Retry button. Never "Something went wrong."
- Action labels: Short verbs. "Buddy Up", "Join Co-op", "Try Again", "Save" — not "Submit" or "Confirm Action".

---

## 5. Engineering Standards (Non-Negotiable)

Full rules in `engineering_standards.md`. Key constraints:

### Mobile
- Styles: `useMemo(() => makeStyles(colors), [colors])` — never call `makeStyles` bare in render
- Zustand: `useStore(s => s.field)` selector syntax always — never `const { x } = useStore()`
- Every screen must handle all 4 states: **Loading** (Skeletons), **Empty** (ScreenState), **Content**, **Error** (ScreenState with onRetry)
- Mutations: optimistic updates via `onMutate` → cache update, `onError` → rollback
- Lists: `FlashList` for any list that may have >10 items; `ScrollView` only for short fixed content
- Images: `expo-image` always — never `<Image>` from React Native
- Haptics: `expo-haptics` on primary success/destructive actions

### Backend
- Every `req.body`, `req.query`, `req.params` must be validated with a Zod schema via `validate()` middleware before the handler runs
- Error responses must follow `{ error: string, code: string, retryable: boolean }`
- Use `express-async-errors` — never wrap handlers in try/catch for the purpose of preventing crashes
- No `any` types. Use `AuthRequest` for authenticated routes, `RequestHandler` for controllers
- Raw SQL only — no ORM. Use the `query()` helper from `server/src/db/index.ts`

---

## 6. Project Structure
```
goalbuddy/
├── mobile/          — Expo SDK 55 app (Expo Router)
├── server/          — Express + TypeScript backend
├── shared/          — Cross-stack TypeScript types (source of truth)
├── CLAUDE.md        — This file
├── engineering_standards.md  — Full technical standards
└── status.md        — Compliance tracking (what's done / pending)
```

## Running the App
```bash
# Server
cd server && npm run dev

# Mobile
cd mobile && npx expo start
```

## Test Accounts
- `bagelbogel@bagelbogel.com` / `1234`

## Workflow
- After completing a major feature or fix, ask: "Should I commit and push these changes?"
- Commits should be atomic and focused on one logical change
- Check `status.md` before starting work — it tracks what's compliant and what's pending
