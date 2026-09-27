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
    CREATE TABLE IF NOT EXISTS student_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      gender VARCHAR(16) NOT NULL DEFAULT '',
      student_number VARCHAR(64) NOT NULL DEFAULT '',
      grade VARCHAR(16) NOT NULL DEFAULT '',
      feishu_user_id VARCHAR(128) NOT NULL,
      study_stage VARCHAR(32) NOT NULL DEFAULT '',
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      last_login_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_profile_feishu_user_id (feishu_user_id),
      KEY idx_profile_stage_grade (study_stage, grade),
      KEY idx_profile_student_number (student_number)
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
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id VARCHAR(64) PRIMARY KEY,
      category VARCHAR(64) NOT NULL,
      scene VARCHAR(128) NOT NULL,
      difficulty VARCHAR(32) NOT NULL,
      source_type VARCHAR(255) NOT NULL,
      question_text TEXT NOT NULL,
      options_json LONGTEXT NOT NULL,
      answer_index TINYINT NOT NULL,
      explanation TEXT NOT NULL,
      review_status VARCHAR(32) NOT NULL DEFAULT 'approved',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_quiz_category (category),
      KEY idx_quiz_status (review_status)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS quiz_bank_versions (
      id VARCHAR(64) PRIMARY KEY,
      uploaded_by_id VARCHAR(128) NOT NULL,
      uploaded_by_name VARCHAR(100) NOT NULL,
      original_file_name VARCHAR(255) NOT NULL,
      stored_file_name VARCHAR(255) NOT NULL,
      question_count INT NOT NULL,
      created_at DATETIME NOT NULL,
      KEY idx_quiz_version_created (created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS safety_education_tasks (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      target_scope VARCHAR(255) NOT NULL,
      expected_count INT NOT NULL DEFAULT 0,
      categories_json LONGTEXT NOT NULL,
      question_count INT NOT NULL DEFAULT 10,
      pass_score INT NOT NULL DEFAULT 80,
      starts_at DATETIME NULL,
      ends_at DATETIME NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_by VARCHAR(128) NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      KEY idx_task_status (status, starts_at, ends_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id VARCHAR(64) PRIMARY KEY,
      task_id VARCHAR(64) NULL,
      student_feishu_user_id VARCHAR(128) NOT NULL,
      student_name VARCHAR(100) NOT NULL,
      score INT NOT NULL,
      total_questions INT NOT NULL,
      correct_count INT NOT NULL,
      completed_at DATETIME NOT NULL,
      KEY idx_attempt_task_student (task_id, student_feishu_user_id),
      KEY idx_attempt_completed (completed_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      attempt_id VARCHAR(64) NOT NULL,
      question_id VARCHAR(64) NOT NULL,
      category VARCHAR(64) NOT NULL,
      selected_answer TINYINT NOT NULL,
      correct_answer TINYINT NOT NULL,
      is_correct TINYINT(1) NOT NULL,
      KEY idx_answer_attempt (attempt_id),
      KEY idx_answer_question (question_id),
      KEY idx_answer_category (category)
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
  const isFreshDatabase = count === 0 && sourceCount === 0;
  if (sourceCount === 0 && Array.isArray(seedDatabase.sourcePool)) writeMysqlSources(seedDatabase.sourcePool);
  // Seed sample cases only for a brand-new database, never after an intentional cleanup.
  if (isFreshDatabase && Array.isArray(seedDatabase.cases)) writeMysqlCases(seedDatabase.cases);
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

function updateMysqlUserRole(feishuUserId, role) {
  mysqlExec("UPDATE admin_users SET role = " + sqlString(role) + ", updated_at = NOW() WHERE feishu_user_id = " + sqlString(feishuUserId) + ";");
  return findMysqlUserByFeishuId(feishuUserId);
}

function upsertMysqlStudent(feishuUserId, name) {
  mysqlExec("INSERT INTO students (feishu_user_id, name, status, last_login_at) VALUES (" + sqlString(feishuUserId) + ", " + sqlString(name) + ", 'active', NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), status = 'active', last_login_at = NOW();");
  return findMysqlStudentByFeishuId(feishuUserId);
}

function upsertMysqlStudentProfile(profile) {
  initMysqlSchema();
  const name = String(profile.name || "").trim() || "飞书用户";
  const gender = String(profile.gender || "").trim();
  const studentNumber = String(profile.studentNumber || "").trim();
  const grade = String(profile.grade || "").trim();
  const studyStage = String(profile.studyStage || "").trim();
  mysqlExec("INSERT INTO student_profiles (name, gender, student_number, grade, feishu_user_id, study_stage, status, last_login_at) VALUES (" +
    sqlString(name) + ", " + sqlString(gender) + ", " + sqlString(studentNumber) + ", " + sqlString(grade) + ", " + sqlString(profile.feishuUserId) + ", " + sqlString(studyStage) + ", 'active', NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), gender = IF(VALUES(gender) = '', gender, VALUES(gender)), student_number = IF(VALUES(student_number) = '', student_number, VALUES(student_number)), grade = IF(VALUES(grade) = '', grade, VALUES(grade)), study_stage = IF(VALUES(study_stage) = '', study_stage, VALUES(study_stage)), status = 'active', last_login_at = NOW();");
  return findMysqlStudentProfileByFeishuId(profile.feishuUserId);
}

function findMysqlStudentProfileByFeishuId(feishuUserId) {
  initMysqlSchema();
  const output = mysqlExec("SELECT id, name, gender, student_number, grade, feishu_user_id, study_stage, status, COALESCE(DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), ''), COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') FROM student_profiles WHERE feishu_user_id = " + sqlString(feishuUserId) + " LIMIT 1;").trim();
  if (!output) return null;
  const [id, name, gender, studentNumber, grade, userId, studyStage, status, lastLoginAt, createdAt, updatedAt] = output.split("\t");
  return { id: Number(id), name, gender, studentNumber, grade, feishuUserId: userId, studyStage, status, lastLoginAt, createdAt, updatedAt };
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

function readMysqlQuizQuestions() {
  initMysqlSchema();
  const output = mysqlExec("SELECT id, category, scene, difficulty, source_type, question_text, options_json, answer_index, explanation, review_status FROM quiz_questions WHERE review_status = 'approved' ORDER BY id;").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [id, category, scene, difficulty, sourceType, question, optionsJson, answer, explain, reviewStatus] = line.split("\t");
    return { id, category, scene, difficulty, sourceType, question, options: JSON.parse(optionsJson || "[]"), answer: Number(answer), explain, reviewStatus };
  });
}

function replaceMysqlQuizQuestions(questions = []) {
  initMysqlSchema();
  const inserts = questions.map((item) =>
    "INSERT INTO quiz_questions (id, category, scene, difficulty, source_type, question_text, options_json, answer_index, explanation, review_status) VALUES (" +
      sqlString(item.id) + ", " + sqlString(item.category) + ", " + sqlString(item.scene) + ", " + sqlString(item.difficulty) + ", " +
      sqlString(item.sourceType) + ", " + sqlString(item.question) + ", " + sqlString(JSON.stringify(item.options || [])) + ", " +
      Number(item.answer) + ", " + sqlString(item.explain) + ", " + sqlString(item.reviewStatus || "approved") + ");"
  ).join("\n");
  mysqlExec("START TRANSACTION;\nDELETE FROM quiz_questions;\n" + inserts + "\nCOMMIT;");
}

function ensureMysqlQuizQuestions(questions = []) {
  if (!Array.isArray(questions) || !questions.length) return;
  initMysqlSchema();
  const count = Number((mysqlExec("SELECT COUNT(*) FROM quiz_questions;") || "0").trim() || "0");
  const ids = questions.map((item) => sqlString(item.id)).join(", ");
  const matched = Number((mysqlExec("SELECT COUNT(*) FROM quiz_questions WHERE id IN (" + ids + ");") || "0").trim() || "0");
  if (count !== questions.length || matched !== questions.length) replaceMysqlQuizQuestions(questions);
}

function insertMysqlQuizBankVersion(version) {
  initMysqlSchema();
  mysqlExec("INSERT INTO quiz_bank_versions (id, uploaded_by_id, uploaded_by_name, original_file_name, stored_file_name, question_count, created_at) VALUES (" +
    sqlString(version.id) + ", " + sqlString(version.uploadedById) + ", " + sqlString(version.uploadedByName) + ", " +
    sqlString(version.originalFileName) + ", " + sqlString(version.storedFileName) + ", " + Number(version.questionCount) + ", NOW());");
}

function readMysqlQuizBankVersions() {
  initMysqlSchema();
  const output = mysqlExec("SELECT id, uploaded_by_id, uploaded_by_name, original_file_name, stored_file_name, question_count, COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') FROM quiz_bank_versions ORDER BY created_at DESC;").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [id, uploadedById, uploadedByName, originalFileName, storedFileName, questionCount, createdAt] = line.split("\t");
    return { id, uploadedById, uploadedByName, originalFileName, storedFileName, questionCount: Number(questionCount), createdAt };
  });
}

function findMysqlQuizBankVersion(id) {
  return readMysqlQuizBankVersions().find((item) => item.id === id) || null;
}

function readMysqlQuizTasks() {
  initMysqlSchema();
  const output = mysqlExec("SELECT id, title, target_scope, expected_count, categories_json, question_count, pass_score, COALESCE(DATE_FORMAT(starts_at, '%Y-%m-%d %H:%i'), ''), COALESCE(DATE_FORMAT(ends_at, '%Y-%m-%d %H:%i'), ''), status, created_by, COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i'), ''), COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i'), '') FROM safety_education_tasks ORDER BY created_at DESC;").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [id, title, targetScope, expectedCount, categoriesJson, questionCount, passScore, startsAt, endsAt, status, createdBy, createdAt, updatedAt] = line.split("\t");
    return { id, title, targetScope, expectedCount: Number(expectedCount), categories: JSON.parse(categoriesJson || "[]"), questionCount: Number(questionCount), passScore: Number(passScore), startsAt, endsAt, status, createdBy, createdAt, updatedAt };
  });
}

