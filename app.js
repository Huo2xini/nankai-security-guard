const tabs = document.querySelectorAll(".tab-button");
const featureCards = document.querySelectorAll(".feature-card[data-tab]");
const panels = document.querySelectorAll(".tab-panel");
const toast = document.querySelector("#toast");
const callButton = document.querySelector("#callButton");
const quizProgress = document.querySelector("#quizProgress");
const quizScore = document.querySelector("#quizScore");
const quizQuestion = document.querySelector("#quizQuestion");
const quizOptions = document.querySelector("#quizOptions");
const quizFeedback = document.querySelector("#quizFeedback");
const nextQuestion = document.querySelector("#nextQuestion");
const scenarioTabs = document.querySelector("#scenarioGallery");
const learningModeButtons = document.querySelectorAll(".learning-mode-button");
const learningSections = document.querySelectorAll(".learning-section");
const rolePicker = document.querySelector("#rolePicker");
const roleName = document.querySelector("#gameRoleName");
const roleScenarioTag = document.querySelector("#roleScenarioTag");
const scenarioTitle = document.querySelector("#gameTitle");
const scenarioBrief = document.querySelector("#gameBrief");
const simDialogue = document.querySelector("#storyBoard");
const simTask = document.querySelector("#thoughtPrompt");
const simActions = document.querySelector("#thoughtChoices");
const simFeedback = document.querySelector("#storyNote");
const storyGameStatus = document.querySelector("#gameStatus");
const storyGameCard = document.querySelector(".story-game-card");
const roleStage = document.querySelector("#roleStage");
const storyStage = document.querySelector("#storyStage");
const endingStage = document.querySelector("#endingStage");
const selectedScenePreview = document.querySelector("#selectedScenePreview");
const storyVisual = document.querySelector("#storyVisual");
const startStory = document.querySelector("#startStory");
const startOverStory = document.querySelector("#startOverStory");
const endingBadge = document.querySelector("#endingBadge");
const endingTitle = document.querySelector("#endingTitle");
const endingText = document.querySelector("#endingText");
const endingReport = document.querySelector("#endingReport");

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

const roleLabels = { experiencer: "体验者", helper: "帮助者", observer: "观察者" };

