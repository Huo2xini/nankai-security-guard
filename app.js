const tabs = document.querySelectorAll(".tab-button");
const panels = document.querySelectorAll(".tab-panel");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatWindow = document.querySelector("#chatWindow");
const reportForm = document.querySelector("#reportForm");
const reportTime = document.querySelector("#reportTime");
const toast = document.querySelector("#toast");
const callButton = document.querySelector("#callButton");
const quizProgress = document.querySelector("#quizProgress");
const quizScore = document.querySelector("#quizScore");
const quizQuestion = document.querySelector("#quizQuestion");
const quizOptions = document.querySelector("#quizOptions");
const quizFeedback = document.querySelector("#quizFeedback");
const nextQuestion = document.querySelector("#nextQuestion");

const answers = [
  { keys: ["电动车", "充电", "自行车"], text: "电动车应在指定区域停放和充电，不建议飞线充电、楼内充电或占用疏散通道。发现异常可通过隐患上报登记位置、照片和风险描述。" },
  { keys: ["诈骗", "反诈", "客服", "链接", "转账", "退款", "低价"], text: "遇到陌生链接、冒充客服、低价转让、刷单返利、中奖缴费等情况，不点击、不转账、不透露验证码。可保留聊天记录并向辅导员或保卫处咨询。" },
  { keys: ["公检法", "警察", "安全账户", "洗钱", "法院", "传票"], text: "凡是自称公检法并要求查账户、转到安全账户、远程配合调查的，都是高风险诈骗。正确做法是挂断电话，拨打 110、96110 或联系学校保卫部门核实。" },
  { keys: ["二维码", "QQ", "邮箱", "校园卡", "账号", "密码"], text: "收到带二维码或登录链接的通知时，不要直接输入账号密码。应通过学校官方渠道、学院辅导员或相关部门核实，发现异常及时提醒同学。" },
  { keys: ["银行卡", "验证码", "助学金", "实名认证", "短信"], text: "银行、助学金、补贴等通知如要求点击陌生链接、扫码、输入身份证号、银行卡号或短信验证码，应先通过官方电话核实。验证码不能告诉任何人。" },
  { keys: ["兼职", "家教", "招聘", "面试", "传销"], text: "寻找兼职或家教时，要核实招聘方身份，不轻信高薪广告，不去偏僻地点单独面试，行程告知同学或朋友，并警惕任何收费、押金或传销诱导。" },
  { keys: ["wifi", "WiFi", "无线", "公共网络"], text: "不要随意连接陌生免费 WiFi，尤其不要在未知网络中登录重要账号、输入密码或进行支付操作，避免个人信息被截获。" },
  { keys: ["消防", "火灾", "灭火器", "烟感", "疏散"], text: "消防通道和安全出口应保持畅通，灭火器、烟感、应急照明等设施如有缺失或损坏，应及时上报。灭火器压力表指针在绿色范围通常表示可使用。" },
  { keys: ["宿舍", "大功率", "电热毯", "充电宝", "电饭煲", "电炉"], text: "宿舍内不要使用违规大功率电器，不乱拉乱接电线，不把充电宝放在床上长时间充电，离开宿舍前应关闭电源，降低火灾风险。" },
  { keys: ["易燃", "易爆", "酒精", "汽油", "烟花", "爆竹"], text: "宿舍和教学楼内严禁存放易燃易爆物品，如大量打火机、烟花爆竹、酒精、汽油等。发现相关隐患可通过隐患上报登记。" },
  { keys: ["隐患", "上报", "流程"], text: "隐患上报建议填写隐患类型、地点、描述、图片、联系人、联系电话和紧急程度。正式版可写入飞书多维表格并同步处置状态。" },
];