function createMysqlQuizTask(task) {
  initMysqlSchema();
  if (task.status === "active") mysqlExec("UPDATE safety_education_tasks SET status = 'paused', updated_at = NOW() WHERE status = 'active';");
  mysqlExec("INSERT INTO safety_education_tasks (id, title, target_scope, expected_count, categories_json, question_count, pass_score, starts_at, ends_at, status, created_by, created_at, updated_at) VALUES (" +
    sqlString(task.id) + ", " + sqlString(task.title) + ", " + sqlString(task.targetScope) + ", " + Number(task.expectedCount || 0) + ", " +
    sqlString(JSON.stringify(task.categories || [])) + ", " + Number(task.questionCount || 10) + ", " + Number(task.passScore || 80) + ", " +
    (task.startsAt ? sqlString(task.startsAt) : "NULL") + ", " + (task.endsAt ? sqlString(task.endsAt) : "NULL") + ", " +
    sqlString(task.status || "active") + ", " + sqlString(task.createdBy) + ", NOW(), NOW());");
  return readMysqlQuizTasks().find((item) => item.id === task.id);
}

function updateMysqlQuizTaskStatus(id, status) {
  initMysqlSchema();
  if (status === "active") mysqlExec("UPDATE safety_education_tasks SET status = 'paused', updated_at = NOW() WHERE status = 'active' AND id <> " + sqlString(id) + ";");
  mysqlExec("UPDATE safety_education_tasks SET status = " + sqlString(status) + ", updated_at = NOW() WHERE id = " + sqlString(id) + ";");
  return readMysqlQuizTasks().find((item) => item.id === id) || null;
}

