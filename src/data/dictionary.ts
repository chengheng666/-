import { DictItem, BroadcastTemplate, TrainInfo } from '../types';

export const DEFAULT_DICTIONARY: DictItem[] = [
  // 礼貌用语与称呼
  { word: "各位旅客", pinyin: "gè wèi lǚ kè", category: "courtesy" },
  { word: "请注意", pinyin: "qǐng zhù yì", category: "courtesy" },
  { word: "祝您旅途愉快", pinyin: "zhù nín lǚ tú yú kuài", category: "courtesy" },
  { word: "随身携带的行李物品", pinyin: "suí shēn xié dài de xíng lǐ wù pǐn", category: "courtesy" },
  { word: "照顾好您的老人和小孩", pinyin: "zhào gù hǎo nín de lǎo rén hé xiǎo hái", category: "courtesy" },
  { word: "文明出行", pinyin: "wén míng chū xíng", category: "courtesy" },

  // 车次类型
  { word: "G", pinyin: "G", category: "train" },
  { word: "D", pinyin: "D", category: "train" },
  { word: "C", pinyin: "C", category: "train" },
  { word: "K", pinyin: "K", category: "train" },
  { word: "T", pinyin: "T", category: "train" },
  { word: "Z", pinyin: "Z", category: "train" },
  { word: "次", pinyin: "cì", category: "train" },
  { word: "列车", pinyin: "liè chē", category: "train" },

  // 车站名称
  { word: "北京南", pinyin: "běi jīng nán", category: "station" },
  { word: "上海虹桥", pinyin: "shàng hǎi hóng qiáo", category: "station" },
  { word: "杭州东", pinyin: "háng zhōu dōng", category: "station" },
  { word: "南京南", pinyin: "nán jīng nán", category: "station" },
  { word: "广州南", pinyin: "guǎng zhōu nán", category: "station" },
  { word: "深圳北", pinyin: "shēn zhèn běi", category: "station" },
  { word: "成都东", pinyin: "chéng dū dōng", category: "station" },
  { word: "西安北", pinyin: "xī ān běi", category: "station" },
  { word: "武汉", pinyin: "wǔ hàn", category: "station" },
  { word: "郑州东", pinyin: "zhèng zhōu dōng", category: "station" },

  // 操作与动作
  { word: "由", pinyin: "yóu", category: "action" },
  { word: "开往", pinyin: "kāi wǎng", category: "action" },
  { word: "由本站始发", pinyin: "yóu běn zhàn shǐ fā", category: "action" },
  { word: "开始检票了", pinyin: "kāi shǐ jiǎn piào le", category: "action" },
  { word: "正在检票", pinyin: "zhèng zài jiǎn piào", category: "action" },
  { word: "停止检票了", pinyin: "tíng zhǐ jiǎn piào le", category: "action" },
  { word: "准备进站", pinyin: "zhǔn bèi jìn zhàn", category: "action" },
  { word: "已经到站", pinyin: "yǐ jīng dào zhàn", category: "action" },
  { word: "晚点", pinyin: "wǎn diǎn", category: "action" },
  { word: "听到广播后", pinyin: "tīng dào guǎng bō hòu", category: "action" },
  { word: "请前往", pinyin: "qǐng qián wǎng", category: "action" },
  { word: "请到", "pinyin": "qǐng dào", category: "action" },
  { word: "进站", "pinyin": "jìn zhàn", category: "action" },

  // 场所与代词
  { word: "检票口", pinyin: "jiǎn piào kǒu", category: "action" },
  { word: "站台", pinyin: "zhàn tái", category: "action" },
  { word: "候车室", pinyin: "hòu chē shì", category: "action" },
  { word: "第", pinyin: "dì", category: "number" },
  { word: "B", pinyin: "B", category: "number" },
  { word: "A", pinyin: "A", category: "number" },

  // 数字大写或念法
  { word: "0", pinyin: "líng", category: "number" },
  { word: "1", pinyin: "yī", category: "number" },
  { word: "yāo", pinyin: "yāo", category: "number" }, // 铁路一般把1念yāo
  { word: "2", pinyin: "èr", category: "number" },
  { word: "3", pinyin: "sān", category: "number" },
  { word: "4", pinyin: "sì", category: "number" },
  { word: "5", pinyin: "wǔ", category: "number" },
  { word: "6", pinyin: "liù", category: "number" },
  { word: "7", pinyin: "qī", category: "number" },
  { word: "8", pinyin: "bā", category: "number" },
  { word: "9", pinyin: "jiǔ", category: "number" },
  { word: "10", pinyin: "shí", category: "number" },

  // 安全与警示
  { word: "禁止抽烟", pinyin: "jìn zhǐ chōu yān", category: "warning" },
  { word: "禁发危险品", pinyin: "jìn fā wēi xiǎn pǐn", category: "warning" },
  { word: "严禁跨越安全红线", pinyin: "yán jìn kuà yuè ān quán hóng xiàn", category: "warning" },
  { word: "注意列车与站台的空隙", pinyin: "zhù yì liè chē yǔ zhàn tái de kòng xì", category: "warning" },
  { word: "注意安全", pinyin: "zhù yì ān quán", category: "warning" },
  { word: "不要在月台嬉戏", pinyin: "bù yào zài yuè tái xī xì", category: "warning" },
];

