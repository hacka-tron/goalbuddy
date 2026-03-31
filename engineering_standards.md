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
