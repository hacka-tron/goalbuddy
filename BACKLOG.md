# Buildpair backlog

Design work for rebranding GoalBuddy as **Buildpair**. No app code has changed yet; everything so far is product decisions, research and screen mockups.

> **RESUME HERE (next session): desktop web design.**
> The web version needs to be as good as the phone app, or better, because many people will use Buildpair from their desktops. Today only one laptop screen exists (screen 10 in `docs/design/buildpair-screens.html`). Start by auditing phone vs web parity (checklist below), then draw the web screens in the same Margin Notes style.

## Where everything is

| What | Where |
|---|---|
| Product record (source of truth for what Buildpair is) | `PRODUCT.md` (written with the Impeccable `init` template) |
| All current screens, with explanations | `docs/design/buildpair-screens.html` (open in a browser). Live copy: https://claude.ai/artifact/RjgGwJC5qCx16sWVwUmEK1 |
| Earlier explorations (superseded, kept for reference) | `docs/design/explorations/buildpair-directions.html` (visual directions; "Margin Notes" was chosen), `docs/design/explorations/buildpair-watching-options.html` (Supporting tab layouts; A+C combined was chosen) |
| Web research (onboarding, feeds, check-ins, integrations, competitors, accountability science, Cloudflare design language) | `docs/research/buildpair-web-research.md`. Live copy: https://claude.ai/artifact/AFeLHvtVnRDaxg9fKdSdEj |
| First codebase-mapped report (partly superseded) | `docs/research/developer-friendly.md` |

## 1. Desktop web (next)

Goal: feature parity with the phone app, designed for a big screen rather than stretched.

Parity checklist (phone screen → web equivalent still to design):

- [ ] Today, grouped by space (phone screen 1)
- [ ] Add bar from the floating + (screen 1): on web also a keyboard shortcut (for example Q or N) and natural-language entry; date chip, space chip
- [ ] Scheduler (date, time, reminder, repeat) as a popover instead of a sheet
- [ ] Spaces list (screen 2): likely the left sidebar
- [ ] Inside a space (screen 3): list and chat side by side; the current laptop mockup (screen 10) is the starting point
- [ ] **Chat views**: stacked reactions with who-reacted on hover, update notes, skip reasons, message box
- [ ] Long-press equivalent: right-click or hover menu, multi-select (Shift/Cmd-click), and the action bar with Skip today / Won't do / Update / Move / ••• full menu
- [ ] Space picker, New space setup, people screen, add people (name, username, Buildpair ID), invite link, Show on Discover (screens 4–5)
- [ ] Supporting (screen 6): "Check in on" strip plus one row per shared space, and a supporter's view of someone's space with suggested replies
- [ ] Discover board, offer support, Requests (screen 7)
- [ ] Profile, badges, compliments, settings (screen 8)
- [ ] Activity / notifications panel (bell)
- [ ] Ideas where web can be better than phone: three-pane layout (spaces · list · chat), Cmd+K command palette, keyboard shortcuts, drag items between spaces, wide calendar or week view, weekly review on one screen
- [ ] Responsive breakpoints (narrow window → phone-like layout)

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

- [ ] Simplify the per-person "Supporter ▾" menu on the people screen to long-press → Remove, like a group chat?
- [ ] Team spaces later (everyone in a space adds their own goals, for crews or cohorts)?
- [ ] Final logo: trademark search on the name and mark, and a designer's refinement. A Buildpair domain (only `goalbuddy.app` is owned today).
- [ ] Seasons (6-week runs with a demo day): keep as an optional feature or drop?

## 5. Key decisions so far

Full detail is in `PRODUCT.md`. In short:

- **What it is:** a social, accountable to-do and goals app for **builders** (anyone making something: startups, side projects, AI-built apps, creators, small businesses), plus their life goals.
- **Spaces:** everything lives in a space (a list plus one chat). Sharing is per space. A space with several people is the group; there is no separate group object.
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
