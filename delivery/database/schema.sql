-- Population Simulation Prototype Database Schema
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO app_settings (key, value) VALUES (''app_name'', ''Population Simulation Prototype'');
INSERT OR IGNORE INTO app_settings (key, value) VALUES (''version'', ''1.0.0'');
INSERT OR IGNORE INTO app_settings (key, value) VALUES (''schema_version'', ''1'');