const fallbackScenarios = [
  {
    id: "task",
    label: "刷单返利诈骗",
    subtitle: "动动手指，日入五百",
    sceneClass: "scene-task",
    tag: "小额返利 · 大额套牢",
    brief: "大三学生小林想换手机，手头有点紧。她被拉进一个副业兼职群，群里不断有人晒返利截图。",
    roles: {
      experiencer: {
        start: "start",
        nodes: {
          start: {
            lines: [["群公告", "动动手指点赞，日入500不是梦！"], ["兼职派单员", "新人福利，首单无需垫付，完成点赞任务即可领取18.8元红包！"], ["你", "首单免费，看起来没什么风险。"]],
            prompt: "你盯着群里一张张返利截图，心里冒出一个念头。",
            thoughts: [["先试一单，反正不用垫钱。", "smallWin"], ["免费的也奇怪，我现在就退群。", "safeExit"]],
          },
          smallWin: {
            lines: [["系统", "你点赞后，真的收到了18.8元红包。"], ["你", "居然真的到账了。"], ["兼职派单员", "现在有进阶福利单，充值500返150，名额只有3个！"]],
            prompt: "第一次甜头让你放松了警惕。",
            thoughts: [["前面都返了，这次也应该没问题。", "bigWin"], ["我有点拿不准，先问问室友。", "askRoommate"]],
          },
          bigWin: {
            lines: [["系统", "你充值500元，对方返了650元。"], ["兼职派单员", "大额联单任务来了：充3000返900，但必须连续完成三单才能返款。"], ["你", "前两次都赚了，这一次金额突然变大。"]],
            prompt: "你开始被前面的成功经验推着往前走。",
            thoughts: [["咬牙充3000，做完就退出。", "frozen"], ["金额太大，先停下核实。", "safeAsk"]],
          },
          askRoommate: {
            lines: [["室友", "所有刷单返利都不可靠，刷单本身也有法律风险。别再转钱了。"], ["你", "你重新看群里的截图，发现大家说话像复制粘贴。"]],
            prompt: "你愿意听室友一句劝吗？",
            thoughts: [["听劝，退群并删除联系人。", "safeHelped"], ["别人可能太谨慎了，我再试一次。", "frozen"]],
          },
          frozen: {
            lines: [["兼职派单员", "系统卡单了，需要再充5000元解冻才能提现。"], ["你", "生活费已经转出去3000元，不充就像前面的钱都白扔了。"]],
            prompt: "沉没成本正在把你往更深处推。",
            thoughts: [["再充5000，把前面的钱拿回来。", "scammed"], ["意识到被骗，立刻报警并联系银行止损。", "lossStopped"]],
          },
        },
        endings: {
          safeExit: ["安全结局", "你及时退群，避开了刷单返利诈骗。", ["首单免费也是诱饵", "刷单返利本身就是高风险信号", "不被群内截图带节奏"]],
          safeHelped: ["安全结局", "你听取室友提醒，没有继续投入。", ["遇到不确定的赚钱机会先求助", "旁观者能帮你打断情绪冲动", "所有刷单都应远离"]],
          safeAsk: ["安全结局", "你在大额转账前暂停核实，成功避开套牢。", ["金额突然放大就是危险节点", "先核实再付款", "不要相信联单任务"]],
          lossStopped: ["止损结局", "你损失了3000元，但没有再充5000元，及时保留证据并报警。", ["不要为了追回损失继续转账", "保存聊天和转账记录", "尽快联系银行和警方"]],
          scammed: ["被骗结局", "对方继续以操作异常、账户冻结为由要钱，你最终被骗走一万多元。", ["小额返利是诱饵", "联单任务是套牢", "解冻费是继续收割"]],
        },
      },
      helper: {
        start: "start",
        nodes: {
          start: {
            lines: [["小林", "我前面转了3000，现在说系统卡了，得再转5000才能把钱拿回来。"], ["你", "她神情紧张，手机停在充值5000元解锁提现的页面。"]],
            prompt: "你要开口了，第一句话会影响她愿不愿意听你说。",
            thoughts: [["你傻啊！这明显是诈骗！", "failed"], ["先别急，我陪你一起看看。", "check"]],
          },
          check: {
            lines: [["你", "我们先看账户和聊天记录，不急着转。"], ["系统", "国家反诈中心提示：该账户为高风险诈骗账户。"], ["96110", "这是典型刷单诈骗，请立即停止转账并报警。"]],
            prompt: "小林稳定下来，下一步你怎么陪她处理？",
            thoughts: [["陪她去派出所，整理聊天记录和转账凭证。", "success"], ["报警太麻烦，算了就当买教训。", "partial"]],
          },
        },
        endings: {
          failed: ["劝阻失败", "小林觉得被否定，继续转账，最终被骗更多。", ["指责会激起逆反", "先稳定情绪再核实", "劝阻不是审判对方"]],
          success: ["成功帮助结局", "你陪小林报警并整理证据，避免她再损失5000元。", ["共情加行动最有效", "用官方工具共同核实", "证据越完整越利于处置"]],
          partial: ["部分帮助结局", "小林没有继续转账，但没有完成报警和复盘，下次仍可能中招。", ["止损后也要复盘", "帮助要走完证据和报警流程", "把一次经历变成长期免疫"]],
        },
      },
      observer: {
        start: "start",
        nodes: {
          start: { lines: [["旁白", "你正在观看刷单诈骗回放。"], ["阶段1", "微信群发布日入500广告，大量账号晒返利截图。"]], prompt: "第1阶段最明显的风险点是什么？", thoughts: [["高收益兼职和群内返利截图集中出现。", "trust"], ["群里人很多，所以应该可信。", "missedTrust"]] },
          trust: { lines: [["阶段2", "小林完成小额任务后秒收红包。"], ["旁白", "骗子先给小钱，建立信任。"]], prompt: "这里的策略是什么？", thoughts: [["小额返利建立信任。", "lock"], ["说明平台真的有实力。", "missedLock"]] },
          missedTrust: { lines: [["提示", "群内热闹可能是托，返利截图也可能伪造。"]], prompt: "重新标记风险点。", thoughts: [["高收益兼职和群内返利截图集中出现。", "trust"]] },
          lock: { lines: [["阶段3", "联单任务要求连续充值，必须做完才能返款。"]], prompt: "联单任务的核心陷阱是什么？", thoughts: [["利用沉没成本，让人不甘心放弃已投入的钱。", "report"], ["只是普通会员升级。", "missedLock"]] },
          missedLock: { lines: [["提示", "联单任务会把金额越滚越大，不是普通升级。"]], prompt: "重新判断联单任务。", thoughts: [["利用沉没成本，让人不甘心放弃已投入的钱。", "report"]] },
        },
        endings: { report: ["学习结局", "你完成刷单诈骗拆解，获得反诈观察员认证。", ["引流：高收益兼职", "取信：小额返利", "套牢：联单任务", "收割：卡单解冻"]] },
      },
    },
  },
  {
    id: "friend",
    label: "冒充熟人借钱",
    subtitle: "在吗？帮我转个账",
    sceneClass: "scene-friend",
    tag: "熟人关系 · 紧急施压",
    brief: "周四深夜，小周收到室友陈晨的QQ消息。对方说朋友车祸急需押金，还发来一张转账截图。",
    roles: {
      experiencer: {
        start: "start",
        nodes: {
          start: { lines: [["陈晨", "在吗？急事！我朋友出车祸了，急需3000元手术押金。"], ["陈晨", "我微信被限制支付，你先转一下，我马上用银行卡还你。"], ["系统", "对方发来一张银行转账截图。"]], prompt: "头像和语气都像室友，你准备怎么办？", thoughts: [["先转3000，救急要紧。", "moreMoney"], ["先打电话确认。", "safeCall"]] },
          moreMoney: { lines: [["系统", "你转了3000元。"], ["陈晨", "还差2000，能不能再帮一次？"], ["你", "这次金额又增加了。"]], prompt: "你脑中闪过一丝不对劲。", thoughts: [["再转2000，别耽误手术。", "scammed"], ["现在就给陈晨打电话。", "partialStop"]] },
        },
        endings: {
          safeCall: ["安全结局", "陈晨接电话说QQ被盗了，你成功避开诈骗。", ["熟人借钱也要二次核实", "电话或视频确认", "不要被截图替代真实到账"]],
          partialStop: ["部分止损结局", "你发现QQ被盗，虽然损失3000元，但避免了追加损失。", ["越催越要核实", "拒绝语音视频是红旗", "及时报警并保留证据"]],
          scammed: ["被骗结局", "对方收到钱后下线，你第二天才知道陈晨QQ被盗，损失5000元。", ["头像名字不能证明本人", "深夜急事会压缩判断时间", "PS截图不等于到账"]],
        },
      },
      helper: {
        start: "start",
        nodes: {
          start: { lines: [["小周", "陈晨出车祸了？他找我借钱，你看这聊天记录。"], ["你", "你发现对方拒绝视频，转账截图格式也怪怪的。"]], prompt: "你会怎么回应小周？", thoughts: [["别磨蹭了，陈晨平时对你多好，赶紧转吧。", "wrongHelp"], ["等一下，这截图有问题，为什么不接视频？", "call"]] },
          call: { lines: [["你", "我们直接给陈晨打电话。"], ["陈晨", "我QQ被盗了！千万别转！"]], prompt: "确认是诈骗后，你还能做什么？", thoughts: [["帮小周举报账号，并提醒班级群。", "success"], ["没被骗就好，让小周自己处理。", "partial"]] },
        },
        endings: {
          wrongHelp: ["错误帮助", "你的催促推了小周一把，他转账后发现被骗。", ["帮助者也可能放大风险", "不要用关系好替代核实", "先确认身份再谈转账"]],
          success: ["成功帮助结局", "你帮小周举报账号并提醒班级群，避免更多同学受害。", ["电话核实", "及时扩散预警", "保存证据并举报"]],
          partial: ["部分帮助结局", "小周没有被骗，但骗子可能继续骗其他同学。", ["止住一个人后要提醒群体", "账号被盗需举报", "把风险扩散阻断"]],
        },
      },
      observer: {
        start: "start",
        nodes: {
          start: { lines: [["回放", "骗子盗取陈晨QQ，查看备注和聊天记录。"], ["回放", "深夜十点半，用‘在吗？急事！’开场。"]], prompt: "为什么选择深夜发消息？", thoughts: [["利用时间压力，让人来不及核实。", "detail"], ["因为晚上朋友关系更亲密。", "hintTime"]] },
          hintTime: { lines: [["提示", "深夜不是亲密信号，而是压缩核实时间的手段。"]], prompt: "重新判断深夜消息。", thoughts: [["利用时间压力，让人来不及核实。", "detail"]] },
          detail: { lines: [["回放", "骗子拒绝语音视频，发PS银行截图。"]], prompt: "哪个细节最值得怀疑？", thoughts: [["拒绝语音或视频核实。", "report"], ["头像和昵称没有变化。", "hintVideo"]] },
          hintVideo: { lines: [["提示", "头像和昵称都可能被盗用，拒绝实时核实才是关键。"]], prompt: "重新标记最关键异常。", thoughts: [["拒绝语音或视频核实。", "report"]] },
        },
        endings: { report: ["学习结局", "你完成冒充熟人诈骗拆解，获得转账前三件事提醒卡。", ["电话核实", "视频确认", "不转陌生账户"]] },
      },
    },
  },
  {
    id: "ticket",
    label: "虚假购物诈骗",
    subtitle: "内部渠道，演唱会门票",
    sceneClass: "scene-ticket",
    tag: "稀缺商品 · 脱离平台",
    brief: "小文在微博超话看到内部渠道门票。对方自称演出合作方员工，说能录入身份信息，现场刷身份证入场。",
    roles: {
      experiencer: {
        start: "start",
        nodes: {
          start: { lines: [["票务代理", "两张内场工作票，内部渠道，非黄牛。"], ["票务代理", "直接录入身份证，现场刷证入场。"], ["你", "价格只比原价高200元，很诱人。"]], prompt: "门票已经秒光，你不想错过这次机会。", thoughts: [["立刻转1400元买票。", "deposit"], ["要求走官方二手票务平台。", "safePlatform"]] },
          deposit: { lines: [["系统", "你转了1400元。"], ["票务代理", "已录入，但需要再交500元实名认证保证金，认证后退还。"]], prompt: "你开始怀疑，但又不甘心放弃。", thoughts: [["再转500元，认证完就好了。", "scammed"], ["拒绝再转，要求退款。", "partialStop"]] },
        },
        endings: {
          safePlatform: ["安全结局", "对方拒绝官方平台交易，你意识到不对劲，放弃购买。", ["紧俏商品更要走官方渠道", "拒绝私下转账", "无法官方验证的内部票不要信"]],
          partialStop: ["部分止损结局", "对方直接拉黑你，你损失1400元，但没有继续交保证金。", ["保证金、认证费、解冻费都是加码话术", "保留证据举报", "不要继续付款换退款"]],
          scammed: ["被骗结局", "对方又索要解冻费，你损失1900元后才意识到被骗。", ["内部渠道无法验证", "个人账户收款高风险", "脱离平台就脱离保护"]],
        },
      },
      helper: {
        start: "start",
        nodes: {
          start: { lines: [["小文", "我买到票了！内部渠道，比黄牛便宜多了！"], ["你", "你看到对方拒绝官方平台，收款账户也是个人账户。"]], prompt: "你要不要帮小文核实？", thoughts: [["太好了，帮我也买一张！", "wrongHelp"], ["先别急，我去官网查有没有录入票说法。", "official"]] },
          official: { lines: [["官方票务", "所有门票均通过官方平台销售，不存在内部录入渠道。"], ["小文", "那这个人很可能是骗子。"]], prompt: "发现骗局后，你还可以怎么做？", thoughts: [["陪小文举报账号，并在超话提醒其他人。", "success"], ["告诉她下次注意，这次算了。", "partial"]] },
        },
        endings: {
          wrongHelp: ["错误帮助", "你跟着转钱，两个人一起被骗。", ["朋友兴奋时更需要冷静核实", "不要被稀缺感带节奏", "帮忙前先查官方规则"]],
          success: ["成功帮助结局", "你陪小文举报账号，并提醒其他粉丝不要私下转账。", ["官方核验", "举报账号", "提醒同伴"]],
          partial: ["部分帮助结局", "小文没被骗，但骗子还可能继续骗其他粉丝。", ["发现骗局后要举报", "平台提醒能保护更多人", "反诈不是只保护自己"]],
        },
      },
      observer: {
        start: "start",
        nodes: {
          start: { lines: [["回放", "骗子在超话发布内部票、工作票信息。"], ["回放", "粉丝急于求票，愿意相信低价渠道。"]], prompt: "骗子抓住了什么心理？", thoughts: [["稀缺商品带来的焦急和侥幸。", "platform"], ["粉丝都喜欢便宜。", "hintNeed"]] },
          hintNeed: { lines: [["提示", "便宜只是表象，真正核心是稀缺和错过恐惧。"]], prompt: "重新判断骗子抓住的心理。", thoughts: [["稀缺商品带来的焦急和侥幸。", "platform"]] },
          platform: { lines: [["回放", "对方坚持不能走官方平台，只能私下转账。"]], prompt: "骗子为什么坚持脱离平台？", thoughts: [["官方平台有担保和维权，私下转账难追回。", "report"], ["工作票本来就不能走平台。", "hintPlatform"]] },
          hintPlatform: { lines: [["提示", "无法在官方验证的内部渠道，本身就是风险信号。"]], prompt: "重新判断脱离平台的原因。", thoughts: [["官方平台有担保和维权，私下转账难追回。", "report"]] },
        },
        endings: { report: ["学习结局", "你完成虚假购物诈骗拆解，获得安全购物三原则。", ["认准官方渠道", "绝不私下转账", "先核实再付款"]] },
      },
    },
  },
];

