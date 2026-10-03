# Decidra

From possibilities to priorities. A simple RICE prioritization app for Product Managers.

![Decidra](docs/screenshots/phase5-save-share.png)

## What it does

Decidra helps a Product Manager decide what to build next.

- Add, edit and delete features, each with RICE inputs and an evidence note.
- Every feature gets a RICE score, with the working shown, and a suggested rank (highest score first).
- Gentle **assumption flags** point out estimates worth double-checking, such as 100% confidence with no real evidence.
- **"What if confidence changed?"** shows how a feature's score and rank would move at other confidence levels.
- The PM can accept the suggested rank or set a **manual priority with a reason**. This never changes the RICE score.
- Everything is **saved in the browser** and comes back after a reload.
- **Export CSV** downloads the whole backlog, and a short stakeholder summary is written from fixed rules (no AI).

It opens with three GymBuddy sample features so there is something to explore straight away.

## The RICE formula

```
RICE score = (Reach × Impact × Confidence) ÷ Effort
```

| Input | Meaning | Values |
|---|---|---|
| Reach | Users affected per quarter | Any number, 0 or more |
| Impact | How much it helps each user | 3 Massive, 2 High, 1 Medium, 0.5 Low, 0.25 Minimal |
| Confidence | How sure you are of the estimates | 100% Strong, 80% Some, 50% Weak evidence |
| Effort | Work needed, in person-months | Any number above 0 |

Example: Beginner Workout Planner = 2,000 × 2 × 0.8 ÷ 3 = **1,066.67**.
Ties go to lower effort, then higher confidence, then the order features were added.

## Install

You need Node.js 20 or newer (https://nodejs.org). In the project folder, run once:

```bash
npm install
```

## Start the app

```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

## Run the tests

```bash
npm test        # scoring, decision support, saving, export and QA regression tests
npm run lint    # looks for common code mistakes
npm run build   # type-checks the code and builds a production version
```

## Reset the demo

Scroll to the **Results** card, click **Reset Demo Data**, then **Yes, reset**. This removes your changes
and brings back the three GymBuddy features. (Clearing the site's data in the browser does the same.)

## Known limitations

- Data lives only in this browser on this device. There are no accounts, no sharing and no sync.
- One person, one backlog at a time.
- Reach is always counted per quarter; the time period can't be changed.
- "What if" scenarios only vary confidence, one feature at a time.
- Assumption flags and the stakeholder summary follow fixed rules; they don't understand the meaning of your notes.
- There is no undo, apart from resetting to the demo data.
- Some embedded previews block file downloads, so CSV export needs the app open in a normal browser tab.

## Optional future enhancements

- Import a backlog from CSV.
- Other scoring methods (ICE, MoSCoW, weighted scoring) alongside RICE.
- Several backlogs or projects.
- "What if" scenarios for reach, impact and effort.
- Undo for edits and deletes.
- A shareable read-only link or PDF of the ranked backlog.

## Project layout

- `src/App.tsx`: the page layout
- `src/components/`: the RICE explainer, backlog summary and table, add/edit form, decision panel, and save/export card
- `src/data/sampleFeatures.ts`: the three GymBuddy sample features
- `src/riceScoring.ts`: the RICE calculation, ranking and tie-breaking
- `src/assumptionChecks.ts`, `src/sensitivity.ts`, `src/pmDecision.ts`: assumption flags, "what if" scenarios and PM decisions
- `src/storage.ts`, `src/csvExport.ts`, `src/stakeholderSummary.ts`: saving, CSV export and the summary
- `src/*.test.ts`: automated tests
- `docs/phase6-qa-report.md`: the quality assurance report