function readMysqlActiveQuizTask() {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  return readMysqlQuizTasks().find((item) => item.status === "active" && (!item.startsAt || item.startsAt <= now.slice(0, 16)) && (!item.endsAt || item.endsAt >= now.slice(0, 16))) || null;
}

function insertMysqlQuizAttempt(attempt, answers = []) {
  initMysqlSchema();
  mysqlExec("INSERT INTO quiz_attempts (id, task_id, student_feishu_user_id, student_name, score, total_questions, correct_count, completed_at) VALUES (" +
    sqlString(attempt.id) + ", " + (attempt.taskId ? sqlString(attempt.taskId) : "NULL") + ", " + sqlString(attempt.studentFeishuUserId) + ", " +
    sqlString(attempt.studentName) + ", " + Number(attempt.score) + ", " + Number(attempt.totalQuestions) + ", " + Number(attempt.correctCount) + ", NOW());");
  for (const answer of answers) mysqlExec("INSERT INTO quiz_attempt_answers (attempt_id, question_id, category, selected_answer, correct_answer, is_correct) VALUES (" +
    sqlString(attempt.id) + ", " + sqlString(answer.questionId) + ", " + sqlString(answer.category) + ", " + Number(answer.selectedAnswer) + ", " + Number(answer.correctAnswer) + ", " + (answer.isCorrect ? 1 : 0) + ");");
}