let scamScenarios = fallbackScenarios;

const sceneClassBySafetyType = {
  "反诈骗": "scene-task",
  "消防安全": "scene-fire",
  "交通安全": "scene-traffic",
  "治安安全": "scene-security",
  "实验室安全": "scene-lab",
  "网络安全": "scene-cyber",
};

function caseList(items) {
  return Array.isArray(items) && items.length ? items : ["识别风险", "暂停操作", "向官方渠道核实"];
}

function buildScenarioFromCase(item, index) {
  const warningSigns = caseList(item.warningSigns);
  const safeActions = caseList(item.safeActions);
  const actor = item.actor || "同学";
  const peer = item.peer || "同学";
  const authority = item.authority || "学校相关部门";
  const sceneClass = item.sceneClass || sceneClassBySafetyType[item.safetyType] || "scene-task";
  const safetyTag = `${item.safetyType || "校园安全"} · ${item.campusScene || "典型情景"}`;
  const sourceLine = item.sourceName ? `来源：${item.sourceName}，已脱敏改编。` : "来源于审核通过的校园安全案例，已脱敏改编。";

  return {
    id: item.id || `case-${index}`,
    label: item.title || item.campusScene || "校园安全案例",
    subtitle: item.subtitle || item.campusScene || "真实案例改编",
    sceneClass,
    tag: safetyTag,
    brief: `${item.hook || "这是一个校园安全案例。"} ${sourceLine}`,
    roles: {
      experiencer: {
        start: "start",
        nodes: {
          start: {
            lines: [["系统", item.hook || "你遇到了一个看似普通的校园安全情景。"], [actor, item.firstLure || "这件事看起来不算严重，先按习惯处理也许没问题。"]],
            prompt: "你正在现场，需要马上做出判断。",
            thoughts: [[item.riskyChoice || "先按原计划继续。", "escalate"], [item.safeChoice || "先停下来核实。", "safeExit"]],
          },
          escalate: {
            lines: [["系统", item.escalation || "风险开始升级，情况比最初看起来更复杂。"], [actor, item.pressure || "现在有点压力，但继续下去似乎更省事。"]],
            prompt: "你已经感到不对劲，下一步怎么办？",
            thoughts: [["继续推进，先把眼前的事处理完。", "incident"], [`问问${peer}，并联系${authority}核实。`, "askPeer"]],
          },
          askPeer: {
            lines: [[peer, `我觉得这里至少有这些风险：${warningSigns.slice(0, 2).join("、")}。`], ["系统", `建议动作：${safeActions.slice(0, 2).join("、")}。`]],
            prompt: "你愿意及时止损并按规范处理吗？",
            thoughts: [[item.safeChoice || "停止风险操作并上报。", "safeHelped"], ["还是先等等，别把事情弄复杂。", "incident"]],
          },
        },
        endings: {
          safeExit: ["安全结局", "你在风险扩大前暂停操作，并通过官方渠道核实，避免了后续损失或事故。", safeActions.slice(0, 4)],
          safeHelped: ["及时处置结局", "你听取提醒并采取规范处置，把一次危险苗头转化成了可复盘的安全经验。", safeActions.slice(0, 4)],
          incident: ["风险发生结局", "你忽视了早期信号，风险继续扩大。复盘显示，关键节点本可以更早暂停和求助。", warningSigns.slice(0, 4)],
        },
      },
      helper: {
        start: "start",
        nodes: {
          start: {
            lines: [[actor, item.escalation || "我现在遇到点情况，但应该能处理。"], ["你", `你注意到：${warningSigns.slice(0, 2).join("、")}。`]],
            prompt: "作为帮助者，你第一句话怎么说更合适？",
            thoughts: [[item.wrongHelp || "直接批评对方不注意安全。", "failed"], [item.helperAction || "先稳定对方，再一起核实处理。", "check"]],
          },
          check: {
            lines: [["你", item.helperAction || "我们先停下来，一起核实信息和现场风险。"], [authority, `建议立即执行：${safeActions.slice(0, 3).join("、")}。`]],
            prompt: "确认风险后，你还要不要陪同完成后续处理？",
            thoughts: [["继续陪同处理、记录并提醒周围同学。", "success"], ["风险暂时停止了，后面让对方自己处理。", "partial"]],
          },
        },
        endings: {
          failed: ["帮助受阻", "过度指责让当事人更难接受提醒，风险没有被及时阻断。", ["先共情", "再核实", "最后给出具体动作"]],
          success: ["成功帮助结局", "你用稳定、具体、可执行的方式帮助当事人完成处置，并把风险提醒扩散给相关同学。", safeActions.slice(0, 4)],
          partial: ["部分帮助结局", "你阻止了眼前风险，但缺少记录、上报和复盘，类似风险仍可能再次出现。", ["完成记录", "及时上报", "提醒同伴"]],
        },
      },
      observer: {
        start: "start",
        nodes: {
          start: {
            lines: [["回放", item.hook || "案例开始于一个看似普通的校园场景。"], ["来源", sourceLine]],
            prompt: "第一个值得警惕的信号是什么？",
            thoughts: [[warningSigns[0] || "出现异常风险信号。", "detail"], ["看起来很常见，暂时不用管。", "hintFirst"]],
          },
          hintFirst: {
            lines: [["提示", `此类案例的早期信号通常包括：${warningSigns.slice(0, 2).join("、")}。`]],
            prompt: "重新标记风险信号。",
            thoughts: [[warningSigns[0] || "出现异常风险信号。", "detail"]],
          },
          detail: {
            lines: [["回放", item.escalation || "随后风险继续扩大。"], ["提示", `关键处置动作包括：${safeActions.slice(0, 2).join("、")}。`]],
            prompt: "这个案例最应该记住的处置原则是什么？",
            thoughts: [[safeActions[0] || "暂停并核实。", "report"], ["等事情结束后再说。", "hintAction"]],
          },
          hintAction: {
            lines: [["提示", "校园安全风险要在早期节点处理，拖延往往会放大后果。"]],
            prompt: "重新选择处置原则。",
            thoughts: [[safeActions[0] || "暂停并核实。", "report"]],
          },
        },
        endings: {
          report: ["学习结局", "你完成了案例拆解，能够识别关键风险信号，并说出可执行的安全动作。", [...warningSigns.slice(0, 2), ...safeActions.slice(0, 2)]],
        },
      },
    },
  };
}

