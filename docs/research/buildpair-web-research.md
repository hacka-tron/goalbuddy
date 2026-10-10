# Pair builders, verify shipping, skip the swipe

Buildpair's strongest opening is the gap Buildspace left: a no-equity, mutual-match "build partner" app in which two technical founders each ship their own product and send each other one short weekly report, with progress checked against the tools they already use. The evidence supports that loop over swiping. A 138-study meta-analysis found that monitoring progress improves goal attainment, and **the effect is larger when progress is reported to others** ([Harkin et al. 2016](https://eprints.whiterose.ac.uk/91437/)). In a randomized trial, adding social support raised treatment completion from **76% to 95%** ([Wing & Jeffery 1999](https://experts.umn.edu/en/publications/benefits-of-recruiting-participants-with-friends-and-increasing-s/)). Meanwhile, swipe-first professional apps such as Shapr and Bumble Bizz have shut down or are being phased out ([Wikipedia: Shapr](https://en.wikipedia.org/wiki/Shapr); [Bumble support](https://support.bumble.com/hc/en-us/articles/30208230972189-Availability-of-Bumble-Bizz)).

Technical founders expect the basics of Linear and Vercel:
- GitHub sign-in that asks only for identity
- a short onboarding with skippable steps
- a chronological work feed
- Cmd+K, Markdown and dark mode

They distrust tools that want write access to their repos or treat commit counts as a virtue.

Integrations should confirm shipping from low-privilege, high-signal events: production deploys, merged PRs, releases and read-only revenue. A personal API token and a tiny CLI are an early expectation, because the closest analogue, WIP, already offers a REST API, a Telegram bot and a Raycast extension.

Keep the mutual match, but cap it. Each week, show a small, pre-filtered deck of candidates; ask for a personal note with each request; and start every match with a two-week trial sprint rather than an endless swipe stack.

The lean MVP is one six-week season of 30–100 builders, matched by hand, with:
- weekly check-ins
- forgiving pair streaks
- reminders
- rematching
- a demo day

Defer AI matching, money stakes, public leaderboards, native apps and most integrations.

For design, borrow Cloudflare's discipline: Inter, a white canvas, near-black type, one accent with a fixed role, hairline borders and small radii. Also borrow the trick from its product UI of keeping the brand color separate from the clickable color. Do not borrow its orange, its "flare" motif or its illustrations.

The owner's codebase and brand colors were not available. Each recommendation below therefore names the functional areas it touches, and a final section lists the questions a pass over the repository must answer.

## Evidence quality

Read the citations with these limits in mind.

**Most sources were read through search summaries.** The researchers' network proxy blocked direct page fetches on most sites, including github.com docs, linear.app, vercel.com, wip.co, ycombinator.com, news.ycombinator.com and cloudflare.com. Most claims below therefore rest on search-engine summaries of the cited pages, not on full reads. Quotes are near-verbatim and should be spot-checked before they appear in marketing copy.

**A few sources were read directly.** The researchers read the design tokens straight from the published npm packages for Cloudflare's Kumo design system (`@cloudflare/kumo` 2.14.0), GitHub Primer (`@primer/primitives` 11.10.0) and Geist.

**Contrast ratios are computed, not published.** The researchers worked them out with the WCAG formula, and this report re-checked them.

**Cloudflare marketing-page details are unverified.** Layout specifics of cloudflare.com and of the Cloudflare docs site come from the researchers' prior familiarity, not inspection. They are marked **[UNVERIFIED]** and should be checked in a browser before anyone treats them as a spec.

**Some data is old or company-reported.** The YC Co-Founder Matching statistics date from 2021. Focusmate's reliability rules come from 2018 blog posts. Hinge's figures are company-reported. One GitHub change from October 2026 rests on a single secondary summary. The current status of Makerlog, Pioneer and Lunchclub could not be confirmed.

**No study tests founder accountability directly.** The behavioral evidence is borrowed from health and weight-loss trials.

## Technical founders expect tools that respect their time and their repos

### Onboarding: borrowed identity, a real first action, nothing gated

Developer tools with well-regarded onboarding share three moves: identity the user already has, a fast path to a real first action, and skippable extras.

**Linear.** According to a third-party teardown, Linear's first run is: welcome, theme, team name, import, invite, notifications, first issue. There is **no role questionnaire and no permissions setup** ([Candu](https://www.candu.ai/blog/linear-onboarding-teardown)). It teaches the Cmd+K command menu before the workspace has any content, and the GitHub integration and teammate invites are both skippable ([Supademo](https://supademo.com/content/plg-onboarding-gallery/linear)).

