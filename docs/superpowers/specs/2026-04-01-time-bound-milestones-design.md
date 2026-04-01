# Time-Bound Milestones Design

## Goal

Extend milestones so GoalBuddy supports both ongoing habits and finite, time-bound milestone programs without forcing the same stats or achievement logic onto both.

This design covers:
- milestone scheduling model
- create/edit UI in the mobile goals flow
- due-state rules
- milestone stats and achievement applicability

This design does not yet cover the coach-facing milestone stats menu. That will reuse the same milestone-stat shaping rules in a later change.

## Product Decisions

- Milestones support two schedule modes:
  - `open_ended`
  - `time_bound`
- `time_bound` milestones require a `start_date`.
- `time_bound` milestones may optionally have an `end_date`.
- `end_date`, when present, is inclusive.
- Before `start_date`, a time-bound milestone is visible but marked `upcoming`.
- For finite time-bound milestones, expected sessions are calculated automatically from frequency plus date range.
- Open-ended milestones keep ongoing metrics only; they do not show finish percentage.
- Time-bound milestones with an `end_date` show both ongoing metrics and finite-progress metrics where applicable.

## Milestone Model

### Existing Model Pressure

The current milestone model only has:
- `frequency`
- optional `days_per_week`
- optional `custom_days`
- optional `due_date`

That is enough for recurring cadence and one-off deadlines, but not enough to distinguish:
- a habit with no end
- a scheduled program with a defined start
- a finite program with a known finish

### Proposed Model Additions

Add the following milestone fields:

- `schedule_mode: 'open_ended' | 'time_bound'`
- `start_date: string | null`
- `end_date: string | null`

Interpretation:
- `open_ended`
  - `start_date` and `end_date` are `null`
  - no finite completion denominator
- `time_bound` with `start_date` and no `end_date`
  - scheduled and not-yet-started states are meaningful
  - no finite completion denominator
- `time_bound` with both `start_date` and `end_date`
  - finite program
  - expected sessions and completion percentage are computed from the active range

### Backward Compatibility

Existing milestones can be migrated as:
- recurring milestones -> `open_ended`
- `once` milestones with a `due_date` can remain compatible until later cleanup, but the long-term direction should favor `time_bound` or explicit one-off semantics rather than overloading `due_date`

## UI Design

### Goals Form Adjustments

In the new-goal milestone composer:
- remove the “co-op option appears when Public is turned on” tile completely
- move `* required` under the `Milestones` label instead of inline with it
- keep the milestone section compact and list-like rather than card-heavy

### Frequency Picker

Replace the current large page-sheet row treatment with a tighter submenu-style picker inspired by TickTick:
- smaller vertical rhythm
- lighter row chrome
- compact chips
- visually closer to an app settings submenu than a full-screen picker

Frequency options remain:
- Daily
- X days/week
- Weekly
- Monthly
- Custom days
- Once

Text adjustment:
- show `Days per week` instead of `X days / week` in the sub-control language

### Schedule Controls

Below frequency, add a compact schedule subsection:
- `Schedule`
- mode choice:
  - `Open-ended`
  - `Time-bound`
- if `Time-bound`:
  - `Start date`
  - `End date`
  - `No end date` toggle

UI behavior:
- when `Open-ended` is selected, schedule date rows collapse away
- when `Time-bound` is selected:
  - `Start date` is required
  - `End date` is optional when `No end date` is on
  - if `No end date` is off, `End date` is required and must be on or after `Start date`

### Draft Milestone Rows

Draft milestone rows should stay compact and scan-friendly:
- title
- frequency summary
- schedule summary
- edit action
- delete action

Schedule summary examples:
- `Open-ended`
- `Starts Apr 8`
- `Apr 8 – May 20`

## State Rules

### Availability

For `time_bound` milestones:
- before `start_date`: `upcoming`
- from `start_date` through `end_date` inclusive: `active`
- after `end_date`: `ended`

