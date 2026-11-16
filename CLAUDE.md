# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"JW클럽하우스 / 미니게임천국": a small, friends-only multi-service web app (lotto generator, taste quizzes, restaurant picks, mini multiplayer games, KBO/World Cup prediction, finance widgets). It is React 19 + Vite 7 SPA (plain JS/JSX, no TypeScript), uses Supabase as the backend, and is deployed to GitHub Pages. UI text and comments are in Korean. See [docs/CONCEPT.md](docs/CONCEPT.md) for product intent.

## Working rules (from `.clauderules`)

- Explain the reason before changing code.
- Keep changes minimal; avoid unnecessary refactors.
- If unsure, ask a clarifying question before editing.

## Commands

```bash
npm run dev            # Vite dev server at http://localhost:5173 (base "/")
npm run build          # production build into dist/ (base "/jwkim1001/")
npm run lint           # ESLint (flat config, js/jsx only)
npm run seed:songs     # wipe + reseed Supabase `songs` from src/data/lifestyle/musicSeed.json (needs SUPABASE_SERVICE_ROLE_KEY)

# E2E (Playwright). No webServer configured, so start `npm run dev` first.
npx playwright test                                   # all browsers (chromium/firefox/webkit)
npx playwright test e2e/smoke.spec.js --project=chromium
npx playwright test -g "첫 화면이 열린다"              # single test by title
```

There is no unit test runner.

`telegram-scheduler/` is a separate TypeScript Node project with its own `package.json`. Run `npm install`, then `npm run dev`, `npm run build`, or `npm run typecheck` inside that directory.

## Architecture

### Routing and base path
- All routes are declared flat in [src/App.jsx](src/App.jsx), inside `<AuthProvider>`.
- Production is served under `/jwkim1001/`. The router `basename` (App.jsx) and Vite `base` ([vite.config.js](vite.config.js)) both switch on build mode. Keep them in sync. When fetching files from `public/`, include the base path.
- `public/404.html` handles SPA deep links on GitHub Pages.

### Home hub and service toggles
[Home.jsx](src/components/common/Home.jsx) renders a hardcoded `SERVICE_LIST`. Each entry is a hub such as `/bonus`, `/gatsaeng`, `/mini-arcade`, or `/taste-lab`, and the hub components (`BonusHub`, `GatsaengHub`, `TasteHub`, `BrainHub`) link out to the individual features. Enabled state, ordering, and parent/child grouping come from the Supabase `serviceConfigTable` via `getServiceConfig()` in [supabaseAdmin.js](src/services/core/supabaseAdmin.js), and the Admin page edits them. A new feature therefore needs all three of these:
1. a route in App.jsx
2. a link from a hub or Home
3. if it should be togglable, a `serviceConfigTable` row

### Domain-mirrored folders
`components/`, `services/`, `data/`, and `utils/` share the same domain subfolders (`games`, `lifestyle`, `lotto`, `prediction`, `core`/`common`). Each component has a sibling `.css` file; there is no CSS framework.
- `services/**`: Supabase reads and writes, one file per feature (`supabaseXxx.js`, `xxxService.js`). Some components also import `supabaseClient` directly.
- `data/**`: static seed and content data (quiz questions, type definitions, song/movie seeds, fortune texts).
- `utils/**`: pure logic (game rules, matching such as `musicMatch.js`/`movieMatch.js`, `sajuCalc.js`, lotto filters in `lottoAPI.js`).

### Auth is custom, not Supabase Auth
- [authService.js](src/services/core/authService.js) checks credentials directly against the `userTable` table, where passwords are stored in plaintext.
- On login it writes the user object to `localStorage['user']` and logs the login to `loginHistoryTable`. The `admin` and `test` accounts are excluded from this tracking.
- [AuthContext.jsx](src/context/AuthContext.jsx) enforces a 30-minute session and shows an extend modal one minute before expiry. The README says 60 minutes, but the code is authoritative.
- Admin features are gated on `loginId === 'admin'`.
- RLS is effectively off. The design assumes a small trusted user group.

### Realtime multiplayer games
Akinator, Blokus, Cobra, TurneyKia, and Typing (`services/games/`) use Supabase Realtime channels plus room tables for live multiplayer state.

### Browser-side secrets
All `VITE_*` env vars are bundled into the client:
- Supabase URL and anon key
- Telegram bot token and chat ID (used by [telegramNotify.js](src/services/core/telegramNotify.js) for signup/login alerts)
- `VITE_ANTHROPIC_API_KEY` (TurneyKia AI hints in [turneyKiaAI.js](src/services/games/turneyKiaAI.js), which uses `dangerouslyAllowBrowser`)
- AdSense slot IDs

`SUPABASE_SERVICE_ROLE_KEY` and the other non-`VITE_` keys belong only in Node scripts under `scripts/` and in `telegram-scheduler`.

### Local SQLite
[database.js](src/services/core/database.js) runs an in-memory SQLite WASM DB that is used for lotto analysis.

## Data pipelines (GitHub Actions)

- `deploy.yml`: on push to `main`, builds and deploys to GitHub Pages. Supabase env vars are inlined in the workflow; Telegram values come from repo secrets.
- `update-lotto-data.yml` (Sat 22:00 UTC): runs `scripts/fetch-lotto-data.js`, which updates `public/lotto-data.json` and commits it.
- `update-lotto-supabase.yml` (Sun 00:00 UTC): runs `update-lotto-supabase.js`.
- `update-kbo-rank.yml` (daily 20:00 UTC): runs `update-kbo-rank.js`.
- `monthly-report.yml` (1st of the month): runs `monthly-report.js`.

If new lotto data seems not to show up on the deployed site, it is usually a GitHub Pages CDN or browser cache issue rather than a pipeline failure. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## telegram-scheduler

This is a node-cron bot. Jobs live in `telegram-scheduler/src/scheduler/jobs/`: weather, Notion calendar, KBO schedule and head-to-head scraping, weekly sector heat report, and burn collection. Each job sends its output through `sender/messageSender.ts`. Env vars are listed in `telegram-scheduler/.env.example`, and `DRY_RUN` skips the actual sending.

## Gotchas

- `.gitignore` excludes temp-script name patterns (`test-*.js`, `fix-*.js`, `check-*.js`, `analyze-*.js`, etc.). Files with those names will not be committed, so give a script a different name if it needs to be tracked.
- `cUsers김시민Desktopquant/` is an unrelated stray Vite/TS project created by a mistyped path. Ignore it.
- `README.md`'s file tree is outdated. The folder layout described above is current.
