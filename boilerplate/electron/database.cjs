const mysql = require('mysql2/promise');
const BetterSqlite3 = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;
let dbType = 'mysql'; // 'mysql' or 'sqlite'

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'competition_db'
};

async function initDatabase() {
  try {
    // First, connect without specifying database to check if it exists
    console.log('[Database] Attempting MySQL connection to', DB_CONFIG.host, 'as user', DB_CONFIG.user);
    const tempConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });
    
    // Create database if it doesn't exist
    console.log('[Database] Creating database if not exists:', DB_CONFIG.database);
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${DB_CONFIG.database}`);
    console.log('[Database] MySQL database ensured:', DB_CONFIG.database);
    await tempConnection.end();
    
    // Now connect to the specific database
    console.log('[Database] Connecting to database:', DB_CONFIG.database);
    const connection = await mysql.createConnection(DB_CONFIG);
    await connection.end();
    dbType = 'mysql';
    console.log('[Database] ✓ Connected to MySQL successfully.');
  } catch (error) {
    console.warn('[Database] MySQL connection failed:', error.code, '-', error.message);
    console.warn('[Database] Falling back to SQLite');
    dbType = 'sqlite';
    const dbPath = path.join(app.getPath('userData'), 'app.db');
    console.log('[Database] Using SQLite database at:', dbPath);
    db = new BetterSqlite3(dbPath);
    setupSqliteSchema();
    console.log('[Database] SQLite schema initialized.');
  }

  // Optionally seed database if SEED_DB environment variable is set
  if (process.env.SEED_DB === 'true' || process.env.SEED_DB === '1') {
    await seedDatabase();
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

async function seedDatabase() {
  console.log('[Database] Seeding database with sample data...');
  
  try {
    // Clear existing data
    if (dbType === 'mysql') {
      const connection = await mysql.createConnection(DB_CONFIG);
      await connection.execute('DELETE FROM items');
      await connection.end();
    } else {
      db.exec('DELETE FROM items');
    }

    // Insert seed data
    const seedItems = [
      { name: 'Sample Item 1', description: 'This is a sample item for testing' },
      { name: 'Sample Item 2', description: 'Another sample item' },
      { name: 'Sample Item 3', description: 'Third sample item' }
    ];

    for (const item of seedItems) {
      await query(
        'INSERT INTO items (name, description) VALUES (?, ?)',
        [item.name, item.description]
      );
    }

    console.log('[Database] Successfully seeded database with', seedItems.length, 'items');
  } catch (error) {
    console.error('[Database] Error seeding database:', error);
  }
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
  query,
  seedDatabase
};
