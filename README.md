# TaskFlow

A simple task board (Board → Columns → Tasks), built with React, Express, and SQLite.

## Tech stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite via `better-sqlite3` — raw SQL, no ORM

## Setup (from a fresh clone)

### 1. Backend

```bash
cd backend
npm install
npm run seed      # populates the DB with 1 board, 3 columns, 7 tasks
npm start         # runs on http://localhost:4000
```

### 2. Frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev        # runs on http://localhost:5173
```

Open http://localhost:5173 — the board will load, backed by the seeded SQLite data at
`backend/taskflow.db`.

### 3. Run tests

```bash
cd backend
npm test
```

Covers: rejecting an empty title, moving a task updates `column_id`, and two tests that
call the DB-layer query functions directly (`getTasksByPriority`, `getTaskCountsPerColumn`)
against known seed data.

## Database schema

See `backend/schema.sql`. Summary:

- `boards(id, name)`
- `columns(id, board_id → boards.id, name, position)`
- `tasks(id, column_id → columns.id, title, description, priority, created_at)`

Foreign keys cascade on delete. Table names are plural (`columns` not `column`) to avoid
the SQL reserved word `COLUMN`.

## The two required non-trivial queries

Both live in `backend/queries.js`, written as raw parameterized SQL:

1. **`getTaskCountsPerColumn`** — task count per column on a board, using `LEFT JOIN` +
   `GROUP BY` so an empty column still returns `task_count: 0` instead of vanishing.
2. **`getTasksByPriority`** — tasks filtered by priority, `ORDER BY created_at DESC`.

## Assumptions & decisions

- **Task status = `column_id`.** There's no separate `status` field — the column a task
  sits in *is* its status, per the assignment's own definition. Avoids redundant/desyncable
  state.
- **Move via dropdown, not drag-and-drop**, given the time budget — the spec explicitly
  says a working dropdown beats a broken drag-and-drop.
- **Multiple boards are supported.** A dropdown in the header lists all boards and lets
  you switch between them or create a new one. New boards start with zero columns.
- **Columns can be added per board** via a "+ Add column" control at the end of the
  board — new columns are appended at `position = max(existing position) + 1`.
- Priority defaults to `Medium` if not specified on task creation.
- `board.name` was added since it wasn't explicitly listed but a board with no name field
  didn't make sense.

## What I'd improve with more time

- Actual drag-and-drop instead of the dropdown (stretch goal).
- Text search by title (stretch goal).
- Optimistic UI updates instead of a full re-fetch after every mutation.
- `updated_at` timestamp on tasks.

## Time spent

[Fill in — roughly X hours]

## Something I found interesting

[Fill in — e.g. the LEFT JOIN vs JOIN behavior with empty columns, or the SQLite
foreign_keys pragma being off by default]
