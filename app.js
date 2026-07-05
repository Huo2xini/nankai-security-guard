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

const quizQuestions = [
  { question: "一个陌生人来到寝室，自称公寓管理服务中心老师，要收取每人 200 元宿舍押金。你应该怎么做？", options: ["配合其工作，向其交押金", "问辅导员或宿管核实，绝不能轻易交钱", "反正毕业会退，先交了再说", "主动帮他去收钱"], answer: 1, explain: "题库答案为 B。涉及收费时要先向辅导员、宿管或学校部门核实，不能轻易交钱。" },
  { question: "接到自称警察的电话，说你涉嫌违法，需要查账户并按电话指令操作。正确做法是？", options: ["按照对方指令执行", "挂断电话并报告学校保卫部门或报警", "向其提供账号密码", "立刻转到对方提供的安全账户"], answer: 1, explain: "题库答案为 B。公检法不会通过电话要求转账或提供账户密码。" },
  { question: "收到银行卡升级短信，需要点击链接完成实名认证，否则影响使用。正确做法是？", options: ["拨打银行官方咨询电话核实", "点开短信中的链接看看", "点击链接看看网站像不像真的", "赶紧按要求办理认证"], answer: 0, explain: "题库答案为 A。短信链接可能是钓鱼网站，应通过官方电话或官方 App 核实。" },
  { question: "校园火灾的常见起因包括哪些？", options: ["明火引燃", "乱拉乱接电线", "使用电器不当", "以上都包括"], answer: 3, explain: "题库答案为 ABCD。明火、电线、电器和宿舍大功率电器都可能造成火灾风险。" },
  { question: "灭火器气压表指针在什么颜色范围内通常表示可使用？", options: ["红色", "绿色", "黄色", "任何颜色"], answer: 1, explain: "题库答案为 B。绿色范围通常表示灭火器压力正常。" },
];

let quizIndex = 0;
let quizPoints = 0;
let answered = false;

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
    "knowledge.html": "chat",
    "report.html": "report",
    "help.html": "help",
  };
  const fileName = url.pathname.split("/").pop();
  const defaultTab = document.body.dataset.defaultTab;
  return explicitTab || pathTabMap[fileName] || defaultTab || "chat";
}

function addMessage(role, text) {
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
  return "我已收到你的问题。演示版会根据关键词模拟回答；正式版将接入南开安全制度、题库、案例库和飞书智能体知识库。";
}

function fillChat(text) {
  switchTab("chat");
  chatInput.value = text;
  chatInput.focus();
}

function renderQuiz() {
  const current = quizQuestions[quizIndex];
  answered = false;
  quizProgress.textContent = `第 ${quizIndex + 1} / ${quizQuestions.length} 题`;
  quizScore.textContent = `得分 ${quizPoints}`;
  quizQuestion.textContent = current.question;
  quizFeedback.textContent = "请选择一个答案。";
  nextQuestion.textContent = quizIndex === quizQuestions.length - 1 ? "重新开始" : "下一题";
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

reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("演示提交成功：当前未接入后台和飞书多维表格");
});

callButton.addEventListener("click", () => showToast("演示拨号：022-123456，当前不会真实拨出"));

nextQuestion.addEventListener("click", () => {
  if (quizIndex === quizQuestions.length - 1) {
    quizIndex = 0;
    quizPoints = 0;
  } else {
    quizIndex += 1;
  }
  renderQuiz();
});

const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
reportTime.value = now.toISOString().slice(0, 16);
renderQuiz();
switchTab(getInitialTab());

