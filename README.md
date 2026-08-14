# TaskFlow

A Kanban-style task board — **Board → Columns → Tasks** — built with React, Express, and SQLite. Drag tasks between columns, filter by priority, and track counts per column.

Requires Node 18+ (tested on Node 20.x)

## 🔗 Live demo

**App:** https://taskflow-nu-ten.vercel.app
**API:** https://taskflow-backend-azrg.onrender.com

> Both run on free hosting tiers. The backend sleeps after 15 minutes of inactivity (first request after that takes ~30–60s to wake up), and the SQLite database resets to seeded demo data on every redeploy or wake cycle — expected behavior, not a bug. See [Persistence on the free tier](#persistence-on-the-free-tier).

## 🚀 Deploy your own copy in ~10 minutes

This is a fully reproducible deployment — anyone can fork this repo and stand up their own live instance for $0, on their own accounts. That's intentional: it proves the setup is documented, not just something that happened to work once.

1. **Fork/clone this repo** to your own GitHub account.
2. **Backend → Render:** [render.com](https://render.com) → **New +** → **Blueprint** → connect your repo. Render reads [`render.yaml`](render.yaml) and auto-configures everything (root dir, build command, Node version). Click Deploy. Copy the resulting URL once live.
3. **Check it:** open `<your-backend-url>/boards` in a browser — you should see a seeded board as JSON.
4. **Frontend → Vercel:** [vercel.com](https://vercel.com) → **Add New** → **Project** → import the same repo. Set **Root Directory** to `frontend`. Before deploying, add env var `VITE_API_URL` = your Render URL (no trailing slash). Deploy.
5. **Lock down CORS:** back in Render, add env var `FRONTEND_URL` = your Vercel production URL (no trailing slash — this matters, see gotcha below). Saves and auto-redeploys.
6. **Verify:** open your Vercel URL — the board should load with 3 columns and 7 tasks.

Full details, including the two gotchas that trip people up on step 5 (trailing slashes and Vercel preview vs. production URLs), are in [Deploying it yourself](#deploying-it-yourself) below.

## Tech stack

| Layer     | Tech                                          |
|-----------|------------------------------------------------|
| Frontend  | React + Vite                                   |
| Backend   | Node.js + Express                              |
| Database  | SQLite via `better-sqlite3` — raw SQL, no ORM  |
| Testing   | Jest + Supertest                               |
| Hosting   | Render (backend) + Vercel (frontend)           |

## Architecture

```
┌─────────────┐        HTTP/JSON        ┌──────────────┐        SQL        ┌─────────────┐
│   React     │ ───────────────────────▶ │   Express    │ ─────────────────▶ │   SQLite    │
│  (Vercel)   │ ◀─────────────────────── │   (Render)   │ ◀───────────────── │  taskflow.db│
└─────────────┘                          └──────────────┘                   └─────────────┘
     reads VITE_API_URL                   reads FRONTEND_URL
     to know where to send requests       to restrict CORS to just this origin
```

- The frontend never talks to the database directly — everything goes through the REST API.
- `frontend/src/api.js` reads `VITE_API_URL` at build time (Vite bakes env vars into the JS bundle), so the same code works against `localhost:4000` locally or the deployed Render URL in production.
- The backend reads `FRONTEND_URL` at runtime to lock down CORS so only the deployed frontend (not arbitrary sites) can call the API.

## Setup (from a fresh clone)

### 1. Backend

```
cd backend
npm install
npm run seed      # populates the DB with 1 board, 3 columns, 7 tasks
npm start         # runs on http://localhost:4000
```

### 2. Frontend (in a second terminal)

```
cd frontend
npm install
npm run dev        # runs on http://localhost:5173
```

Open http://localhost:5173 — the board will load, backed by the seeded SQLite data at `backend/taskflow.db`.

### 3. Run tests

```
cd backend
npm test
```

Covers: rejecting an empty title, moving a task updates `column_id`, and two tests that call the DB-layer query functions directly (`getTasksByPriority`, `getTaskCountsPerColumn`) against known seed data.

## Database schema

See `backend/schema.sql`. Summary:

* `boards(id, name)`
* `columns(id, board_id → boards.id, name, position)` — unique `(board_id, name)`, so no duplicate column names on the same board
* `tasks(id, column_id → columns.id, title, description, priority, created_at)` — `priority` constrained to `Low | Medium | High`

Foreign keys cascade on delete (deleting a board removes its columns and tasks). Table names are plural (`columns` not `column`) to avoid the SQL reserved word `COLUMN`. SQLite has foreign keys off by default per-connection, so `db.js` explicitly runs `PRAGMA foreign_keys = ON` — without this, `ON DELETE CASCADE` would silently do nothing.

Data persists in `backend/taskflow.db` between restarts — it's a SQLite file on disk, not in-memory.

## API reference

| Method | Endpoint                       | Description                                  |
|--------|---------------------------------|-----------------------------------------------|
| GET    | `/boards`                       | List all boards                               |
| POST   | `/boards`                       | Create a board — `{ name }`                   |
| GET    | `/boards/:id`                   | Get a board with its columns and tasks nested |
| GET    | `/boards/:id/column-counts`     | Task count per column for a board             |
| POST   | `/columns`                      | Create a column — `{ board_id, name }`        |
| GET    | `/tasks?priority=High`          | Tasks filtered by priority, newest first      |
| POST   | `/tasks`                        | Create a task — `{ column_id, title, description?, priority? }` |
| PATCH  | `/tasks/:id`                    | Update a task's title/description/priority    |
| PATCH  | `/tasks/:id/move`               | Move a task to another column — `{ column_id }` |
| DELETE | `/tasks/:id`                    | Delete a task                                 |

All error responses are `{ "error": "..." }` with an appropriate 4xx/5xx status. The backend validates inputs independently of the frontend.

## The two required non-trivial queries

Both live in `backend/queries.js`, written as raw parameterized SQL:

1. `getTaskCountsPerColumn` — task count per column on a board, using `LEFT JOIN` + `GROUP BY` so an empty column still returns `task_count: 0` instead of vanishing.
2. `getTasksByPriority` — tasks filtered by priority, `ORDER BY created_at DESC`.

## Validation & error handling

* **Empty title** — the form won't submit; a red inline message ("Title can't be empty") appears under the field. The backend also re-validates and rejects with a 400 if it's ever bypassed, so it's enforced at both layers, not just the UI.
* **Invalid priority** — not possible by construction. Priority is a fixed dropdown of exactly three options (Low/Medium/High), so there's no free-text field for a bad value to come from.
* **Duplicate column name** — `columns` has a `UNIQUE(board_id, name)` constraint. If you try to add a second column with the same name on the same board, the backend rejects it and the UI shows a red inline message: "A column with this name already exists on this board."

## Assumptions & decisions

* Task status = `column_id`. There's no separate `status` field — the column a task sits in is its status, per the assignment's own definition. Avoids redundant/desyncable state.
* Move via dropdown, not drag-and-drop, given the time budget — the spec explicitly says a working dropdown beats a broken drag-and-drop.
* Multiple boards are supported. A dropdown in the header lists all boards and lets you switch between them or create a new one. New boards start with zero columns.
* Columns can be added per board via a "+ Add column" control at the end of the board — new columns are appended at `position = max(existing position) + 1`.
* Priority defaults to `Medium` if not specified on task creation.
* `board.name` was added since it wasn't explicitly listed but a board with no name field didn't make sense.

## What I'd improve with more time

* Actual drag-and-drop instead of the dropdown (stretch goal).
* Text search by title (stretch goal).
* Optimistic UI updates instead of a full re-fetch after every mutation.
* `updated_at` timestamp on tasks.

## Deploying it yourself

This repo deploys as two independent services: the Express API on **Render**, and the static Vite build on **Vercel**. Total cost on the free tiers of both: $0.

### Backend → Render

1. Push this repo to your own GitHub account.
2. On [render.com](https://render.com): **New +** → **Blueprint** → connect your repo. Render reads [`render.yaml`](render.yaml) automatically and configures:
   - Root directory: `backend`
   - Build command: `npm install && npm run seed` (creates the schema and reseeds demo data on every deploy)
   - Start command: `npm start`
   - Node pinned to `20.x` (see note below on why this matters)
3. Deploy. Once live, copy the service URL (e.g. `https://taskflow-backend-azrg.onrender.com`).
4. Sanity check: open `<your-backend-url>/boards` in a browser — you should see the seeded board as JSON.

**Why Node is pinned to 20.x:** `better-sqlite3` is a native module distributed as prebuilt binaries for common Node versions. Render's default runtime can be newer than what's been prebuilt for, which forces a from-source compile that fails against newer V8 APIs. Pinning via both `engines.node` in `backend/package.json` and the `NODE_VERSION` env var in `render.yaml` avoids this.

### Frontend → Vercel

1. On [vercel.com](https://vercel.com): **Add New** → **Project** → import the same repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Vite (`npm run build`, output `dist`).
3. Add an environment variable **before deploying**: `VITE_API_URL` = your Render backend URL (no trailing slash). Vite bakes this into the build at compile time, so if you add it after the fact, you must trigger a fresh redeploy for it to take effect.
4. Deploy. You'll get a stable production URL like `https://taskflow-nu-ten.vercel.app`.

### Lock down CORS

Back in Render, add an environment variable on the backend service: `FRONTEND_URL` = your Vercel production URL (no trailing slash — a mismatch here, e.g. a trailing `/`, will cause the browser to block every request with a CORS error even though the domain is "correct"). Saving it triggers a redeploy. `server.js` reads this to restrict `Access-Control-Allow-Origin` to just that origin instead of allowing any site.

> **Gotcha:** Vercel gives every individual deployment its own unique preview URL (e.g. `taskflow-<hash>-<team>.vercel.app`) in addition to the stable production domain. `FRONTEND_URL` must match the production domain — testing from a preview link will always fail CORS, since it's a genuinely different origin.

## Persistence on the free tier

Render's free web services have an **ephemeral filesystem** — any local file (including a SQLite `.db` file) is reset whenever the service redeploys *or* spins down from inactivity and wakes back up. There's no code bug here; it's a hosting-tier tradeoff.

Practical effect: the `.db` file is never committed to git (see `.gitignore`) — it's generated fresh from `schema.sql` and reseeded by `seed.js` as part of every build. So the app always comes back up in a clean, working demo state rather than an empty or broken one; it just means anything a visitor adds through the UI won't persist long-term.

For real persistence, the options are: a paid Render instance with an attached persistent disk, or swapping the DB layer to a hosted Postgres (Neon/Supabase) — neither was needed for this as a portfolio piece.

## Time spent

6-7 hours exact

## Something I found interesting
I know sql and its theory but using it in practical situation give me a broad spectrum of learning around database, Enjoyed building the assignment.

