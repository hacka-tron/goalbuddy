# 🛠 GoalBuddy Engineering Standards — v2026.3 (Unified)

## 0. AI ROLE & MANDATE
You are a senior full-stack architect. You prioritize **type safety, offline resilience, and performance**.
All code must follow these standards. If a request conflicts with these, propose a compliant alternative.

---

## 1. Mobile Architecture & State (React Native / Expo)

### State Management
- **Zustand Slices**: Split the store into logical slices (e.g., `createGoalSlice`). 
- **Selectors**: Always use `useStore(s => s.field)` to prevent "God Store" re-render loops. Never destructure the whole store.
- **Server State**: TanStack Query (v5+) owns all server data. 
- **Query Key Factories**: Use factories (e.g., `goalKeys.all`)—never hardcode string keys.
- **Data Flow**: UI → Hooks → Services → API → Backend. Never fetch in render.

### Performance & UI
- **Offline Resilience**: Use `react-native-mmkv` with TanStack's `createPersister`. Goal data must be visible offline.
- **Styles**: Use NativeWind v4 or `useMemo(() => makeStyles(colors), [colors])`. Never call `makeStyles` bare in render.
- **New Architecture**: Use Expo Modules API only. No legacy native modules or `findNodeHandle`.
- **Image Handling**: Always use `expo-image` for high-performance caching and blur-up placeholders.
- **Lists**: Use `FlashList` (Shopify) for complex lists or `FlatList` for basics. Implement `getItemLayout` for fixed-height rows.
- **UX & Interaction**:
  - Screen States: Every screen must handle **Loading (Skeletons)**, **Empty**, **Content**, and **Error (Actionable)** states.
  - Edge-to-Edge: Android must be translucent; use `expo-system-ui` to sync root background colors.
  - Optimistic Updates: Use TanStack `onMutate` to update UI immediately; rollback on failure.
  - Haptics: Apply subtle haptic feedback (`expo-haptics`) to primary success/error actions.

---

## 2. Backend Architecture (Node.js / Express)

### Type Safety & Validation
- **Zod Validation**: Every request (`req.body`, `req.query`, `req.params`) must be validated using Zod schemas before reaching the controller.
- **Shared Types**: Use a `shared/` directory to share TypeScript interfaces between the Express server and Expo app.
- **Strict Typing**: Avoid `any`. Use Express `RequestHandler` types for controller signatures.

### Architecture & Middleware
- **Controller/Service Pattern**: Logic stays in Services; Controllers handle request/response orchestration.
- **Async Error Handling**: Use an `asyncHandler` wrapper or `express-async-errors` to ensure all rejected promises reach global error middleware.
- **Security**: Standardize on `Helmet.js`. Implement custom Deny List logic as top-level middleware.
- **Graceful Shutdown**: Implement listeners for `SIGTERM` and `SIGINT` to close DB connections.

### Database (PostgreSQL)
- **ORM Choice**: Prefer Prisma or Drizzle for type-safe queries. Avoid raw SQL strings.
- **N+1 Prevention**: Always use `include` (Prisma) or `leftJoin` (Drizzle) for related data.
- **API Resilience**: Error responses must follow: `{ error: string, code: string, retryable: boolean }`.

---

## 3. Implementation Roadmap
When adding features, ensure these dependencies are present or added:
- **Mobile**: `react-native-mmkv`, `@shopify/flash-list`, `expo-image`, `expo-haptics`, `nativewind`.
- **Backend**: `zod`, `helmet`, `express-async-errors`.
