-- TaskFlow schema
-- Table names are plural (boards/columns/tasks) to avoid clashing with the
-- SQL reserved word COLUMN.

CREATE TABLE IF NOT EXISTS boards (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS columns (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  position INTEGER NOT NULL
);

-- Prevents two columns with the same name on the same board.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_column_name_per_board
ON columns(board_id, name);

CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  column_id   INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  priority    TEXT NOT NULL DEFAULT 'Medium'
              CHECK (priority IN ('Low','Medium','High')),
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