export const PRESET_TEMPLATES: BroadcastTemplate[] = [
  {
    id: "boarding_start",
    title: "开始检票广播 (始发)",
    description: "始发列车开始在检票口检票时播报",
    chinese: "各位旅客 请注意 由本站始发 开往 上海虹桥 的 G 1 0 1 次 列车 开始检票了 请前往 第 2 检票口 检票 祝您旅途愉快",
    english: "Dear passengers, attention please. Train G 1 0 1 originating from this station bound for Shanghai Hongqiao is now checking tickets. Please go to Ticket Gate No. 2. We wish you a pleasant journey.",
    category: "boarding"
  },
  {
    id: "boarding_start_transit",
    title: "开始检票广播 (途经)",
    description: "过路列车开始在检票口检票时播报",
    chinese: "各位旅客 请注意 由 北京南 开往 深圳北 的 G 7 1 次 列车 开始检票了 请前往 第 5 检票口 A 检票 祝您旅途愉快",
    english: "Dear passengers, attention please. Train G 7 1 from Beijing South bound for Shenzhen North is now checking tickets. Please go to Ticket Gate No. 5 A.",
    category: "boarding"
  },
  {
    id: "boarding_stop",
    title: "停止检票广播",
    description: "列车检票结束前3分钟或正停止检票时播报",
    chinese: "各位旅客 请注意 开往 深圳北 的 G 1 0 1 次 列车 停止检票了 已经检票的旅客 请前往 第 2 站台 乘车 祝您旅途愉快",
    english: "Dear passengers, attention please. Train G 1 0 1 bound for Shenzhen North has stopped checking tickets. Passengers with tickets checked please go to Platform No. 2 to board. We wish you a pleasant journey.",
    category: "boarding"
  },
  {
    id: "train_arriving",
    title: "列车进站广播",
    description: "列车即将到达或者正在进站时播报",
    chinese: "各位旅客 请注意 由 上海虹桥 开往 北京南 的 G 1 0 2 次 列车 准备进站 请在 候车室 候车的旅客 请到 第 3 站台 准备乘车 注意列车与站台的空隙 注意安全",
    english: "Dear passengers, attention please. Train G 1 0 2 from Shanghai Hongqiao bound for Beijing South is arriving. Passengers waiting inside the waiting hall please go to Platform No. 3 to prepare for boarding. Please mind the gap between the train and the platform.",
    category: "arrival"
  },
  {
    id: "train_delay",
    title: "列车晚点抱歉广播",
    description: "当列车因各种原因晚点时，安抚并告知旅客",
    chinese: "各位旅客 请注意 开往 广州南 的 G 1 2 1 次 列车 晚点 预计晚点 3 0 分钟 列车 晚点 给您带来不便 铁路部门 敬请谅解",
    english: "Dear passengers, attention please. Train G 1 2 1 bound for Guangzhou South is delayed. The estimated delay is 3 0 minutes. We apologize for the inconvenience and thank you for your understanding.",
    category: "delay"
  },
  {
    id: "lost_and_found",
    title: "寻人/寻物广播",
    description: "在车站寻找遗失物品或走散的小孩、乘客",
    chinese: "各位旅客 请注意 听到广播后 请到 1 检票口 旁边 候车室 值班台 祝您旅途愉快",
    english: "Dear passengers, attention please. Upon hearing this broadcast, please go to the Duty Desk inside the Waiting Hall next to Ticket Gate No. 1. Thank you.",
    category: "general"
  },
  {
    id: "safety_caution",
    title: "站台安全警示广播",
    description: "站台等候安全提醒，严禁越线，文明出行",
    chinese: "各位旅客 请注意 严禁跨越安全红线 照顾好您的老人和小孩 注意列车与站台的空隙 不要在月台嬉戏 注意安全 文明出行 祝您旅途愉快",
    english: "Dear passengers, attention please. Crossing the safety line is strictly prohibited. Please take care of the elderly and children. Please mind the gap.",
    category: "emergency"
  },
  {
    id: "smoke_ban",
    title: "列车与车站禁烟广播",
    description: "对普速或动车、车站禁烟宣传",
    chinese: "各位旅客 请注意 动车组列车 禁止抽烟 禁发危险品 严禁跨越安全红线 祝您旅途愉快",
    english: "Dear passengers, attention please. Smoking is strictly prohibited on CRH bullet trains. Carrying hazardous items is forbidden.",
    category: "emergency"
  }
];

