const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();
const dbAdapter = require("./db-adapter");

const port = Number(process.env.PORT || 8000);
const host = "0.0.0.0";
const root = __dirname;
const dataDir = path.join(root, "data");
const seedPath = path.join(dataDir, "safety-cases.json");
const dbPath = path.join(dataDir, "safety-case-db.json");

const protectedPages = { "/editor.html": "editor", "/reviewer.html": "reviewer", "/knowledge.html": "student" };
const oauthStates = new Map();
const notificationDedupes = new Map();

function authRequired() {
  return String(process.env.FEISHU_AUTH_REQUIRED || "true").toLowerCase() !== "false";
}

function publicBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || ("http://localhost:" + port)).replace(/\/$/, "");
}

function feishuAuthConfig() {
  const baseUrl = publicBaseUrl();
  return {
    appId: process.env.FEISHU_APP_ID || "",
    appSecret: process.env.FEISHU_APP_SECRET || "",
    redirectUri: process.env.FEISHU_REDIRECT_URI || (baseUrl + "/api/auth/callback"),
    scope: process.env.FEISHU_SCOPE || "",
    sessionSecret: process.env.SESSION_SECRET || process.env.FEISHU_APP_SECRET || "dev-session-secret"
  };
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  const result = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return result;
}

function base64Url(value) { return Buffer.from(value).toString("base64url"); }
function signPayload(payload) { return crypto.createHmac("sha256", feishuAuthConfig().sessionSecret).update(payload).digest("base64url"); }

function makeSessionCookie(user) {
  const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : String(user.role || "").split(",").map((item) => item.trim()).filter(Boolean);
  const payload = base64Url(JSON.stringify({ feishuUserId: user.feishuUserId, name: user.name, role: user.role, roles, exp: Date.now() + 12 * 60 * 60 * 1000 }));
  return payload + "." + signPayload(payload);
}

function readSession(request) {
  if (!authRequired()) return { feishuUserId: "dev", name: "开发模式", role: "admin" };
  const token = parseCookies(request).nsg_session;
  if (!token || !token.includes(".")) return null;
  const parts = token.split(".");
  const payload = parts[0];
  const signature = parts[1];
  if (signPayload(payload) !== signature) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch (error) {
    return null;
  }
}

function sessionRoles(session) {
  if (!session) return [];
  const cookieRoles = Array.isArray(session.roles) ? session.roles : String(session.role || "").split(",").map((item) => item.trim()).filter(Boolean);
  const merged = new Set(cookieRoles);
  if (session.feishuUserId && dbAdapter.mysqlEnabled()) {
    const databaseUser = dbAdapter.findMysqlUserByFeishuId(session.feishuUserId);
    if (databaseUser && databaseUser.status === "active") {
      String(databaseUser.role || "").split(",").map((item) => item.trim()).filter(Boolean).forEach((role) => merged.add(role));
    }
  }
  return Array.from(merged);
}

function roleAllowed(session, requiredRole) {
  if (!authRequired()) return true;
  if (!session) return false;
  if (requiredRole === "any") return true;
  const roles = sessionRoles(session);
  if (roles.includes("admin")) return true;
  return roles.includes(requiredRole);
}

function redirect(response, location, cookies = []) {
  response.writeHead(302, { Location: location, "Set-Cookie": cookies });
  response.end();
}