async function loadSafetyCaseScenarios() {
  if (!scenarioTabs || !window.fetch) return;
  const sources = ["/api/cases?status=approved", "data/safety-cases.json"];
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) throw new Error("案例库读取失败");
      const library = await response.json();
      const approvedCases = Array.isArray(library.cases) ? library.cases.filter((item) => item.reviewStatus === "approved") : [];
      const generatedScenarios = approvedCases.map(buildScenarioFromCase);
      if (generatedScenarios.length) {
        scamScenarios = generatedScenarios;
        return;
      }
    } catch (error) {
      console.warn("案例库来源不可用", source, error);
    }
  }
}
let activeRole = "experiencer";
let activeScenarioIndex = 0;
let activeStoryNode = "start";
let scenarioTouchStartX = 0;
let scenarioCarouselPosition = 1;
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

function switchTab(target, shouldScroll = true) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === target));
  featureCards.forEach((card) => card.classList.toggle("active", card.dataset.tab === target));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === target));
  if (shouldScroll) document.querySelector(".workspace")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function switchLearningMode(mode) {
  learningModeButtons.forEach((button) => button.classList.toggle("active", button.dataset.learningMode === mode));
  learningSections.forEach((section) => section.classList.toggle("active", section.dataset.learningSection === mode));
}

