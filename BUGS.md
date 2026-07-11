# Parma Bug Audit — 2026-07-11

File+line references accurate as of commit `7154068`. This overwrites the 2026-07-10 audit;
several items from that pass (RLS on the 8 untracked tables, the `progress-photos` storage
policies) were separately confirmed fixed and verified live in the intervening sessions, so they
are not repeated here. Scope: focused on what the module-OS restructure (`app/(os)/*`) and this
session's new features (saved meals, AI daily briefing, food item edit/delete) may have
introduced or broken.

**Update (2026-07-11, later same day)**: all 2 critical and 4 major items below were fixed and
verified live in a follow-up pass — see the **FIXED** notes on each and `PROGRESS.md` for the full
evidence trail. The 2 minor items were also fixed in that same pass. Nothing in this document is
still open.

---

## CRITICAL

### 1. Saved-meal items are never validated before being stored, risking `NaN` macros in `daily_stats`
**File**: `app/api/saved-meals/route.ts:22`
**Effect**: `POST /api/saved-meals` only checks `Array.isArray(body.items) && body.items.length` —
it never validates that each item has the numeric macro fields `SavedMealItem`/`ParsedFoodItemSchema`
require. A malformed item (missing `protein_g`, a string where a number is expected) saves
successfully as-is. Later, quick-adding that meal (`lib/db/savedMeals.ts:94-105`,
`quickAddSavedMeal`'s totals reduction, e.g. `acc.protein_g + i.protein_g`) produces `NaN`, which
is then written straight into `daily_stats` with no schema check anywhere in that code path —
a silent, permanent corruption of that day's totals.
**Fix**: validate each item against `ParsedFoodItemSchema` (or a `SavedMealItem`-shaped zod schema)
in the `POST` handler before calling `createSavedMeal`, reject with 400 on failure.
**FIXED** (`6204898`): added `SavedMealItemSchema` (all 7 macros required, non-optional), validated
in both `POST /api/saved-meals` and `PATCH /api/saved-meals/[id]` before any write. Verified: valid
item passes, missing/string/NaN macros all rejected with a precise field-level error, and a
simulated bad payload never reached the DB.

### 2. `/api/briefing` turns a real database error into a silent "no briefing yet"
**File**: `app/api/briefing/route.ts:16`
**Effect**: `getBriefing(...).catch(() => null)` swallows every error from the read — a genuine
RLS/connection failure looks identical to "the cron hasn't generated today's briefing yet" and
returns `200 { briefing: null }`. This violates the project's own no-silent-failure rule: a real
outage would be invisible, showing the same graceful "no briefing yet" copy a healthy account
with a young cron cycle would show.
**Fix**: only treat a `PGRST116`/not-found style result as "no briefing yet"; log and surface
(500) any other error instead of blanket-catching to `null`.
**FIXED** (`6cf30e7`): the real live code path turned out to be `app/(os)/main/page.tsx` (this
route is never actually called), which had the identical bug — fixed both: the route now
try/catches to log+500 on a real error, and Main's page.tsx uses a `getBriefingSafe()` wrapper that
logs instead of discarding. Verified: a genuine no-row date returns null with no throw; a malformed
UUID (real DB error) correctly throws instead.

---

## MAJOR

### 3. `RealtimeSync` isn't mounted anywhere in the new module shell — no live refresh on Main/Food/Health/Gym/etc.
**File**: `app/(os)/layout.tsx` (missing), only present at `app/(os)/grid/page.tsx:19,64`
**Effect**: `RealtimeSync` (subscribes to 9 tables for live dashboard updates) is only rendered on
the legacy `/grid` page. None of the new module pages re-render when data changes elsewhere (e.g.
a WHOOP webhook landing, or logging from another device) — the user has to manually reload every
page in the new shell to see fresh data, a regression from the old dashboard's behavior.
**Fix**: mount `RealtimeSync` once in `app/(os)/layout.tsx` (same pattern as `ContextualLogBar`),
or add it per-page if different pages need different table subscriptions.
**FIXED** (`cd3d99d`): mounted unmodified in `app/(os)/layout.tsx`. Verified: confirmed all 9
watched tables are genuinely in the `supabase_realtime` publication, then ran the exact
subscription this component sets up, wrote a real `daily_stats` row, and confirmed the
`postgres_changes` event was actually received end-to-end.

### 4. Widget visibility/layout preferences are split between `/grid` and the new module pages
**File**: `components/dashboard/DashboardGrid.tsx:558-608` (`postLayout`/`hiddenWidgets`) vs. all
of `app/(os)/main|food|health|gym/page.tsx`
**Effect**: hiding a widget via the catalog panel on `/grid` writes to `user_preferences` and is
only ever read back by `/grid` itself — none of the new module pages check `hiddenWidgets`, they
unconditionally render their fixed widget list. A user who hides "Weather" on `/grid` will still
see it on `/main`, which reasonably reads as "hide" not working.
**Fix**: either read `hiddenWidgets` in the new pages too, or (simpler, given the new pages are
meant to be curated rather than customisable) formally retire the catalog panel's relevance to
`/grid` and say so in-app, so the two aren't silently out of sync.
**FIXED** (`4ebb323`): wired `user_preferences.hidden_widgets` into Main (weather, heatmap), Health
(whoop, sleepdebt), and Gym (trainload, prtracker) — the widgets with an unambiguous 1:1 catalog
match. `/body`'s `BodyWidget` deliberately left unmapped (single-purpose destination page, not one
card among several — hiding it would just leave a blank page). Verified: wrote
`hidden_widgets=[weather,trainload]` directly, confirmed the real query logic returns it correctly
and the affected pages would skip exactly those two widgets while others stayed visible, then
restored the original value.