**Vercel.** You import a Git repo and Vercel auto-detects the framework and build settings. The import itself creates the first deployment ([Vercel docs](https://vercel.com/docs/getting-started-with-vercel/import)). Sign-up uses a GitHub, GitLab or Bitbucket account, or an email six-digit code ([Vercel docs](https://vercel.com/docs/accounts/create-an-account)).

The complaints are just as consistent:
- **Onboarding in general.** Hacker News commenters call onboarding "extremely annoying" and "very frequently patronizing" ([HN](https://news.ycombinator.com/item?id=19798849)).
- **Surveys.** Even survey vendors concede that a role survey shown before the dashboard "feels like a gate" ([Appcues](https://www.appcues.com/blog/user-onboarding-surveys)). Another recommends at most two questions after sign-up ([Formbricks](https://formbricks.com/blog/user-onboarding-best-practices)).
- **Magic links.** These draw complaints when they are the *only* way in ([HN](https://news.ycombinator.com/item?id=42627453)). One 2025-era advisory also describes pre-account hijacking on magic-link and email-OTP sign-in, so account linking needs care ([GHSA-qq9h-g4jm-xgf3](https://github.com/advisories/GHSA-qq9h-g4jm-xgf3)).
- **Repo permissions.** This is the most specific developer grievance. GitHub OAuth Apps have **no read-only private-repo scope**, and the `repo` scope grants full read/write access ([GitHub community #174347](https://github.com/orgs/community/discussions/174347); [GitHub Docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)). Developers ask apps to "only require the lowest level of permission" ([GitHub community #7891](https://github.com/orgs/community/discussions/7891)).
- **Empty dashboards.** These undercut first value. A teardown of PostHog found users landing on an empty dashboard until events accumulate ([Indie Hackers](https://www.indiehackers.com/post/i-went-through-posthogs-onboarding-so-you-don-t-have-to-here-s-what-i-found-b659301e4f)). Empty-state guides suggest clearly labeled, muted sample data ([usertourkit](https://usertourkit.com/blog/empty-states-that-convert-onboarding-design-patterns)).

For Buildpair, this means:
- "Continue with GitHub" should request identity and email only, with a non-magic-link fallback.
- Onboarding should end on the founder's first real commitment, not on a questionnaire or an empty feed.
- Repo access should be a later, explicit opt-in.

### Feeds: chronological, work-first, built from shipped work

GitHub's feed history is a warning.

**GitHub reversed course on ranking.** In 2023 it introduced an algorithmic "For you" feed, and a community thread titled "Bring back the old feed please" captured the backlash ([GitHub changelog](https://github.blog/changelog/2023-09-06-updates-to-your-github-feed/); [GitHub community #66188](https://github.com/orgs/community/discussions/66188)). On 14 February 2025 GitHub **reverted to chronological ordering** ([GitHub changelog](https://github.blog/changelog/2025-02-14-reverting-feed-activity-sorting-back-to-chronological-ordering/)). A secondary summary reports that in October 2026 GitHub made a work-focused home dashboard the default and moved updates from followed people to a separate Feed tab ([WindowsForum summary](https://windowsforum.com/news/github-makes-work-focused-home-dashboard-default-with-feed-tab-and-copilot-actions.446883/)). That last claim rests on that summary alone.

**Linear separates "For me" from discovery.** Its Pulse feed has "For me", "Popular" and "Recent" tabs, plus an optional daily or weekly digest ([Linear docs: Pulse](https://linear.app/docs/pulse)).

**WIP logs completed work only.** Members post **completed to-dos, not plans**. A streak needs one completed to-do per day and resets to zero after a miss. Members get one free streak freeze a month ([WIP help](https://wip.co/help)). Members keep asking for weekend exemptions and gentler resets ([WIP: weekends](https://wip.co/posts/can-i-keep-my-streak-if-i-don-t-post-on-weekends-xnpz4q); [WIP: drop by 1](https://wip.co/posts/what-if-rather-than-losing-your-streak-count-during-an-off-day-it-drops-by-1-or-more-wip-bgxe87)).

**Counting shapes behavior.** GitHub removed streak counters in 2016 so users would "focus on the work you're doing rather than the duration of your activity" ([GitHub blog](https://github.blog/news-insights/product-news/more-contributions-on-your-profile)). A peer-reviewed natural experiment found that afterwards **weekend activity fell and single-contribution days became less common** ([Moldon et al., ICSE 2021](https://ar5iv.labs.arxiv.org/html/2006.02371)). In other words, the counter had been producing trivial activity. Contribution graphs are also trivially faked ([DEV](https://dev.to/sylwia-lask/your-github-contribution-graph-means-absolutely-nothing-and-heres-why-2kjc); [gitfill](https://github.com/frankdierolf/gitfill)).

Buildpair should therefore count honest check-ins and shipped outcomes, never raw activity volume. Its default feed should be the pair's own work, in chronological order and written like a changelog.

### Check-ins: three prompts, two minutes, one guaranteed reader

Async check-in tools have settled on a stable pattern.

**Linear project updates:**
- Each update is a **health signal (On track / At risk / Off track)** plus free text.
- Reminders go only to the owner, followed by **nudges one and two working days later**.
- A project with no update shows a gray indicator.
- Linear recommends a weekly cadence ([Linear docs](https://linear.app/docs/initiative-and-project-updates)).
- Linear built human-written updates because progress "can't be predicted from quantitative data alone" ([Linear Now](https://linear.app/now/how-we-built-project-updates)).

**Basecamp Automatic Check-ins** roll answers into a digest with a permanent history per person ([Basecamp](https://basecamp.com/features/automatic-check-ins)). Jason Fried describes skimming them as a **five-minute daily catch-up** ([37signals](https://37signals.com/podcast/how-we-work-fewer-meetings-more-check-ins/)).

**Status Hero** adds GitHub, Jira and Trello activity to each check-in automatically, so people only write the qualitative part ([Slack Marketplace](https://slack.com/marketplace/A0FRKLJDA-status-hero)).

**The failure mode is "nobody reads it."** A competing vendor's blog, which is biased, describes updates decaying to one-liners by month three ([Standin](https://www.standin.co/blog/geekbot-alternatives)). Practitioners recommend updates that take **under two minutes and lead with the blocker** ([Pickuma](https://pickuma.com/for-dev/async-standups-people-actually-read/)). A pair app has a structural advantage here: every check-in has exactly one reader who is expected to respond.

### Conventions that read as "built for developers"

**A command palette on Cmd+K** is now normal in web apps such as Linear, Slack and Superhuman. It should work from anywhere, show its shortcuts and run real actions ([Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)). The known failure is a palette that only lists pages users could have clicked anyway ([Setproduct](https://www.setproduct.com/blog/command-palette-ui-design-guide)). Linear, Vercel and Raycast all use Vercel's open-source `cmdk` library ([techinterview](https://www.techinterview.org/post/3233475212/build-command-palette-cmd-k/)). In 2019 Linear bound `?` to a shortcuts sheet and made its tour replayable from the command menu ([Linear changelog, 2019](https://linear.app/changelog/2019-05-09-first-time-user-experience)).

**Dark mode** is a strong preference, but there is little hard data. Three-quarters of Sourcegraph's engineers prefer dark themes, from a small internal sample ([Sourcegraph](https://sourcegraph.com/blog/workspaces-of-sourcegraph/)). The often-quoted "70% of developers" figure could not be traced to a source.

**Theming, Markdown, changelogs and copy:**
- Linear's recent refresh lets users build custom themes from base and accent colors ([Linear Now](https://linear.app/now/behind-the-latest-design-refresh)).
- Any Linear update can be copied as Markdown from Cmd+K ([Linear docs](https://linear.app/docs/initiative-and-project-updates)).
- Raycast keeps a dated, versioned public changelog ([Raycast changelog](https://www.raycast.com/changelog)).
- Railway's candid copy ("the actual error is rarely at the bottom!") shows the expected tone ([Railway docs](https://docs.railway.com/quick-start)).

## Verify shipping from deploys, merged PRs and revenue, never from repo write access

### GitHub: use a GitHub App, never the `repo` scope

A GitHub App lets users choose which repositories it can see. It can receive `push` webhooks, but subscribing to `push` **requires Contents: read** ([GitHub Docs: webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads)). Contents is also the permission that allows cloning ([GitHub Docs: choosing permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)).

So there is **no "commit metadata only" permission**, and scopes alone cannot remove the trust problem. Buildpair has to earn trust in other ways:
- Users install the app on selected repositories only.
- Buildpair processes webhook payloads only and never calls the contents or tree APIs.
- A plain privacy statement says so.
- Founders who want zero repo permissions get alternatives: a git hook, or a CLI that posts only commit subjects.

Two more constraints:
- **Rate limits are generous.** A GitHub App installation starts at 5,000 requests an hour and scales up to 12,500 ([GitHub Docs: rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)). Even so, webhooks are better than polling.
- **The public Events API is a dead end.** GitHub's August 2025 changelog announced trimmed push-event payloads ([GitHub changelog](https://github.blog/changelog/2025-08-08-upcoming-changes-to-github-events-api-payloads/)). Secondhand reports say commit lists were removed from `PushEvent` entirely by October 2025 ([DEV](https://dev.to/flarecanary/github-silently-removed-payloadcommits-from-pushevent-heres-what-broke-and-how-to-catch-the-2i33)).

Polling also has a cost in freshness. Peerlist's GitHub sync "is not synced in real-time" and can lag 24 to 72 hours ([Peerlist help](https://help.peerlist.io/individual/peerlist-profile/how-to-create-peerlist-profile/how-to-showcase-my-work-on-my-peerlist-profile)).

### Deploys and revenue are the cleanest signals

A production deploy proves something shipped. It needs no code access and produces about one event per real release.

**Vercel.** `deployment.promoted` fires when a production deployment starts serving traffic, and it excludes rollbacks ([Vercel docs](https://vercel.com/docs/webhooks/webhooks-api); [Vercel changelog](https://vercel.com/changelog/new-webhook-for-promotion-events)). `deployment.succeeded` depends on checks registered by an integration ([Vercel docs](https://vercel.com/docs/webhooks/webhooks-api)), so `deployment.promoted` is the better trigger. Vercel's own demo notes that event ordering is not guaranteed ([vercel-labs/demo-webhooks](https://github.com/vercel-labs/demo-webhooks)).

**Other hosts:**
- Netlify sends "Deploy succeeded" with an optional JWS signature ([Netlify docs](https://docs.netlify.com/deploy/deploy-notifications/)).
- Render's deploy webhooks require a Pro plan ([Render docs](https://render.com/docs/webhooks)).
- Railway sends deployment status webhooks per project ([Railway docs](https://docs.railway.com/observability/webhooks)).

**Revenue** is the most valued signal in build-in-public circles, but only when it is verified.
- Stripe restricted keys can be limited to read-only access per resource ([Stripe docs](https://docs.stripe.com/keys/restricted-api-keys)).
- TrustMRR lists startups only through a read-only payment-provider key. It refreshes about hourly, can be revoked at any time and collects only revenue metrics ([TrustMRR FAQ](https://trustmrr.com/faq)). It was built because of faked Stripe screenshots ([Leedlime](https://leedlime.com/blog/marc-lou-trust-mrr/)).
- Indie Hackers lets visitors filter for Stripe-verified revenue ([Indie Hackers](https://www.indiehackers.com/products?businessModel=subscriptions&funding=self&revenueVerification=stripe&sorting=highest-revenue)). Hacker News commenters note that most listings are unverified, and one founder removed verification after passing $200k a month ([HN](https://news.ycombinator.com/item?id=32151172)). Revenue display must therefore be opt-in.

**Linear** is a solid second wave. Its webhooks cover issues, projects and project updates and are signed with HMAC-SHA256 ([Linear Developers](https://linear.app/developers/webhooks)). Its OAuth `read` scope is the default ([Linear docs](https://linear.app/docs/api/oauth-2-0-authentication)). No data was found on how many solo founders use Linear, so it waits for phase 2.

| Signal | What it proves | Privacy cost | Suggested phase |
|---|---|---|---|
| Verified revenue (Stripe or other restricted read-only key) | Customers pay | Revenue figures only; opt-in display | After core loop |
| Production deploy webhook (Vercel `deployment.promoted`, Netlify, Render, Railway) | Something reached users | None on code; per-user webhook secret | MVP-adjacent (cheapest) |
| Merged PRs and releases (GitHub App) | Discrete units of work landed | Contents: read on selected repos | After core loop |
| Closed issues and project updates (Linear) | Planned work completed; human-written updates | OAuth `read` | Phase 2 |
| Commits and coding time (git hook, WakaTime) | Effort only | Low (hook) to moderate | Optional; never ranked |

The ranking in this table is the researchers' synthesis from the trust debates above. No survey ranks these signals.

### AI summaries are commoditized; the accountability loop is not

Many tools already turn commits and PRs into AI standups, including [Gitmore](https://gitmore.io/blog/best-async-standup-tools), [EasyStandup](https://www.easystandup.com/) and [Steady](https://runsteady.com/integrations/github/). Geekbot now ships a CLI and an MCP server whose agent drafts the standup from merged PRs "ready for one-tap approval" ([Geekbot](https://geekbot.com/blog/geekbot-cli-and-geekbot-mcp/)).

The pattern to copy is **AI drafts, the human approves**:
- Draft from merged-PR titles, release notes and deploy events, not noisy commit messages.
- Never auto-post a draft into a shared space.
- Keep manual entries for non-code work such as sales calls and interviews, so that a week with no integration events does not read as a week with no progress.

### An API, a token and a tiny CLI are early expectations

WIP, the closest analogue, offers:
- a REST API with API-key or OAuth auth and an OpenAPI spec, which replaced its older GraphQL API, plus Zapier ([WIP API](https://wip.co/api))
- an official Raycast extension
- a Telegram bot that takes `/done <text> #project`
- an explicit stance that "anything able to call an HTTP endpoint can post" ([WIP help](https://wip.co/help))

WIP's early growth came largely through that Telegram bot ([HackerNoon](https://hackernoon.com/founder-interviews-marc-k%C3%B6hlbrugge-of-wip-4f2d6d696d5c)), and its community built its own bots on top ([cba85/telegram-wiptimelinebot](https://github.com/cba85/telegram-wiptimelinebot)). Geekbot's CLI-plus-MCP move ([Geekbot](https://geekbot.com/blog/geekbot-cli-and-geekbot-mcp/)) suggests that letting AI coding agents report progress is becoming expected. Adding an MCP server to tools like Claude Code is a one-line operation ([Claude Code docs](https://code.claude.com/docs/en/mcp)).

The honest gap: no data shows what share of users actually post through an API or CLI. The case for it rests on two things. It removes friction from logging, which is the habit that matters. And it signals to technical founders that the product fits a terminal-first workflow. The minimum version is cheap, so it belongs early:
- a personal token
- one `POST` endpoint
- a ten-line CLI or git hook

## Incumbents each fail in a known way, and Buildspace's slot is empty

### Cofounder matchers: long funnels, bots and no-shows

**YC Co-Founder Matching** is the free default. Profiles need approval, which can take up to a week. Users send an invite with a personal message, and a match forms only when the invite is accepted. Invites are capped at **15 a week "to prevent spam,"** and YC recommends a trial project before committing ([Startup School FAQ](https://startupschool.org/faq)).

YC's October 2021 data is the only large public dataset ([YC blog](https://www.ycombinator.com/blog/what-do-people-want-in-a-co-founder/)):
- **25% of invites were accepted**, and the average user had 3.6 matches.
- 79% cared about time commitment, but only **15% made it a must-have**.
- **61% of matches were within three time zones.**
- Only 42% of profiles were technical. Separately, TechCrunch's reading of the data is that 63% want an engineering cofounder ([TechCrunch](https://techcrunch.com/2021/10/21/what-do-people-want-in-a-co-founder-yc-has-some-answers/)).

Users report long funnels. One founder described "~150 people, talking to ~50 … deal with 1" ([HN](https://news.ycombinator.com/item?id=42184984)). A YC staffer called it "a multi-sided marketplace with complex dynamics" ([HN](https://news.ycombinator.com/item?id=34886675)). TechCrunch summed the concept up as "kind of like Tinder for co-founders," harder to execute than it looks ([TechCrunch](https://techcrunch.com/?p=2175809)).

**Paid and algorithmic alternatives fare worse:**
- **CoFoundersLab** reviews are dominated by complaints about free trials converting to ~$89/month charges and about "cofounders" who are bots or salespeople ([Trustpilot](https://www.trustpilot.com/review/cofounderslab.com)).
- **Lunchclub**, which made AI-matched intros, drew complaints about having no control over matches and about no-shows ([Product Hunt](https://www.producthunt.com/products/lunchclub/reviews)).
- **Focusmate** is praised for "gentle and positive accountability," but its top complaints are no-shows, late cancellations and lockouts ([Product Hunt](https://www.producthunt.com/products/focusmate/reviews)).
- **Cohort programs** such as Entrepreneur First pair people well through repeated short trial collaborations, but they demand full-time commitment and equity ([Dan MacD on EF](https://danmacd.substack.com/p/is-entrepreneur-first-worth-it-part-3c4)).

Two quieter signals matter for positioning:
- **Engineers get approached by non-technical "idea" people** and learn to treat it as a red flag ([Blind](https://www.teamblind.com/post/looking-for-a-technical-cofounder-fefhseb8)).
- One old Hacker News thread captures the underlying need: "In looking for a cofounder, I'm mostly seeking social support and motivation" ([HN](https://news.ycombinator.com/item?id=824943)).

### Accountability feeds: visibility without relationships

**WIP** charges new members **$29/month or $199/year** and remains invite-only ([WIP](https://wip.co/posts/discontinuing-free-plans-for-new-wip-members-tbahrf)). A December 2024 review calls it "a maker community that's missing the community" ([ilikekillnerds](https://ilikekillnerds.com/2024/12/15/my-experience-with-wip-co-a-maker-community-thats-missing-the-community/)). A ranking site gives it "great accountability for shipping, less help with sales, pricing, or hiring" ([profitablefounder](https://www.profitablefounder.xyz/blog/best-indie-hacker-communities)).

**Indie Hackers** users complain about low-quality, repetitive content ([news.hada.io](https://news.hada.io/topic?id=16908)). A February 2025 post asks whether build-in-public is ending as top indie hackers go quiet to avoid copycats ([Indie Hackers](https://www.indiehackers.com/post/lifestyle/is-this-the-end-of-build-in-public-heres-why-top-indie-hackers-are-suddenly-disappearing-IhSJQBnXNuNwSuNTuz4t)). That argues for **private-by-default** progress.

**Buildspace Nights & Weekends** came closest to what Buildpair wants to be:
- a six-week season with mandatory weekly updates
- Discord "houses"
- a demo day ([Josh Finnie review](https://www.joshfinnie.com/blog/review-of-buildspace-nights-weekends/))

More than 30,000 people joined it in 2023 ([YC company page](https://www.ycombinator.com/companies/buildspace)). One participant counted roughly 7,000 sign-ups and about 450 finishers in one season, about 6%; this is an anecdotal count ([Prithvi Bharadwaj](https://prithvibharadwaj.substack.com/p/the-buildspace-experience)). It closed in August 2024 for personal reasons, while, by the founder's account, it was "the strongest it's ever been" ([buildspace.so](https://buildspace.so/old-home-2); [Farza on X](https://x.com/FarzaTV/status/1827030900456169849?lang=en)).

Newer tools such as [ShipIt](https://shipit.day/) offer commit-verified streaks, but they serve solo builders. No active product found in this research combines all four of these elements:
- a mutual match between builders who each own a product
- no equity
- verified shipping signals
- a time-boxed season

That combination is Buildpair's opening.

### Swipe works as a gesture, not as the matching model

The swipe-first professional apps are gone. Shapr closed in 2023 ([Wikipedia](https://en.wikipedia.org/wiki/Shapr)), and Bumble Bizz is being "phased out across all countries" ([Bumble support](https://support.bumble.com/hc/en-us/articles/30208230972189-Availability-of-Bumble-Bizz)). Tinder's original CTO said that, for business networking, "it isn't as easy as just throwing profiles up on a screen" and that Tinder's success went "far deeper" than the swipe ([TechCrunch](https://techcrunch.com/2018/01/08/ripple-a-tinder-spinoff-backed-by-match-launches-app-for-professional-networking/?ncid=rss)).

**The research on how many options to show is mixed:**
- **Against long decks:** in one study, the probability of accepting a profile fell about 27% from the first profile to the last as options kept coming ([Pronk & Denissen 2019](https://journals.sagepub.com/doi/10.1177/1948550619866189)).
- **For larger sets:** a 2026 study found that showing 31 profiles instead of 6 *raised* intent to pursue ([PsyPost on Hu & Markowitz](https://www.psypost.org/more-choices-on-dating-apps-actually-increase-commitment-new-study-suggests/)).

**What clearly does work is double opt-in with substance and limits:**
- **YC's model:** an invite carrying a personal note, accepted at 25%.
- **Hinge's "Most Compatible":** one curated recommendation a day that expires after 24 hours ([Wikipedia: Hinge](https://wikipedia.com/wiki/Hinge_%28app%29)).
- **Hinge's "Your Turn Limits":** once eight or more matches are waiting on a reply, the user cannot send or receive new likes until they respond. Hinge reports this **raised responsiveness by 20%** ([Hinge newsroom](https://hinge.co/newsroom/your-turn-limits-test)).
- **Hinge's "We Met" check:** a private prompt after a meeting feeds real-world outcomes back into matching ([TechCrunch](https://techcrunch.com/2018/10/16/hinge-is-first-dating-app-to-actually-measure-real-world-success)).

**Verdict:** keep "mutual match" as the core promise.
- Present a **capped, pre-filtered deck of three to five candidates a week**. A swipe or keyboard gesture is fine as the triage interface.
- Require a one-line note with each request.
- Turn every accepted match straight into a time-boxed trial sprint instead of an open chat.
- Drop "Tinder" from public copy. It invites the comparison that sank Shapr and that TechCrunch used to signal doubt.

## One season, one partner, one weekly report: the lean MVP

### The behavioral evidence favors specific plans reported to a specific person

Three findings carry most of the weight:
- **Monitoring and reporting.** Monitoring progress improves goal attainment (d = 0.40), and **the effect grows when progress is reported to others or physically recorded** ([Harkin et al. 2016](https://eprints.whiterose.ac.uk/91437/)).
- **If-then plans.** Concrete plans of the form "When it's Tuesday 8pm, I will ship the checkout" show d = 0.65 across 94 tests ([Gollwitzer & Sheeran, via Frontiers](https://www.frontiersin.org/articles/10.3389/fpsyg.2021.565202/full)).
- **Social support.** Recruiting people with friends and adding social support raised completion from 76% to 95%, and maintenance from 24% to 66% ([Wing & Jeffery](https://experts.umn.edu/en/publications/benefits-of-recruiting-participants-with-friends-and-increasing-s/)).

Several caveats shape the design:
- **Announcing identity goals can backfire.** Identity-related intentions that others noticed were acted on *less*, through a "premature sense of completeness" ([Gollwitzer et al. 2009](https://www.socmot.uni-konstanz.de/node/131)). Keep "I'm building X!" posts private until something ships.
- **Money stakes have low take-up.** They help people who opt in, but only 29% of stickK commitments carried them ([ICWSM analysis](https://ojs.aaai.org/index.php/ICWSM/article/download/31440/33600)). Only 14% of people offered a deposit contract in a smoking trial accepted it ([Beeminder blog on NEJM trial](https://blog.beeminder.com/smoking)).
- **Fresh starts help.** People are likelier to start goals after temporal landmarks such as a Monday or the first of the month ([Dai, Milkman & Riis](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf)).
- **Habits take longer than a season.** Median habit formation took about 66 days ([The Behavioral Scientist on Lally](https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit)). A six-week season should not promise to form a habit.
- **Matching strangers can work.** In a field experiment with 112 aspiring software entrepreneurs, teams without prior ties benefited from nearby high-performing peers ([Hasan & Koning](https://www.hbs.edu/ris/Publication%20Files/When_Peers_don_t_have_an_effect_4bccbfcc-0ebc-4675-a8b2-feda39bf71e2.pdf)).
- **Don't use two popular statistics in marketing.** The "76% vs. 43%" Dominican University study is a small, unpublished conference presentation ([Matthews summary](https://www.dominican.edu/sites/default/files/2020-02/gailmatthews-harvard-goals-researchsummary.pdf)). The "ASTD 95%" figure has no traceable source ([ATD](https://www.td.org/content/td-magazine/fact-check)).

### Matching inputs and anti-ghosting rules

YC's data suggests which signals to collect. Keep must-haves few and treat the rest as soft ranking factors:
1. **Time-zone overlap or working-hours window.** 61% of YC matches were within three zones.
2. **Weekly hours committed.** This was the top preference, yet rarely a must-have. Buildpair should make it a hard filter.
3. **Stage:** idea, building, launched or revenue.
4. **Stack and skills,** so partners can actually guide each other.
5. **Season goal type:** ship an MVP, get first users, or get first revenue.
6. **Async versus call preference.**

Being individually identifiable reduces social loafing ([Wikipedia: social loafing](https://en.wikipedia.org/wiki/Social_loafing)). Each partner's report should therefore be visibly expected by the other.

Reliability needs explicit mechanics, and Focusmate offers a working model:
- Its 2018 rules based an attendance score on the last 20 sessions and let booking limits grow with reliability ([Focusmate blog](https://www.focusmate.com/blog/feature-update-july-2018-attendance-score-booking-limits/)).
- It offers a rematch after one minute if a partner doesn't show ([Focusmate support](https://support.focusmate.com/en/articles/4044431-what-if-i-don-t-get-a-match-or-my-partner-doesn-t-show)).

Buildpair's equivalents:
- a missed-check-in counter
- reliability shown before matching
- limits on open requests, in the style of Hinge's Your Turn Limits
- a fast re-pair pool so one person's ghosting never ends the other's season

Users resent punitive lockouts, so the penalties should be soft ([Product Hunt](https://www.producthunt.com/products/focusmate/reviews)).

### Cold start: one dense season, matched by hand

Andrew Chen's advice is to win a small, dense "atomic network" first and to recruit the "hard side" ([Charter](https://www.charterworks.com/the-cold-start-problem-andrew-chen/)). Here the hard side is builders who reliably show up.

The precedents point the same way:
- **YC** piloted cofounder matching inside Startup School, where 4,500 users made about 9,000 matches before the public launch ([YC launch blog](https://www.ycombinator.com/blog/co-founder-matching/)).
- **WIP** began as a free Telegram group ([HackerNoon](https://hackernoon.com/founder-interviews-marc-k%C3%B6hlbrugge-of-wip-4f2d6d696d5c)).
- **Concierge matching** is standard marketplace advice: "If you can't make it work as a human concierge, you can't make it work as software" ([Traction Thinking](https://tractionthinking.substack.com/p/illiquid-marketplaces)).
- **Cohorts complete more often.** Scheduled cohort courses complete at 64.2% versus 48.2% for self-paced ones ([Ruzuku](https://www.ruzuku.com/learn/articles/completion-gap)).

**Season 1 shape:**
- 30–100 builders from one community, all starting on the same Monday
- light screening: a project or repo link and stated weekly hours
- manual matching
- a "bring your build buddy" option

### Retention: count pair weeks, forgive misses, end with a demo day

Day-30 retention for health and fitness apps runs around 3–8% ([Business of Apps](https://businessofapps.com/data/health-fitness-app-benchmarks)), so daily opens are the wrong yardstick.

Streak design needs care:
- **Broken streaks hurt.** Highlighting a streak increases continuation, but a broken one lowers later engagement ([Penn CHIBE seminar abstract](https://chibe.upenn.edu/event/rachel-gershon-phd%E2%94%82chibe-research-seminar/)).
- **Forgiveness helps.** Duolingo built a "Weekend Amulet" because "losing a streak can be very discouraging" ([Duolingo](https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals)).

Buildpair should:
- count **weeks in which both partners checked in**
- give one "life happens" freeze per season
- allow vacation pauses
- never shame a break publicly
- measure retention as **season-to-season re-enrollment and goal shipped by demo day**

### What the MVP contains and what it defers

| In the MVP (season 1) | Deferred |
|---|---|
| GitHub sign-in (identity scope only) plus a non-magic-link fallback | Infinite swipe feed; ML or AI matching |
| Intake profile: time zone and working window, weekly hours, stage, stack, season goal, check-in mode, project link | Money stakes and commitment contracts (low take-up) |
| Waitlist or application, then manual (concierge) matching of 3 candidates, mutual accept with a one-line note | Public social feed, leaderboards, global rankings |
| Kickoff on a Monday: one season goal plus a weekly if-then plan | Native mobile apps; in-app video (link to Meet or Zoom instead) |
| Weekly check-in to the partner (shipped / next / blocked, plus health), with partner acknowledgment | Payments, paywalls, pods larger than three |
| Email reminders with at most two nudges; weekly pair streak with one freeze | GitHub App, Stripe, Linear, Slack/Discord bots, MCP (phase 2) |
| "Keep building with this person?" pulse after weeks 1 and 3; re-pair pool | Vercel Marketplace integration, WakaTime, Product Hunt, X/Bluesky cross-posting |
| Block, report, code of conduct, a founder-run moderation queue | |
| Demo-day post at season end; opt in to the next season | |
| Stretch: personal API token with one endpoint and a git-hook script; generic deploy-webhook URL | |

### How to make it appeal to founders and would-be cofounders

**Positioning.** Present Buildpair as a "build partner for people shipping their own product," not a cofounder marketplace. That lowers the stakes and avoids the CoFoundersLab associations.

**The cofounder angle.** The two-week trial sprint is exactly what YC tells would-be cofounders to do before committing ([Startup School FAQ](https://startupschool.org/faq)), and YC's success stories ran month-long trials ([YC blog](https://www.ycombinator.com/blog/does-co-founder-matching-work)). Buildpair can therefore add an optional "open to cofounding" profile flag. Pairs who click can then use YC's "10 questions" style prompts ([YC](https://www.ycombinator.com/blog/10-questions-to-discuss-with-a-potential-co-founder)) without turning the product into an equity marketplace.

**Protecting technical founders.** Requiring proof of shipping (a project link or connected deploy) to enter the pool protects technical founders from idea-only outreach. It also makes the community feel professional.

**Pricing.** Keep it plain:
- no paywalled first message
- easy cancellation
- no revenue from users' failures

These are the monetization patterns that drew the harshest reviews ([Trustpilot: CoFoundersLab](https://www.trustpilot.com/review/cofounderslab.com)).

## Borrow Cloudflare's discipline, not its orange

### What actually creates the Cloudflare feel

Cloudflare's published brand guidelines, read via search excerpts of the official pages, describe a restrained system:

**Typography** ([Cloudflare Brand: Typography](https://www.cloudflare.com/tr-tr/brand/typography)):
- **Inter**, the open-source typeface, in four weights
- headlines in sentence case, semibold, with **−3% tracking and 100% leading**
- eyebrow labels in ALL CAPS, semibold, with **+5% tracking**
- body text regular, with −2% tracking and 120% leading
- **left-aligned** in most layouts

**Color** ([Cloudflare Brand: Color](https://www.cloudflare.com/en-gb/brand/color)):
- one lead orange, Tangerine #F6821F, as the constant
- white as a primary color, with "ample white space"
- black reserved for type and "never as a background"
- secondary colors "only used in diagrams and illustrations"

**Graphics.** The signature graphic is the cropped "flare" arc taken from the logomark ([Cloudflare Brand: Design Elements](https://www.cloudflare.com/en-ca/brand/design-elements)). The illustration principles favor simplicity, metaphor over explanatory text, and legibility at small sizes ([Cloudflare Brand: Illustration](https://www.cloudflare.com/en-au/brand/illustration)).

The feel therefore comes from discipline, not from proprietary assets: a white canvas, near-black type, one accent in a fixed role, tight semibold headlines, small tracked eyebrows and left alignment. All of these are generic and free to use.

### Cloudflare's product UI splits identity color from action color

Kumo, Cloudflare's MIT-licensed React design system, was read directly from its npm package ([npm: @cloudflare/kumo](https://registry.npmjs.org/@cloudflare/kumo); [2.14.0 tarball](https://registry.npmjs.org/@cloudflare/kumo/-/kumo-2.14.0.tgz)). It is built on Base UI and Tailwind CSS v4.

Its tokens, from that package:
- **Surfaces** are neutral, zero-chroma OKLCH greys with light/dark pairs handled by CSS `light-dark()`.
- **The interactive "brand" color is a saturated blue**, roughly #056DFF.
- **Tangerine is a text color only.**
- **Borders** are hairlines at about 10% alpha.
- **Focus rings are neutral**, not brand-colored.
- **Radii** are mostly 6–8px, and shadows are rare.
- **Type:** `text-sm` (14px) is the workhorse size, and medium is the most common weight.
- **Status colors** come in solid-plus-tint pairs.
- It ships `CommandPalette`, `Sidebar`, `Meter`, `Empty` and `Chart` components.

The reason for the split is contrast. Per this report's WCAG calculations, **white on Tangerine is 2.58:1**, which fails AA for text and the 3:1 threshold for UI components. Black on Tangerine is 8.13:1, and white on Kumo's blue is 4.53:1. WCAG AA requires 4.5:1 for normal text and 3:1 for large text and UI components ([W3C](https://w3.org/WAI/WCAG21/Understanding/contrast-minimum.html); [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast)).

Cloudflare also reorganized dashboard navigation around tasks rather than product names, for example "Insights" and "Traffic policies" ([Cloudflare changelog](https://developers.cloudflare.com/changelog/new-cloudflare-one-navigation-and-product-experience)). That is a useful model for a founder-jobs sidebar.

### Role map for Buildpair's own colors

The owner's brand colors are unknown, so this map defines roles, not hex values. Measure the brand color's relative luminance first. **Below about 0.18, white text on it can pass AA. Above about 0.18, it needs dark text, or a darkened shade for button fills.** This follows from the WCAG formula, since white passes 4.5:1 only when the fill's luminance is at most about 0.183. Darken in OKLCH so the hue stays recognizable ([MDN: lch()](https://developer.mozilla.org/docs/Web/CSS/Reference/Values/color_value/lch)). If the owner's color is orange, shift it far enough from Tangerine to avoid any suggestion of affiliation.

| Token | Role | Rule | Cloudflare/Kumo analogue |
|---|---|---|---|
| `--brand` | Identity: logo, eyebrow accent, small highlights, illustration key color | Any shade; used as text only if ≥4.5:1 | Tangerine as text-only brand color |
| `--primary`, `--primary-fg` | Primary button fill and its text; about one per view | ≥4.5:1 between them; fill ≥3:1 against canvas | Kumo's blue interactive brand token |
| `--link` | Inline links | ≥4.5:1 on canvas in both modes | blue-800 light / blue-400 dark |
| `--focus` | Focus ring | ≥3:1; neutral by default | near-black / near-white |
| `--canvas`, `--base`, `--elevated`, `--recessed` | Surfaces | Near-zero-chroma neutrals; light/dark pairs | Kumo OKLCH neutrals |
| `--text`, `--text-strong`, `--text-subtle` | Type | Body text ≥4.5:1 | neutral-900/100 scale |
| `--line`, `--hairline` | Borders and dividers | About 10% alpha near-black in light mode | Kumo `line` / `hairline` |
| `--success`, `--warning`, `--danger`, `--info` (+ `-tint`) | Status, health chips (On track / At risk / Off track) | Solid for icons and text, tint for backgrounds | Kumo status pairs |
| `--chart-1…6` | Charts, diagrams, match-fit visuals only | Never on buttons | "Secondary colors only in diagrams" |

### Type, shape and density spec

**Fonts.** Use **Inter**, which is open source and is Cloudflare's actual brand face ([Wikipedia: Inter](https://en.wikipedia.org/wiki/Inter_%28typeface%29)), or Geist Sans under the SIL OFL license ([vercel/geist-font](https://github.com/vercel/geist-font)). Pair it with a monospace face for IDs, timestamps, streak counts and metrics.

**Marketing type.** Apply Cloudflare's specs:
- headlines semibold at −0.03em letter-spacing and about 1.0 line-height
- eyebrows uppercase semibold at +0.05em

**Product UI type.** Keep 14px body text with normal tracking. Kumo's density and Primer's tokens suggest this, though the tracking choice is a judgment call, not a sourced rule.

**Shape and density** ([Primer primitives](https://registry.npmjs.org/@primer/primitives/-/primitives-11.10.0.tgz)):
- **Radius:** 6px for controls, 8px for cards, fully round for avatars and badges
- **Controls:** 32px default height
- **Elevation:** borders by default, shadows only on menus, popovers and dialogs
- **Icons:** one icon set in one weight (Kumo uses Phosphor)

**Light first.** Make the experience light-first, with first-class dark mode built from the same tokens. Avoid the dark-gradient-and-glow "Linear look." Commentary says Linear's site "feels cheapened by the number of blatant clones" ([Design This Week](https://designthisweek.substack.com/p/twid-linear-style-is-now-illegal)), and a light, restrained, Cloudflare-like system stands apart from that.

### Marketing-page grammar [UNVERIFIED]

The researchers' recollection of cloudflare.com includes:
- a large mega-menu with a persistent primary call to action and a secondary "contact sales" button
- a hero with a large headline, a subhead, two calls to action and an illustration
- customer-logo walls
- stat strips with big numbers
- three- and four-up feature-card grids
- dark full-width call-to-action bands
- a dense multi-column footer

None of this was inspected in this research, so **verify each element in a browser before treating it as a spec**. The dark bands in particular sit uneasily with the brand rule that black is never a background. A third-party reference describes the site as "a calm white canvas, near-black body type" with one orange accent ([webdesignhot](https://www.webdesignhot.com/api/design-md/cloudflare.md)), which is consistent with the verified guidelines.

If Buildpair uses this grammar:
- **Stat strips** should show only true numbers.
- **Logo walls** need permission from every company shown.
- **Testimonials** should carry real names.

### What not to copy

The layout grammar, Inter, neutral token structure, radii and accent discipline are generic and free to borrow. Do not copy:
- the Cloudflare logo, which requires written permission ([Cloudflare Trademark Guidelines](https://cloudflare.com/trademark))
- the flare or arc motif
- the Tangerine/Mango/Ruby set or the Dawn gradient
- Cloudflare's illustrations, icons or copy
- Kumo's `CloudflareLogo` component, if Kumo is used

US courts are skeptical of broad "look and feel" claims, but such claims have survived dismissal. In *Design With Friends v. Target*, the trade-dress claim was dismissed as functional, but a copyright claim over copied code survived ([D. Del. opinion](https://www.ded.uscourts.gov/sites/ded/files/opinions/21-1376%20DI%2024%20Opinion.pdf)). In *Blue Nile v. Ice.com*, a website trade-dress claim survived a motion to dismiss ([Stanford CIS](https://cyberlaw.stanford.edu/blog/2007/03/court-rules-copyright-preemption-trade-dress-infringement-and-state-law-claims)). This is general information, not legal advice.

Buildpair should create its own signature motif, for example two interlocking shapes for "pair," and use real product screenshots.

## Key findings at a glance

| # | Finding | Implication for Buildpair | Sources |
|---|---|---|---|
| 1 | Reporting progress to others strengthens monitoring's effect on goals (d = 0.40 overall); social support raised completion from 76% to 95% | Core loop = weekly report to one partner who responds | [Harkin 2016](https://eprints.whiterose.ac.uk/91437/); [Wing & Jeffery](https://experts.umn.edu/en/publications/benefits-of-recruiting-participants-with-friends-and-increasing-s/) |
| 2 | Swipe-first professional apps are gone; double opt-in with a note works (YC: 25% acceptance) | Capped weekly deck plus a note; no "Tinder" marketing | [Bumble](https://support.bumble.com/hc/en-us/articles/30208230972189-Availability-of-Bumble-Bizz); [YC blog](https://www.ycombinator.com/blog/what-do-people-want-in-a-co-founder/) |
| 3 | Commitment level matters to 79% of users but is a must-have for only 15%; 61% of matches fall within three time zones | Hard filters on weekly hours and time-zone overlap | [YC blog](https://www.ycombinator.com/blog/what-do-people-want-in-a-co-founder/) |
| 4 | No-shows and ghosting dominate complaints about Lunchclub and Focusmate; Hinge's reply caps raised responsiveness 20% | Reliability score, open-request cap, fast re-pair | [Product Hunt](https://www.producthunt.com/products/focusmate/reviews); [Hinge](https://hinge.co/newsroom/your-turn-limits-test) |
| 5 | GitHub reverted its algorithmic feed to chronological in 2025 | Chronological, work-first pair feed | [GitHub changelog](https://github.blog/changelog/2025-02-14-reverting-feed-activity-sorting-back-to-chronological-ordering/) |
| 6 | Removing GitHub streaks reduced weekend and one-commit days; broken streaks depress engagement | Weekly pair streaks with forgiveness; count outcomes | [ICSE 2021](https://ar5iv.labs.arxiv.org/html/2006.02371); [Penn CHIBE](https://chibe.upenn.edu/event/rachel-gershon-phd%E2%94%82chibe-research-seminar/) |
| 7 | GitHub OAuth has no read-only private-repo scope; push webhooks need Contents: read | Identity-only sign-in; opt-in GitHub App on selected repos; zero-permission hook alternative | [GitHub community](https://github.com/orgs/community/discussions/174347); [GitHub Docs](https://docs.github.com/en/webhooks/webhook-events-and-payloads) |
| 8 | Production-deploy and read-only revenue signals are cheap and trusted | Deploy-webhook receiver and Stripe restricted-key sync | [Vercel docs](https://vercel.com/docs/webhooks/webhooks-api); [TrustMRR](https://trustmrr.com/faq) |
| 9 | The closest analogue (WIP) has a REST API, Telegram `/done` and Raycast; Geekbot added a CLI and MCP | Personal token, one endpoint, tiny CLI early; MCP and bots in phase 2 | [WIP API](https://wip.co/api); [Geekbot](https://geekbot.com/blog/geekbot-cli-and-geekbot-mcp/) |
| 10 | Buildspace's season format drove engagement with high dropout and then closed; WIP is "missing the community" | Seasons, pairs and demo day fill an open slot | [buildspace.so](https://buildspace.so/old-home-2); [ilikekillnerds](https://ilikekillnerds.com/2024/12/15/my-experience-with-wip-co-a-maker-community-thats-missing-the-community/) |
| 11 | Cloudflare's feel comes from Inter, a white canvas, one accent and left alignment; its product UI uses blue for actions, orange for identity | Token role split; own hue and motif | [Cloudflare Brand](https://www.cloudflare.com/en-gb/brand/color); [Kumo](https://registry.npmjs.org/@cloudflare/kumo/-/kumo-2.14.0.tgz) |
| 12 | Announcing identity goals publicly can reduce effort; build-in-public is cooling | Private by default; public posts after shipping | [Gollwitzer 2009](https://www.socmot.uni-konstanz.de/node/131); [Indie Hackers](https://www.indiehackers.com/post/lifestyle/is-this-the-end-of-build-in-public-heres-why-top-indie-hackers-are-suddenly-disappearing-IhSJQBnXNuNwSuNTuz4t) |

## Prioritized recommendations

The IDs are stable for follow-up work. Within each group, items are listed in priority order. Effort labels (S, M, L) are relative guesses made without seeing the code, and should be re-estimated after the codebase mapping. Every item is phrased so it works whether the existing app already has the feature (adapt it) or not (add it). The mapping section lists the questions that decide which case applies.

### Quick wins

**QW1. Reposition and rewrite copy as "build partner for technical founders" (S).**
- Rename all user-facing "goal buddy" strings to Buildpair.
- Lead the landing page with the weekly-report-to-a-partner loop.
- Describe matching as "mutual match" and remove "Tinder" from public copy.
- Keep the tone terse and specific, in Railway's style, with no guilt language in reminders.
- Do not cite the "ASTD 95%" or "Matthews 76%" statistics anywhere.

Codebase areas: landing page, app name and metadata (title, favicon, social cards), email templates, notification copy, onboarding copy, about and legal pages.

**QW2. Introduce semantic theme tokens with a brand/action color split, plus light and dark modes (S–M).**
- Define the token set from the role map above.
- Derive `--primary` from the owner's brand hue using the luminance rule, and verify every text/fill pair against WCAG AA.
- Load Inter (or Geist) plus a monospace face.
- Set radii to 6/8px, hairline borders, neutral focus rings and status solid/tint pairs.
- Add a separate chart palette.
- Respect the system theme and offer a toggle.
- Replace hard-coded colors in shared components with tokens.

Codebase areas: global styles and theme tokens, font loading, shared UI components (buttons, inputs, cards, badges, alerts), charts and visualizations, theme toggle in settings.

**QW3. Add "Continue with GitHub" with identity-only scope and a non-magic-link fallback (S–M).**
- Request only the user's identity and email at sign-in; never request `repo`.
- Keep email plus OTP or password as a fallback.
- If email OTP or magic links already exist, make sure account linking cannot be pre-hijacked: verify ownership before merging identities.
- Store the GitHub username for profile display.

Codebase areas: auth and sign-up flow, OAuth provider configuration, user/account model (linked identities), login and sign-up UI.

**QW4. Cut onboarding to five or fewer skippable steps that end on the first commitment (S–M).**
- Steps: sign in, theme, short profile (time zone and working window, weekly hours, stage, stack, project link, async or call preference, optional "open to cofounding"), season goal plus one if-then weekly plan, then land on the pair or waiting view.
- No role questionnaire as a gate.
- Mark sample data clearly wherever an empty state would otherwise appear.

Codebase areas: onboarding flow, user profile model, settings, empty states.

**QW5. Restructure the check-in as shipped / next / blocked plus a health chip, in under two minutes (S–M).**
- Three Markdown fields, with "blocked" placed prominently.
- A one-tap health chip (On track / At risk / Off track, mapped to status tokens) and an optional mood emoji.
- Cmd+Enter submits.
- The partner must react or comment, and the author sees "read."
- Each person gets a permanent history timeline.
- "Copy as Markdown" for reuse in investor updates.
- A manual "non-code work" entry type.

Codebase areas: check-in model and forms, Markdown rendering and sanitization, pair view, activity feed, reactions and comments.

**QW6. Replace daily all-or-nothing streaks with forgiving weekly pair streaks (S).**
- Count weeks in which both partners checked in, and also show an adherence percentage (for example, "5 of the last 6 weeks").
- Give one free freeze per season and a vacation pause.
- Never sell freezes and never highlight breaks publicly.
- Score check-ins and shipped items, not app activity.

Codebase areas: streak and progress computation, check-in model, profile and stats display, notifications.

**QW7. Adopt Linear-style reminder etiquette (S).**
- One reminder at a user-chosen local time, followed by at most two nudges, one and two working days later.
- No weekend nudges by default, and a per-goal pause.
- An optional weekly email digest of the pair's updates.
- All scheduling must be time-zone aware.

Codebase areas: notifications and email, scheduled jobs, user settings (time zone, quiet days, digest preference).

**QW8. Make the feed chronological, filterable and pair-first, written like a changelog (S–M).**
- The default tab shows my pair's and my own entries, newest first, grouped by date.
- An optional "Community" tab can come later.
- Filters: person, project, entry type (check-in, shipped, deploy).
- Entries are private by default, and public sharing is per item after shipping.

Codebase areas: activity feed queries and UI, post/entry visibility model, privacy settings.

**QW9. Ship trust and safety basics before season 1 (S–M).**
- Block and report on every profile and conversation.
- A short code of conduct accepted at sign-up.
- An admin queue the founder can work through.
- Reports never notify the reported person.

Codebase areas: profile and messaging UI, moderation/admin tools, user relationship model (blocks), legal pages.

**QW10. Run season 1 as a waitlist plus concierge matching (S–M).**
- An application form with light screening: project or repo link, weekly hours, time zone, season goal.
- A "bring your build buddy" field.
- An admin view to propose three candidates per person and record mutual accepts.
- A fixed Monday start date.

Codebase areas: landing page, application/waitlist form, admin tools, user profile model, email.

**QW11. Add a Cmd+K command palette with real actions and a `?` shortcuts sheet (S).**
- Actions: new check-in, log shipped item, open pair, switch project, toggle theme, copy last update as Markdown.
- Show each command's shortcut beside it.
- Make the onboarding tour replayable from the palette.

Codebase areas: app shell/layout, global keyboard handling, routing.

**QW12. Publish a dated public changelog (S).**
- A `/changelog` page with dated, specific entries that thank the people who gave feedback.

Codebase areas: marketing site routes and content, navigation and footer.

### Bigger changes

**BC1. Season and trial-sprint lifecycle (M–L).**
- Model seasons: six weeks, Monday start, demo day, re-enrollment.
- Model the pair lifecycle as states: proposed → accepted → trial sprint (two weeks, with one shared micro-goal each) → active → completed, or dissolved and re-paired.
- Run a "keep building with this person?" pulse after weeks 1 and 3. Use its answers both as a matching signal and as the re-pair trigger.
- Add a demo-day page where each person posts what shipped.
- For pairs who flagged "open to cofounding," the end of the sprint offers YC-style discussion prompts.

Codebase areas: new season/cohort model, pair/relationship model and state machine, scheduled jobs, demo-day page, email and notifications.

**BC2. Reliability and anti-ghosting mechanics (M).**
- Keep a missed-check-in counter, shown before matching as a reliability indicator, with gentle wording.
- Graduated privileges: new users can hold fewer open requests.
- A cap on unanswered match requests, in the style of Hinge's Your Turn Limits.
- When a partner is silent for about a week, the other person can join a re-pair pool right away, with a trio as fallback.
- Soft penalties only; no account freezes.

Codebase areas: matching logic, check-in model, pair model, notifications, admin tools.

**BC3. Mutual-match engine with a capped, curated weekly deck (L).** This replaces concierge matching once season 1 shows which signals predict good pairs.
- Hard filters: time-zone or working-window overlap and a weekly-hours band.
- Soft ranking: stage, stack overlap, goal type and check-in mode. Prefer similar but slightly unequal stages so partners can guide each other.
- Show three to five candidates a week, with an optional swipe or keyboard gesture.
- Every request carries a one-line note.
- Requests expire after a few days.
- Use reliability scores and the post-sprint pulse as inputs.
- Keep the infinite deck and ML ranking deferred.

Codebase areas: matching logic, match/request model, user profile model, notifications, match UI.

**BC4. Personal API tokens, one REST endpoint, a tiny CLI and a git-hook template (M).**
- Hashed, revocable tokens managed in settings.
- `POST` an update (shipped item or check-in draft) and `GET` the current commitments, documented with an OpenAPI spec.
- A small CLI (`buildpair done "…"`) and a copy-paste `post-commit`/`pre-push` hook that sends commit subjects only. This is the zero-permission alternative to a GitHub App.

Codebase areas: API layer and routing, auth (token issuance, hashing, scopes), settings (tokens UI), developer docs page.

**BC5. Generic inbound deploy-webhook receiver (M).**
- A per-user secret URL that accepts Vercel `deployment.promoted`, Netlify "Deploy succeeded", Render deploy-ended and Railway deployment events.
- Verify each provider's signature and deduplicate by delivery ID.
- Order events by payload timestamps.
- Turn each event into a "shipped to production" feed entry and a pre-filled line in the next check-in draft.

Codebase areas: webhook endpoints, integrations/connected-accounts model, activity feed event types, check-in drafting, background jobs.

**BC6. Opt-in GitHub App for merged PRs and releases (L).**
- Permissions: Metadata read, Contents read (required for `push`) and Pull requests read.
- Users install it on selected repositories only.
- Process webhooks only; never call the contents or tree APIs.
- Publish a privacy page saying exactly what is read.
- Merged PRs and releases since the last check-in pre-fill the "shipped" field.
- Do not build on the public Events API.

Codebase areas: integrations module, webhook receiver, background jobs, settings/connected accounts, privacy page, check-in drafting.

**BC7. AI-drafted weekly update, approved by the human (M).**
- Draft from merged PRs, releases, deploy events and manual entries.
- Show the draft in the check-in form for editing.
- Never auto-post.
- Strip repository and customer identifiers unless the user keeps them.

Codebase areas: check-in drafting service, model/LLM integration, check-in forms, privacy settings.

**BC8. Verified revenue via a read-only key (M).**
- Accept a Stripe restricted read-only key (and later LemonSqueezy, Paddle or Polar equivalents).
- Sync MRR and the last 30 days of revenue hourly, with one-click revoke.
- Encrypt keys at rest.
- Show an opt-in "verified revenue" badge, optionally as a range.

Codebase areas: integrations, encrypted secrets storage, background jobs, profile badges, privacy settings.

**BC9. Full visual redesign of the app shell and landing page (L).**
- A sidebar organized by founder jobs: Pair, Check-ins, Commitments, Matches, Insights.
- Dense, calm lists with 14px text and 32–40px rows.
- A landing page using the generic Cloudflare-like grammar, after checking the [UNVERIFIED] elements in a browser:
  - a left-aligned hero with an eyebrow, a semibold tight headline and two calls to action
  - a three-up "how it works" section (match → sprint → ship)
  - a stat strip with true numbers only
  - testimonials with real names
  - a single tinted or dark call-to-action band
  - an original "pair" motif and real product screenshots
- No Cloudflare marks, motif or palette.

Codebase areas: app shell and navigation, landing page, illustration and asset files, shared components, global styles.

**BC10. Phase-2 channels (L, staged).**
- A Slack, Discord or Telegram `/done` bot.
- An MCP server so coding agents can log progress and read commitments.
- A Linear OAuth integration (completed issues, project updates).
- Outbound webhooks (`update.created`, `checkin.missed`).

Codebase areas: integrations, bot services, API layer, webhook delivery and retry jobs.

### Suggested sequence

1. **Phase 0, the rebrand:** QW1, QW2, QW3, QW11 and QW12. These change how the product looks and feels without touching the core loop.
2. **Phase 1, season 1:** QW4–QW10, plus BC1 and BC2. This tests match → commit → weekly check-in → ship with concierge matching.
3. **Alongside season 1, for dev-friendly signals:** BC4 and BC5, because they are cheap and need no repo permissions.
4. **After season 1:** BC3, BC6, BC7 and BC9, once the data shows which match signals and integrations matter.
5. **Later:** BC8 and BC10.

The core metrics are:
- the share of pairs in which both partners did every weekly check-in
- the share of members who shipped their stated goal by demo day
- next-season re-enrollment
- the "keep building with this person?" score

Daily active users are not a target.

## To map against the codebase

A follow-up pass over the real repository should answer these questions. The IDs in parentheses show which recommendations each answer unlocks.

1. **Stack and styling.** What frontend framework, styling approach (CSS files, CSS modules, utility classes, CSS-in-JS) and component library does the app use? Do design tokens or CSS variables already exist? (QW2, BC9)
2. **Current brand.** What are the current brand color hex values, fonts and logo assets, and where are they defined? Is the owner's intended Buildpair palette documented anywhere? (QW2, BC9)
3. **Dark mode.** Is there any theme or dark-mode support today, and how is the theme chosen and persisted? (QW2, QW4)
4. **Naming.** Where is the old "goal buddy" name hard-coded: UI strings, email templates, metadata, OAuth app names, domains, environment config? (QW1)
5. **Authentication.** What auth library or provider is used? Is GitHub OAuth present, and with which scopes? Are magic links the only login? How are multiple identities linked to one account? (QW3)
6. **User and profile model.** Which profile fields exist today: time zone, working hours, stage, stack, project links, goals? Where is the profile model and its validation? (QW4, BC3)
7. **Pairing today.** How are buddies paired now: invite link, random, manual, or something else? Is the relationship one-to-one or group-based, and what states does it have? (QW10, BC1, BC2, BC3)
8. **Goals and check-ins.** How are goals and check-ins modeled: fields, cadence, edit history? Do check-ins support Markdown, and how is user content sanitized? (QW5, QW6, BC7)
9. **Streaks.** Do streaks or other progress metrics exist? How are they computed (daily or weekly), and where is that logic? (QW6)
10. **Feed.** Does an activity feed exist? How is it ordered and filtered, and what does each entry make visible to whom? (QW8)
11. **Notifications.** Which email or push provider and which scheduler or background-job system send notifications? How are user time zones handled in scheduling? (QW7, BC1, BC5)
12. **Messaging and moderation.** Do in-app messaging, comments or reactions exist? Are there any block, report or admin tools? (QW5, QW9)
13. **Seasons.** Is there any concept of cohorts, seasons or time-boxed programs that BC1 could extend? (BC1)
14. **API and webhooks.** Is there an existing public or internal API layer, API-token mechanism or webhook endpoint? Where would a new versioned endpoint live? (BC4, BC5, BC10)
15. **Secrets and third-party tokens.** How are secrets and third-party tokens stored, and are they encrypted at rest? Is there a connected-accounts model? (BC5, BC6, BC8)
16. **Hosting.** Where is the app hosted, and can it receive public webhooks and run hourly background syncs? (BC5, BC6, BC8)
17. **Marketing site.** Is the landing page part of the same app or a separate site? Where would `/changelog` and a privacy page live? (QW1, QW12, BC9)
18. **Keyboard handling.** Is there existing global keyboard handling or a command palette, and what routing model would palette actions call? (QW11)
19. **Platforms.** Is the product web-only, or are there native or mobile clients that would also need the new tokens and check-in format? (QW2, QW5)
20. **Analytics.** What analytics or event tracking exists to measure pair check-in completion, goal shipped and re-enrollment? (Suggested sequence, BC1)
21. **Tests and deployment.** What tests and deployment pipeline protect these areas, and which flows (auth, check-in, notifications) lack coverage? (all)

## Conclusion

The research changes where Buildpair's value sits. The obvious bet is a better matching mechanic: swipe, AI or larger pools. The evidence points instead to what happens *after* a match: a specific plan, a weekly report that one specific person reads and answers, a finish line, and a quick way out when a partner disappears. Matching only has to be good enough to start that loop. That is why concierge matching, a capped deck and a two-week trial sprint beat an endless swipe stack, and why the same trial sprint can serve founders who are quietly testing cofounder fit.

For technical founders, "developer friendly" mostly means restraint. Ask for the least access. Count outcomes, not activity. Let them log progress from wherever they already work. And keep the interface as calm and exact as Cloudflare's, without borrowing what Cloudflare owns. The biggest open risk is not design or integrations. It is liquidity and reliability in the first season, and only running that season will show whether the loop holds.
