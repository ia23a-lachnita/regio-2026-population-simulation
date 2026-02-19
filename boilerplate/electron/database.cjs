const BetterSqlite3 = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;
let dbType = 'sqlite'; // 'mysql' or 'sqlite'
let mysqlModule = null;

// Log level control
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
const shouldLog = (level) => logLevels[level] >= logLevels[LOG_LEVEL];

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'competition_db'
};

async function initDatabase() {
  const useMysql = ['1', 'true', 'mysql'].includes(String(process.env.USE_MYSQL || process.env.DB_TYPE || '').toLowerCase());

  if (!useMysql) {
    initSqliteDatabase();
    if (process.env.SEED_DB !== 'false' && process.env.SEED_DB !== '0') {
      await seedDatabase();
    }
    return;
  }

  try {
    try {
      mysqlModule = require('mysql2/promise');
    } catch (error) {
      throw new Error(`mysql2 is unavailable: ${error.message}`);
    }

    // First, connect to MySQL server without specifying database to create it if needed
    const tempConnection = await mysqlModule.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });
    
    // Create database if it doesn't exist
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${DB_CONFIG.database}`);
    if (shouldLog('info')) console.log(`[Database] Database '${DB_CONFIG.database}' ready.`);
    await tempConnection.end();
    
    // Now connect to the actual database
    const connection = await mysqlModule.createConnection(DB_CONFIG);
    
    // Set up MySQL schema
    await setupMysqlSchema(connection);
    
    await connection.end();
    dbType = 'mysql';
    if (shouldLog('info')) console.log('[Database] Connected to MySQL successfully.');
  } catch (error) {
    console.warn('[Database] MySQL connection failed, falling back to SQLite:', error.message);
    mysqlModule = null;
    initSqliteDatabase();
  }

  // Optionally seed database if SEED_DB environment variable is set
  if (process.env.SEED_DB !== 'false' && process.env.SEED_DB !== '0') {
    await seedDatabase();
  }
}

function initSqliteDatabase() {
  dbType = 'sqlite';
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  if (shouldLog('info')) console.log('[Database] Using SQLite database at:', dbPath);
  db = new BetterSqlite3(dbPath);
  setupSqliteSchema();
  if (shouldLog('info')) console.log('[Database] SQLite schema initialized.');
}

function setupSqliteSchema() {
  if (dbType !== 'sqlite') return;

  db.exec('PRAGMA foreign_keys = ON;');

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

async function setupMysqlSchema(connection) {
  // Example schema - DELETE THIS and replace with your application's tables
  await connection.query(`
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  if (shouldLog('info')) console.log('[Database] MySQL schema initialized.');
}

async function seedDatabase() {
  if (shouldLog('info')) console.log('[Database] Seeding database with sample data...');

  const countRows = await query('SELECT COUNT(*) AS count FROM items', []);
  const existingCount = Number(countRows?.[0]?.count ?? 0);
  if (existingCount > 0) {
    if (shouldLog('info')) console.log('[Database] Seed skipped (database already has data).');
    return;
  }
  
  try {
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
  if (dbType === 'mysql' && mysqlModule) {
    const connection = await mysqlModule.createConnection(DB_CONFIG);
    const [results] = await connection.execute(sql, params);
    await connection.end();
    return results;
  } else {
    db.exec('PRAGMA foreign_keys = ON;');
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
