const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = __dirname;
const envPath = path.join(root, ".env");

function loadLocalEnv() {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) process.env[key] = value;
  }
}

loadLocalEnv();

function mysqlEnabled() {
  return String(process.env.DB_MODE || "json").toLowerCase() === "mysql";
}

function mysqlConfig() {
  return {
    cli: process.env.MYSQL_CLI || "mysql",
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: process.env.MYSQL_PORT || "3306",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "nankai_security_guard"
  };
}

function mysqlBaseArgs(config, includeDatabase = true) {
  const args = ["--default-character-set=utf8mb4", "--batch", "--raw", "--skip-column-names", "--host", config.host, "--port", String(config.port), "--user", config.user];
  if (config.password) args.push(`--password=${config.password}`);
  if (includeDatabase) args.push(config.database);
  return args;
}

function mysqlIdentifier(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function mysqlExec(sql, includeDatabase = true) {
  const config = mysqlConfig();
  const sqlWithCharset = includeDatabase ? `SET NAMES utf8mb4; ${sql}` : sql;
  const result = spawnSync(config.cli, [...mysqlBaseArgs(config, includeDatabase), "--execute", sqlWithCharset], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "MySQL command failed").trim();
    throw new Error(message);
  }
  return result.stdout || "";
}

function initMysqlSchema() {
  if (!mysqlEnabled()) return;
  const config = mysqlConfig();
  mysqlExec(`CREATE DATABASE IF NOT EXISTS ${mysqlIdentifier(config.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`, false);
  mysqlExec(`
    CREATE TABLE IF NOT EXISTS app_state (
      state_key VARCHAR(64) PRIMARY KEY,
      state_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS source_pool (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      url VARCHAR(1024) NOT NULL,
      types_json LONGTEXT NOT NULL,
      UNIQUE KEY unique_source_url (url(180))
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS safety_cases (
      id VARCHAR(128) PRIMARY KEY,
      review_status VARCHAR(32) NOT NULL DEFAULT 'draft',
      safety_type VARCHAR(64),
      campus_scene VARCHAR(128),
      source_name VARCHAR(255),
      source_url VARCHAR(1024),
      source_date VARCHAR(32),
      collected_at VARCHAR(32),
      updated_at VARCHAR(32),
      data_json LONGTEXT NOT NULL,
      KEY idx_review_status (review_status),
      KEY idx_type_scene (safety_type, campus_scene(80)),
      KEY idx_source_url (source_url(180))
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      feishu_user_id VARCHAR(128) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      last_login_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_feishu_user_id (feishu_user_id),
      KEY idx_role_status (role, status)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      feishu_user_id VARCHAR(128) NOT NULL,
      name VARCHAR(100) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      last_login_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_student_feishu_user_id (feishu_user_id),
      KEY idx_student_status (status)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS learning_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_feishu_user_id VARCHAR(128) NOT NULL,
      case_id VARCHAR(128) NOT NULL,
      scenario_title VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL,
      ending_key VARCHAR(64) NOT NULL,
      completed_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_student_case_role (student_feishu_user_id, case_id, role),
      KEY idx_case_id (case_id),
      KEY idx_completed_at (completed_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      target_role VARCHAR(32) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      trigger_type VARCHAR(64) NOT NULL,
      related_state_key VARCHAR(64),
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      webhook_status VARCHAR(32) NOT NULL DEFAULT 'not_configured',
      webhook_response TEXT,
      created_at DATETIME NOT NULL,
      sent_at DATETIME NULL,
      KEY idx_notification_target (target_role, created_at),
      KEY idx_notification_status (status)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
}

function ensureMysqlSeed(seedDatabase) {
  if (!mysqlEnabled()) return;
  initMysqlSchema();
  const count = Number((mysqlExec("SELECT COUNT(*) FROM safety_cases;") || "0").trim() || "0");
  const sourceCount = Number((mysqlExec("SELECT COUNT(*) FROM source_pool;") || "0").trim() || "0");
  if (sourceCount === 0 && Array.isArray(seedDatabase.sourcePool)) writeMysqlSources(seedDatabase.sourcePool);
  if (count === 0 && Array.isArray(seedDatabase.cases)) writeMysqlCases(seedDatabase.cases);
  const stateCount = Number((mysqlExec("SELECT COUNT(*) FROM app_state WHERE state_key = 'collection';") || "0").trim() || "0");
  if (stateCount === 0 && seedDatabase.collection) writeMysqlCollection(seedDatabase.collection);
  ensureDefaultAdminUsers();
}

function ensureDefaultAdminUsers() {
  const count = Number((mysqlExec("SELECT COUNT(*) FROM admin_users;") || "0").trim() || "0");
  if (count > 0) return;
  mysqlExec(`INSERT INTO admin_users (feishu_user_id, name, role, status) VALUES
    ('feishu-editor-placeholder', '编辑员账号', 'editor', 'active'),
    ('feishu-reviewer-placeholder', '审核员账号', 'reviewer', 'active');`);
}

function readMysqlUsers() {
  const output = mysqlExec("SELECT id, feishu_user_id, name, role, status, COALESCE(DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') FROM admin_users ORDER BY id;").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [id, feishuUserId, name, role, status, lastLoginAt, createdAt, updatedAt] = line.split("\t");
    return { id: Number(id), feishuUserId, name, role, status, lastLoginAt, createdAt, updatedAt };
  });
}

function findMysqlUserByFeishuId(feishuUserId) {
  const output = mysqlExec("SELECT id, feishu_user_id, name, role, status, COALESCE(DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') FROM admin_users WHERE feishu_user_id = " + sqlString(feishuUserId) + " LIMIT 1;").trim();
  if (!output) return null;
  const [id, userId, name, role, status, lastLoginAt, createdAt, updatedAt] = output.split("\t");
  return { id: Number(id), feishuUserId: userId, name, role, status, lastLoginAt, createdAt, updatedAt };
}

function markMysqlUserLogin(feishuUserId, name) {
  mysqlExec("UPDATE admin_users SET name = " + sqlString(name) + ", last_login_at = NOW() WHERE feishu_user_id = " + sqlString(feishuUserId) + ";");
  return findMysqlUserByFeishuId(feishuUserId);
}

function upsertMysqlStudent(feishuUserId, name) {
  mysqlExec("INSERT INTO students (feishu_user_id, name, status, last_login_at) VALUES (" + sqlString(feishuUserId) + ", " + sqlString(name) + ", 'active', NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), status = 'active', last_login_at = NOW();");
  return findMysqlStudentByFeishuId(feishuUserId);
}

function findMysqlStudentByFeishuId(feishuUserId) {
  const output = mysqlExec("SELECT id, feishu_user_id, name, status, COALESCE(DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') FROM students WHERE feishu_user_id = " + sqlString(feishuUserId) + " LIMIT 1;").trim();
  if (!output) return null;
  const [id, userId, name, status, lastLoginAt, createdAt, updatedAt] = output.split("\t");
  return { id: Number(id), feishuUserId: userId, name, role: "student", status, lastLoginAt, createdAt, updatedAt };
}

function insertMysqlLearningRecord(record) {
  mysqlExec("INSERT INTO learning_records (student_feishu_user_id, case_id, scenario_title, role, ending_key, completed_at) VALUES (" + sqlString(record.studentFeishuUserId) + ", " + sqlString(record.caseId) + ", " + sqlString(record.scenarioTitle) + ", " + sqlString(record.role) + ", " + sqlString(record.endingKey) + ", NOW()) ON DUPLICATE KEY UPDATE scenario_title = VALUES(scenario_title), ending_key = VALUES(ending_key), completed_at = NOW();");
}

function readMysqlLearningRecords() {
  const output = mysqlExec("SELECT student_feishu_user_id, case_id, scenario_title, role, ending_key, COALESCE(DATE_FORMAT(completed_at, '%Y-%m-%d %H:%i:%s'), '') FROM learning_records ORDER BY completed_at DESC;").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [studentFeishuUserId, caseId, scenarioTitle, role, endingKey, completedAt] = line.split("\t");
    return { studentFeishuUserId, caseId, scenarioTitle, role, endingKey, completedAt };
  });
}
function readMysqlSources() {
  const output = mysqlExec("SELECT name, url, types_json FROM source_pool ORDER BY id;").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [name, url, typesJson = "[]"] = line.split("\t");
    return { name, url, types: JSON.parse(typesJson || "[]") };
  });
}

function readMysqlCases() {
  const output = mysqlExec("SELECT id, data_json FROM safety_cases ORDER BY COALESCE(updated_at, collected_at, source_date, '') DESC, id;").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const tabIndex = line.indexOf("\t");
    const json = tabIndex >= 0 ? line.slice(tabIndex + 1) : line;
    return JSON.parse(json);
  });
}

function readMysqlCollection() {
  const output = mysqlExec("SELECT state_json FROM app_state WHERE state_key = 'collection' LIMIT 1;").trim();
  return output ? JSON.parse(output) : null;
}

function readMysqlDatabase(fallback = {}) {
  initMysqlSchema();
  return {
    schemaVersion: fallback.schemaVersion || "2026-07-campus-safety-db-mysql-v1",
    updatedAt: fallback.updatedAt || new Date().toISOString().slice(0, 10),
    sourcePool: readMysqlSources(),
    cases: readMysqlCases(),
    collection: readMysqlCollection(),
    users: readMysqlUsers(),
    learningRecords: readMysqlLearningRecords(),
    notifications: readMysqlNotificationLogs(30)
  };
}


function insertMysqlNotificationLog(log) {
  const createdAt = log.createdAt || new Date().toISOString().slice(0, 19).replace("T", " ");
  mysqlExec("INSERT INTO notification_logs (target_role, title, message, trigger_type, related_state_key, status, webhook_status, webhook_response, created_at, sent_at) VALUES (" +
    sqlString(log.targetRole || "editor") + ", " +
    sqlString(log.title || "") + ", " +
    sqlString(log.message || "") + ", " +
    sqlString(log.triggerType || "system") + ", " +
    sqlString(log.relatedStateKey || "") + ", " +
    sqlString(log.status || "pending") + ", " +
    sqlString(log.webhookStatus || "not_configured") + ", " +
    sqlString(log.webhookResponse || "") + ", " +
    sqlString(createdAt) + ", " +
    (log.sentAt ? sqlString(log.sentAt) : "NULL") + ");");
}

function readMysqlNotificationLogs(limit = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const output = mysqlExec("SELECT id, target_role, title, message, trigger_type, related_state_key, status, webhook_status, COALESCE(webhook_response, ''), COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(sent_at, '%Y-%m-%d %H:%i:%s'), '') FROM notification_logs ORDER BY created_at DESC, id DESC LIMIT " + safeLimit + ";").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [id, targetRole, title, message, triggerType, relatedStateKey, status, webhookStatus, webhookResponse, createdAt, sentAt] = line.split("\t");
    return { id: Number(id), targetRole, title, message, triggerType, relatedStateKey, status, webhookStatus, webhookResponse, createdAt, sentAt };
  });
}

function writeMysqlSources(sources = []) {
  mysqlExec("DELETE FROM source_pool;");
  for (const source of sources) {
    mysqlExec(`INSERT INTO source_pool (name, url, types_json) VALUES (${sqlString(source.name)}, ${sqlString(source.url)}, ${sqlString(JSON.stringify(source.types || []))});`);
  }
}

function upsertMysqlCase(item) {
  const json = JSON.stringify(item);
  mysqlExec(`INSERT INTO safety_cases (id, review_status, safety_type, campus_scene, source_name, source_url, source_date, collected_at, updated_at, data_json)
    VALUES (${sqlString(item.id)}, ${sqlString(item.reviewStatus || "draft")}, ${sqlString(item.safetyType || "")}, ${sqlString(item.campusScene || "")}, ${sqlString(item.sourceName || "")}, ${sqlString(item.sourceUrl || "")}, ${sqlString(item.sourceDate || "")}, ${sqlString(item.collectedAt || "")}, ${sqlString(item.updatedAt || item.reviewedAt || "")}, ${sqlString(json)})
    ON DUPLICATE KEY UPDATE review_status = VALUES(review_status), safety_type = VALUES(safety_type), campus_scene = VALUES(campus_scene), source_name = VALUES(source_name), source_url = VALUES(source_url), source_date = VALUES(source_date), collected_at = VALUES(collected_at), updated_at = VALUES(updated_at), data_json = VALUES(data_json);`);
}

function writeMysqlCases(cases = []) {
  mysqlExec("DELETE FROM safety_cases;");
  for (const item of cases) upsertMysqlCase(item);
}

function writeMysqlCollection(collection) {
  if (!collection) {
    mysqlExec("DELETE FROM app_state WHERE state_key = 'collection';");
    return;
  }
  mysqlExec(`INSERT INTO app_state (state_key, state_json) VALUES ('collection', ${sqlString(JSON.stringify(collection))}) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json);`);
}

function writeMysqlDatabase(database) {
  initMysqlSchema();
  writeMysqlSources(database.sourcePool || []);
  writeMysqlCases(database.cases || []);
  writeMysqlCollection(database.collection || null);
}

module.exports = {
  mysqlEnabled,
  mysqlConfig,
  initMysqlSchema,
  ensureMysqlSeed,
  readMysqlDatabase,
  insertMysqlNotificationLog,
  readMysqlNotificationLogs,
  writeMysqlDatabase,
  findMysqlUserByFeishuId,
  markMysqlUserLogin,
  upsertMysqlStudent,
  findMysqlStudentByFeishuId,
  insertMysqlLearningRecord,
  readMysqlLearningRecords,
  insertMysqlNotificationLog,
  readMysqlNotificationLogs
};