function readMysqlQuizAttempts(taskId = "") {
  initMysqlSchema();
  const where = taskId ? " WHERE task_id = " + sqlString(taskId) : "";
  const output = mysqlExec("SELECT id, COALESCE(task_id, ''), student_feishu_user_id, student_name, score, total_questions, correct_count, COALESCE(DATE_FORMAT(completed_at, '%Y-%m-%d %H:%i:%s'), '') FROM quiz_attempts" + where + " ORDER BY completed_at DESC;").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [id, taskIdValue, studentFeishuUserId, studentName, score, totalQuestions, correctCount, completedAt] = line.split("\t");
    return { id, taskId: taskIdValue, studentFeishuUserId, studentName, score: Number(score), totalQuestions: Number(totalQuestions), correctCount: Number(correctCount), completedAt };
  });
}

function readMysqlQuizAttemptAnswers(taskId = "") {
  initMysqlSchema();
  const join = taskId ? " INNER JOIN quiz_attempts qa ON qa.id = qaa.attempt_id WHERE qa.task_id = " + sqlString(taskId) : "";
  const output = mysqlExec("SELECT qaa.attempt_id, qaa.question_id, qaa.category, qaa.selected_answer, qaa.correct_answer, qaa.is_correct FROM quiz_attempt_answers qaa" + join + ";").trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [attemptId, questionId, category, selectedAnswer, correctAnswer, isCorrect] = line.split("\t");
    return { attemptId, questionId, category, selectedAnswer: Number(selectedAnswer), correctAnswer: Number(correctAnswer), isCorrect: Number(isCorrect) === 1 };
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
  updateMysqlUserRole,
  upsertMysqlStudent,
  upsertMysqlStudentProfile,
  findMysqlStudentProfileByFeishuId,
  findMysqlStudentByFeishuId,
  insertMysqlLearningRecord,
  readMysqlLearningRecords,
  readMysqlQuizQuestions,
  replaceMysqlQuizQuestions,
  ensureMysqlQuizQuestions,
  insertMysqlQuizBankVersion,
  readMysqlQuizBankVersions,
  findMysqlQuizBankVersion,
  readMysqlQuizTasks,
  createMysqlQuizTask,
  updateMysqlQuizTaskStatus,
  readMysqlActiveQuizTask,
  insertMysqlQuizAttempt,
  readMysqlQuizAttempts,
  readMysqlQuizAttemptAnswers,
  insertMysqlNotificationLog,
  readMysqlNotificationLogs
};
