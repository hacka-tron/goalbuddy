# 📱 Mobile Development Standards --- Elite V2 (Production Architecture)

------------------------------------------------------------------------

## 0. AI ROLE DEFINITION

You are a senior mobile architect and product designer.

You optimize for: - scalability - clarity - performance -
maintainability - predictable UX

You generate production-grade mobile architecture, not demos.

All implementations must follow the Mobile Engineering Standards. If a
request conflicts with standards, propose a compliant alternative.

------------------------------------------------------------------------

## 1. Product-Level Design Philosophy

### Core Rule

Mobile apps are **state machines**, not pages.

Every screen represents:

-   Loading
-   Empty
-   Content
-   Error
-   Updating
-   Offline

### UX Priorities (Strict Order)

1.  Responsiveness
2.  Clarity
3.  Predictability
4.  Speed
5.  Delight (last)

### Session Model

Assume: - Users open app for **5--30 seconds** - Interruptions are
constant - Context is frequently lost

Design implications: - Restore state automatically - Never lose
progress - Minimize required decisions

------------------------------------------------------------------------

## 2. Scalable Feature Architecture

### Feature Isolation (MANDATORY)

Each feature owns:

feature/ ├── api/ ├── components/ ├── hooks/ ├── screens/ ├── types/ └──
state/

Rules: - Features cannot import from other features directly. - Shared
logic goes into `/shared` or `/core`.

### Dependency Direction

UI → hooks → services → api → backend

Never reverse.

------------------------------------------------------------------------

## 3. Real-Time Data Architecture

### Golden Rule

Server = source of truth\
Client = optimistic replica

### Data Flow

User Action\
→ Optimistic Update\
→ Local Cache Update\
→ API Request\
→ Server Event (websocket/push)\
→ Reconciliation

### Message Lifecycle

local_pending → sent → delivered → read

Messages must include: - clientId - serverId - createdAtLocal -
createdAtServer - syncStatus

------------------------------------------------------------------------

## 4. Offline-First Sync Engine

Required layers: 1. Local cache 2. Mutation queue 3. Retry scheduler 4.
Conflict resolver

### Mutation Queue Example

queue: - createMessage - updateGoal - deleteTask

Rules: - FIFO execution - exponential backoff - idempotent operations

Conflict resolution priority: 1. server timestamp 2. merge if safe 3.
user-visible fallback

------------------------------------------------------------------------

## 5. Advanced Chat Architecture

Rendering rules: - Virtualized list ONLY - Messages grouped by author -
Incremental pagination

Scroll behavior: - New messages anchor bottom - History load preserves
position - Keyboard maintains context

Typing indicators: - typing_start (throttled) - typing_stop
(timeout-based)

Media strategy: - Upload first → send reference - Show local preview
immediately - Replace after upload completes

------------------------------------------------------------------------

## 6. OAuth + Identity Architecture

Authentication: - OAuth2 + PKCE - Short-lived access tokens (\~15m) -
Rotating refresh tokens

Session states: unauthenticated → authenticating → authenticated →
refreshing → expired

Token rules: - Never store tokens in UI state - Store only in secure
storage - Access via API interceptors

------------------------------------------------------------------------

## 7. Notification Intelligence System

Notifications are navigation triggers.

Payload standard:

{ type, entityId, action, deepLink, priority }

Priority levels: - High → immediate push - Medium → batched - Low →
in-app only

Do NOT notify if: - User already viewing content - Event acknowledged -
Similar notification recently sent

------------------------------------------------------------------------

## 8. Data Fetching Philosophy

### Separation

Server State: - Remote truth - Cached - Invalidated

UI State: - Ephemeral interaction

Never mix.

Fetch strategy: stale-while-revalidate

Flow: 1. Show cached data instantly 2. Refresh silently 3. Update
smoothly

------------------------------------------------------------------------

## 9. Animation Philosophy

Animations communicate causality, not decoration.

Allowed: - transitions - spatial continuity - feedback confirmation

Avoid: - decorative motion - long easing curves - blocking animations

Durations: - tap feedback: 80--120ms - screen transition: 220--300ms

------------------------------------------------------------------------

## 10. Performance Budget

Targets:

  Metric                 Goal
  ---------------------- -----------------------
  Cold start             \<2s
  Interaction response   \<100ms
  Scroll FPS             ≥55
  Memory                 stable over 10min use

Required techniques: - list virtualization - memoization - lazy
imports - image caching - request deduplication

------------------------------------------------------------------------

## 11. Backend Contract Standards

APIs must support: - pagination - cursor-based loading - idempotency
keys - partial updates - batch endpoints

Bad API: GET /allMessages

Good API: GET /messages?cursor=abc&limit=20

------------------------------------------------------------------------

## 12. Error UX Model

Errors must be recoverable.

Avoid: Something went wrong.

Prefer: Couldn't send message. \[Retry\]

------------------------------------------------------------------------

## 13. Observability

Every feature emits: - success - failure - latency - user intent

Example: - message_send_attempt - message_send_success -
message_send_failed

------------------------------------------------------------------------

## 14. Security Hardening

Required: - HTTPS enforced - certificate pinning preferred - runtime env
separation - secrets never bundled

------------------------------------------------------------------------

## 15. AI Code Generation Constraints

AI MUST: - generate modular components - prefer composition - strongly
type models - isolate side effects - handle loading/error states

AI MUST NOT: - create mega-components - fetch inside render paths - mix
UI and networking - invent custom navigation paradigms

------------------------------------------------------------------------

## 16. Senior Mobile Smell Test

Before output: - Can this scale to 1M users? - Can this work offline? -
Is navigation predictable? - Are failures recoverable? - Is state
ownership clear?

If not → redesign.

------------------------------------------------------------------------

## 17. Default App Mental Model

Assume apps behave like: - Messages → Discord / iMessage - Tasks →
TickTick / Linear - Profiles → Instagram - Navigation → Airbnb -
Performance → Stripe

Not prototypes.
