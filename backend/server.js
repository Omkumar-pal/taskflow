const express = require('express');
const cors = require('cors');
const queries = require('./queries');

const app = express();

// In prod, set FRONTEND_URL to the deployed frontend's origin (e.g. https://taskflow.vercel.app).
// Locally, with no FRONTEND_URL set, all origins are allowed for convenience.
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors(FRONTEND_URL ? { origin: FRONTEND_URL } : {}));
app.use(express.json());

// Lightweight health check endpoint for keep-alive pingers (e.g. UptimeRobot, cron-job.org)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/boards', (req, res) => {
  res.json(queries.getAllBoards());
});

app.post('/boards', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const board = queries.createBoard(name.trim());
  res.status(201).json(board);
});

app.post('/columns', (req, res) => {
  const { board_id, name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!board_id) {
    return res.status(400).json({ error: 'board_id is required' });
  }
  try {
    const column = queries.createColumn(board_id, name.trim());
    res.status(201).json(column);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'a column with this name already exists on this board' });
    }
    throw err;
  }
});

app.get('/boards/:id', (req, res) => {
  const board = queries.getBoardWithColumnsAndTasks(Number(req.params.id));
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

app.get('/boards/:id/column-counts', (req, res) => {
  res.json(queries.getTaskCountsPerColumn(Number(req.params.id)));
});

app.get('/tasks', (req, res) => {
  const { priority } = req.query;
  if (!priority) {
    return res.status(400).json({ error: 'priority query param is required' });
  }
  res.json(queries.getTasksByPriority(priority));
});

app.post('/tasks', (req, res) => {
  const { column_id, title, description, priority } = req.body;

  // Backend enforces this too, not just the frontend form.
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!column_id) {
    return res.status(400).json({ error: 'column_id is required' });
  }

  try {
    const task = queries.createTask({ column_id, title: title.trim(), description, priority });
    res.status(201).json(task);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'column_id does not exist' });
    }
    if (err.code === 'SQLITE_CONSTRAINT_CHECK') {
      return res.status(400).json({ error: 'priority must be Low, Medium, or High' });
    }
    throw err;
  }
});

app.patch('/tasks/:id', (req, res) => {
  const { title, description, priority } = req.body;
  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }
  try {
    const task = queries.updateTask(Number(req.params.id), { title, description, priority });
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_CHECK') {
      return res.status(400).json({ error: 'priority must be Low, Medium, or High' });
    }
    throw err;
  }
});

app.patch('/tasks/:id/move', (req, res) => {
  const { column_id } = req.body;
  if (!column_id) return res.status(400).json({ error: 'column_id is required' });
  try {
    const task = queries.moveTask(Number(req.params.id), column_id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'target column does not exist' });
    }
    throw err;
  }
});

app.delete('/tasks/:id', (req, res) => {
  const deleted = queries.deleteTask(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'task not found' });
  res.status(204).end();
});

// Catch-all so a thrown error never returns a blank screen / raw stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`TaskFlow API listening on port ${PORT}`));
}

module.exports = app;