export const INITIAL_TRAINS: TrainInfo[] = [
  {
    id: "t1",
    trainNumber: "G101",
    type: "G",
    origin: "北京南",
    destination: "上海虹桥",
    route: ["北京南", "济南西", "南京南", "上海虹桥"],
    arrivalTime: "09:30",
    departureTime: "09:40",
    platform: "2",
    checkGate: "2",
    status: "checking",
  },
  {
    id: "t2",
    trainNumber: "G102",
    type: "G",
    origin: "上海虹桥",
    destination: "北京南",
    route: ["上海虹桥", "南京南", "徐州东", "北京南"],
    arrivalTime: "10:15",
    departureTime: "10:30",
    platform: "3",
    checkGate: "3",
    status: "waiting",
  },
  {
    id: "t3",
    trainNumber: "D322",
    type: "D",
    origin: "杭州东",
    destination: "南京南",
    route: ["杭州东", "湖州", "宣城", "南京南"],
    arrivalTime: "10:45",
    departureTime: "10:50",
    platform: "5",
    checkGate: "5A",
    status: "arriving",
  },
  {
    id: "t4",
    trainNumber: "G71",
    type: "G",
    origin: "北京南",
    destination: "深圳北",
    route: ["北京南", "石家庄", "郑州东", "武汉", "长沙南", "广州南", "深圳北"],
    arrivalTime: "11:00",
    departureTime: "11:15",
    platform: "6",
    checkGate: "6B",
    status: "delayed",
    delayMinutes: 25,
  },
  {
    id: "t5",
    trainNumber: "C2001",
    type: "C",
    origin: "北京南",
    destination: "天津",
    route: ["北京南", "天津武清", "天津"],
    arrivalTime: "11:30",
    departureTime: "11:45",
    platform: "1",
    checkGate: "1",
    status: "waiting",
  },
  {
    id: "t6",
    trainNumber: "K511",
    type: "K",
    origin: "上海站",
    destination: "广州南",
    route: ["上海", "杭州", "金华", "向塘", "韶关东", "广州"],
    arrivalTime: "12:10",
    departureTime: "12:25",
    platform: "4",
    checkGate: "4",
    status: "waiting",
  }
];
