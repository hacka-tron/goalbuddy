# Buildpair backlog

Design work for rebranding GoalBuddy as **Buildpair**. No app code has changed yet; everything so far is product decisions, research and screen mockups.

> **RESUME HERE (next session): review the desktop web screens with the owner, then the design system.**
> All 14 desktop web screens are drawn and simplified after the owner's first review (spaces are now chat-first) in `docs/design/buildpair-web.html` (live copy: https://claude.ai/artifact/8sGnN5pw9Fz5uBV7McrJAV), with a parity checklist mapping every phone screen to its web version. Next: owner feedback on the web screens and the open web questions in section 4, then section 2 (design system).

## Where everything is

| What | Where |
|---|---|
| Product record (source of truth for what Buildpair is) | `PRODUCT.md` (written with the Impeccable `init` template) |
| Desktop web screens (14 screens and a parity checklist) | `docs/design/buildpair-web.html`. Live copy: https://claude.ai/artifact/8sGnN5pw9Fz5uBV7McrJAV |
| All current phone screens, with explanations | `docs/design/buildpair-screens.html` (open in a browser). Live copy: https://claude.ai/artifact/RjgGwJC5qCx16sWVwUmEK1 |
| Earlier explorations (superseded, kept for reference) | `docs/design/explorations/buildpair-directions.html` (visual directions; "Margin Notes" was chosen), `docs/design/explorations/buildpair-watching-options.html` (Supporting tab layouts; A+C combined was chosen) |
| Web research (onboarding, feeds, check-ins, integrations, competitors, accountability science, Cloudflare design language) | `docs/research/buildpair-web-research.md`. Live copy: https://claude.ai/artifact/AFeLHvtVnRDaxg9fKdSdEj |
| First codebase-mapped report (partly superseded) | `docs/research/developer-friendly.md` |

## 1. Desktop web (drawn, awaiting owner review)

Goal: feature parity with the phone app, designed for a big screen rather than stretched. Drawn 2026-10-10 in `docs/design/buildpair-web.html`.

Layout: sidebar (navigation, your spaces, spaces you support, profile) · the page (Today, a space's list, Discover) · the margin (chat, people's notes, item details).

- [x] Today, grouped by space; hover actions on rows; margin shows "Check in on" and the last day's notes (web 1)
- [x] Add bar always at the top, Q from any screen, highlighted natural-language words, date and space chips (web 2)
- [x] Scheduler and space picker as popovers (web 2)
- [x] Spaces list as the sidebar's "Your spaces" (web 1)
- [x] Inside a space: list and chat side by side, List / Week / People / Requests tabs, goal steps indented (web 3)
- [x] Chat: stacked reactions with who-reacted on hover, message hover toolbar, update notes, skip reasons, "Update an item" in the message box (web 3)
- [x] Selecting: click edge or X, Shift/Cmd-click, floating action bar with keys, right-click full menu with Move to submenu, "Add a reason" toast, bulk edit in the margin (web 4)
- [x] Item details in the margin, drawn for a habit (this week, 12-week history, weeks on target, skips and notes) (web 5)
- [x] People and sharing dialog, same dialog for New space (web 6)
- [x] Supporting as a two-pane inbox with suggested replies (web 7)
- [x] Discover grid with filters, Offer support dialog, Requests tab (web 8)
- [x] Profile, settings (browser notifications, email digest, keyboard shortcuts), compliment dialog (web 9)
- [x] Activity panel (web 10)
- [x] Web-only: command palette and shortcuts sheet (web 11), Upcoming week view with drag and drop (web 12), weekly review on one screen (web 13)
- [x] Window sizes: four layouts from wide desktop to phone width (web 14)
- [ ] Not drawn for web yet: dark mode, onboarding, empty states, focus timer, Pro upgrade
- [x] Owner review 2026-10-10: "too busy", and spaces should focus on the chat. Done: spaces are chat-first (list in a narrow panel that folds away); sidebar cut to Today, Upcoming, Supporting, Discover and Spaces, with the bell and profile at the bottom; Today's margin shows only "Check in on" and spaces with new messages; selecting and item details moved to Today; fewer chips, buttons and notes throughout
- [ ] Redraw phone screen 3 chat-first to match (chat as the main view, the list as a collapsed strip above it)

## 2. Design system (after web)

- [ ] Write `DESIGN.md` and `.impeccable/design.json` (Impeccable `document`): tokens for royal blue, neutrals, status colors, dark mode, type, spacing, radii, components.
- [ ] Theme file for the app (replace `THEMES` in `mobile/lib/constants.ts` with Buildpair light and dark; the 8 old themes move to a settings menu).
- [ ] Note: the Impeccable launcher binary was blocked in the cloud session, so its method was followed by hand. Running `/impeccable` locally would add its detector and live tools.

