# GoalBuddy — Development Guide (v2026.3)

## Engineering Standards (MANDATORY)
All code must strictly follow `/engineering_standards.md`. Core rules:

### 📱 Mobile (Expo/React Native)
- **State**: Use **Zustand Slices** + **Selectors** `useStore(s => s.field)`. Never destructure.
- **Server Data**: **TanStack Query v5** + **Query Key Factories**. 
- **Offline**: Use **MMKV** with TanStack `createPersister`.
- **UI**: 
  - Handle Loading (Skeletons), Empty, Content, and Error states on every screen.
  - Styles: **NativeWind v4** or `useMemo` for `makeStyles`. Never bare in render.
  - Lists: Use **FlashList** (Shopify).
  - Images: Use **expo-image**.
- **UX**: Apply **Optimistic Updates** (`onMutate`) and **Haptics**.

### 🛠 Backend (Node.js/Express)
- **Validation**: Every request must use **Zod** schemas.
- **Typing**: Share interfaces in `shared/`. Use `RequestHandler` types. No `any`.
- **Flow**: Controller/Service pattern. All logic stays in Services.
- **Error Handling**: Use `express-async-errors`. JSON errors must include `retryable: boolean`.
- **DB**: Use **Prisma/Drizzle** (ORM) to prevent SQL injection and N+1 queries.

## Project Structure
- `mobile/` — Expo (SDK 55) app with Expo Router.
- `server/` — Express + TypeScript, PostgreSQL.
- `shared/` — Shared TypeScript types (Contract-first).

## Running the App
```bash
# Server
cd server && npm run dev

# Mobile
cd mobile && npx expo start
```

## Test Accounts
- `bagelbogel@bagelbogel.com` / `1234`

## Workflow & Deployment
- **Feature Check-in**: After completing and verifying a major code change or new feature, ask the user: "Should I commit and push these changes to origin?"
- **Atomic Commits**: Ensure commits are focused and follow the project's commit message style.
