const fs = require("fs");
const path = require("path");
const dbAdapter = require("../db-adapter");

if (!dbAdapter.mysqlEnabled()) {
  console.error("请先在 .env 中设置 DB_MODE=mysql，并填写 MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE。");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const dbPath = path.join(root, "data", "safety-case-db.json");
const seedPath = path.join(root, "data", "safety-cases.json");
const fallback = fs.existsSync(dbPath) ? dbPath : seedPath;
const database = JSON.parse(fs.readFileSync(fallback, "utf8"));

dbAdapter.ensureMysqlSeed(database);
const mysqlDatabase = dbAdapter.readMysqlDatabase(database);
console.log(`MySQL 初始化完成：${dbAdapter.mysqlConfig().database}`);
console.log(`官方来源：${mysqlDatabase.sourcePool.length} 个`);
console.log(`案例：${mysqlDatabase.cases.length} 条`);
console.log(`采集状态：${mysqlDatabase.collection ? "已导入" : "暂无"}`);