const questionBank = [
  { question: "一个陌生人来到寝室，自称公寓管理服务中心老师，要收取每人 200 元宿舍押金。你应该怎么做？", options: ["配合其工作，向其交押金", "问辅导员或宿管核实，绝不能轻易交钱", "反正毕业会退，先交了再说", "主动帮他去收钱"], answer: 1, explain: "涉及收费时要先向辅导员、宿管或学校部门核实，不能轻易交钱。" },
  { question: "接到自称警察的电话，说你涉嫌违法，需要查账户并按电话指令操作。正确做法是？", options: ["按照对方指令执行", "挂断电话并报告学校保卫部门或报警", "向其提供账号密码", "立刻转到对方提供的安全账户"], answer: 1, explain: "公检法不会通过电话要求转账或提供账户密码。" },
  { question: "收到银行卡升级短信，需要点击链接完成实名认证，否则影响使用。正确做法是？", options: ["拨打银行官方咨询电话核实", "点开短信中的链接看看", "点击链接看看网站像不像真的", "赶紧按要求办理认证"], answer: 0, explain: "短信链接可能是钓鱼网站，应通过官方电话或官方 App 核实。" },
  { question: "校园火灾的常见起因包括哪些？", options: ["明火引燃", "乱拉乱接电线", "使用电器不当", "以上都包括"], answer: 3, explain: "明火、电线、电器和宿舍大功率电器都可能造成火灾风险。" },
  { question: "灭火器气压表指针在什么颜色范围内通常表示可使用？", options: ["红色", "绿色", "黄色", "任何颜色"], answer: 1, explain: "绿色范围通常表示灭火器压力正常。" },
  { question: "遇到陌生人要求扫码领取补贴或礼品，并让你填写银行卡号和验证码，正确做法是？", options: ["按要求填写", "只填写验证码", "拒绝填写并通过官方渠道核实", "让同学先试试"], answer: 2, explain: "银行卡号、验证码等敏感信息不能提供给陌生人。" },
  { question: "宿舍内发现有人使用违规大功率电器，比较合适的做法是？", options: ["提醒停止使用并向宿管或辅导员反映", "帮忙一起使用", "只要没起火就不用管", "拍照发到网上"], answer: 0, explain: "违规大功率电器容易引发火灾，应及时提醒并通过正规渠道处理。" },
  { question: "消防通道和安全出口应当保持什么状态？", options: ["可以临时堆放杂物", "保持畅通", "晚上可以锁闭", "只在检查时清理"], answer: 1, explain: "消防通道和安全出口必须保持畅通，不能占用、堵塞或锁闭。" },
  { question: "收到自称客服的电话，说订单异常需要退款，并要求你下载会议软件共享屏幕，正确做法是？", options: ["立即共享屏幕", "按对方提示转账", "挂断并通过官方平台核实", "把验证码告诉对方"], answer: 2, explain: "冒充客服退款是常见诈骗，不能共享屏幕或透露验证码。" },
  { question: "在校园内发现电动车飞线充电，应该怎么处理？", options: ["继续观察", "上报隐患并说明位置", "自己拔掉所有电线", "拍照嘲笑车主"], answer: 1, explain: "飞线充电存在火灾风险，应通过隐患上报说明位置和情况。" },
  { question: "公共 WiFi 环境下，哪种行为更安全？", options: ["登录网银并转账", "输入所有账号密码", "避免进行支付和重要账号登录", "关闭手机锁屏密码"], answer: 2, explain: "陌生公共网络可能存在信息泄露风险，应避免重要操作。" },
  { question: "实验室或宿舍发现酒精、汽油等易燃物品大量存放，正确做法是？", options: ["靠近闻一闻", "随意搬动", "及时提醒并报告相关管理人员", "放在阳光下晾晒"], answer: 2, explain: "易燃易爆物品应规范存放，发现隐患要及时报告。" },
  { question: "收到陌生邮件附件，标题写着考试答案或补助名单，正确做法是？", options: ["直接打开", "转发给同学", "核实来源，不随意点击附件或链接", "输入账号密码查看"], answer: 2, explain: "陌生附件和链接可能包含钓鱼或恶意程序，应先核实来源。" },
  { question: "遇到可疑人员在宿舍楼内推销、收费或索要个人信息，应该怎么办？", options: ["主动提供信息", "向宿管、辅导员或保卫部门反映", "帮他介绍同学", "不管不问"], answer: 1, explain: "宿舍楼内可疑推销和收费应及时向管理人员反映。" },
  { question: "隐患上报时，哪项信息最有助于后续处置？", options: ["只写很危险", "准确地点、隐患描述、照片和联系方式", "不写地点", "只选择紧急程度"], answer: 1, explain: "准确地点、描述、照片和联系方式有助于快速核实和处置。" }
];

const QUESTIONS_PER_ROUND = 5;
let quizQuestions = [];
let quizIndex = 0;
let quizPoints = 0;

function shuffleQuestions(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function startQuizRound() {
  quizQuestions = shuffleQuestions(questionBank).slice(0, QUESTIONS_PER_ROUND);
  quizIndex = 0;
  quizPoints = 0;
  renderQuiz();
}
let answered = false;
let quizFinished = false;

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchTab(target) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === target));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === target));
  document.querySelector(".workspace")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function getInitialTab() {
  const url = new URL(window.location.href);
  const explicitTab = url.searchParams.get("tab") || url.hash.replace("#", "");
  const pathTabMap = {
    "knowledge.html": "quiz",
    "report.html": "report",
    "help.html": "help",
  };
  const fileName = url.pathname.split("/").pop();
  const defaultTab = document.body.dataset.defaultTab;
  return explicitTab || pathTabMap[fileName] || defaultTab || "chat";
}