For `time_bound` milestones with no `end_date`:
- before `start_date`: `upcoming`
- from `start_date` onward: `active`

For `open_ended` milestones:
- always `active`

### Validation

Creation/edit validation:
- `open_ended`
  - no `start_date`
  - no `end_date`
- `time_bound`
  - `start_date` required
  - `end_date` optional
  - if `end_date` exists, it must be `>= start_date`
- frequency-specific fields still validate as today:
  - `x_weekly` needs `days_per_week`
  - `custom_days` needs at least one selected day

## Stats Model

### Principle

Do not show stats that imply a finite denominator unless the milestone actually has one.

### Open-Ended Milestones

Allowed stats:
- streak, where frequency makes sense
- total completed sessions
- current period completion where already supported

Not shown:
- percentage complete toward finishing the milestone
- sessions remaining to finish

### Time-Bound Milestones Without End Date

Allowed stats:
- all open-ended-compatible stats
- upcoming/started state awareness

Not shown:
- percentage complete toward finishing
- remaining sessions to finish

### Time-Bound Milestones With End Date

Allowed stats:
- total completed sessions
- total expected sessions
- remaining sessions
- percent complete
- streak where the cadence still makes sense

Examples:
- `12 of 30 sessions completed`
- `18 sessions remaining`
- `40% complete`

## Expected Sessions Calculation

Expected sessions are derived automatically from frequency plus inclusive date range.

Rules:
- `daily`: count days in range
- `weekly`: count active weeks in range
- `monthly`: count active months in range
- `x_weekly`: count active weeks multiplied by `days_per_week`
- `custom_days`: count matching weekdays between `start_date` and `end_date`
- `once`: count as 1

Implementation detail:
- expected-session calculation should live in one shared backend utility so milestone stats, achievements, and later coach views all derive from the same logic

## Achievement Logic

Achievement visibility and calculation should depend on milestone type.

Open-ended and no-end-date time-bound milestones:
- keep streak-style achievements
- keep session-count achievements if desired
- do not show completion-percentage achievements

Finite time-bound milestones:
- allow completion-percentage achievements
- allow remaining-session progress messaging
- retain streak only when it reflects real cadence rather than conflicting with finite progress messaging

This means achievement cards become milestone-aware instead of globally uniform.

## API and Persistence Impact

### Mobile

The mobile milestone create/edit payload will need to expand beyond current fields:
- `scheduleMode`
- `startDate`
- `endDate`

Current mobile API only persists:
- `frequency`
- `daysPerWeek`
- `customDays`
- optional `dueDate`

So this feature cannot remain UI-only. It requires backend schema and API support.

### Backend

Required backend work:
- schema migration for `schedule_mode`, `start_date`, `end_date`
- create/update milestone service changes
- milestone stats logic changes
- achievement-selection logic changes

## Testing Impact

Add coverage for:
- schedule mode validation
- `start_date`/`end_date` validation
- inclusive end-date behavior
- upcoming state before `start_date`
- expected-session calculations by frequency
- finite vs non-finite stat visibility
- achievement applicability by milestone type

## Rollout Order

1. Add data model and backend validation
2. Add expected-session calculation utility and tests
3. Update mobile create/edit milestone UI
4. Update milestone stats shaping
5. Update achievement logic
6. Later: add coach-facing milestone stats menu using the same stat-shaping rules

## Risks

- Date math can get inconsistent across stats and achievements if the calculation logic is duplicated
- Existing `due_date` semantics may overlap awkwardly with new time-bound fields unless migration rules are explicit
- A visually heavy schedule picker will regress the compactness goal, so the milestone form should stay submenu-like and restrained

## Recommendation

Use an explicit `schedule_mode` with `start_date` and optional inclusive `end_date`.

That gives GoalBuddy:
- a clean distinction between ongoing and finite milestones
- stats that only show meaningful metrics
- a stable base for later coach milestone views