function sendAuthError(response, status, title, message) {
  response.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${title}</title><link rel="stylesheet" href="/styles.css"></head><body><main class="admin-console"><section class="admin-toolbar"><div><p class="eyebrow">Access</p><h1>${title}</h1><p>${message}</p></div></section></main></body></html>`;
  response.end(html);
}

function authLoginUrl(role, next) {
  const config = feishuAuthConfig();
  if (!config.appId || !config.appSecret) return "";
  const state = crypto.randomBytes(18).toString("hex");
  oauthStates.set(state, { role, next, createdAt: Date.now() });
  const url = new URL("https://accounts.feishu.cn/open-apis/authen/v1/authorize");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  if (config.scope) url.searchParams.set("scope", config.scope);
  return url.href;
}

async function exchangeFeishuCode(code) {
  const config = feishuAuthConfig();
  const tokenResponse = await fetch("https://open.feishu.cn/open-apis/authen/v2/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ grant_type: "authorization_code", client_id: config.appId, client_secret: config.appSecret, code, redirect_uri: config.redirectUri })
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || tokenData.code !== 0 || !tokenData.access_token) throw new Error(tokenData.error_description || tokenData.msg || "飞书授权失败");
  const userResponse = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
    headers: { Authorization: "Bearer " + tokenData.access_token, "Content-Type": "application/json; charset=utf-8" }
  });
  const userData = await userResponse.json();
  if (!userResponse.ok || userData.code !== 0 || !userData.data) throw new Error(userData.msg || "飞书用户信息读取失败");
  return userData.data;
}

async function feishuUserToLocalUser(feishuUser, requestedRole = "reviewer") {
  const feishuUserId = feishuUser.open_id || feishuUser.union_id || feishuUser.user_id;
  const name = feishuUser.name || feishuUser.en_name || "Feishu user";
  if (!feishuUserId) return null;
  if (requestedRole === "student") return dbAdapter.upsertMysqlStudent(feishuUserId, name);
  const matched = dbAdapter.findMysqlUserByFeishuId(feishuUserId);
  if (!matched || matched.status !== "active") return null;
  return dbAdapter.markMysqlUserLogin(feishuUserId, name);
}

function requireApiRole(request, response, role) {
  const session = readSession(request);
  if (roleAllowed(session, role)) return session;
  sendJson(response, session ? 403 : 401, { error: session ? "权限不足：当前账号没有 " + role + " 权限，请重新登录或检查 admin_users 表。" : "未登录" });
  return null;
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const sampleDraftCases = [
  {
    id: "draft-fraud-scholarship-001",
    reviewStatus: "draft",
    safetyType: "反诈骗",
    campusScene: "奖学金申报",
    title: "假冒奖学金申报入口的信息收集",
    subtitle: "补录材料，逾期视为放弃？",
    sceneClass: "scene-task",
    sourceName: "南开保卫处与公安机关公开反诈提醒综合改编",
    sourceUrl: "https://guard.nankai.edu.cn/",
    sourceDate: "2026-07-19",
    desensitization: "待完善：需确认是否已经去除真实学院、姓名、账号、链接和联系方式。",
    actor: "小林",
    peer: "同学",
    authority: "辅导员、学院官网或保卫处",
    hook: "班级群里有人转发奖学金补录链接，要求填写身份证、银行卡和验证码。",
    firstLure: "页面写着名额即将关闭，填完即可优先审核。",
    escalation: "对方继续索要验证码，并提醒不要重复提交以免影响资格。",
    pressure: "限时、资格取消、补录名额等话术制造紧迫感。",
    riskyChoice: "直接填写个人信息和验证码。",
    safeChoice: "关闭链接，通过学院官网或辅导员核实。",
    helperAction: "提醒先核验官方入口，协助保存链接截图并上报。",
    wrongHelp: "只转发给更多同学提醒大家赶紧填。",
    warningSigns: ["非官方链接", "索要银行卡", "索要验证码", "限时资格威胁"],
    safeActions: ["从官网入口办理", "验证码不外泄", "向学院或保卫处核实", "保存证据"]
  },
  {
    id: "draft-security-lost-item-001",
    reviewStatus: "draft",
    safetyType: "治安安全",
    campusScene: "物品遗失",
    title: "图书馆座位上的无人看管物品",
    subtitle: "只是离开十分钟？",
    sceneClass: "scene-security",
    sourceName: "南开保卫处校园治安安全提醒综合改编",
    sourceUrl: "https://guard.nankai.edu.cn/",
    sourceDate: "2026-07-19",
    desensitization: "待完善：需确认不包含真实馆区、座位号、失主身份和监控信息。",
    actor: "小文",
    peer: "朋友",
    authority: "图书馆服务台或保卫处",
    hook: "同学在图书馆用电脑和证件占座，离开很久没有返回。",
    firstLure: "大家都这样做，短时间离开似乎没问题。",
    escalation: "贵重物品长时间无人看管，周围人员流动频繁。",
    pressure: "当事人觉得带走电脑麻烦，也担心座位被占。",
    riskyChoice: "继续把物品留在原位。",
    safeChoice: "随身带走贵重物品，必要时请服务台协助。",
    helperAction: "提醒朋友收好贵重物品，并告知遗失后应及时联系服务台和保卫处。",
    wrongHelp: "帮朋友继续看包但自己也离开。",
    warningSigns: ["贵重物品无人看管", "人员流动大", "证件暴露", "长时间离开"],
    safeActions: ["贵重物品随身带走", "不使用证件占座", "发现遗失及时上报", "联系服务台"]
  }
];


const duplicateThreshold = 0.55;
const collectionScheduleText = "每天 00:00 自动采集，编辑员可手动立即采集；每天 09:00 自动发送待办提醒";

function chinaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function chinaDateKey(date = new Date()) {
  const parts = chinaDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function chinaDateTimeLabel(date = new Date()) {
  const parts = chinaDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function nextChinaMidnightDate(fromDate = new Date()) {
  const parts = chinaDateParts(fromDate);
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, 0, 0, 0) - 8 * 60 * 60 * 1000);
}

function nextChinaNineDate(fromDate = new Date()) {
  const parts = chinaDateParts(fromDate);
  let nextRun = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 9, 0, 0) - 8 * 60 * 60 * 1000);
  if (nextRun.getTime() <= fromDate.getTime()) {
    nextRun = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, 9, 0, 0) - 8 * 60 * 60 * 1000);
  }
  return nextRun;
}

function caseComparableText(item) {
  return [
    item.title,
    item.title,
    item.subtitle,
    item.safetyType,
    item.campusScene,
    item.campusScene,
    item.hook,
    item.hook,
    item.firstLure,
    item.escalation,
    item.escalation,
    ...(item.warningSigns || []),
    ...(item.safeActions || [])
  ].filter(Boolean).join(" ");
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/https?:\/\/\S+/g, "").replace(/[\s\p{P}\p{S}]+/gu, "");
}

function bigrams(value) {
  const text = normalizeText(value);
  if (!text) return new Set();
  if (text.length === 1) return new Set([text]);
  const result = new Set();
  for (let index = 0; index < text.length - 1; index += 1) result.add(text.slice(index, index + 2));
  return result;
}

function similarityScore(a, b) {
  const left = bigrams(caseComparableText(a));
  const right = bigrams(caseComparableText(b));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return Number((intersection / union).toFixed(4));
}

function findDuplicateCase(candidate, cases) {
  const sameUrl = cases.find((item) => candidate.sourceUrl && item.sourceUrl === candidate.sourceUrl);
  if (sameUrl) return { score: 1, case: sameUrl, reason: "same-source-url" };
  const scopedCases = cases.filter((item) => {
    const sameType = candidate.safetyType && item.safetyType === candidate.safetyType;
    const sameScene = candidate.campusScene && item.campusScene === candidate.campusScene;
    return sameType || sameScene;
  });
  const pool = scopedCases.length ? scopedCases : cases;
  let best = { score: 0, case: null, reason: "text-similarity" };
  for (const item of pool) {
    const score = similarityScore(candidate, item);
    if (score > best.score) best = { score, case: item, reason: "text-similarity" };
  }
  return best;
}

function slugifyCaseId(item) {
  const seed = [item.safetyType, item.campusScene, item.title, item.sourceUrl, Date.now(), Math.random()].filter(Boolean).join("-");
  const hash = require("crypto").createHash("sha1").update(seed).digest("hex").slice(0, 12);
  return `case-${Date.now().toString(36)}-${hash}`;
}

function inferSafetyType(text) {
  const value = String(text || "");
  if (/诈骗|反诈|刷单|中奖|银行卡|转账|冒充|钓鱼/.test(value)) return "反诈骗";
  if (/消防|火灾|宿舍用电|违规电器|逃生|通道/.test(value)) return "消防安全";
  if (/交通|电动车|骑行|充电|校门|车辆/.test(value)) return "交通安全";
  if (/治安|夜间|尾随|遗失|盗窃|陌生人/.test(value)) return "治安安全";
  if (/实验室|化学品|废液|仪器|试剂/.test(value)) return "实验室安全";
  if (/网络|密码|验证码|邮件|账号|信息安全/.test(value)) return "网络安全";
  return "";
}

function inferCampusScene(text) {
  const value = String(text || "");
  const scenes = ["兼职刷单", "冒充老师", "奖学金申报", "二手交易", "账号盗用借钱", "宿舍用电", "实验室操作", "逃生通道", "违规电器", "校园骑行", "电动车充电", "校门口通行", "夜间出行", "陌生人尾随", "物品遗失", "化学品使用", "仪器操作", "废液处理", "钓鱼链接", "账号密码", "验证码泄露"];
  return scenes.find((scene) => value.includes(scene)) || "待分类情景";
}

function stripTags(value) {
  return String(value || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function absoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href;
  } catch (error) {
    return "";
  }
}

function extractCandidateLinks(html, source) {
  const candidates = [];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkPattern.exec(html))) {
    const url = absoluteUrl(match[1], source.url);
    const title = stripTags(match[2]);
    const combined = `${title} ${url}`;
    const safetyType = inferSafetyType(combined);
    if (!url || !title || !safetyType) continue;
    candidates.push({
      sourceName: source.name,
      sourceUrl: url,
      sourceDate: new Date().toISOString().slice(0, 10),
      safetyType,
      campusScene: inferCampusScene(combined),
      title,
      subtitle: "官方来源自动采集",
      hook: `官方来源提到“${title}”，需由编辑员整理为校园安全情景。`,
      escalation: "待编辑员补充风险升级过程。",
      warningSigns: ["官方来源提示风险", "需进一步提炼风险信号", "需完成信息脱敏"],
      safeActions: ["查看官方来源", "完成信息脱敏", "补充处置建议"]
    });
  }
  return candidates.slice(0, 12);
}

async function intakeCandidate(database, candidate) {
  const today = new Date().toISOString().slice(0, 10);
  const item = {
    id: candidate.id || slugifyCaseId(candidate),
    reviewStatus: "draft",
    sourceType: candidate.sourceType || "official",
    sourceAuthority: candidate.sourceAuthority || (/nankai\.edu\.cn/.test(candidate.sourceUrl || "") ? "nankai" : "public-authority"),
    sourceName: candidate.sourceName || "",
    sourceUrl: candidate.sourceUrl || "",
    sourceDate: candidate.sourceDate || today,
    collectedAt: today,
    safetyType: candidate.safetyType || "",
    campusScene: candidate.campusScene || "待分类情景",
    title: candidate.title || "待整理案例",
    subtitle: candidate.subtitle || "",
    sceneClass: candidate.sceneClass || "scene-task",
    desensitization: candidate.desensitization || "待完善：需由编辑员完成信息脱敏说明。",
    actor: candidate.actor || "同学",
    peer: candidate.peer || "同学",
    authority: candidate.authority || "学校相关部门",
    hook: candidate.hook || "",
    firstLure: candidate.firstLure || "",
    escalation: candidate.escalation || "",
    pressure: candidate.pressure || "",
    riskyChoice: candidate.riskyChoice || "",
    safeChoice: candidate.safeChoice || "",
    helperAction: candidate.helperAction || "",
    wrongHelp: candidate.wrongHelp || "",
    warningSigns: Array.isArray(candidate.warningSigns) ? candidate.warningSigns : [],
    safeActions: Array.isArray(candidate.safeActions) ? candidate.safeActions : []
  };
  const duplicate = findDuplicateCase(item, database.cases || []);
  item.duplicateCheck = {
    status: duplicate.score >= duplicateThreshold ? "duplicate" : "unique",
    score: duplicate.score,
    matchedCaseId: duplicate.case ? duplicate.case.id : "",
    reason: duplicate.reason || "text-similarity",
    checkedAt: today
  };
  const requiredReady = Boolean(item.sourceName && item.sourceUrl && item.title && item.hook && item.safetyType && item.campusScene);
  if (item.duplicateCheck.status === "duplicate") return { status: "duplicate", case: item };
  if (!requiredReady) return { status: "invalid", case: item };
  database.cases.push(item);
  return { status: "created", case: item };
}

async function fetchWithTimeout(url, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function collectionState(lastRun = null) {
  const nextRunAt = nextChinaMidnightDate();
  return {
    lastRun,
    schedule: collectionScheduleText,
    timezone: "Asia/Shanghai",
    nextRunAt: nextRunAt.toISOString(),
    nextRunAtText: chinaDateTimeLabel(nextRunAt)
  };
}

function cn(values) {
  return values.map((code) => String.fromCharCode(code)).join("");
}

const notifyText = {
  editorTodoTitle: cn([12304,21335,24320,23433,20840,21355,22763,12305,24453,32534,36753,25552,37266]),
  reviewerTodoTitle: cn([12304,21335,24320,23433,20840,21355,22763,12305,24453,23457,26680,25552,37266]),
  editorTodoLabel: cn([24453,32534,36753]),
  reviewerTodoLabel: cn([24453,23457,26680]),
  itemUnit: cn([26465]),
  editorAction: cn([35831,32534,36753,21592,36827,20837,31995,32479,22788,29702,12290]),
  reviewerAction: cn([35831,23457,26680,21592,36827,20837,31995,32479,22788,29702,12290]),
  linkLabel: cn([38142,25509])
};

function feishuNotificationWebhookUrl(role) {
  if (role === "reviewer") return process.env.FEISHU_REVIEWER_WEBHOOK_URL || process.env.FEISHU_EDITOR_WEBHOOK_URL || "";
  return process.env.FEISHU_EDITOR_WEBHOOK_URL || "";
}

function feishuNotificationSecret(role) {
  if (role === "reviewer") return process.env.FEISHU_REVIEWER_WEBHOOK_SECRET || process.env.FEISHU_EDITOR_WEBHOOK_SECRET || process.env.FEISHU_WEBHOOK_SECRET || "";
  return process.env.FEISHU_EDITOR_WEBHOOK_SECRET || process.env.FEISHU_WEBHOOK_SECRET || "";
}

function feishuWebhookPayload(role, title, message) {
  const payload = { msg_type: "text", content: { text: title + "\n" + message } };
  const secret = feishuNotificationSecret(role);
  if (!secret) return payload;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  payload.timestamp = timestamp;
  payload.sign = crypto.createHmac("sha256", timestamp + "\n" + secret).digest("base64");
  return payload;
}

async function sendFeishuRoleNotification(targetRole, title, message) {
  const webhookUrl = feishuNotificationWebhookUrl(targetRole);
  if (!webhookUrl) return { webhookStatus: "not_configured", webhookResponse: "" };
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(feishuWebhookPayload(targetRole, title, message))
    });
    const text = await response.text();
    let feishuOk = response.ok;
    try {
      const data = JSON.parse(text);
      if (typeof data.code === "number" && data.code !== 0) feishuOk = false;
    } catch (error) {}
    return { webhookStatus: feishuOk ? "sent" : "failed", webhookResponse: text.slice(0, 500), sentAt: feishuOk ? chinaDateTimeLabel(new Date()) : "" };
  } catch (error) {
    return { webhookStatus: "failed", webhookResponse: error.message };
  }
}

async function createNotificationLog(targetRole, title, message, triggerType, relatedStateKey) {
  const dedupeKey = [targetRole, triggerType || "system", relatedStateKey || "", title].join("|");
  const now = Date.now();
  const lastSentAt = notificationDedupes.get(dedupeKey) || 0;
  if (now - lastSentAt < 10 * 60 * 1000) {
    return { targetRole, title, message, triggerType: triggerType || "system", relatedStateKey: relatedStateKey || "", status: "skipped_duplicate", webhookStatus: "skipped_duplicate", webhookResponse: "duplicate notification suppressed", createdAt: chinaDateTimeLabel(new Date()), sentAt: "" };
  }
  notificationDedupes.set(dedupeKey, now);
  const webhookResult = await sendFeishuRoleNotification(targetRole, title, message);
  const log = {
    targetRole,
    title,
    message,
    triggerType: triggerType || "system",
    relatedStateKey: relatedStateKey || "",
    status: "unread",
    webhookStatus: webhookResult.webhookStatus,
    webhookResponse: webhookResult.webhookResponse,
    createdAt: chinaDateTimeLabel(new Date()),
    sentAt: webhookResult.sentAt || ""
  };
  if (dbAdapter.mysqlEnabled()) dbAdapter.insertMysqlNotificationLog(log);
  return log;
}

function roleTodoCounts() {
  const database = readDatabase();
  const cases = database.cases || [];
  return {
    editor: cases.filter((item) => ["draft", "revision"].includes(normalizeStatus(item.reviewStatus))).length,
    reviewer: cases.filter((item) => normalizeStatus(item.reviewStatus) === "review").length
  };
}

function roleTodoUrl(targetRole) {
  return publicBaseUrl() + (targetRole === "reviewer" ? "/reviewer.html" : "/editor.html");
}

async function createRoleTodoNotification(targetRole, triggerType, relatedStateKey) {
  const counts = roleTodoCounts();
  const count = counts[targetRole] || 0;
  if (count <= 0) return null;
  const isReviewer = targetRole === "reviewer";
  const title = isReviewer ? notifyText.reviewerTodoTitle : notifyText.editorTodoTitle;
  const label = isReviewer ? notifyText.reviewerTodoLabel : notifyText.editorTodoLabel;
  const action = isReviewer ? notifyText.reviewerAction : notifyText.editorAction;
  const message = label + ": " + count + " " + notifyText.itemUnit + "\n" + action + "\n" + notifyText.linkLabel + ": " + roleTodoUrl(targetRole);
  return createNotificationLog(targetRole, title, message, triggerType, relatedStateKey);
}

async function createCollectionNotification(run) {
  const shouldNotify = (run.created || 0) > 0 || (run.errors || []).length > 0;
  if (!shouldNotify) return null;
  return createRoleTodoNotification("editor", run.trigger || "collection", "collection");
}

async function createWorkflowNotification(targetStatus, item) {
  if (targetStatus === "review") {
    return createRoleTodoNotification("reviewer", "submit_review", item.id);
  }
  if (targetStatus === "revision") {
    return createRoleTodoNotification("editor", "return_revision", item.id);
  }
  return null;
}

async function createDailyTodoNotifications() {
  const results = [];
  const counts = roleTodoCounts();
  if (counts.editor > 0) results.push(await createRoleTodoNotification("editor", "daily_todo", chinaDateKey()));
  if (counts.reviewer > 0) results.push(await createRoleTodoNotification("reviewer", "daily_todo", chinaDateKey()));
  return results;
}
async function runAutoCollection(trigger = "manual") {
  const database = readDatabase();
  const today = chinaDateKey();
  const started = new Date();
  const run = {
    date: today,
    trigger,
    startedAt: started.toISOString(),
    startedAtText: chinaDateTimeLabel(started),
    scanned: 0,
    created: 0,
    duplicate: 0,
    invalid: 0,
    sourceCount: 0,
    sources: [],
    errors: []
  };
  const sources = database.sourcePool || [];
  for (const source of sources) {
    const sourceRun = { name: source.name, url: source.url, scanned: 0, created: 0, duplicate: 0, invalid: 0, error: "" };
    try {
      const response = await fetchWithTimeout(source.url);
      const html = await response.text();
      const candidates = extractCandidateLinks(html, source);
      sourceRun.scanned = candidates.length;
      run.scanned += candidates.length;
      for (const candidate of candidates) {
        const result = await intakeCandidate(database, candidate);
        if (result.status === "created") { run.created += 1; sourceRun.created += 1; }
        if (result.status === "duplicate") { run.duplicate += 1; sourceRun.duplicate += 1; }
        if (result.status === "invalid") { run.invalid += 1; sourceRun.invalid += 1; }
      }
    } catch (error) {
      sourceRun.error = error.message;
      run.errors.push({ source: source.name, url: source.url, message: error.message });
    }
    run.sources.push(sourceRun);
  }
  run.sourceCount = sources.length;
  const finished = new Date();
  run.finishedAt = finished.toISOString();
  run.finishedAtText = chinaDateTimeLabel(finished);
  database.updatedAt = today;
  database.collection = collectionState(run);
  persistDatabase(database);
  run.notification = await createCollectionNotification(run);
  return run;
}

async function runDailyCollectionIfNeeded(trigger = "startup") {
  const database = readDatabase();
  const today = chinaDateKey();
  if (database.collection?.lastRun?.date === today) {
    database.collection = collectionState(database.collection.lastRun);
    persistDatabase(database);
    return database.collection.lastRun;
  }
  return runAutoCollection(trigger);
}

function scheduleMidnightCollection() {
  const nextRunAt = nextChinaMidnightDate();
  const delay = Math.max(1000, nextRunAt.getTime() - Date.now());
  setTimeout(async () => {
    try {
      await runAutoCollection("scheduled-midnight");
    } catch (error) {
      console.error("自动采集失败", error);
    } finally {
      scheduleMidnightCollection();
    }
  }, delay);
  return nextRunAt;
}

function scheduleNineTodoNotifications() {
  const nextRunAt = nextChinaNineDate();
  const delay = Math.max(1000, nextRunAt.getTime() - Date.now());
  setTimeout(async () => {
    try {
      await createDailyTodoNotifications();
    } catch (error) {
      console.error("每日待办提醒失败", error);
    } finally {
      scheduleNineTodoNotifications();
    }
  }, delay);
  return nextRunAt;
}
function normalizeStatus(status) {
  return { pending: "review", returned: "revision" }[status] || status || "draft";
}

function caseSubmissionFailures(item) {
  const isCleanDesensitization = Boolean(item.desensitization && !/(待审核|待完善|需由编辑员|真实姓名|手机号|身份证|银行卡号|学号\d+)/.test(item.desensitization));
  const isUsefulList = (items) => Array.isArray(items) && items.length >= 3 && !items.some((value) => /需进一步|需完成|补充|待完善/.test(String(value || "")));
  const failures = [];
  if (!/^https:\/\//.test(item.sourceUrl || "")) failures.push("来源链接需要使用 https 官网或权威来源");
  if (!isCleanDesensitization) failures.push("需要填写明确的脱敏说明");
  if (!item.safetyType || !item.campusScene || item.campusScene === "待分类情景") failures.push("需要选择安全类型和具体校园情景");
  if (!isUsefulList(item.warningSigns)) failures.push("风险信号至少 3 条，且不能是模板句");
  if (!isUsefulList(item.safeActions)) failures.push("安全动作至少 3 条，且需要可执行");
  return failures;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function seedDatabaseFromJson() {
  const existing = readJson(dbPath, null);
  if (existing && Array.isArray(existing.cases)) return existing;
  const seed = readJson(seedPath, { sourcePool: [], cases: [] });
  const ids = new Set((seed.cases || []).map((item) => item.id));
  const cases = [
    ...(seed.cases || []).map((item) => ({ ...item, reviewStatus: normalizeStatus(item.reviewStatus) })),
    ...sampleDraftCases.filter((item) => !ids.has(item.id))
  ];
  return {
    schemaVersion: "2026-07-campus-safety-db-v1",
    updatedAt: new Date().toISOString().slice(0, 10),
    sourcePool: seed.sourcePool || [],
    cases
  };
}

function ensureDatabase() {
  const seed = seedDatabaseFromJson();
  if (dbAdapter.mysqlEnabled()) {
    dbAdapter.ensureMysqlSeed(seed);
    return;
  }
  if (!fs.existsSync(dbPath)) writeJson(dbPath, seed);
}

function normalizeDatabase(database) {
  database.cases = (database.cases || []).map((item) => ({ ...item, reviewStatus: normalizeStatus(item.reviewStatus) }));
  database.sourcePool = database.sourcePool || [];
  return database;
}

function readDatabase() {
  ensureDatabase();
  if (dbAdapter.mysqlEnabled()) return normalizeDatabase(dbAdapter.readMysqlDatabase(seedDatabaseFromJson()));
  return normalizeDatabase(readJson(dbPath, { sourcePool: [], cases: [] }));
}

function persistDatabase(database) {
  if (dbAdapter.mysqlEnabled()) dbAdapter.writeMysqlDatabase(database);
  else writeJson(dbPath, database);
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) request.destroy();
    });
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
    request.on("error", reject);
  });
}

async function handleApi(request, response, url) {

  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const session = readSession(request);
    sendJson(response, session ? 200 : 401, session ? { user: session } : { error: "未登录" });
    return true;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Set-Cookie": "nsg_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" });
    response.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (url.pathname === "/api/auth/login" && request.method === "GET") {
    const role = url.searchParams.get("role") || "reviewer";
    const next = url.searchParams.get("next") || (role === "editor" ? "/editor.html" : role === "student" ? "/knowledge.html" : "/reviewer.html");
    const loginUrl = authLoginUrl(role, next);
    if (!loginUrl) {
      sendAuthError(response, 503, "飞书登录未配置", "请在 .env 中填写 FEISHU_APP_ID、FEISHU_APP_SECRET、PUBLIC_BASE_URL，并在飞书开放平台配置回调地址。需要配置的回调地址是：" + feishuAuthConfig().redirectUri);
      return true;
    }
    redirect(response, loginUrl);
    return true;
  }

  if (url.pathname === "/api/auth/callback" && request.method === "GET") {
    try {
      if (url.searchParams.get("error")) throw new Error("飞书授权被取消");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const saved = state ? oauthStates.get(state) : null;
      if (!code || !saved || Date.now() - saved.createdAt > 5 * 60 * 1000) throw new Error("登录状态已过期，请重新登录");
      oauthStates.delete(state);
      const feishuUser = await exchangeFeishuCode(code);
      const localUser = await feishuUserToLocalUser(feishuUser, saved.role);
      if (!localUser) {
        const feishuId = feishuUser.open_id || feishuUser.union_id || feishuUser.user_id || "未知";
        sendAuthError(response, 403, "无访问权限", "当前飞书账号未加入后台用户表，飞书用户 ID：" + feishuId + "。请管理员在 admin_users 表中配置该 ID 和角色。");
        return true;
      }
      if (!roleAllowed(localUser, saved.role)) {
        sendAuthError(response, 403, "角色权限不足", "当前账号角色为 " + localUser.role + "，不能访问该工作台。");
        return true;
      }
      const cookie = "nsg_session=" + encodeURIComponent(makeSessionCookie(localUser)) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200";
      redirect(response, saved.next || "/reviewer.html", [cookie]);
      return true;
    } catch (error) {
      sendAuthError(response, 500, "飞书登录失败", error.message);
      return true;
    }
  }
  if (url.pathname === "/api/learning/progress" && request.method === "GET") {
    const session = requireApiRole(request, response, "student");
    if (!session) return true;
    const database = readDatabase();
    const records = (database.learningRecords || []).filter((item) => item.studentFeishuUserId === session.feishuUserId);
    sendJson(response, 200, { user: session, records });
    return true;
  }

  if (url.pathname === "/api/learning/complete" && request.method === "POST") {
    const session = requireApiRole(request, response, "student");
    if (!session) return true;
    const body = await readRequestBody(request);
    const caseId = String(body.caseId || "").trim();
    if (!caseId) {
      sendJson(response, 422, { error: "Missing case ID" });
      return true;
    }
    dbAdapter.insertMysqlLearningRecord({
      studentFeishuUserId: session.feishuUserId,
      caseId,
      scenarioTitle: body.scenarioTitle || "",
      role: body.role || "",
      endingKey: body.endingKey || "completed"
    });
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/notifications" && request.method === "GET") {
    const targetRole = url.searchParams.get("role") || "editor";
    if (!["editor", "reviewer"].includes(targetRole)) {
      sendJson(response, 422, { error: "invalid role" });
      return true;
    }
    if (!requireApiRole(request, response, targetRole)) return true;
    if (!dbAdapter.mysqlEnabled()) {
      sendJson(response, 200, { notifications: [] });
      return true;
    }
    const notifications = dbAdapter.readMysqlNotificationLogs(50).filter((item) => item.targetRole === targetRole);
    sendJson(response, 200, { notifications });
    return true;
  }
  if (url.pathname === "/api/collection/status" && request.method === "GET") {
    if (!requireApiRole(request, response, "any")) return true;
    const database = readDatabase();
    sendJson(response, 200, database.collection || collectionState());
    return true;
  }

  if (url.pathname === "/api/collection/run" && request.method === "POST") {
    if (!requireApiRole(request, response, "editor")) return true;
    const run = await runAutoCollection("manual");
    sendJson(response, 200, { run });
    return true;
  }

  if (url.pathname === "/api/cases/intake" && request.method === "POST") {
    if (!requireApiRole(request, response, "editor")) return true;
    const database = readDatabase();
    const body = await readRequestBody(request);
    const result = await intakeCandidate(database, body);
    database.updatedAt = new Date().toISOString().slice(0, 10);
    if (result.status === "created") persistDatabase(database);
    if (result.status === "duplicate") {
      sendJson(response, 200, { duplicate: true, skipped: true, matchedCase: database.cases.find((item) => item.id === result.case.duplicateCheck.matchedCaseId), duplicateCheck: result.case.duplicateCheck });
      return true;
    }
    if (result.status === "invalid") {
      sendJson(response, 422, { duplicate: false, skipped: true, error: "采集字段不足", duplicateCheck: result.case.duplicateCheck });
      return true;
    }
    sendJson(response, 201, { duplicate: false, case: result.case, database });
    return true;
  }
  if (url.pathname === "/api/cases" && request.method === "GET") {
    if (!requireApiRole(request, response, "any")) return true;
    const database = readDatabase();
    const status = url.searchParams.get("status");
    const cases = status ? database.cases.filter((item) => normalizeStatus(item.reviewStatus) === status) : database.cases;
    sendJson(response, 200, { ...database, cases });
    return true;
  }


  const submitMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/submit$/);
  if (submitMatch && request.method === "POST") {
    if (!requireApiRole(request, response, "editor")) return true;
    const database = readDatabase();
    const body = await readRequestBody(request);
    const id = decodeURIComponent(submitMatch[1]);
    const item = database.cases.find((caseItem) => caseItem.id === id);
    if (!item) {
      sendJson(response, 404, { error: "案例不存在" });
      return true;
    }
    const editableFields = [
      "safetyType",
      "campusScene",
      "title",
      "subtitle",
      "sourceName",
      "sourceUrl",
      "sourceDate",
      "desensitization",
      "hook",
      "escalation",
      "warningSigns",
      "safeActions"
    ];
    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) item[field] = body[field];
    }
    const failures = caseSubmissionFailures(item);
    if (failures.length) {
      item.updatedAt = new Date().toISOString().slice(0, 10);
      database.updatedAt = item.updatedAt;
      persistDatabase(database);
      sendJson(response, 422, { error: "整理要求未满足", failures, case: item, database });
      return true;
    }
    const previousStatus = normalizeStatus(item.reviewStatus);
    item.reviewStatus = "review";
    item.reviewNote = body.reviewNote || item.reviewNote || "";
    item.updatedAt = new Date().toISOString().slice(0, 10);
    item.reviewedAt = item.updatedAt;
    database.updatedAt = item.updatedAt;
    persistDatabase(database);
    const notification = previousStatus === "review" ? null : await createWorkflowNotification(item.reviewStatus, item);
    sendJson(response, 200, { case: item, database, notification, statusChanged: previousStatus !== "review" });
    return true;
  }

  const updateMatch = url.pathname.match(/^\/api\/cases\/([^/]+)$/);
  if (updateMatch && request.method === "PATCH") {
    if (!requireApiRole(request, response, "editor")) return true;
    const database = readDatabase();
    const body = await readRequestBody(request);
    const id = decodeURIComponent(updateMatch[1]);
    const item = database.cases.find((caseItem) => caseItem.id === id);
    if (!item) {
      sendJson(response, 404, { error: "案例不存在" });
      return true;
    }
    const editableFields = [
      "safetyType",
      "campusScene",
      "title",
      "subtitle",
      "sourceName",
      "sourceUrl",
      "sourceDate",
      "desensitization",
      "hook",
      "escalation",
      "warningSigns",
      "safeActions"
    ];
    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) item[field] = body[field];
    }
    item.updatedAt = new Date().toISOString().slice(0, 10);
    database.updatedAt = item.updatedAt;
    persistDatabase(database);
    sendJson(response, 200, { case: item, database });
    return true;
  }
  const statusMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/status$/);
  if (statusMatch && request.method === "PATCH") {
    const body = await readRequestBody(request);
    const targetStatus = normalizeStatus(body.reviewStatus);
    const requiredRole = targetStatus === "review" ? "editor" : "reviewer";
    if (!requireApiRole(request, response, requiredRole)) return true;
    const database = readDatabase();
    const id = decodeURIComponent(statusMatch[1]);
    const item = database.cases.find((caseItem) => caseItem.id === id);
    if (!item) {
      sendJson(response, 404, { error: "案例不存在" });
      return true;
    }
    const previousStatus = normalizeStatus(item.reviewStatus);
    item.reviewStatus = targetStatus;
    item.reviewNote = body.reviewNote || item.reviewNote || "";
    item.reviewedAt = new Date().toISOString().slice(0, 10);
    database.updatedAt = item.reviewedAt;
    persistDatabase(database);
    const notification = previousStatus === targetStatus ? null : await createWorkflowNotification(item.reviewStatus, item);
    sendJson(response, 200, { case: item, database, notification, statusChanged: previousStatus !== targetStatus });
    return true;
  }

  return false;
}

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("文件不存在");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = { "Content-Type": types[ext] || "application/octet-stream" };
    if ([".html", ".js", ".css"].includes(ext)) headers["Cache-Control"] = "no-store";
    response.writeHead(200, headers);
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (requestUrl.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, requestUrl);
      if (!handled) sendJson(response, 404, { error: "接口不存在" });
      return;
    }

    const urlPath = decodeURIComponent(requestUrl.pathname);
    const safePath = path.normalize(urlPath).replace(/\\/g, "/").replace(/^(\.\.[/\\])+/, "");
    const requestedPath = safePath === "/" ? "/index.html" : safePath;
    const requiredPageRole = protectedPages[requestedPath];
    if (authRequired() && requiredPageRole) {
      const session = readSession(request);
      if (!session) {
        const loginUrl = authLoginUrl(requiredPageRole, requestedPath);
        if (!loginUrl) {
          sendAuthError(response, 503, "飞书登录未配置", "请在 .env 中填写 FEISHU_APP_ID、FEISHU_APP_SECRET、PUBLIC_BASE_URL，并在飞书开放平台配置回调地址：" + feishuAuthConfig().redirectUri);
          return;
        }
        redirect(response, loginUrl);
        return;
      }
      if (requiredPageRole === "student" && !roleAllowed(session, "student")) {
        const loginUrl = authLoginUrl("student", requestedPath);
        if (!loginUrl) {
          sendAuthError(response, 503, "Feishu auth is not configured", "Please configure FEISHU_APP_ID, FEISHU_APP_SECRET and callback URL: " + feishuAuthConfig().redirectUri);
          return;
        }
        redirect(response, loginUrl);
        return;
      }
      if (requiredPageRole === "student" && roleAllowed(session, "student")) {
        dbAdapter.upsertMysqlStudent(session.feishuUserId, session.name || "Feishu user");
      }
      if (!roleAllowed(session, requiredPageRole)) {
        const loginUrl = authLoginUrl(requiredPageRole, requestedPath);
        if (loginUrl) {
          redirect(response, loginUrl);
          return;
        }
        sendAuthError(response, 403, "Role denied", "Current account cannot access this workspace.");
        return;
      }
    }
    const filePath = path.join(root, requestedPath);

    if (!filePath.startsWith(root)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("禁止访问");
      return;
    }

    sendFile(response, filePath);
  } catch (error) {
    sendJson(response, 500, { error: "服务器处理失败" });
  }
});

ensureDatabase();
runDailyCollectionIfNeeded("startup").catch((error) => console.error("启动补采失败", error));
const nextScheduledRun = scheduleMidnightCollection();
const nextTodoReminderRun = scheduleNineTodoNotifications();
server.listen(port, host, () => {
  console.log(`南开安全卫士已启动：http://localhost:${port}`);
  console.log(`后端案例库接口：http://localhost:${port}/api/cases`);
  console.log(`下一次自动采集：${chinaDateTimeLabel(nextScheduledRun)}`);
  console.log(`下一次待办提醒：${chinaDateTimeLabel(nextTodoReminderRun)}`);
});