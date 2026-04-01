# 🛠 GoalBuddy Engineering Standards (v2026.3)

## 📱 Mobile Engineering Standards
### 1. Architecture & State
- **Zustand Slices**: Split the store into logical slices (e.g., `createGoalSlice`). Use Selectors `useStore(s => s.field)` to prevent "God Store" re-render loops.
- **Server State**: TanStack Query (v5+) owns all server data. Use Query Key Factories (e.g., `goalKeys.all`)—never hardcode string keys.
- **Data Flow**: UI → Hooks → Services → API → Backend. Never fetch in render.
- **Offline Resilience**: Use `react-native-mmkv` with TanStack's `createPersister`. Goal data must be visible offline.

### 2. Component Performance
- **Styles**: Use NativeWind v4 for utilities or `useMemo(() => makeStyles(colors), [colors])`. Never call `makeStyles` bare in render.
- **New Architecture**: No legacy native modules or `findNodeHandle`. Use Expo Modules API only.
- **Image Handling**: Always use `expo-image` for high-performance caching and blur-up placeholders.
- **Lists**: Use `FlashList` (Shopify) for complex lists or `FlatList` for basics. Implement `getItemLayout` for fixed-height rows.

### 3. UX & Interaction
- **Screen States**: Every screen must handle Loading (Skeletons), Empty, Content, and Error (Actionable) states.
- **Edge-to-Edge**: Android must be translucent; use `expo-system-ui` to sync root background colors and prevent splash-screen flashes.
- **Optimistic Updates**: Use TanStack `onMutate` to update UI immediately; rollback on failure.
- **Haptics**: Apply subtle haptic feedback (`expo-haptics`) to primary success/error actions.

---

## 🛠 Backend Engineering Standards (Node.js/Express)
### 1. Type Safety & Validation
- **Zod Validation**: Every request (`req.body`, `req.query`, `req.params`) must be validated using Zod schemas before reaching the controller.
- **Shared Types**: Use a `shared/` directory or a monorepo structure to share TypeScript interfaces between the Express server and Expo app to ensure 100% type-safe API calls.
- **Strict Typing**: Avoid `any` at all costs. Use `RequestHandler` types from Express to define controller signatures.

### 2. Architecture & Middleware
- **Controller/Service Pattern**: Logic stays in Services; Controllers only handle request/response orchestration.
- **Async Error Handling**: Use an `asyncHandler` wrapper or `express-async-errors` to ensure all rejected promises are caught by the global error middleware without crashing the node process.
- **Security**: Standardize on `Helmet.js` for headers and ensure your custom Deny List logic is implemented as a top-level Express middleware.

### 3. Performance & Database (PostgreSQL)
- **Prisma/Drizzle**: (Assuming an ORM) Use Type-safe queries. Avoid raw strings for SQL to prevent injection.
- **Connection Pooling**: Ensure PostgreSQL connections are pooled correctly to handle the concurrent nature of Node.
- **N+1 Prevention**: Always use `include` (Prisma) or `leftJoin` (Drizzle) to fetch Goal and Buddy data in a single query.

### 4. API Resilience
- **JSON Consistency**: All error responses must follow a standard structure: `{ error: string, code: string, retryable: boolean }`.
- **Graceful Shutdown**: Implement listeners for `SIGTERM` and `SIGINT` to close database connections before the process exits.

---

## 🧪 Testing Requirements

**Every new feature must include tests before it is considered complete.**

- **Backend features**: add integration tests to the relevant `server/src/__tests__/*.test.ts` suite. New routes → test happy path, validation errors (400), auth failures (401), and business rule violations. New utilities → unit tests covering all branches.
- **Mobile features**: add unit/component tests for any new hooks (query + mutation), utility functions, and non-trivial components.
- **New seed data shapes**: update `server/src/__tests__/setup/db-helpers.ts` seed helpers to accept the new fields.
- Tests must pass (`npm test`) before the feature is merged or committed as complete.

---

## 🧪 Test Architecture

### Mobile — Unit & Component Tests

**Stack**: `jest-expo` preset · `@testing-library/react-native` · mocked API layer

**Run**: `cd mobile && npm test`

**Config**: `mobile/jest.config.js` · setup file: `mobile/jest.setup.ts`

