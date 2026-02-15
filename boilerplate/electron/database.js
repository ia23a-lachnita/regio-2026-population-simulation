const mysql = require('mysql2/promise');
const BetterSqlite3 = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;
let dbType = 'mysql'; // 'mysql' or 'sqlite'

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '', // Default competition password often empty or 'root'
  database: 'competition_db'
};

async function initDatabase() {
  try {
    // Attempt MySQL connection
    const connection = await mysql.createConnection(DB_CONFIG);
    await connection.end();
    dbType = 'mysql';
    console.log('Connected to MySQL successfully.');
  } catch (error) {
    console.warn('MySQL connection failed, falling back to SQLite:', error.message);
    dbType = 'sqlite';
    const dbPath = path.join(app.getPath('userData'), 'app.db');
    db = new BetterSqlite3(dbPath);
    setupSqliteSchema();
  }
}

function setupSqliteSchema() {
  if (dbType !== 'sqlite') return;

  // Example schema - DELETE THIS and replace with your application's tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function query(sql, params = []) {
  if (dbType === 'mysql') {
    const connection = await mysql.createConnection(DB_CONFIG);
    const [results] = await connection.execute(sql, params);
    await connection.end();
    return results;
  } else {
    // SQLite uses ? for placeholders, MySQL also uses ?
    // But SQLite better-sqlite3 uses .prepare().all() or .run()
    const stmt = db.prepare(sql);
    if (sql.trim().toLowerCase().startsWith('select')) {
      return stmt.all(params);
    } else {
      return stmt.run(params);
    }
  }
}

module.exports = {
  initDatabase,
  query
};
