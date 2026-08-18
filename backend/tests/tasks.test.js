process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../server');
const db = require('../db');
const queries = require('../queries');

beforeEach(() => {
  db.exec('DELETE FROM tasks; DELETE FROM columns; DELETE FROM boards;');
  db.prepare('INSERT INTO boards (id, name) VALUES (1, ?)').run('Test Board');
  db.prepare('INSERT INTO columns (id, board_id, name, position) VALUES (1, 1, ?, 0)').run('To Do');
  db.prepare('INSERT INTO columns (id, board_id, name, position) VALUES (2, 1, ?, 1)').run('Done');
});

describe('POST /tasks', () => {
  it('rejects an empty title (backend validation, not just the form)', async () => {
    const res = await request(app).post('/tasks').send({ column_id: 1, title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('creates a task with a valid title', async () => {
    const res = await request(app).post('/tasks').send({ column_id: 1, title: 'New task' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.column_id).toBe(1);
  });

  it('rejects a column_id that does not exist, instead of a generic 500', async () => {
    const res = await request(app).post('/tasks').send({ column_id: 9999, title: 'Orphan task' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/column_id/i);
  });

  it('rejects a priority outside Low/Medium/High, instead of a generic 500', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ column_id: 1, title: 'Bad priority task', priority: 'Urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });
});

describe('PATCH /tasks/:id/move', () => {
  it('updates the task column_id correctly', async () => {
    const created = await request(app).post('/tasks').send({ column_id: 1, title: 'Move me' });
    const res = await request(app).patch(`/tasks/${created.body.id}/move`).send({ column_id: 2 });
    expect(res.status).toBe(200);
    expect(res.body.column_id).toBe(2);
  });

  it('rejects a move to a column_id that does not exist, instead of a generic 500', async () => {
    const created = await request(app).post('/tasks').send({ column_id: 1, title: 'Move me' });
    const res = await request(app).patch(`/tasks/${created.body.id}/move`).send({ column_id: 9999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/column/i);
  });
});

describe('PATCH /tasks/:id', () => {
  it('rejects a priority outside Low/Medium/High, instead of a generic 500', async () => {
    const created = await request(app).post('/tasks').send({ column_id: 1, title: 'Reprioritize me' });
    const res = await request(app).patch(`/tasks/${created.body.id}`).send({ priority: 'Urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });

  it('updates priority when given a valid value', async () => {
    const created = await request(app).post('/tasks').send({ column_id: 1, title: 'Reprioritize me' });
    const res = await request(app).patch(`/tasks/${created.body.id}`).send({ priority: 'High' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('High');
  });
});

describe('DB layer: getTasksByPriority (hits the database directly)', () => {
  it('returns High priority tasks newest first', () => {
    const insert = db.prepare(
      'INSERT INTO tasks (column_id, title, priority, created_at) VALUES (?, ?, ?, ?)'
    );
    insert.run(1, 'Old high task', 'High', '2026-08-01 09:00:00');
    insert.run(1, 'New high task', 'High', '2026-08-12 09:00:00');
    insert.run(1, 'Low task', 'Low', '2026-08-13 09:00:00');

    const results = queries.getTasksByPriority('High');

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('New high task');
    expect(results[1].title).toBe('Old high task');
  });
});

describe('POST /boards', () => {
  it('rejects an empty name', async () => {
    const res = await request(app).post('/boards').send({ name: '  ' });
    expect(res.status).toBe(400);
  });

  it('creates a new board', async () => {
    const res = await request(app).post('/boards').send({ name: 'Marketing Board' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Marketing Board');
  });
});

describe('GET /boards', () => {
  it('lists all boards', async () => {
    await request(app).post('/boards').send({ name: 'Second Board' });
    const res = await request(app).get('/boards');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('POST /columns', () => {
  it('adds a new column to a board at the next position', async () => {
    const res = await request(app).post('/columns').send({ board_id: 1, name: 'Backlog' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Backlog');
    expect(res.body.position).toBe(2); // after existing To Do (0) and Done (1)
  });

  it('rejects a column with no name', async () => {
    const res = await request(app).post('/columns').send({ board_id: 1, name: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate column name on the same board, instead of a generic 500', async () => {
    const res = await request(app).post('/columns').send({ board_id: 1, name: 'To Do' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('allows the same column name on a different board', async () => {
    const otherBoard = await request(app).post('/boards').send({ name: 'Other Board' });
    const res = await request(app).post('/columns').send({ board_id: otherBoard.body.id, name: 'To Do' });
    expect(res.status).toBe(201);
  });
});

describe('DB layer: getTaskCountsPerColumn', () => {
  it('includes a column with zero tasks as count 0', () => {
    db.prepare('INSERT INTO columns (id, board_id, name, position) VALUES (3, 1, ?, 2)').run('Backlog');
    db.prepare('INSERT INTO tasks (column_id, title, priority) VALUES (1, ?, ?)').run('Task A', 'Medium');

    const results = queries.getTaskCountsPerColumn(1);
    const backlog = results.find((r) => r.column_name === 'Backlog');

    expect(backlog).toBeDefined();
    expect(backlog.task_count).toBe(0);
  });
});

describe('GET /health', () => {
  it('returns 200 OK with status and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

