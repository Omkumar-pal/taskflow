const db = require('./db');

function seed() {
  db.exec('DELETE FROM tasks; DELETE FROM columns; DELETE FROM boards;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('tasks','columns','boards');");

  const boardId = db.prepare('INSERT INTO boards (name) VALUES (?)').run('Website Redesign').lastInsertRowid;

  const insertColumn = db.prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)');
  const todoId = insertColumn.run(boardId, 'To Do', 0).lastInsertRowid;
  const progressId = insertColumn.run(boardId, 'In Progress', 1).lastInsertRowid;
  const doneId = insertColumn.run(boardId, 'Done', 2).lastInsertRowid;

  const insertTask = db.prepare(
    `INSERT INTO tasks (column_id, title, description, priority, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );

  insertTask.run(todoId, 'Fix navbar bug', 'Logo overlaps nav links on mobile', 'High', '2026-08-10 09:00:00');
  insertTask.run(todoId, 'Write API docs', null, 'Low', '2026-08-11 14:00:00');
  insertTask.run(todoId, 'Redesign footer', null, 'Medium', '2026-08-12 10:00:00');
  insertTask.run(progressId, 'Build login page', 'Add form validation', 'Medium', '2026-08-09 11:00:00');
  insertTask.run(progressId, 'Integrate payment gateway', null, 'High', '2026-08-08 16:00:00');
  insertTask.run(doneId, 'Setup CI pipeline', null, 'High', '2026-08-05 08:00:00');
  insertTask.run(doneId, 'Initial project scaffold', null, 'Low', '2026-08-01 09:00:00');

  console.log('Seed complete: 1 board, 3 columns, 7 tasks.');
}

seed();
