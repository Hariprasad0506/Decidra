# Phase 6: Quality assurance report

Tested on `main` after PR #4 (Phase 5) was merged, using the GymBuddy demo data, in a real Chromium
browser against the production build, plus the automated tests.

## Automated checks

| Check | Result |
|---|---|
| `npm test` (before fixes) | 55 / 55 passed |
| `npm test` (after fixes) | 59 / 59 passed (4 new regression tests) |
| `npm run lint` | No problems |
| `npm run build` | Succeeds |

## Browser checks (51 / 51 passed after fixes)

| # | Area | What was checked | Result |
|---|---|---|---|
| 1 | Add, edit, delete | Add gets the next ID (F-004); edit is pre-filled and saves; cancel changes nothing; delete asks to confirm; a deleted ID is never reused | Pass |
| 2 | Required fields | Empty form shows an error on name, reach, impact, confidence, effort and evidence; description and dependency stay optional | Pass |
| 3 | Negative reach | `-100` rejected with "Reach cannot be negative." | Pass |
| 4 | Zero or negative effort | `0`, `0.0` and `-1` all rejected | Pass |
| 5 | RICE formula | F-001 = 1,066.67, F-002 = 437.50, F-003 = 1,666.67 (match hand calculation) | Pass |
| 6 | Ranking and ties | Highest score first; equal scores go to lower effort, then higher confidence | Pass |
| 7 | Recalculation after edits | Changing reach 3,500 → 35,000 updates the score to 4,375.00 and moves it to #1 at once | Pass |
| 8 | Confidence sensitivity | 80% → 100% gives 1,333.33, 80% → 50% gives 666.67, real score untouched | Pass |
| 9 | Assumption warnings | 100% without evidence, low effort, zero reach, dependency note all flagged | Pass |
| 10 | PM overrides | Needs a reason; final priority changes; RICE score and suggested rank do not | Pass |
| 11 | localStorage | Backlog, scores, ranks and decisions identical after reload; reset survives reload | Pass (after fix B) |
| 12 | CSV export | One row per feature, dated file name, scores and override reason included | Pass |
| 13 | Responsive layout | No sideways page scroll at 320, 375, 600, 768, 1024 and 1280 px | Pass (after fix A) |
| – | Console | No JavaScript errors | Pass |

## Problems found and fixed

**A. The whole page scrolled sideways on tablet-sized screens (about 600–1100 px wide).**
Cause: the table has a hidden "Actions" label for screen readers. It is positioned relative to the
page rather than the table's scroll box, so it poked out to the right and stretched the page.
Fix: one CSS line (`position: relative` on `.table-wrap`) so the label stays inside the table.

**B. Reloading the page could silently change a PM decision.**
Cause: with 3 features, set one to manual priority #3, then delete another. The screen still showed
#3, but on reload the saved data was tidied to #2 (the highest allowed with 2 features).
Fix: the same tidy-up rule now runs at the moment of deletion, so the screen and the saved data
always agree. The rule lives in one function, `capManualPriorities`, used by both places.

Regression tests for both are in `src/qaRegression.test.ts`.

## Remaining limitations

- The live preview link cannot download files, so CSV export only works when the app runs in a
  normal browser tab (for example `npm run dev`).
- Data lives in one browser on one device. Clearing site data or switching browsers loses it.
- On screens between 600 and about 1100 px the backlog table scrolls sideways inside its own box to
  reach the score and action columns. Below 600 px it switches to stacked cards.
- The responsive regression test checks the CSS rule, not a real browser. The browser checks were run
  by hand with Playwright and are not part of `npm test`, to avoid adding a dependency.