### 5. Onboarding tour is now dead code — no new-user walkthrough exists anywhere
**File**: `components/OnboardingTour.tsx` (fully implemented, driver.js-based, 4 steps), not
imported by any page in the repo
**Effect**: was removed from `app/(dashboard)/page.tsx` when that page became a redirect stub to
the new shell (the commit that switched the default view), and was never re-added to
`app/(os)/layout.tsx` or `main/page.tsx`. New users get no tour at all — silent loss of a real
onboarding feature, not an intentional removal.
**Fix**: re-mount `OnboardingTour` in the new shell, updating its step targets
(`data-tour="log-input"` etc.) to match the new layout's elements (sidebar, `ContextualLogBar`,
Main).
**FIXED** (`33d2aee`): 2 of 3 target elements already existed unchanged (`log-input` via
`ContextualLogBar`'s reused `LogInput`, `command-palette` via `PaletteWrapper`); added the missing
`dashboard-grid` target to Main's rings section with updated copy (old text described drag-and-drop
rearranging, which the new Main doesn't have), and mounted `<OnboardingTour />` in `MainClient` —
the page `/` redirects to. No browser available to click through the actual popovers.

### 6. `WhoopWidget` renders even when WHOOP isn't connected, showing a permanent placeholder card
**File**: `app/(os)/health/page.tsx:41` vs. `components/dashboard/DashboardGrid.tsx:902`
**Effect**: the old dashboard only rendered `WhoopWidget` when `whoopConnected` was true
(`DashboardGrid.tsx:902`, `{whoopConnected && !hiddenWidgets.has('whoop') && (...)}`). The new
Health page renders it unconditionally regardless of connection state, so any account that hasn't
linked WHOOP sees a permanent card full of `—` placeholders instead of it being hidden or replaced
with a "Connect WHOOP" prompt.
**Fix**: gate the `<TappableWidget widgetId="whoop">` block in `app/(os)/health/page.tsx` behind
`whoopConnected` (already computed in that file), same as the old dashboard.
**FIXED** (`14062bf`): one-line fix, `whoopConnected &&` added to the existing condition. Confirmed
via the live DB that the test account itself has 0 `whoop_connections` rows — it was concretely
hitting this exact bug before the fix.

---

## MINOR

### 7. Daily-briefing cron's "active users in the last 30 days" cutoff bypasses `getLocalDate`
**File**: `app/api/cron/daily-briefing/route.ts:20`
**Effect**: `new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]` derives
a calendar-date cutoff from a raw UTC instant — the exact pattern the rest of the codebase avoids
via `getLocalDate()`/`subtractDay()`. Impact is small (only shifts the 30-day boundary by a few
hours around midnight UTC/BST), but it's inconsistent with the convention used everywhere else,
including this same file's `today = getLocalDate()` two lines below.
**Fix**: derive `since` via a `daysAgo(getLocalDate(), 30)`-style helper instead of
`new Date().toISOString()`.
**FIXED** (`4623be0`): added `daysAgo(dateStr, days)` to `lib/date.ts` (DST-safe, same pattern as
`subtractDay`), used it here and also fixed `lib/dailyBriefing.ts`'s own local `thirtyDaysAgo` (same
bug, not previously flagged). Verified correct across an actual DST changeover.

### 8. `ContextualLogBar`'s mobile bottom offset is a magic number, not tied to the bottom-tab bar's real height
**File**: `components/os/ContextualLogBar.tsx:14` (`bottom-16 sm:bottom-0`) vs.
`components/os/Sidebar.tsx:83-92` (mobile bottom-tab bar)
**Effect**: `bottom-16` (64px) currently happens to clear the bottom-tab bar's rendered height, but
there's no shared constant or comment linking the two — a future padding/icon-size tweak to either
component could silently reintroduce overlap between the chat bar and the tab bar on mobile.
**Fix**: extract the tab-bar height into a shared constant (or CSS variable) both components
reference, instead of two independently-guessed magic numbers.
**FIXED** (`4623be0`): added `lib/layoutConstants.ts` (`MOBILE_TAB_BAR_HEIGHT_REM`), gave Sidebar's
mobile nav an explicit height derived from it (was organic before), and switched ContextualLogBar
to a CSS-variable-driven class set from the same constant. Verified in the compiled CSS output that
both the new class and the `sm:bottom-0` override generated correctly.

---

## Suggested fix order

1. **#1** (saved-meal validation) — real data-corruption path, cheap to fix (one schema check).
2. **#2** (briefing silent-error swallow) — one-line no-silent-failure violation.
3. **#6** (WhoopWidget unconditional render) — small, visible regression for any non-WHOOP user.
4. **#3** (RealtimeSync not mounted) — real UX regression (manual reloads), moderate effort.
5. **#5** (onboarding tour dead) — real feature loss, but only affects new users, not urgent.
6. **#4** (hidden-widget split) — needs a product decision (sync the two, or retire `/grid`'s
   relevance) before a code fix makes sense.
7. **#7**, **#8** — low-impact, fix opportunistically alongside nearby work.