#### What the setup file mocks (applied globally to every test)
| Mock | Why |
|---|---|
| `./store/themeStore` | Provides stable `sage` colors — prevents Zustand store from reading AsyncStorage |
| `./lib/api` (`apiFetch`) | Starts as a failing stub — each test explicitly controls the response |
| `expo-haptics` | Side-effect-free in CI |
| `expo-router` | Provides `router`, `useRouter`, `useLocalSearchParams`, etc. |
| `expo-image` | Renders as a plain `View` |
| `react-native-mmkv` | In-memory stub |
| `@expo/vector-icons` | Renders icon name as a `<Text testID="material-community-icon">` |
| `global.fetch` | Fails loudly — all network must go through `apiFetch` |

#### What to test
| Layer | Tool | What |
|---|---|---|
| Pure utilities (`validation.ts`, helpers) | Plain Jest | All branches of the function |
| Query hooks (`useGoals`, `useCheckins`, …) | `renderHook` + `waitFor` | loading / success / error states |
| Mutation hooks (`useCreateGoal`, `useDeleteGoal`, …) | `renderHook` + `act` | success path, optimistic update, error rollback |
| UI primitives (`ScreenState`, `Skeleton`, …) | `render` + `screen` | all prop combinations including optional omissions |
| Feature components (`GoalCard`, `SwipeCard`, …) | `render` + `fireEvent` | renders correctly, user interactions call correct callbacks |

#### Hook test pattern
```tsx
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}
```

#### What NOT to test
- Screen files (too much integration surface — covered by E2E)
- Zustand store slices directly (test via consuming components/hooks)
- Navigation calls (mock `router` and assert `router.push` was called)

---

### Server — Integration Tests

**Stack**: `jest` + `ts-jest` · `supertest` · real PostgreSQL (`goalbuddy_test` DB)

**Run**: `cd server && npm test`

**Config**: `server/jest.config.js` · env setup: `server/jest-env-setup.js`

#### Architecture
```
server/src/__tests__/
├── setup/
│   ├── db-helpers.ts      — testPool, truncateAll(), seed helpers
│   ├── global-setup.ts    — runs once before all suites
│   └── global-teardown.ts — closes testPool after all suites
├── auth.test.ts
├── users.test.ts
├── goals.test.ts
├── milestones.test.ts
├── buddies.test.ts
├── checkins.test.ts
├── finder.test.ts
├── stats.test.ts
└── middleware.test.ts
```

#### Key rules
- **No DB mocking** — tests hit a real `goalbuddy_test` PostgreSQL database
- **`truncateAll()` in `beforeEach`** — every test starts with a clean slate
- **`seedUser()` returns `{ ...user, token }`** — token signed with `test-secret-key`
- **`--runInBand`** — tests run serially to avoid connection pool contention
- **`jest-env-setup.js` in `setupFiles`** — sets `DATABASE_URL` before any module evaluates (prevents `db/index.ts` pool from pointing at the dev DB)

#### Seed helper signatures
```ts
seedUser(overrides?)                                          // → { id, email, token, … }
seedGoal(userId, { category?, isPublic?, coopOpen? })        // → goal row
seedMilestone(goalId, userId, { title?, frequency? })        // → milestone row
seedConnection(requesterId, receiverId, goalId, { status? }) // → connection row
seedCheckin(connectionId, authorId, { message?, mood? })     // → check_in row
```

#### What each suite covers
| File | Scope |
|---|---|
| `auth.test.ts` | register (201/409/400), login (200/401), JWT issues |
| `users.test.ts` | GET /me, PATCH /me, GET /:id (404) |
| `goals.test.ts` | CRUD, public goal filter/search, from-template, stats, ownership |
| `milestones.test.ts` | create, update, log (idempotent/201), undo (204), feed |
| `buddies.test.ts` | request accountability/coop, accept/decline, list, goal-stats |
| `checkins.test.ts` | create (accepted/pending/forbidden), paginated GET with cursor |
| `finder.test.ts` | deck candidates, swipe pass/like/mutual match |
| `stats.test.ts` | GET by userId, 404 for non-existent user |
| `middleware.test.ts` | auth failures, Zod 400, error response shape `{ error, code, retryable }` |