function addMessage(role, text) {
  if (!chatWindow) return;
  const message = document.createElement("article");
  message.className = `message ${role}`;
  message.innerHTML = `<span>${role === "user" ? "我" : "南开安全卫士"}</span><p></p>`;
  message.querySelector("p").textContent = text;
  chatWindow.append(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function getAnswer(question) {
  const normalized = question.trim().toLowerCase();
  const matched = answers.find((item) => item.keys.some((key) => normalized.includes(key.toLowerCase())));
  if (matched) return matched.text;
  return "我已收到你的问题。系统将根据南开安全制度、题库和案例库持续完善回答内容。";
}

function fillChat(text) {
  switchTab("chat");
  if (!chatInput) return;
  chatInput.value = text;
  chatInput.focus();
}

function renderQuiz() {
  const current = quizQuestions[quizIndex];
  answered = false;
  quizFinished = false;
  quizProgress.textContent = `第 ${quizIndex + 1} / ${quizQuestions.length} 题`;
  quizScore.textContent = `得分 ${quizPoints}`;
  quizQuestion.textContent = current.question;
  quizFeedback.textContent = "请选择一个答案。";
  nextQuestion.textContent = "下一题";
  quizOptions.innerHTML = "";

  current.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.type = "button";
    button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span><strong></strong>`;
    button.querySelector("strong").textContent = option;
    button.addEventListener("click", () => chooseAnswer(index));
    quizOptions.append(button);
  });
}

function renderQuizResult() {
  quizFinished = true;
  answered = true;
  quizProgress.textContent = "本轮完成";
  quizScore.textContent = `总分 ${quizPoints}`;
  quizQuestion.textContent = "本轮安全答题已完成";
  quizOptions.innerHTML = "";
  quizFeedback.textContent = `你已完成 ${quizQuestions.length} 道题，最终得分 ${quizPoints} 分。请继续保持安全意识，遇到可疑情况及时核实并联系学校相关部门。`;
  nextQuestion.textContent = "重新开始";
}

function chooseAnswer(index) {
  if (answered) return;
  answered = true;
  const current = quizQuestions[quizIndex];
  const optionButtons = quizOptions.querySelectorAll(".quiz-option");

  optionButtons.forEach((button, optionIndex) => {
    if (optionIndex === current.answer) button.classList.add("correct");
    if (optionIndex === index && optionIndex !== current.answer) button.classList.add("wrong");
  });

  if (index === current.answer) {
    quizPoints += 20;
    quizFeedback.textContent = `回答正确。${current.explain}`;
  } else {
    quizFeedback.textContent = `回答错误。${current.explain}`;
  }
  quizScore.textContent = `得分 ${quizPoints}`;
}

tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
document.querySelectorAll("[data-jump-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.jumpTab)));
document.querySelectorAll("[data-fill-chat]").forEach((button) => button.addEventListener("click", () => fillChat(button.dataset.fillChat)));

if (chatForm) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = chatInput.value.trim();
    if (!question) {
      showToast("请输入一个问题");
      return;
    }
    addMessage("user", question);
    chatInput.value = "";
    window.setTimeout(() => addMessage("bot", getAnswer(question)), 350);
  });
}

if (reportForm) {
  reportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("请打开飞书表单提交隐患信息");
  });
}

function isMobileDevice() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  const touchLikely = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua) || (touchLikely && window.innerWidth <= 820);
}

callButton.addEventListener("click", () => {
  const phoneNumber = "022-123456";
  if (isMobileDevice()) {
    window.location.href = `tel:${phoneNumber}`;
    return;
  }
  showToast(`请使用电话拨打 ${phoneNumber}`);
});

nextQuestion.addEventListener("click", () => {
  if (quizFinished) {
    startQuizRound();
    return;
  }

  if (!answered) {
    showToast("请先选择一个答案");
    return;
  }

  if (quizIndex === quizQuestions.length - 1) {
    renderQuizResult();
    return;
  }

  quizIndex += 1;
  renderQuiz();
});

if (reportTime) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  reportTime.value = now.toISOString().slice(0, 16);
}
startQuizRound();
switchTab(getInitialTab());









