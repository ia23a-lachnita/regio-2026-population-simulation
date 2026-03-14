const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function parseArgs(argv) {
  const parsed = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function loadContract(contractPath) {
  if (!contractPath || !fs.existsSync(contractPath)) {
    throw new Error(`Seed contract missing: ${contractPath}`);
  }

  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  if (!Array.isArray(contract.required_tables) || contract.required_tables.length === 0) {
    throw new Error('Seed contract must define a non-empty required_tables array.');
  }

  return contract;
}

function getTableNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
}

function getTableColumns(db, tableName) {
  return db.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all().map((column) => column.name);
}

function getSampleValues(db, tableName, sampleColumn, sampleLimit) {
  if (!sampleColumn) {
    return [];
  }

  const sql = `SELECT ${quoteIdentifier(sampleColumn)} AS value FROM ${quoteIdentifier(tableName)} LIMIT ${Number(sampleLimit || 3)}`;
  return db.prepare(sql).all().map((row) => row.value).filter((value) => value !== null && value !== undefined);
}

function verifySeedState({ dbPath, contractPath, outputPath }) {
  if (!dbPath) {
    throw new Error('Missing required --dbPath argument.');
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }

  const contract = loadContract(contractPath);
  const db = new Database(dbPath, { readonly: true });

  try {
    const tableNames = new Set(getTableNames(db));
    const requiredTables = contract.required_tables.map((entry) => {
      const tableName = entry.table;
      const minRows = Number(entry.min_rows || 1);
      if (!tableNames.has(tableName)) {
        return {
          table: tableName,
          min_rows: minRows,
          actual_rows: 0,
          exists: false,
          passed: false,
          sample_values: [],
          description: entry.description || null,
        };
      }

      const actualRows = Number(db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`).get().count);
      const columns = getTableColumns(db, tableName);
      const sampleColumn = entry.sample_column && columns.includes(entry.sample_column) ? entry.sample_column : null;

      return {
        table: tableName,
        min_rows: minRows,
        actual_rows: actualRows,
        exists: true,
        passed: actualRows >= minRows,
        sample_column: sampleColumn,
        sample_values: getSampleValues(db, tableName, sampleColumn, entry.sample_limit),
        description: entry.description || null,
      };
    });

    const result = {
      artifact: 'db_reset',
      result: requiredTables.every((entry) => entry.passed) ? 'PASS' : 'FAIL',
      db_path: path.resolve(dbPath),
      contract_path: path.resolve(contractPath),
      contract_version: contract.version || 1,
      required_tables: requiredTables,
    };

    if (outputPath) {
      fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }

    return result;
  } finally {
    db.close();
  }
}

function main() {
  const args = parseArgs(process.argv);
  const result = verifySeedState({
    dbPath: args.dbPath,
    contractPath: args.contract,
    outputPath: args.output,
  });

  process.stdout.write(JSON.stringify(result, null, 2));
  if (result.result !== 'PASS') {
    process.exitCode = 1;
  }
}

try {
  if (require.main === module) {
    main();
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

module.exports = {
  verifySeedState,
};