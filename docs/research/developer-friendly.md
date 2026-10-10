# Buildpair: making GoalBuddy developer friendly

> **Partly superseded (2026-10-10).** This report predates the later product decisions: Buildpair is now a social, accountable to-do and goals app for *builders* (not only founders), organized into shared **spaces**, with supporters instead of one buddy, no swiping, and OAuth skipped for now. `PRODUCT.md` is the current source of truth, and `BACKLOG.md` has the plan. The codebase analysis and housekeeping notes below are still accurate.


Research and plan for rebranding GoalBuddy as **Buildpair**, a social accountability app where technical founders and indie hackers pair up (or form small groups) to build their own products alongside each other, check in every week, and guide each other.

- Date: 2026-10-09
- Scope: research plus a plan. No code was changed.
- Full web research with every source: [Buildpair developer research (artifact)](https://claude.ai/artifact/AFeLHvtVnRDaxg9fKdSdEj). This document keeps the findings that drive decisions, with their source links.

## Decisions already made

| Topic | Decision |
|---|---|
| Codebase | **Keep this repo and refactor it.** The stack, auth, buddy connections, check-ins, finder, chat, streaks and tests already cover most of Buildpair's core loop. |
| Product focus | Social accountability first. Partners or small groups set a season goal and send each other weekly check-ins that they read and reply to. |
| Matching | No swiping. A **Discover** screen with "Suggested for you" profile cards that show *why* someone is a match, plus Browse with filters, and "Request to pair" with a short note. |
| Groups | Pairs and small groups of 3–4. |
| Privacy | Private by default. Goals and check-ins are visible only to your partner or group. Users choose to share wins to a community feed. |
| Platforms | One Expo codebase for **web, iOS and Android**. Season 1 leads with the web version because the audience works at laptops. |
| OAuth | **Skipped for now.** Email/password login stays. GitHub sign-in is a later item. |
| Integrations | Later. GitHub/deploy integrations, AI drafts, API/CLI and bots are not in the MVP. |

## Key findings

The research behind the decisions above. Most sources were read through search-result summaries because direct page fetches were blocked during research, so spot-check quotes before reusing them in marketing copy.

### What makes accountability work

- **Reporting progress to someone works.** A meta-analysis of 138 studies found monitoring progress improves goal attainment, and the effect is larger when progress is reported to others ([Harkin et al. 2016](https://eprints.whiterose.ac.uk/91437/)). This is the strongest evidence for the core loop: a weekly report to one specific person who replies.
- **Social support raises completion.** In a randomized trial, recruiting with friends plus social support raised treatment completion from 76% to 95% ([Wing & Jeffery 1999](https://experts.umn.edu/en/publications/benefits-of-recruiting-participants-with-friends-and-increasing-s/)).
- **Concrete plans help.** "When X, I will Y" plans had a medium-to-large effect (d = 0.65) across 94 tests ([Gollwitzer & Sheeran, via Frontiers](https://www.frontiersin.org/articles/10.3389/fpsyg.2021.565202/full)). A weekly plan field in the check-in uses this.
- **Announcing goals publicly can backfire.** Identity goals that others noticed were acted on *less* ([Gollwitzer et al. 2009](https://www.socmot.uni-konstanz.de/node/131)). Indie hackers are also going quiet to avoid copycats ([Indie Hackers](https://www.indiehackers.com/post/lifestyle/is-this-the-end-of-build-in-public-heres-why-top-indie-hackers-are-suddenly-disappearing-IhSJQBnXNuNwSuNTuz4t)). Both support **private by default**.
- **Avoid two popular statistics.** The "ASTD 95%" accountability figure has no traceable source ([ATD](https://www.td.org/content/td-magazine/fact-check)), and the Dominican "76% vs 43%" study is an unpublished conference presentation ([summary](https://www.dominican.edu/sites/default/files/2020-02/gailmatthews-harvard-goals-researchsummary.pdf)). Don't use either in marketing.

### Matching

- **Swipe-first professional apps have died.** Shapr closed in 2023 ([Wikipedia](https://en.wikipedia.org/wiki/Shapr)) and Bumble Bizz is being phased out ([Bumble support](https://support.bumble.com/hc/en-us/articles/30208230972189-Availability-of-Bumble-Bizz)).
- **What works is mutual opt-in with a note and limits.** YC Co-Founder Matching uses invites with a personal message, capped at 15 a week, and 25% of invites were accepted ([Startup School FAQ](https://startupschool.org/faq); [YC blog, 2021 data](https://www.ycombinator.com/blog/what-do-people-want-in-a-co-founder/)).
- **Useful match signals:** 61% of YC matches were within three time zones, and 79% of users cared about a partner's time commitment ([YC blog](https://www.ycombinator.com/blog/what-do-people-want-in-a-co-founder/)).
- **Ghosting is the top complaint** about matching products such as Lunchclub and Focusmate ([Product Hunt: Focusmate](https://www.producthunt.com/products/focusmate/reviews); [Product Hunt: Lunchclub](https://www.producthunt.com/products/lunchclub/reviews)). Hinge blocks new likes while 8+ matches wait on a reply and reports 20% better responsiveness ([Hinge](https://hinge.co/newsroom/your-turn-limits-test)).
- **Trial periods before committing** are what YC recommends for would-be cofounders ([Startup School FAQ](https://startupschool.org/faq)).

### Check-ins, feeds and streaks in developer tools

- **Linear project updates:** an On track / At risk / Off track status plus free text. A reminder goes to the owner, then nudges one and two working days later, and weekly is the recommended cadence ([Linear docs](https://linear.app/docs/initiative-and-project-updates)).
- **Check-ins die when nobody reads them.** Practitioners recommend updates that take under two minutes and lead with blockers ([Pickuma](https://pickuma.com/for-dev/async-standups-people-actually-read/)). A pair app guarantees a reader.
- **Feeds should be chronological.** GitHub tried an algorithmic feed, got backlash, and reverted to chronological order in February 2025 ([GitHub changelog](https://github.blog/changelog/2025-02-14-reverting-feed-activity-sorting-back-to-chronological-ordering/)).
- **Daily streaks cause trivial activity and guilt.** After GitHub removed streak counters, single-contribution days dropped ([Moldon et al., ICSE 2021](https://ar5iv.labs.arxiv.org/html/2006.02371)). Broken streaks lower later engagement ([Penn CHIBE](https://chibe.upenn.edu/event/rachel-gershon-phd%E2%94%82chibe-research-seminar/)), and Duolingo added streak forgiveness for that reason ([Duolingo](https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals)). WIP users keep asking for weekend exemptions ([WIP](https://wip.co/posts/can-i-keep-my-streak-if-i-don-t-post-on-weekends-xnpz4q)).
- **Developer conventions:** Cmd+K command palettes, Markdown, dark mode and dated public changelogs are expected in developer tools ([Superhuman on command palettes](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/); [Raycast changelog](https://www.raycast.com/changelog)).

### Competitors and the gap

- **Buildspace** (6-week seasons, weekly updates, demo day) came closest to Buildpair and closed in August 2024 ([buildspace.so](https://buildspace.so/old-home-2)).
- **WIP** is a paid build-in-public log ($29/mo) that one reviewer calls "missing the community" ([WIP](https://wip.co/posts/discontinuing-free-plans-for-new-wip-members-tbahrf); [review](https://ilikekillnerds.com/2024/12/15/my-experience-with-wip-co-a-maker-community-thats-missing-the-community/)).
- **CoFoundersLab** reviews complain about billing traps and bot profiles ([Trustpilot](https://www.trustpilot.com/review/cofounderslab.com)).
- No active product found combines mutual matching between builders who each own a product, no equity, and time-boxed seasons. That is Buildpair's opening.

### Integrations, API and CLI (later phases)

- GitHub OAuth Apps have no read-only private-repo scope ([GitHub community](https://github.com/orgs/community/discussions/174347)). An opt-in GitHub App on selected repos, or production-deploy webhooks such as Vercel's `deployment.promoted` ([Vercel docs](https://vercel.com/docs/webhooks/webhooks-api)), are the low-privilege options.
- The closest analogue, WIP, offers a REST API, a Telegram `/done` bot and a Raycast extension ([WIP API](https://wip.co/api); [WIP help](https://wip.co/help)). A personal token plus one endpoint is the cheap first step.
- Any AI-written update should be a draft the user approves ([Geekbot CLI and MCP](https://geekbot.com/blog/geekbot-cli-and-geekbot-mcp/)).

### Design: Cloudflare's discipline, your colors

- **Cloudflare's brand system** ([typography](https://www.cloudflare.com/tr-tr/brand/typography), [color](https://www.cloudflare.com/en-gb/brand/color)):
  - **Type:** the free Inter typeface, semibold headlines with tight tracking, small ALL-CAPS labels, left-aligned text.
  - **Color:** white space as part of the palette, near-black type, one accent used sparingly.
- **Its product design system, Kumo** ([npm](https://registry.npmjs.org/@cloudflare/kumo)), keeps the brand color for identity and uses a separate, darker color for buttons, because white text on its orange fails contrast. It also uses hairline borders, 6–8px radii and 14px body text.
- **Don't copy:** the logo, the orange palette, the arc motif or the illustrations ([trademark guidelines](https://cloudflare.com/trademark)).

## What exists today

| Area | Where | Notes |
|---|---|---|
| Stack | `mobile/` (Expo SDK 55, Expo Router, React Native 0.83, TanStack Query, Zustand), `server/` (Express 5, TypeScript, raw SQL on PostgreSQL), `shared/types/index.ts` | Solid, current stack. `CLAUDE.md` documents the architecture rules. |
| Auth | `server/src/services/auth.service.ts`, `server/src/routes/auth.ts`, `mobile/features/auth/` | Email/password with JWT, plus Google OAuth. OAuth work is skipped for now. |
| Goals and milestones | `goal.service.ts`, `milestone.service.ts`, `mobile/features/goals/`, `mobile/features/milestones/` | Categories are personal-life oriented (`workout`, `study`, …). Milestones support frequencies and schedules. `GoalsScreen.tsx` is 1,623 lines. |
| Buddy connections | `buddy_connections` table, `buddy.service.ts`, `mobile/features/buddies/` | One partner per goal, enforced by the `enforce_one_buddy_per_goal` trigger (`002_triggers.sql`). Status includes `blocked`. Accountability and co-op types (`004_milestone_frequency.sql`). |
| Check-ins and chat | `check_ins` table (`message` + `mood`), `checkin.service.ts`, `server/src/socket/index.ts`, `mobile/features/chat/` | Free-text check-ins in a chat, delivered live by Socket.io. |
| Finder | `finder.service.ts` (`getDeck`, `recordSwipe`), `swipe_actions` table, `handle_mutual_like` trigger, `mobile/features/finder/` (`SwipeCard.tsx`) | Swipe deck filtered by goal category, plus public goal search. |
| Streaks and stats | `activity_stats` table, `update_stats_on_checkin` trigger, `refresh_activity_levels()` via `server/src/services/cron.ts` | Daily streak per user. |
| Theme | `mobile/lib/constants.ts` (`THEMES`: 8 user-selectable palettes + custom), `mobile/store/slices/themeSlice.ts`, `mobile/theme/typography.ts` | Default theme "Sage", primary `#6A9E7F`. |
| Navigation | `mobile/app/(tabs)/_layout.tsx` | 5 bottom tabs: Wins, Find, Goals, Buddies, Settings. |
| Landing page | `docs/index.html` (GitHub Pages) | "GoalBuddy — Achieve More Together". |
| Tests | `server/src/__tests__/` (11 files, needs Postgres), `mobile/**/__tests__` | Server tests cover auth, goals, buddies, check-ins, finder, milestones, stats. |

### Housekeeping to do first

1. **Remove `server/.env` from git** (`git rm --cached server/.env`) and add `.env` to `.gitignore`. The file holds `JWT_SECRET`, `GOOGLE_CLIENT_SECRET` and `DATABASE_URL` in a public repo, so the old values stay visible in history. Rotate them wherever they are used, not only in the local file.
2. **Remove `server/node_modules` from git** (about 3,500 tracked files) and ignore it.
3. **`mobile/lib/api.ts` hard-codes `API_URL = 'http://10.0.2.2:3000'`** (the Android emulator address). Web and real devices need it from config, for example `EXPO_PUBLIC_API_URL`.

## Why keep this repo

- Most of the core loop already works: accounts, partner requests and acceptance, check-ins with a partner, live delivery, a finder, stats and streaks, themes and tests.
- Expo builds for the web from the same code, so "web and mobile" doesn't need a second app.
- The biggest change (groups) is a data-model change either way. In this repo it is a migration plus service changes, with tests to catch regressions.
- Starting fresh would mean rebuilding auth, sockets, offline handling, error middleware and the test setup before any new feature.

## MVP plan: keep, rename, change, add, defer

| Action | Items |
|---|---|
| **Keep** | Email/password auth and JWT; Express routes → services → `query()` pattern; Zod validation; Socket.io rooms; TanStack Query hooks; milestones (as weekly plan items); `activity_stats`; chat (as the reply thread under check-ins); tests. |
| **Rename** | GoalBuddy → Buildpair everywhere; "buddy" → "partner" in user-facing copy; "Wins" tab → "Shipped". Keep table names like `buddy_connections` unless a rename is cheap; user-facing copy is what matters. |
| **Change** | Swipe deck → Discover screen; free-text check-in → structured weekly check-in; daily streak → weekly pair streak with forgiveness; public-by-default goals → private by default; 8 themes → a Buildpair light and dark theme; bottom tabs → sidebar on wide screens. |
| **Add** | Builder profile fields; groups of 3–4; seasons and demo day; request notes and caps; trial period and rematch; read receipts and replies on check-ins; block/report; reminders; Expo web support. |
| **Defer** | GitHub/Google OAuth work; GitHub App and deploy webhooks; AI-drafted updates; API tokens and CLI; Slack/Discord/Telegram bots; verified revenue; public community tab beyond opt-in "Shipped" posts; paid plans. |

## Recommendations

IDs are stable for follow-up work. Effort is a rough guess: S (a day or two), M (a few days), L (a week or more).

### Quick wins

**QW1. Rebrand copy and metadata to Buildpair (S).**
- App name, icon text, splash and store metadata.
- Landing page headline: a build partner for people shipping their own product. Don't use "Tinder" in public copy, and don't cite the ASTD or Dominican statistics.
- Rename "buddy" to "partner" in UI strings, and reminders that encourage rather than guilt.

Files: `mobile/app.json`, `mobile/assets/*`, `docs/index.html`, screen titles in `mobile/app/(tabs)/_layout.tsx`, strings in `mobile/features/*/screens/*.tsx`, `CLAUDE.md` (product vision), `docs/feature-catalog.md`. Adapts existing.

**QW2. Replace the theme set with Buildpair light and dark tokens (S–M).**
- Replace the 8 palettes in `THEMES` with one Buildpair light and one dark theme, keyed to the system setting with a manual toggle. Keep `buildCustomPalette` only if the custom theme is wanted.
- Split brand color from action color, as Cloudflare does (see "Design direction").
- Add status colors (`success`, `warning`, `danger`) for On track / At risk / Off track.
- Add Inter via `expo-font` and keep the size tokens in `typography.ts`. Suggested body size 15–16 on mobile, 14 on wide web layouts.
- Reduce radii to 6–8px and prefer 1px borders over shadows.

Files: `mobile/lib/constants.ts` (`THEMES`, `ColorPalette`), `mobile/store/slices/themeSlice.ts`, `mobile/theme/typography.ts`, `mobile/app/_layout.tsx` (font loading), `mobile/features/settings/screens/SettingsScreen.tsx` (theme picker), `mobile/components/ui/*`. Adapts existing.

**QW3. Builder profile fields (S–M).**
- Add to `users`: `building` (one line), `project_url`, `stage` (idea / building / launched / revenue), `stack` (text array), `timezone`, `work_window` (e.g. evenings, weekends), `hours_per_week`, `wants_help_with`, `can_help_with`, `open_to_cofounding`, `checkin_preference` (async / calls).
- Show them on profiles and collect them in a short, skippable onboarding step after registration.

Files: new migration `server/src/db/migrations/008_builder_profile.sql`, `shared/types/index.ts` (`User`), `server/src/services/user.service.ts`, `server/src/routes/users.ts` (Zod schema), `mobile/features/settings/` (edit profile), `mobile/features/auth/screens/RegisterScreen.tsx` (follow-up step), tests in `users.test.ts`. Adds new.

**QW4. Builder goal categories (S).**
- Replace or extend `goal_category` (`workout`, `study`, …) with builder categories: `ship_mvp`, `first_users`, `first_revenue`, `launch`, `side_project`, `other`.
- Remove goal templates that don't fit.

Files: migration altering `goal_category`, `goal.service.ts` (`fromTemplate`), `mobile/features/goals/` (category picker, `CategoryIcon.tsx`), `finder.service.ts` (category matching), tests. Adapts existing.

**QW5. Structured weekly check-in (M).**
- Add to `check_ins`: `kind` (`weekly` / `message`), `shipped`, `next`, `blocked`, `status` (`on_track` / `at_risk` / `off_track`). Keep `message` and `mood` for normal chat messages.
- A check-in form designed to take under two minutes, with "blocked" prominent and Markdown in the text fields.
- Render weekly check-ins as cards in the chat thread, with replies below.

Files: migration on `check_ins`, `checkin.service.ts`, `routes/checkins.ts` (Zod), `shared/types/index.ts`, `mobile/features/chat/` (`ChatScreen.tsx`, new `CheckinCard`, `ChatInput.tsx` or a new form), `checkins.test.ts`. Adapts existing.

**QW6. Read receipts and reactions on check-ins (S–M).**
- A `check_in_reads` table (user, check-in, read_at) and a simple reaction field or table.
- Show "Seen by …" on weekly check-ins.

Files: new migration, `checkin.service.ts`, socket events in `server/src/socket/index.ts`, `mobile/features/chat/`. Adds new.

**QW7. Weekly pair streak with forgiveness (S–M).**
- Count weeks in which everyone in the pair or group posted a weekly check-in.
- One skip per season and a vacation pause. Never show a broken streak publicly.
- Keep the personal daily streak only if you still want it, and make it less prominent.

Files: `update_stats_on_checkin` in a new migration, `activity_stats` (or a new `connection_stats` table), `stats.service.ts`, `buddy.service.ts` (`getConnectionGoalStats`), `mobile/components/ui/ActivityBadge.tsx`, `stats.test.ts`. Adapts existing.

**QW8. Private by default (S).**
- New goals default to `is_public = false`.
- Add a per-milestone "Share to Shipped feed" action instead of making whole goals public.
- Discover reads profile data, not goals, so private goals don't hurt matching.

Files: `goal.service.ts`, migration changing the default, `milestone.service.ts` (`getFeed` filters on a new `shared` flag), `mobile/features/milestones/` (Shipped feed), `mobile/features/goals/`. Adapts existing.

**QW9. Block and report (S–M).**
- A `reports` table, a report action on profiles and chats, and an admin-only list endpoint.
- Hide blocked users from Discover (the `blocked` connection status already exists).

Files: new migration, new `report.service.ts` and `routes/reports.ts`, `finder.service.ts` (exclude blocked), `mobile/features/buddies/`, `mobile/features/chat/`. Adds new.

**QW10. Reminders (M).**
- A weekly check-in reminder at a local time the user chooses, then at most two nudges, with none on weekends by default.
- Use email for web (add a provider such as Resend or Postmark) and push for mobile (`expo-notifications`; `users.push_token` already exists).

Files: `server/src/services/cron.ts` (new scheduled job), new `notification.service.ts`, `users` settings fields (`reminder_time`, `timezone`, `quiet_weekends`), `mobile/features/settings/`. Adds new.

### Bigger changes

**BC1. Discover screen replaces the swipe deck (M–L).**
- **"Suggested for you":** 3–5 profile cards ranked by time-zone overlap, hours-per-week band, stage, stack overlap and goal type. Each card lists its match reasons ("4 hrs overlap · both pre-launch · both on Next.js").
- **"Browse":** filters for time zone, hours, stage, stack, goal and "open to cofounding".
- **"Request to pair":** requires a one-line note. A match forms when the other person accepts. Requests expire after about 7 days.
- **Request cap:** for example 5 open outgoing requests, and no new ones while 5+ incoming requests are unanswered.
- Drop `recordSwipe` and the `handle_mutual_like` trigger. Keep `swipe_actions` only if you want a "not interested" signal.

Files: `server/src/services/finder.service.ts` (replace `getDeck` with `getSuggestions` and `browse`), `routes/finder.ts`, `buddy.service.ts` (`requestBuddy` gains `note` and caps), migration adding `note` and `expires_at` to `buddy_connections`, `shared/types/index.ts`, `mobile/features/finder/` (replace `SwipeCard.tsx` and `FinderScreen.tsx` with `ProfileCard` and a `DiscoverScreen`), `mobile/app/buddy-requests.tsx`, `finder.test.ts`, `buddies.test.ts`.

**BC2. Groups of 3–4 (L).** This is the largest change because the data model assumes one partner per goal.
- Introduce `pods` (id, name, season_id, created_at) and `pod_members` (pod_id, user_id, goal_id, role, joined_at, left_at). A pair is a pod with two members.
- Move check-ins from `connection_id` to `pod_id`, and Socket.io rooms from `connection:{id}` to `pod:{id}`.
- Replace the `enforce_one_buddy_per_goal` trigger with a member limit (2–4).
- Migrate existing accepted `buddy_connections` into two-member pods. Keep `buddy_connections` as the request/invite record.
- Decide whether co-op mode survives. It overlaps with groups, so the simplest path is to retire it.

Files: new migration, `002_triggers.sql` successors, `buddy.service.ts`, `checkin.service.ts`, `stats` logic, `server/src/socket/index.ts`, `routes/buddies.ts`, `routes/checkins.ts`, `shared/types/index.ts`, `mobile/features/buddies/`, `mobile/features/chat/`, `mobile/app/chat/[id].tsx`, `buddies.test.ts`, `checkins.test.ts`.

**BC3. Seasons, trial period and rematch (M–L).**
- A `seasons` table: 6 weeks, Monday start, demo-day date, enrollment open/closed.
- New pods start with a 2-week trial. At the end of week 2 each member answers "Keep building together?" privately. A yes from everyone continues the pod; otherwise members return to Discover with priority.
- If a member misses two weekly check-ins, the others can rematch or invite a replacement without waiting.
- **Demo day:** each member posts what they shipped, optionally shared to the Shipped feed, then opts into the next season.

Files: new migration (`seasons`, `pods.season_id`, `trial_ends_at`, pulse answers), `cron.ts` (season and trial transitions), new `season.service.ts` and route, `mobile/features/` (season banner, demo-day screen), notifications.

**BC4. Web version with Expo (M–L).**
- Add `react-native-web` and set up the web target in `app.json`.
- Make `API_URL` configurable (see Housekeeping).
- Check the native-only pieces:
  - `react-native-mmkv` doesn't run on the web; AsyncStorage does, and the status file says AsyncStorage is already used.
  - `expo-haptics` (7 files) should no-op on web.
  - Push notifications become email on web.
  - Gesture and animation code mostly goes away with the swipe deck.
- **Responsive layout:** above roughly 900px, show a left sidebar (Pair, Check-ins, Discover, Shipped, Settings) instead of bottom tabs, a grid of profile cards on Discover, and the chat next to the check-in history.
- Add hover states, visible keyboard focus, Cmd+Enter to submit a check-in, and later a Cmd+K palette.
- Optionally make the web app installable to the home screen.

Files: `mobile/package.json`, `mobile/app.json`, `mobile/lib/api.ts`, `mobile/store/*` (storage adapters), `mobile/app/(tabs)/_layout.tsx` (responsive navigation), screens using haptics, `mobile/features/finder/`, `mobile/features/chat/`.

**BC5. Visual redesign of key screens (L).**
- Apply QW2's tokens to the Discover, pair/group home, check-in, profile and landing screens.
- Split `GoalsScreen.tsx` (1,623 lines) into smaller components while restyling it.
- Rebuild `docs/index.html` as the Buildpair landing page:
  - a left-aligned hero with a small caps label, a headline and two buttons
  - a three-step "Match → Check in weekly → Ship" strip
  - real product screenshots and real testimonials only
  - an original "pair" mark instead of stock illustrations

Files: `mobile/features/*`, `mobile/components/ui/*`, `docs/index.html`.

### Later (not MVP)

| ID | Item | Main touch points |
|---|---|---|
| L1 | GitHub sign-in (identity scope only) | `auth.service.ts`, `routes/auth.ts`, `users` (`github_id`), `LoginScreen.tsx` |
| L2 | Deploy webhooks and opt-in GitHub App to pre-fill "shipped" | new `routes/webhooks.ts`, integrations tables, `checkin.service.ts` |
| L3 | AI-drafted weekly check-in, edited before sending | new drafting service, check-in form |
| L4 | Personal API token, one `POST` endpoint, tiny CLI or git hook | `middleware/auth.ts`, new tokens table, settings UI |
| L5 | Slack/Discord/Telegram bot, MCP server | new services |
| L6 | Verified revenue badge (read-only Stripe key) | integrations, profile |
| L7 | Cmd+K command palette and public changelog page | web layout, landing site |

## Design direction

Borrow Cloudflare's restraint, not its brand:
- a calm light canvas and near-black text
- one accent used sparingly, with a separate, darker shade for buttons
- Inter, semibold headlines, small uppercase labels, left-aligned text
- 1px borders, 6–8px radii, few shadows
- a proper dark mode

**Mapping your current Sage palette** (`mobile/lib/constants.ts`). Contrast ratios are calculated with the WCAG formula; AA needs 4.5:1 for normal text.

| Token | Role | Suggested value | Check |
|---|---|---|---|
| `brand` | Logo, small labels, highlights, match chips | `#6A9E7F` (current Sage primary) | White text on it is 3.08:1: **fails** for normal text, so don't put white text on it |
| `primary` | Buttons and links (about one main button per screen) | `#457058` (Sage darkened) | White text 5.66:1, on the background 5.29:1: passes |
| `primarySoft` | Selected states, tinted backgrounds | `#E8F5EE` (current `primaryLight`) | Background only |
| `accent` | Rare highlights (current coral) | `#E8806A` | White text 2.72:1 fails; for buttons use `#B8513C` (4.91:1) |
| `background` / `card` | Surfaces | `#F9F7F4` / `#FFFFFF` (current) | Consider a cooler, more neutral grey for a more professional feel |
| `text` / `textSecondary` | Type | `#2C2C2C` / a darker grey than `#8A8A8A` | `#8A8A8A` is too light for small body text; aim for 4.5:1 |
| `border` | Hairlines | `#EDEBE8` (current) | |
| `success` / `warning` / `danger` | On track / At risk / Off track | New | Solid for text and icons, tinted for backgrounds |

If Buildpair gets a new brand color instead of Sage, apply the same rule: if white text on it is under 4.5:1, use a darker shade for buttons.

**Don't copy:** Cloudflare's logo, orange palette, arc motif, illustrations or copy.

## Suggested order

1. **Housekeeping:** remove the `.env` and `node_modules` files from git, rotate the old secrets, make `API_URL` configurable.
2. **Rebrand:** QW1, QW2, QW4.
3. **Core loop:** QW3, QW5, QW6, QW7, QW8, BC1.
4. **Groups and seasons:** BC2, BC3, QW9, QW10.
5. **Web:** BC4, then BC5. BC4 can start in parallel with step 3 so every new screen is built responsive from the start.
6. **Season 1:** 30–100 builders from one community, started on a Monday, with hand-picked suggestions if Discover doesn't have enough people yet.
7. **Later:** L1–L7 based on what season 1 shows.

**Measure:**
- the share of groups where everyone checked in every week
- the share of members who shipped their season goal by demo day
- "keep building together?" answers
- next-season sign-ups

Daily active users is not a target.

## Open questions

1. Is Sage the intended Buildpair brand color, or will there be a new one?
2. Should co-op mode (two people copying the same goal) survive, or be retired in favor of groups?
3. Should the 8 selectable themes go, or stay as an option beside the Buildpair default?
4. Which email provider for reminders on web?
5. Where will the API and database be hosted? Web users need the API reachable over HTTPS. `server/src/create-app.ts` currently allows every origin (`cors({ origin: '*' })`); restrict it to the web app's domain before launch.
