const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Use DB_PATH=':memory:' for tests, or a real file path in dev/prod.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskflow.db');

const db = new Database(DB_PATH);

// SQLite has foreign keys OFF by default per-connection.
// Without this line, ON DELETE CASCADE in schema.sql silently does nothing.
db.pragma('foreign_keys = ON');

function initSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

initSchema();

module.exports = db;