function getInitialTab() {
  const url = new URL(window.location.href);
  const explicitTab = url.searchParams.get("tab") || url.hash.replace("#", "");
  const pathTabMap = {
    "knowledge.html": "quiz",
    "help.html": "help",
  };
  const fileName = url.pathname.split("/").pop();
  const defaultTab = document.body.dataset.defaultTab;
  return explicitTab || pathTabMap[fileName] || defaultTab || "quiz";
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

function setStoryPhase(phase) {
  if (!scenarioTabs || !roleStage || !storyStage || !endingStage) return;
  scenarioTabs.hidden = phase !== "select";
  roleStage.hidden = phase !== "role";
  storyStage.hidden = phase !== "story";
  endingStage.hidden = phase !== "ending";
  storyGameStatus.textContent = phase === "select" ? "选择场景" : phase === "role" ? "选择身份" : phase === "story" ? "剧情锁定" : "结局复盘";
  storyGameCard?.classList.toggle("story-mode", phase === "story");
  document.body.classList.toggle("story-active", phase === "story");
}

function currentScenario() {
  return scamScenarios[activeScenarioIndex];
}

function currentRoleStory() {
  return currentScenario().roles[activeRole];
}

function setScenarioTrackPosition(animated = true) {
  const track = scenarioTabs?.querySelector(".scene-track");
  if (!track) return;
  track.style.transition = animated ? "" : "none";
  track.style.transform = `translateX(-${scenarioCarouselPosition * 100}%)`;
}

function snapScenarioTrack(position) {
  const track = scenarioTabs?.querySelector(".scene-track");
  if (!track) return;
  scenarioCarouselPosition = position;
  track.style.transition = "none";
  track.style.transform = `translateX(-${scenarioCarouselPosition * 100}%)`;
  track.offsetHeight;
  window.requestAnimationFrame(() => {
    track.style.transition = "";
  });
}

function updateScenarioCarousel(animated = true) {
  if (!scenarioTabs) return;
  setScenarioTrackPosition(animated);
  scenarioTabs.querySelectorAll(".scene-dot").forEach((dot, index) => dot.classList.toggle("active", index === activeScenarioIndex));
  scenarioTabs.querySelectorAll(".scene-card").forEach((card) => {
    card.setAttribute("aria-hidden", Number(card.dataset.scenarioIndex) === activeScenarioIndex ? "false" : "true");
  });
}

function shiftScenario(direction) {
  scenarioCarouselPosition += direction;
  activeScenarioIndex = (activeScenarioIndex + direction + scamScenarios.length) % scamScenarios.length;
  updateScenarioCarousel(true);
}

function createScenarioCard(scenario, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scene-card";
  button.dataset.scenarioIndex = index;
  button.innerHTML = `<span class="scene-illustration ${scenario.sceneClass}" aria-hidden="true"></span><span class="scene-content"><span class="scene-badge">情景演练 0${index + 1}</span><span class="scene-label">${scenario.label}</span><strong>${scenario.subtitle}</strong><small>${scenario.tag}</small><em>进入演练</em></span>`;
  button.addEventListener("click", () => {
    activeScenarioIndex = index;
    activeRole = "experiencer";
    renderRoleSelection();
  });
  return button;
}

function renderScenarioTabs() {
  if (!scenarioTabs) return;
  scenarioTabs.innerHTML = `<button class="scene-nav scene-prev" type="button" aria-label="上一个情景">‹</button><div class="scene-viewport"><div class="scene-track"></div></div><button class="scene-nav scene-next" type="button" aria-label="下一个情景">›</button><div class="scene-dots" aria-label="情景位置"></div>`;
  const track = scenarioTabs.querySelector(".scene-track");
  const dots = scenarioTabs.querySelector(".scene-dots");
  scenarioCarouselPosition = activeScenarioIndex + 1;

  track.append(createScenarioCard(scamScenarios[scamScenarios.length - 1], scamScenarios.length - 1));
  scamScenarios.forEach((scenario, index) => {
    track.append(createScenarioCard(scenario, index));

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "scene-dot";
    dot.setAttribute("aria-label", `切换到情景 ${index + 1}`);
    dot.addEventListener("click", () => {
      activeScenarioIndex = index;
      scenarioCarouselPosition = index + 1;
      updateScenarioCarousel(true);
    });
    dots.append(dot);
  });
  track.append(createScenarioCard(scamScenarios[0], 0));

  track.addEventListener("transitionend", (event) => {
    if (event.target !== track || event.propertyName !== "transform") return;
    if (scenarioCarouselPosition === 0) snapScenarioTrack(scamScenarios.length);
    if (scenarioCarouselPosition === scamScenarios.length + 1) snapScenarioTrack(1);
  });
  scenarioTabs.querySelector(".scene-prev").addEventListener("click", () => shiftScenario(-1));
  scenarioTabs.querySelector(".scene-next").addEventListener("click", () => shiftScenario(1));
  const viewport = scenarioTabs.querySelector(".scene-viewport");
  viewport.addEventListener("pointerdown", (event) => {
    scenarioTouchStartX = event.clientX;
  });
  viewport.addEventListener("pointerup", (event) => {
    const distance = event.clientX - scenarioTouchStartX;
    if (Math.abs(distance) > 42) shiftScenario(distance < 0 ? 1 : -1);
  });
  updateScenarioCarousel(false);
}

function renderRoleSelection() {
  const scenario = currentScenario();
  scenarioTitle.textContent = scenario.label;
  scenarioBrief.textContent = scenario.brief;
  selectedScenePreview.className = `selected-scene ${scenario.sceneClass}`;
  selectedScenePreview.innerHTML = `<span>${scenario.subtitle}</span><strong>${scenario.label}</strong>`;
  rolePicker?.querySelectorAll(".role-button").forEach((button) => button.classList.toggle("active", button.dataset.role === activeRole));
  setStoryPhase("role");
}

function startLockedStory() {
  activeStoryNode = currentRoleStory().start;
  renderRoleSimulation();
  setStoryPhase("story");
  storyGameCard?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function renderRoleSimulation() {
  if (!scenarioTitle || !simDialogue || !simActions) return;
  const scenario = currentScenario();
  const roleStory = currentRoleStory();
  const node = roleStory.nodes[activeStoryNode];
  roleName.textContent = roleLabels[activeRole];
  roleScenarioTag.textContent = scenario.tag;
  storyVisual.className = `story-visual ${scenario.sceneClass}`;
  simDialogue.innerHTML = "";
  node.lines.forEach(([speaker, text]) => {
    const line = document.createElement("article");
    const userSide = ["你", "小林", "小周", "小文", "陈晨", "室友", "长辈", "同学"].includes(speaker);
    line.className = `story-line${userSide ? " user-chat" : ""}`;
    line.innerHTML = "<span></span><p></p>";
    line.querySelector("span").textContent = speaker;
    line.querySelector("p").textContent = text;
    simDialogue.append(line);
  });
  simTask.textContent = node.prompt;
  simFeedback.textContent = "剧情已锁定，做出选择后将进入下一幕。";
  simActions.innerHTML = "";
  node.thoughts.forEach(([text, next]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thought-choice";
    button.textContent = text;
    button.addEventListener("click", () => advanceStory(next));
    simActions.append(button);
  });
}

function advanceStory(next) {
  const roleStory = currentRoleStory();
  if (roleStory.endings[next]) {
    renderEnding(next);
    return;
  }
  activeStoryNode = next;
  renderRoleSimulation();
}

async function recordLearningCompletion(endingKey) {
  const scenario = currentScenario();
  try {
    await fetch("/api/learning/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: scenario.id,
        scenarioTitle: scenario.label,
        role: activeRole,
        endingKey
      }),
    });
  } catch (error) {
    console.warn("学习记录保存失败", error);
  }
}
function renderEnding(endingKey) {
  const [title, text, report] = currentRoleStory().endings[endingKey];
  endingBadge.textContent = roleLabels[activeRole];
  endingTitle.textContent = title;
  endingText.textContent = text;
  endingReport.innerHTML = report.map((item) => `<span>${item}</span>`).join("");
  setStoryPhase("ending");
  recordLearningCompletion(endingKey);
}

