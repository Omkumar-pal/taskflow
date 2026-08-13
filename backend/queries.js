const db = require('./db');

module.exports = {
  getAllBoards() {
    return db.prepare('SELECT id, name FROM boards ORDER BY id').all();
  },

  createBoard(name) {
    const info = db.prepare('INSERT INTO boards (name) VALUES (?)').run(name);
    return db.prepare('SELECT * FROM boards WHERE id = ?').get(info.lastInsertRowid);
  },

  // New column goes to the end of the board (highest existing position + 1).
  createColumn(boardId, name) {
    const { next } = db
      .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM columns WHERE board_id = ?')
      .get(boardId);
    const info = db
      .prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)')
      .run(boardId, name, next);
    return db.prepare('SELECT * FROM columns WHERE id = ?').get(info.lastInsertRowid);
  },

  // Fetch a board with its columns, each populated with its tasks.
  getBoardWithColumnsAndTasks(boardId) {
    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
    if (!board) return null;

    const columns = db
      .prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position')
      .all(boardId);

    const tasks = db
      .prepare(
        `SELECT t.* FROM tasks t
         JOIN columns c ON c.id = t.column_id
         WHERE c.board_id = ?
         ORDER BY t.created_at DESC`
      )
      .all(boardId);

    const columnsWithTasks = columns.map((col) => ({
      ...col,
      tasks: tasks.filter((t) => t.column_id === col.id),
    }));

    return { ...board, columns: columnsWithTasks };
  },

  // Required query 1: count of tasks per column, on a given board.
  // LEFT JOIN (not JOIN) so a column with zero tasks still returns a row
  // with task_count = 0 instead of disappearing from the results.
  getTaskCountsPerColumn(boardId) {
    return db
      .prepare(
        `SELECT c.id AS column_id, c.name AS column_name, COUNT(t.id) AS task_count
         FROM columns c
         LEFT JOIN tasks t ON t.column_id = c.id
         WHERE c.board_id = ?
         GROUP BY c.id, c.name
         ORDER BY c.position`
      )
      .all(boardId);
  },

  // Required query 2: tasks with a given priority, newest first.
  getTasksByPriority(priority) {
    return db
      .prepare(
        `SELECT id, title, description, priority, column_id, created_at
         FROM tasks
         WHERE priority = ?
         ORDER BY created_at DESC`
      )
      .all(priority);
  },

  createTask({ column_id, title, description, priority }) {
    const info = db
      .prepare(
        `INSERT INTO tasks (column_id, title, description, priority)
         VALUES (?, ?, ?, ?)`
      )
      .run(column_id, title, description || null, priority || 'Medium');
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  },

  updateTask(id, { title, description, priority }) {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) return null;

    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?`
    ).run(
      title ?? existing.title,
      description ?? existing.description,
      priority ?? existing.priority,
      id
    );

    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  },

  moveTask(id, columnId) {
    const info = db.prepare('UPDATE tasks SET column_id = ? WHERE id = ?').run(columnId, id);
    if (info.changes === 0) return null;
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  },

  deleteTask(id) {
    const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return info.changes > 0;
  },
};