## 3. Screens not drawn yet

- [ ] Activity screen (behind the bell) in the current style
- [ ] Habit detail (weekly progress, history, skip reasons)
- [ ] Shared focus timer ("Focus with Sam for 50 minutes")
- [ ] Pro upgrade screen and where upgrade prompts appear
- [ ] Onboarding after the welcome screen (profile basics, first space, first item)
- [ ] Empty states (no spaces, no supporters, empty Discover)
- [ ] Dark mode versions of the key screens
- [ ] Android versions (Material navigation bar, floating + already matches)
- [ ] Mockup polish: the scheduler, space picker, long-press menu and compliment sheets should float over their source screen (only the add bar does today)

## 4. Open questions

- [ ] Web: should a habit count "weeks on target" (as drawn in web 5) everywhere, including the phone, instead of any daily streak?
- [ ] Web: is the "Upcoming" week view (web 12) also wanted on the phone as a calendar tab or a Today toggle?
- [ ] Web: single-letter shortcuts (Q, S, W, U, M) on by default, with an off switch in settings (as drawn), or off by default?
- [ ] Simplify the per-person "Supporter ▾" menu on the people screen to long-press → Remove, like a group chat?
- [ ] Team spaces later (everyone in a space adds their own goals, for crews or cohorts)?
- [ ] Final logo: trademark search on the name and mark, and a designer's refinement. A Buildpair domain (only `goalbuddy.app` is owned today).
- [ ] Seasons (6-week runs with a demo day): keep as an optional feature or drop?

## 5. Key decisions so far

Full detail is in `PRODUCT.md`. In short:

- **What it is:** a social, accountable to-do and goals app for **builders** (anyone making something: startups, side projects, AI-built apps, creators, small businesses), plus their life goals.
- **Spaces:** everything lives in a space (a list plus one chat). Sharing is per space. Inside a space the chat is the main view; planning happens on Today and finding people on Supporting and Discover (owner, 2026-10-10). A space with several people is the group; there is no separate group object.
- **Item types:** decided by the schedule. One date = to-do; repeating = habit; deadline with steps = goal.
- **Adding:** floating + (bottom-right, like TickTick) opens an add bar with natural language, a date chip and a space chip.
- **Acting on items:** tap the circle = done; long-press = select, with an action bar (Skip today, Won't do, Update, Move, ••• full menu). Skips can carry a reason that goes to the chat.
- **Chat:** completions post themselves, small to-dos roll up into one line per day, reactions stack like Teams or Slack.
- **Supporting tab:** "Check in on" strip (watcher-only nudges; never shown to the goal's owner), then one row per space others share with you. Suggested replies appear inside the chat.
- **Discover:** a "Show on Discover" switch per space (purpose is required); others offer support or "support each other" by suggesting their spaces; the owner picks one in Requests. No swiping.
- **Adding people:** search people you share spaces with, any name or username, or a Buildpair ID; invite links work like group chats (ask to join, owner approves).
- **Reputation:** earned badges (Fast responder, Reliable supporter, Finisher) and positive-only compliments. No star ratings of people.
- **Look:** "Margin Notes" direction; royal blue; serious core, warm edges; avoid dark hacker styling and generic SaaS; Cloudflare-like restraint without copying its brand.
- **Platforms:** one Expo codebase for iOS, Android and web, adapting to each platform's conventions.
- **Monetization (planned):** free core with sharing always free; Pro (about $4–5/month) for integrations, more themes, focus timer stats and insights; later community plans and paid seasons. No ads.
- **Deferred:** social sign-in (OAuth), developer integrations beyond Jira, revenue verification.

## 6. Housekeeping found in the codebase (not yet done)

- [ ] `server/.env` is committed to this public repo: remove it from git, add `.env` to `.gitignore`, and rotate the Google client secret, JWT secret and database password where they are used.
- [ ] `server/node_modules` is committed (about 3,500 files): remove and ignore.
- [ ] `mobile/lib/api.ts` hard-codes `API_URL = 'http://10.0.2.2:3000'`; make it configurable for web and devices.
- [ ] `server/src/create-app.ts` allows every origin (`cors({ origin: '*' })`); restrict before launch.
- [ ] Hosting plan: AWS (ECS Fargate or Lightsail/EC2 for the API with Socket.io, RDS Postgres, S3 + CloudFront for the web build, SES for email). Cloudflare Email Routing for a support address.