function initRoleSimulation() {
  if (!scenarioTabs || !rolePicker || !startStory || !startOverStory) return;
  renderScenarioTabs();
  setStoryPhase("select");
  rolePicker.querySelectorAll(".role-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeRole = button.dataset.role;
      renderRoleSelection();
    });
  });
  startStory.addEventListener("click", startLockedStory);
  startOverStory.addEventListener("click", () => {
    activeStoryNode = "start";
    activeRole = "experiencer";
    renderScenarioTabs();
    setStoryPhase("select");
  });
}
tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
featureCards.forEach((card) => card.addEventListener("click", (event) => {
  event.preventDefault();
  switchTab(card.dataset.tab);
}));
learningModeButtons.forEach((button) => button.addEventListener("click", () => switchLearningMode(button.dataset.learningMode)));
document.querySelectorAll("[data-jump-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.jumpTab)));


function isMobileDevice() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  const touchLikely = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua) || (touchLikely && window.innerWidth <= 820);
}

if (callButton) callButton.addEventListener("click", () => {
  const phoneNumber = "022-123456";
  if (isMobileDevice()) {
    window.location.href = `tel:${phoneNumber}`;
    return;
  }
  showToast(`请使用电话拨打 ${phoneNumber}`);
});

if (nextQuestion) nextQuestion.addEventListener("click", () => {
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

if (quizQuestion && quizOptions) startQuizRound();
loadSafetyCaseScenarios().finally(initRoleSimulation);
switchTab(getInitialTab(), false);









