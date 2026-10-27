/* =========================================================
 * 一日计划 · 考研时间表 + 每周菜单打卡
 * 纯原生 JS，无依赖。状态持久化：localStorage
 * key: kaoyan-daily-schedule-v1（schema version 3）
 *
 * 双视图（Tab）：
 *   daily —— 每日计划：默认 35 个「时间段」（t- 前缀），可自定义增删改
 *   menu  —— 每周菜单：7 天 × 4 餐 = 28 餐次（训练日/休息日加餐共享一个勾选位）
 *
 * 编辑态（v3 新增）：
 *   默认只读，点右上角「编辑」才进入编辑态；编辑态下每张卡变成
 *   时间段表单（开始时间 / 结束时间 / 做什么 / 备注 / 分类 / 删除），
 *   列表底部有「＋ 添加时间段」。点「完成」后自动按开始时间排序并保存。
 *   编辑态不持久化：重新打开页面永远是只读视图。
 *
 * 数据模型：每个时段 { id, start:"HH:MM", end:"HH:MM", title, details, category, badges }
 *   当前高亮 = start <= now < end；end <= now 视为已过。
 *
 * 旧数据迁移（全部容错，不丢打卡）
 *   v1 mode training/rest → daily/menu，completed.training → completed.daily
 *   v2 无 schedule 字段 → 由默认 TRAINING 推导 start/end
 * ========================================================= */
(function () {
  "use strict";

  /* ---------------- 常量 ---------------- */

  var STORAGE_KEY = "kaoyan-daily-schedule-v1";
  var STORAGE_VERSION = 3;
  var MODES = ["daily", "menu"];
  var MODE_LABELS = { daily: "每日计划", menu: "每周菜单" };

  /** 可选的分类（与 styles.css 的 .cat[data-cat] 一一对应） */
  var CATEGORIES = ["学习", "饮食", "饮水", "训练", "休息", "健康", "睡眠"];

  /** 新增时段默认时长（分钟） */
  var DEFAULT_DURATION = 30;

  /* ---------------- 默认任务数据（只作为默认时段的来源） ---------------- */

  /** 每日计划默认项（沿用原 training 数组，t- 前缀 35 项；只有开始时间，结束时间由下一条推导） */
  var TRAINING = [
    {id:"t-0650",time:"06:50",title:"起床",details:"醒后坐10秒再站，不猛然起身",category:"健康",badges:["血压"]},
    {id:"t-0700",time:"07:00",title:"第一口水 300ml",details:"温水，分3-5分钟小口慢饮，不猛灌",category:"饮水",badges:[]},
    {id:"t-0710",time:"07:10",title:"洗漱 + 颈肩轻活动",details:"收下巴、肩胛后缩各5次，不低头刷手机",category:"健康",badges:["颈椎"]},
    {id:"t-0730",time:"07:30",title:"早餐",details:"水煮蛋/蒸蛋1个 + 好消化主食 + 无糖豆浆/牛奶200-250ml + 少量焯拌菜；不油条不煎蛋",category:"饮食",badges:["脾胃"]},
    {id:"t-0800",time:"08:00",title:"散步 + 播客",details:"喝水100-150ml；走路目视前方，不低头刷屏",category:"休息",badges:["颈椎"]},
    {id:"t-0830",time:"08:30",title:"考研学习①：高难度逻辑科目",details:"屏幕与眼平齐，腰部有支撑；50分钟必起身",category:"学习",badges:["颈椎","前列腺"]},
    {id:"t-0920",time:"09:20",title:"强制起身10分钟",details:"走动、接水、颈肩拉伸；喝水200ml；有尿意即排",category:"休息",badges:["颈椎","前列腺"]},
    {id:"t-0930",time:"09:30",title:"考研学习②",details:"继续高难度内容或切换相近逻辑科目",category:"学习",badges:["颈椎","前列腺"]},
    {id:"t-1020",time:"10:20",title:"起身休息",details:"喝水150ml；远眺",category:"休息",badges:[]},
    {id:"t-1030",time:"10:30",title:"考研学习③",details:"11:00前可再小口喝水100ml",category:"学习",badges:["颈椎","前列腺"]},
    {id:"t-1120",time:"11:20",title:"整理/复盘上午",details:"起身活动，不连续坐满50分钟以上",category:"学习",badges:["颈椎"]},
    {id:"t-1140",time:"11:40",title:"午餐前喝水",details:"100-150ml",category:"饮水",badges:[]},
    {id:"t-1200",time:"12:00",title:"午餐",details:"主食1拳 + 鱼虾/鸡胸/豆腐1掌 + 蔬菜2拳；若吃第2个蛋放这里，水煮/蒸；不喝肉汤、不碰啤酒；七分饱",category:"饮食",badges:["尿酸","脾胃"]},
    {id:"t-1225",time:"12:25",title:"慢走/站立10-15分钟",details:"饭后不立刻躺；走动促尿酸排泄，减轻前列腺压迫",category:"休息",badges:["尿酸","前列腺"]},
    {id:"t-1250",time:"12:50",title:"午休20-30分钟",details:"不超过30分钟；不趴桌压颈",category:"休息",badges:["颈椎"]},
    {id:"t-1320",time:"13:20",title:"午休起床喝水200ml",details:"温水小口",category:"饮水",badges:[]},
    {id:"t-1330",time:"13:30",title:"考研学习④",details:"坐姿同上午；50分钟必起身",category:"学习",badges:["颈椎","前列腺"]},
    {id:"t-1420",time:"14:20",title:"强制起身10分钟",details:"喝水150ml；颈肩活动；排尿，不憋",category:"休息",badges:["颈椎","前列腺"]},
    {id:"t-1430",time:"14:30",title:"考研学习⑤",details:"",category:"学习",badges:["颈椎","前列腺"]},
    {id:"t-1520",time:"15:20",title:"起身/准备加餐",details:"喝水150ml",category:"休息",badges:[]},
    {id:"t-1530",time:"15:30",title:"练前加餐",details:"运动日必吃：香蕉半根或全麦1片 + 无糖酸奶100-150g或温豆浆200ml；喝水200ml",category:"饮食",badges:[]},
    {id:"t-1600",time:"16:00",title:"运动前补水",details:"150-200ml；排尿后再训练",category:"饮水",badges:["前列腺"]},
    {id:"t-1630",time:"16:30",title:"力量训练",details:"全程不憋气、不瓦式呼吸：发力呼气、还原吸气；组间休1-1.5分钟；组间小口补水共300-500ml",category:"训练",badges:["血压"]},
    {id:"t-1730",time:"17:30",title:"拉伸、补水、练后小补",details:"分次补水300-500ml；可小口温豆浆或1/3根香蕉；不立刻冷水澡、不立刻坐下刷手机",category:"训练",badges:[]},
    {id:"t-1800",time:"18:00",title:"休息后洗澡",details:"运动后休息20-30分钟再温水澡；水温不过烫",category:"休息",badges:["血压"]},
    {id:"t-1820",time:"18:20",title:"洗澡后整理 + 轻播客",details:"晾汗、整理；不刷短视频",category:"休息",badges:[]},
    {id:"t-1840",time:"18:40",title:"晚餐",details:"鱼虾/豆腐/豆制品 + 焯蔬菜 + 少量主食；七八分饱；练后已小补则主食略减；不饮酒、不喝浓肉汤/火锅汤",category:"饮食",badges:["尿酸","脾胃"]},
    {id:"t-1910",time:"19:10",title:"考研学习⑥：刷题/背诵/整理",details:"巩固型；50分钟必起身；不憋尿",category:"学习",badges:["颈椎","前列腺"]},
    {id:"t-2000",time:"20:00",title:"强制起身10分钟",details:"喝水150ml；走动、颈肩拉伸；排尿",category:"休息",badges:["颈椎","前列腺"]},
    {id:"t-2010",time:"20:10",title:"考研学习⑦",details:"难度低于晨间；不在此段死磕新难题",category:"学习",badges:["颈椎"]},
    {id:"t-2100",time:"21:00",title:"收尾/起身",details:"喝水100ml即可，之后只小口",category:"休息",badges:[]},
    {id:"t-2110",time:"21:10",title:"复盘、轻播客、放松",details:"屏幕调暖色/调暗；不处理高情绪信息",category:"休息",badges:["血压"]},
    {id:"t-2140",time:"21:40",title:"睡前准备",details:"洗漱、调暗灯光、泡脚或温和拉伸；睡前1小时不大量喝水；睡前排尿一次",category:"休息",badges:["前列腺"]},
    {id:"t-2220",time:"22:20",title:"上床酝酿",details:"4-7-8呼吸4-6轮或身体扫描；不刷手机；卧室暗、凉、安静",category:"睡眠",badges:["血压"]},
    {id:"t-2230",time:"22:30",title:"睡觉",details:"固定起床时间；夜间如醒不摸手机看时间",category:"睡眠",badges:[]}
  ];

  /**
   * 每周菜单（7 天 × 4 餐 = 28 餐次；加餐为训练日/休息日共享勾选位）
   * 遵循：鸡蛋 1—2 个/天（水煮/蒸蛋，不煎炸）；蛋白分散；不酒、不浓汤、不甜饮；
   * 主食好消化；蔬菜焯拌/清炒；汤为素汤少量且不喝汤底。
   */
  var WEEKLY_MENU = [
    {day:"周一",breakfast:"蒸蛋羹1个 + 小米粥1碗 + 无糖豆浆250ml + 焯拌菠菜",lunch:"米饭1拳 + 清蒸鲈鱼1掌 + 蒜蓉西兰花 + 番茄豆腐汤（素汤、少量、不喝汤底）",snackTraining:"香蕉半根 + 无糖酸奶100g",snackRest:"苹果半个",dinner:"杂粮饭半拳 + 豆腐炒虾仁 + 焯拌生菜",waterTraining:"约2600ml",waterRest:"约2200ml",badges:["脾胃","尿酸"]},
    {day:"周二",breakfast:"水煮蛋1个 + 全麦馒头半个 + 温牛奶250ml + 小番茄",lunch:"米饭1拳 + 鸡胸肉炒彩椒 + 清炒油麦菜 + 冬瓜汤（素汤、少量）",snackTraining:"全麦面包1片 + 温豆浆200ml",snackRest:"无糖酸奶100g",dinner:"小米粥1碗 + 清蒸鳕鱼 + 焯拌秋葵",waterTraining:"约2700ml",waterRest:"约2100ml",badges:["脾胃","尿酸"]},
    {day:"周三",breakfast:"蒸蛋羹1个 + 软燕麦粥1碗 + 无糖豆浆250ml + 焯拌黄瓜",lunch:"馒头1个 + 番茄炖豆腐 + 清炒西葫芦 + 紫菜汤（素汤、少量）",snackTraining:"苹果半个 + 无糖酸奶100g",snackRest:"坚果一小把",dinner:"山药粥1碗 + 白灼虾 + 焯拌西兰花",waterTraining:"约2500ml",waterRest:"约2000ml",badges:["脾胃","尿酸"]},
    {day:"周四",breakfast:"水煮蛋1个 + 蒸红薯1个 + 温牛奶250ml + 焯拌胡萝卜丝",lunch:"软杂粮饭1拳 + 清蒸鸡腿肉（去皮） + 蒜蓉菠菜 + 冬瓜虾皮汤（少量）",snackTraining:"香蕉半根 + 温豆浆200ml",snackRest:"苹果半个",dinner:"小米粥1碗 + 豆腐蒸蛋（用半个蛋） + 焯拌油麦菜",waterTraining:"约2600ml",waterRest:"约2200ml",badges:["脾胃","尿酸"]},
    {day:"周五",breakfast:"蒸蛋羹1个 + 小米粥1碗 + 无糖豆浆250ml + 焯拌木耳",lunch:"米饭1拳 + 清炒虾仁 + 蒜蓉西兰花 + 番茄豆腐汤（素汤、少量）",snackTraining:"全麦面包1片 + 无糖酸奶100g",snackRest:"无糖酸奶100g",dinner:"杂粮饭半拳 + 清蒸鲈鱼 + 焯拌生菜",waterTraining:"约2700ml",waterRest:"约2100ml",badges:["脾胃","尿酸"]},
    {day:"周六",breakfast:"水煮蛋1个 + 全麦馒头半个 + 温牛奶250ml + 小番茄",lunch:"馒头1个 + 鸡胸肉炒蘑菇 + 清炒小白菜 + 紫菜汤（素汤、少量）",snackTraining:"苹果半个 + 温豆浆200ml",snackRest:"香蕉半根",dinner:"山药粥1碗 + 白灼虾 + 焯拌菠菜",waterTraining:"约2500ml",waterRest:"约2000ml",badges:["脾胃","尿酸"]},
    {day:"周日",breakfast:"蒸蛋羹1个 + 软燕麦粥1碗 + 无糖豆浆250ml + 焯拌黄瓜",lunch:"米饭1拳 + 番茄炖豆腐 + 清炒西葫芦 + 冬瓜汤（素汤、少量）",snackTraining:"香蕉半根 + 无糖酸奶100g",snackRest:"坚果一小把",dinner:"小米粥1碗 + 清蒸鳕鱼 + 焯拌秋葵",waterTraining:"约2600ml",waterRest:"约2200ml",badges:["脾胃","尿酸"]}
  ];

  /** 菜单 key：mon/tue/... + breakfast/lunch/snackTraining/snackRest/dinner */
  var MENU_DAY_CODES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  var MENU_TOTAL = 28; // 7 天 × 4 餐（加餐共享 1 个勾选位）

  /* ---------------- 日期 / 时间工具 ---------------- */

  /**
   * 本地时区日期键。禁止 toISOString（UTC 偏移会跨日错位）。
   */
  function localDateKey(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  /**
   * “现在”。测试钩子：window.__SCHEDULE_TEST_NOW__ = "HH:MM"
   * 仅覆盖时分，日期仍取真实本地日期。
   */
  function getNow() {
    var t = (typeof window !== "undefined" && window.__SCHEDULE_TEST_NOW__) || null;
    if (t) {
      var parts = String(t).split(":");
      var d = new Date();
      d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
      return d;
    }
    return new Date();
  }

  function timeToMin(t) {
    var p = t.split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function minToTime(m) {
    var v = Math.max(0, Math.min(23 * 60 + 59, m));
    return pad2(Math.floor(v / 60)) + ":" + pad2(v % 60);
  }

  /** 合法 "HH:MM" → 原值；否则 null */
  function validTime(t) {
    if (typeof t !== "string") {
      return null;
    }
    var v = t.trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(v)) {
      return null;
    }
    return v;
  }

  /** 开始时间 + 分钟数（不超过 23:59） */
  function addMinutes(start, mins) {
    return minToTime(timeToMin(start) + mins);
  }

  function formatHM(d) {
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function weekdayCN(d) {
    return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  }

  /** 时间段时长（分钟），跨零点按 +1 天算 */
  function durMin(start, end) {
    var m = timeToMin(end) - timeToMin(start);
    if (m <= 0) {
      m += 24 * 60;
    }
    return m;
  }

  /** "1 小时 30 分" 形式的时长文案 */
  function durText(start, end) {
    var m = durMin(start, end);
    var h = Math.floor(m / 60);
    var r = m % 60;
    if (h && r) {
      return h + " 小时 " + r + " 分";
    }
    if (h) {
      return h + " 小时";
    }
    return m + " 分钟";
  }

  /* ---------------- 存储（全部 try/catch） ---------------- */

  function storageGet() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn("[一日计划] localStorage 读取失败，改用内存存储。", e);
      return null;
    }
  }

  function storageSet(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
      return true;
    } catch (e) {
      console.warn("[一日计划] 一日计划写入失败，状态仅保存在内存中。", e);
      return false;
    }
  }

  /* ---------------- 时段数据：默认值 / 校验 / 排序 ---------------- */

  function newId() {
    return "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  /** 由默认 TRAINING 推导时间段：start = time，end = 下一条的 time（末条到 23:59） */
  function buildDefaultSchedule() {
    return TRAINING.map(function (item, i) {
      var next = TRAINING[i + 1];
      return {
        id: item.id,
        start: item.time,
        end: next ? next.time : "23:59",
        title: item.title,
        details: item.details,
        category: item.category,
        badges: item.badges.slice()
      };
    });
  }

  /** 校验并修补单个时段；时间非法则返回 null（丢弃该条） */
  function sanitizeItem(raw, index, seen) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    var start = validTime(raw.start) || validTime(raw.time);
    if (!start) {
      return null;
    }
    var end = validTime(raw.end);
    if (!end || (timeToMin(end) - timeToMin(start)) <= 0) {
      end = addMinutes(start, DEFAULT_DURATION);
    }
    var id = typeof raw.id === "string" && raw.id && !seen[raw.id]
      ? raw.id
      : "c-" + (index + 1) + "-" + Math.random().toString(36).slice(2, 6);
    seen[id] = true;

    var title = typeof raw.title === "string" ? raw.title.replace(/\s+$/, "") : "";
    return {
      id: id,
      start: start,
      end: end,
      title: title,
      details: typeof raw.details === "string" ? raw.details : "",
      category: CATEGORIES.indexOf(raw.category) > -1 ? raw.category : "学习",
      badges: Array.isArray(raw.badges) ? raw.badges.filter(function (b) {
        return typeof b === "string" && b;
      }) : []
    };
  }

  function sanitizeSchedule(raw) {
    if (!Array.isArray(raw)) {
      return null;
    }
    var seen = {};
    var out = [];
    raw.forEach(function (item, i) {
      var clean = sanitizeItem(item, i, seen);
      if (clean) {
        out.push(clean);
      }
    });
    return out;
  }

  /** 按开始时间排序（同开始时间按结束时间），并写回 state */
  function sortSchedule() {
    state.schedule.sort(function (a, b) {
      var d = timeToMin(a.start) - timeToMin(b.start);
      return d !== 0 ? d : timeToMin(a.end) - timeToMin(b.end);
    });
  }

  /* ---------------- 状态 ---------------- */

  function defaultState() {
    return {
      version: STORAGE_VERSION,
      date: localDateKey(),
      mode: "daily",
      completed: { daily: {}, menu: {} },
      schedule: buildDefaultSchedule()
    };
  }

  /* -------- 旧数据迁移（v1/v2 → v3，必须不报错） -------- */

  /** mode 映射："training"→"daily"，"rest"→"menu"，其余非法值回退 "daily" */
  function normalizeMode(m) {
    if (m === "training") return "daily";
    if (m === "rest") return "menu";
    if (m === "daily" || m === "menu") return m;
    return "daily";
  }

  /**
   * completed 映射：
   *   training → daily（保留 t-* 打卡）
   *   rest     → 丢弃（r-* 与菜单餐次无对应关系，menu 初始化为空）
   */
  function normalizeCompleted(src) {
    var out = { daily: {}, menu: {} };
    if (!src || typeof src !== "object") {
      return out;
    }
    if (src.daily && typeof src.daily === "object") {
      out.daily = Object.assign({}, src.daily);
    }
    if (src.menu && typeof src.menu === "object") {
      out.menu = Object.assign({}, src.menu);
    }
    if (src.training && typeof src.training === "object") {
      out.daily = Object.assign({}, out.daily, src.training);
    }
    /* src.rest 有意丢弃，不做映射 */
    return out;
  }

  function loadState() {
    var raw = storageGet();
    if (raw === null) {
      return defaultState();
    }
    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn("[一日计划] 存储数据损坏，已重置为今日。", e);
      return defaultState();
    }
    var state = defaultState();
    var today = localDateKey();
    if (parsed && typeof parsed === "object") {
      state.mode = normalizeMode(parsed.mode);
      // 日期不是今天：两个视图的完成状态全部清空，mode 与自定义时段保留
      if (parsed.date === today) {
        state.completed = normalizeCompleted(parsed.completed);
      }
      // 自定义时段：缺失或损坏时用默认计划；空数组视为用户主动清空，予以保留
      var schedule = sanitizeSchedule(parsed.schedule);
      if (schedule) {
        state.schedule = schedule;
      }
    }
    return state;
  }

  var state = loadState();

  function persist() {
    storageSet(JSON.stringify(state));
  }

  persist(); // 启动即回写：跨日重置结果 + 迁移后的新结构

  var els = {};
  var editing = false;          // 编辑态：只在内存中，刷新后回到只读
  var lastRenderedHM = "";
  var resetTimer = null;
  var restoreTimer = null;
  var armedDelete = { btn: null, id: null, timer: null };
  var persistTimer = null;
  var focusAfterRender = null;  // 新增时段后要聚焦的 id
  var pendingScrollId = null;   // 新增时段后要滚动到的 id

  function dailyTasks() {
    return state.schedule;
  }

  /** 单个时段相对现在的位置：past / current / future */
  function statusOf(item, nowMin) {
    var s = timeToMin(item.start);
    var e = timeToMin(item.end);
    if (e <= s) {
      e += 24 * 60; // 跨零点
    }
    if (nowMin < s) {
      return "future";
    }
    return nowMin < e ? "current" : "past";
  }

  /** 当前时段（多个重叠时取第一个）；没有则 null */
  function findCurrent(tasks, nowMin) {
    for (var i = 0; i < tasks.length; i++) {
      if (statusOf(tasks[i], nowMin) === "current") {
        return tasks[i];
      }
    }
    return null;
  }

  /** 下一个尚未开始的时段；没有则 null */
  function findNext(tasks, nowMin) {
    for (var i = 0; i < tasks.length; i++) {
      if (timeToMin(tasks[i].start) > nowMin) {
        return tasks[i];
      }
    }
    return null;
  }

  /* ---------------- 渲染：通用小件 ---------------- */

  function partOf(time) {
    var h = parseInt(time.split(":")[0], 10);
    if (h < 8) return "清晨";
    if (h < 12) return "上午";
    if (h < 14) return "午间";
    if (h < 17) return "下午";
    if (h < 19) return "傍晚";
    if (h < 22) return "晚间";
    return "睡前";
  }

  var PART_RANGE = {
    "清晨": "05:00 — 08:00",
    "上午": "08:00 — 12:00",
    "午间": "12:00 — 14:00",
    "下午": "14:00 — 17:00",
    "傍晚": "17:00 — 19:00",
    "晚间": "19:00 — 22:00",
    "睡前": "22:00 — 24:00"
  };

  function makePartHeader(part) {
    var div = document.createElement("div");
    div.className = "day-part";
    div.textContent = part + " · " + PART_RANGE[part];
    return div;
  }

  function makeChip(text, cls) {
    var chip = document.createElement("span");
    chip.className = "chip " + cls;
    chip.textContent = text;
    chip.hidden = true;
    return chip;
  }

  function makeBadge(label) {
    var b = document.createElement("span");
    b.className = "badge";
    b.setAttribute("data-badge", label);
    b.textContent = label;
    return b;
  }

  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7.5"/></svg>';
  var TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V5h5v2M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7M10.5 11v6M13.5 11v6"/></svg>';

  /* ---------------- 渲染：每日计划（只读视图） ---------------- */

  function makeCard(item) {
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", "false");
    card.setAttribute("aria-label", item.start + " 至 " + item.end + " " + item.title);
    card.tabIndex = 0;
    card.dataset.id = item.id;

    var timeCol = document.createElement("div");
    timeCol.className = "task-time";
    var timeEl = document.createElement("span");
    timeEl.className = "time";
    timeEl.textContent = item.start;
    timeCol.appendChild(timeEl);
    var endEl = document.createElement("span");
    endEl.className = "time-end";
    endEl.textContent = "– " + item.end;
    timeCol.appendChild(endEl);
    timeCol.appendChild(makeChip("已过", "chip-past"));
    card.appendChild(timeCol);

    var body = document.createElement("div");
    body.className = "task-body";

    var titleRow = document.createElement("div");
    titleRow.className = "task-title-row";
    var title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = item.title || "未命名时段";
    titleRow.appendChild(title);
    titleRow.appendChild(makeChip("当前", "chip-current"));
    body.appendChild(titleRow);

    var meta = document.createElement("div");
    meta.className = "task-meta";
    var cat = document.createElement("span");
    cat.className = "cat";
    cat.setAttribute("data-cat", item.category);
    cat.textContent = item.category;
    meta.appendChild(cat);
    item.badges.forEach(function (b) {
      meta.appendChild(makeBadge(b));
    });
    var dur = document.createElement("span");
    dur.className = "dur";
    dur.textContent = durText(item.start, item.end);
    meta.appendChild(dur);
    body.appendChild(meta);

    if (item.details) {
      var details = document.createElement("p");
      details.className = "task-details";
      details.textContent = item.details;
      body.appendChild(details);
    }
    card.appendChild(body);

    var check = document.createElement("span");
    check.className = "task-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = CHECK_SVG;
    card.appendChild(check);

    card.addEventListener("click", function (e) {
      if (editing || e.target.closest("button, a, input, textarea, select")) {
        return;
      }
      handleDailyToggle(item.id);
    });

    card.addEventListener("keydown", function (e) {
      if (editing) {
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleDailyToggle(item.id);
      }
    });

    return card;
  }

  /* ---------------- 渲染：每日计划（编辑态表单） ---------------- */

  function makeFieldInput(field, value, placeholder, cls) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = "edit-field" + (cls ? " " + cls : "");
    input.value = value || "";
    input.placeholder = placeholder;
    input.dataset.field = field;
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    return input;
  }

  function makeEditCard(item) {
    var card = document.createElement("article");
    card.className = "task-card is-editing";
    card.dataset.id = item.id;

    /* 时间段：开始 — 结束 — 删除 */
    var timeRow = document.createElement("div");
    timeRow.className = "edit-time-row";

    var startInput = document.createElement("input");
    startInput.type = "time";
    startInput.className = "edit-field edit-time-input";
    startInput.value = item.start;
    startInput.dataset.field = "start";
    startInput.setAttribute("aria-label", "开始时间");

    var dash = document.createElement("span");
    dash.className = "edit-dash";
    dash.textContent = "—";

    var endInput = document.createElement("input");
    endInput.type = "time";
    endInput.className = "edit-field edit-time-input";
    endInput.value = item.end;
    endInput.dataset.field = "end";
    endInput.setAttribute("aria-label", "结束时间");

    var del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn edit-del";
    del.setAttribute("aria-label", "删除这个时段，需点两次确认");
    del.innerHTML = TRASH_SVG;
    del.addEventListener("click", function (e) {
      e.stopPropagation();
      handleDelete(del, item.id);
    });

    timeRow.appendChild(startInput);
    timeRow.appendChild(dash);
    timeRow.appendChild(endInput);
    timeRow.appendChild(del);

    /* 做什么 */
    var titleInput = makeFieldInput("title", item.title, "做什么？例如：背单词 / 力量训练", "edit-title-input");
    titleInput.setAttribute("data-focus-id", item.id);

    /* 备注 */
    var detailsInput = document.createElement("textarea");
    detailsInput.className = "edit-field";
    detailsInput.rows = 2;
    detailsInput.value = item.details || "";
    detailsInput.placeholder = "备注（可选）";
    detailsInput.dataset.field = "details";

    /* 分类 + 时长 */
    var footRow = document.createElement("div");
    footRow.className = "edit-foot-row";

    var select = document.createElement("select");
    select.className = "edit-field edit-cat";
    select.dataset.field = "category";
    select.setAttribute("aria-label", "分类");
    CATEGORIES.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
    select.value = item.category;

    var durEl = document.createElement("span");
    durEl.className = "edit-dur";
    durEl.textContent = durText(item.start, item.end);

    footRow.appendChild(select);
    footRow.appendChild(durEl);

    card.appendChild(timeRow);
    card.appendChild(titleInput);
    card.appendChild(detailsInput);
    card.appendChild(footRow);

    /* 文本类字段：边输边存（不重绘，避免丢焦点） */
    card.addEventListener("input", function (e) {
      var field = e.target.dataset ? e.target.dataset.field : null;
      if (field === "title") {
        item.title = e.target.value;
        schedulePersist();
      } else if (field === "details") {
        item.details = e.target.value;
        autoGrow(e.target);
        schedulePersist();
      }
    });

    /* 时间 / 分类：失焦或选定后提交并纠正非法区间 */
    card.addEventListener("change", function (e) {
      var field = e.target.dataset ? e.target.dataset.field : null;
      if (field === "start" || field === "end") {
        commitTime(item, field, e.target.value, startInput, endInput, durEl);
      } else if (field === "category") {
        item.category = e.target.value;
        schedulePersist();
      }
    });

    return card;
  }

  /** 提交时间修改：保证 end > start，非法输入回退 */
  function commitTime(item, field, value, startInput, endInput, durEl) {
    var v = validTime(value);
    if (!v) {
      startInput.value = item.start;
      endInput.value = item.end;
      announce("时间格式不对，已还原");
      return;
    }
    if (field === "start") {
      item.start = v;
      if (timeToMin(item.end) <= timeToMin(v)) {
        item.end = addMinutes(v, DEFAULT_DURATION);
      }
    } else {
      item.end = v;
      if (timeToMin(v) <= timeToMin(item.start)) {
        item.end = addMinutes(item.start, DEFAULT_DURATION);
      }
    }
    startInput.value = item.start;
    endInput.value = item.end;
    durEl.textContent = durText(item.start, item.end);
    schedulePersist();
    announce("已改为 " + item.start + " — " + item.end);
  }

  function autoGrow(ta) {
    try {
      ta.style.height = "auto";
      ta.style.height = Math.max(52, ta.scrollHeight) + "px";
    } catch (e) { /* 忽略 */ }
  }

  function growTextareas(root) {
    Array.prototype.forEach.call(root.querySelectorAll("textarea.edit-field"), autoGrow);
  }

  function makeAddButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "add-btn";
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>添加时间段</span>';
    btn.addEventListener("click", function () {
      playSound("tick");
      addItem();
    });
    return btn;
  }

  function renderList() {
    var listEl = els.taskList;
    listEl.textContent = "";
    var tasks = dailyTasks();
    var frag = document.createDocumentFragment();

    if (!tasks.length) {
      var empty = document.createElement("div");
      empty.className = "plan-empty";
      empty.textContent = editing
        ? "还没有任何时段。点下面的「添加时间段」开始安排。"
        : "还没有任何安排。点右上角「编辑」就能添加时间段。";
      frag.appendChild(empty);
    } else if (editing) {
      tasks.forEach(function (item) {
        frag.appendChild(makeEditCard(item));
      });
    } else {
      var lastPart = null;
      tasks.forEach(function (item) {
        var part = partOf(item.start);
        if (part !== lastPart) {
          lastPart = part;
          frag.appendChild(makePartHeader(part));
        }
        frag.appendChild(makeCard(item));
      });
    }

    if (editing) {
      frag.appendChild(makeAddButton());
    }

    listEl.appendChild(frag);
    growTextareas(listEl);

    if (focusAfterRender) {
      var target = listEl.querySelector('[data-focus-id="' + focusAfterRender + '"]');
      focusAfterRender = null;
      if (target) {
        try {
          target.focus({ preventScroll: true });
        } catch (e) {
          target.focus();
        }
      }
    }
    if (pendingScrollId) {
      var scrollTarget = listEl.querySelector('[data-id="' + pendingScrollId + '"]');
      pendingScrollId = null;
      if (scrollTarget) {
        safeScrollIntoView(scrollTarget);
      }
    }
  }

  function renderStates() {
    if (state.mode !== "daily" || editing) {
      return;
    }
    var tasks = dailyTasks();
    var nowMin = timeToMin(formatHM(getNow()));
    var map = {};
    tasks.forEach(function (t) {
      map[t.id] = statusOf(t, nowMin);
    });

    els.taskList.querySelectorAll(".task-card").forEach(function (card) {
      var id = card.dataset.id;
      var st = map[id] || "future";
      var done = !!state.completed.daily[id];

      card.classList.toggle("done", done);
      card.classList.toggle("current", st === "current");
      card.classList.toggle("past", !done && st === "past");
      card.setAttribute("aria-checked", done ? "true" : "false");

      var chipCur = card.querySelector(".chip-current");
      var chipPast = card.querySelector(".chip-past");
      if (chipCur) {
        chipCur.hidden = st !== "current";
      }
      if (chipPast) {
        chipPast.hidden = !(!done && st === "past");
      }
    });
  }

  /* ---------------- 渲染：每周菜单 ---------------- */

  /** 加餐共享勾选位：返回该行对应的一个或两个存储键 */
  function mealKeys(id) {
    if (id.slice(-6) === "-snack") {
      return [id + "Training", id + "Rest"];
    }
    return [id];
  }

  function isMealDone(id) {
    return mealKeys(id).some(function (k) {
      return !!state.completed.menu[k];
    });
  }

  function menuEatenCount() {
    var n = 0;
    MENU_DAY_CODES.forEach(function (code) {
      ["breakfast", "lunch", "dinner"].forEach(function (meal) {
        if (state.completed.menu[code + "-" + meal]) {
          n++;
        }
      });
      if (state.completed.menu[code + "-snackTraining"] || state.completed.menu[code + "-snackRest"]) {
        n++; // 训练日/休息日加餐共享一个勾选位，只计 1 次
      }
    });
    return n;
  }

  function makeMenuCheck() {
    var check = document.createElement("span");
    check.className = "menu-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = CHECK_SVG;
    return check;
  }

  function makeMealRow(id, label, text) {
    var row = document.createElement("li");
    row.className = "menu-row";
    row.setAttribute("role", "checkbox");
    row.setAttribute("aria-checked", "false");
    row.setAttribute("aria-label", label + "：" + text);
    row.tabIndex = 0;
    row.dataset.id = id;

    row.appendChild(makeMenuCheck());

    var body = document.createElement("div");
    body.className = "menu-row-body";
    var lab = document.createElement("span");
    lab.className = "menu-label";
    lab.textContent = label;
    body.appendChild(lab);
    var p = document.createElement("p");
    p.className = "menu-text";
    p.textContent = text;
    body.appendChild(p);
    row.appendChild(body);

    row.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) {
        return;
      }
      handleMealToggle(id);
    });
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleMealToggle(id);
      }
    });

    return row;
  }

  function makeSnackRow(code, snackTraining, snackRest) {
    var id = code + "-snack";
    var row = document.createElement("li");
    row.className = "menu-row menu-row-snack";
    row.setAttribute("role", "checkbox");
    row.setAttribute("aria-checked", "false");
    row.setAttribute("aria-label", "加餐（训练日/休息日共享勾选）");
    row.tabIndex = 0;
    row.dataset.id = id;

    row.appendChild(makeMenuCheck());

    var body = document.createElement("div");
    body.className = "menu-row-body";
    var grid = document.createElement("div");
    grid.className = "menu-snack-grid";

    [["训练日加餐", snackTraining], ["休息日加餐", snackRest]].forEach(function (pair) {
      var item = document.createElement("div");
      item.className = "menu-snack-item";
      item.setAttribute("data-snack", pair[0] === "训练日加餐" ? "training" : "rest");
      var lab = document.createElement("span");
      lab.className = "menu-snack-label";
      lab.textContent = pair[0];
      item.appendChild(lab);
      var p = document.createElement("p");
      p.className = "menu-snack-text";
      p.textContent = pair[1];
      item.appendChild(p);
      grid.appendChild(item);
    });

    body.appendChild(grid);
    row.appendChild(body);

    row.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) {
        return;
      }
      handleMealToggle(id);
    });
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleMealToggle(id);
      }
    });

    return row;
  }

  function makeMenuCard(menuItem, code) {
    var card = document.createElement("article");
    card.className = "menu-card";

    var head = document.createElement("header");
    head.className = "menu-card-head";
    var day = document.createElement("h3");
    day.className = "menu-day";
    day.textContent = menuItem.day;
    head.appendChild(day);
    var badges = document.createElement("div");
    badges.className = "menu-badges";
    menuItem.badges.forEach(function (b) {
      badges.appendChild(makeBadge(b));
    });
    head.appendChild(badges);
    card.appendChild(head);

    var rows = document.createElement("ul");
    rows.className = "menu-rows";
    rows.appendChild(makeMealRow(code + "-breakfast", "早餐", menuItem.breakfast));
    rows.appendChild(makeMealRow(code + "-lunch", "午餐", menuItem.lunch));
    rows.appendChild(makeSnackRow(code, menuItem.snackTraining, menuItem.snackRest));
    rows.appendChild(makeMealRow(code + "-dinner", "晚餐", menuItem.dinner));
    card.appendChild(rows);

    var foot = document.createElement("footer");
    foot.className = "menu-card-foot";
    var water = document.createElement("span");
    water.className = "menu-water";
    water.textContent = "训练日 " + menuItem.waterTraining + " · 休息日 " + menuItem.waterRest;
    foot.appendChild(water);
    var hint = document.createElement("span");
    hint.className = "menu-foot-hint";
    hint.textContent = "少量多次";
    foot.appendChild(hint);
    card.appendChild(foot);

    return card;
  }

  function renderMenu() {
    var listEl = els.taskList;
    listEl.textContent = "";
    var frag = document.createDocumentFragment();
    WEEKLY_MENU.forEach(function (item, i) {
      frag.appendChild(makeMenuCard(item, MENU_DAY_CODES[i]));
    });
    listEl.appendChild(frag);
  }

  function renderMenuStates() {
    if (state.mode !== "menu") {
      return;
    }
    els.taskList.querySelectorAll(".menu-row").forEach(function (row) {
      var done = isMealDone(row.dataset.id);
      row.classList.toggle("done", done);
      row.setAttribute("aria-checked", done ? "true" : "false");
    });
  }

  /* ---------------- 渲染：进度 / 预告 / FAB / 编辑态 ---------------- */

  function renderProgress() {
    var total;
    var done;
    if (state.mode === "daily") {
      var tasks = dailyTasks();
      total = tasks.length;
      done = tasks.filter(function (t) {
        return !!state.completed.daily[t.id];
      }).length;
      els.progressTrack.setAttribute("aria-label", "每日计划完成进度");
    } else {
      total = MENU_TOTAL;
      done = menuEatenCount();
      els.progressTrack.setAttribute("aria-label", "每周菜单进度（已吃餐次）");
    }
    var pct = total ? Math.round((done / total) * 100) : 0;

    els.progressText.textContent = done + "/" + total;
    els.progressPct.textContent = pct + "%";
    els.progressFill.style.width = pct + "%";
    els.progressTrack.setAttribute("aria-valuenow", String(pct));
  }

  function renderNow() {
    if (state.mode !== "daily" || editing) {
      return;
    }
    var tasks = dailyTasks();
    var card = els.nowCard;

    if (!tasks.length) {
      card.hidden = true;
      return;
    }
    card.hidden = false;

    var nowMin = timeToMin(formatHM(getNow()));
    var cur = findCurrent(tasks, nowMin);

    card.classList.remove("is-next", "is-done", "is-ended");

    if (cur) {
      var done = !!state.completed.daily[cur.id];
      card.classList.toggle("is-done", done);
      card.dataset.scrollId = cur.id;
      card.setAttribute("aria-label", "当前时段 " + cur.start + " " + cur.title + "，点击定位");
      els.nowStatus.textContent = done ? "当前 · 已完成" : "当前";
      els.nowTime.textContent = cur.start;
      els.nowTitle.textContent = cur.title || "未命名时段";
      els.nowDetails.textContent = cur.details || "";
      els.nowMeta.textContent = "进行至 " + cur.end + " · 共 " + durText(cur.start, cur.end);
      return;
    }

    var next = findNext(tasks, nowMin);
    if (next) {
      card.classList.add("is-next");
      card.dataset.scrollId = next.id;
      card.setAttribute("aria-label", "下一项 " + next.start + " " + next.title + "，点击定位");
      els.nowStatus.textContent = "下一项";
      els.nowTime.textContent = next.start;
      els.nowTitle.textContent = next.title || "未命名时段";
      els.nowDetails.textContent = next.details || "";
      var gap = timeToMin(next.start) - nowMin;
      els.nowMeta.textContent = "还有 " + gap + " 分钟开始 · 至 " + next.end;
      return;
    }

    /* 全部时段都已结束 */
    var last = tasks[tasks.length - 1];
    card.classList.add("is-ended");
    card.dataset.scrollId = last.id;
    card.setAttribute("aria-label", "今日安排已结束，最后一项 " + last.title);
    els.nowStatus.textContent = "已结束";
    els.nowTime.textContent = last.end;
    els.nowTitle.textContent = "今日安排已走完";
    els.nowDetails.textContent = "";
    els.nowMeta.textContent = "共 " + tasks.length + " 个时段 · 点「编辑」可继续调整";
  }

  function renderFab() {
    var hidden = true;
    if (state.mode === "daily" && !editing) {
      var tasks = dailyTasks();
      var nowMin = timeToMin(formatHM(getNow()));
      hidden = !findCurrent(tasks, nowMin);
    }
    els.fab.hidden = hidden;
  }

  function renderDate() {
    var now = new Date();
    els.appDate.textContent = localDateKey(now) + " · " + weekdayCN(now);
  }

  function renderModeButtons() {
    els.modeButtons.forEach(function (btn) {
      var active = btn.dataset.mode === state.mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderClock() {
    els.appClock.textContent = formatHM(getNow());
    lastRenderedHM = els.appClock.textContent;
  }

  /** 编辑按钮 / 编辑栏 的显隐与文案 */
  function renderEditUi() {
    var editable = state.mode === "daily";
    if (!editable && editing) {
      editing = false; // 切到菜单视图时自动退出编辑态
    }
    els.editBtn.hidden = !editable;
    els.editBtn.setAttribute("aria-pressed", editing ? "true" : "false");
    els.editLabel.textContent = editing ? "完成" : "编辑";
    els.editBar.hidden = !(editable && editing);
    document.body.classList.toggle("is-editing", editable && editing);
  }

  function renderAll() {
    detachHaptics(); // 重绘前：旧节点 detach，防止 label/switch 累积
    renderDate();
    renderModeButtons();
    renderEditUi();
    if (state.mode === "daily") {
      els.nowCard.hidden = editing;
      els.listHeading.textContent = editing ? "编辑今日安排" : "今日安排";
      renderList();
      renderStates();
    } else {
      els.nowCard.hidden = true;
      els.listHeading.textContent = "本周菜单 · 28 餐次";
      renderMenu();
      renderMenuStates();
    }
    renderProgress();
    renderNow();
    renderFab();
    renderClock();
    mountHaptics();
  }

  /**
   * 常驻跨日检查：日期一变就清空两个视图的完成状态、更新 date 并回写存储。
   * mode 与自定义时段保留。返回是否发生了跨日。
   */
  function ensureToday() {
    var today = localDateKey();
    if (today !== state.date) {
      state.date = today;
      state.completed = { daily: {}, menu: {} };
      persist();
      renderDate();
      renderStates();
      renderMenuStates();
      renderProgress();
      renderNow();
      renderFab();
      announce("新的一天，今日打卡已自动重置");
      return true;
    }
    return false;
  }

  /** 时间流逝引起的轻量刷新：不动列表结构，只更新状态与文案 */
  function tick() {
    var dayChanged = ensureToday();
    var hm = formatHM(getNow());
    if (dayChanged || hm !== lastRenderedHM) {
      lastRenderedHM = hm;
      els.appClock.textContent = hm;
      if (!dayChanged && !editing) {
        renderStates();
        renderNow();
        renderFab();
      }
    }
  }

  /* ---------------- 交互 ---------------- */

  /* ============ 震动 + 音效集成（与打卡逻辑解耦，任何一方失败不阻断打卡） ============ */

  function playSound(type) {
    if (!window.ScheduleSounds) {
      return;
    }
    try {
      window.ScheduleSounds.play(type);
    } catch (e) { /* 静默：音效失败不影响打卡 */ }
  }

  /** 每日计划任务卡点击：状态恰好翻转一次（震动由透明 label 原生触发，无需手动调用） */
  function handleDailyToggle(id) {
    toggleTask(id);
    playSound(state.completed.daily[id] ? "complete" : "uncomplete");
  }

  /** 每周菜单餐次行点击：状态恰好翻转一次（含加餐共享勾选位） */
  function handleMealToggle(id) {
    toggleMeal(id);
    playSound(isMealDone(id) ? "complete" : "uncomplete");
  }

  /** 渲染前：对旧节点显式 detach（移除 label + switch），避免 DOM 累积 */
  function detachHaptics() {
    if (!window.ScheduleHaptics) {
      return;
    }
    try {
      document.querySelectorAll(".schedule-haptic-label").forEach(function (l) {
        try {
          window.ScheduleHaptics.detach(l.parentElement);
        } catch (e) { /* 忽略 */ }
      });
      /* 兜底：清理 label 已不在 DOM 的孤儿 switch */
      document.querySelectorAll(".schedule-haptic-switch").forEach(function (sw) {
        var lab = document.querySelector('label[for="' + sw.id + '"]');
        if (!lab || !lab.isConnected) {
          try {
            if (sw.parentNode) sw.parentNode.removeChild(sw);
          } catch (e) { /* 忽略 */ }
        }
      });
    } catch (e) { /* 静默：震动清理失败不影响打卡 */ }
  }

  /** 渲染完成后：为当前视图的全部可点击元素 attach 震动反馈层 */
  function mountHaptics() {
    if (!window.ScheduleHaptics) {
      return;
    }
    try {
      els.modeButtons.forEach(function (b) {
        window.ScheduleHaptics.attach(b);
      });
      window.ScheduleHaptics.attach(els.resetBtn);
      window.ScheduleHaptics.attach(els.editBtn);
      window.ScheduleHaptics.attach(els.restoreBtn);
      window.ScheduleHaptics.attach(els.fab);
      if (editing) {
        /* 编辑态卡片里是输入控件，不挂震动层（透明 label 会挡住点击） */
        var addBtn = els.taskList.querySelector(".add-btn");
        if (addBtn) {
          window.ScheduleHaptics.attach(addBtn);
        }
      } else if (state.mode === "daily") {
        els.taskList.querySelectorAll(".task-card").forEach(function (c) {
          window.ScheduleHaptics.attach(c);
        });
      } else {
        els.taskList.querySelectorAll(".menu-row").forEach(function (r) {
          window.ScheduleHaptics.attach(r);
        });
      }
    } catch (e) { /* 静默：震动挂载失败不影响打卡 */ }
  }

  function toggleTask(id) {
    var map = state.completed.daily;
    if (map[id]) {
      delete map[id];
    } else {
      map[id] = true;
    }
    persist();
    renderStates();
    renderProgress();
    renderNow();
  }

  function toggleMeal(id) {
    var keys = mealKeys(id);
    var done = keys.some(function (k) {
      return !!state.completed.menu[k];
    });
    keys.forEach(function (k) {
      if (done) {
        delete state.completed.menu[k];
      } else {
        state.completed.menu[k] = true;
      }
    });
    persist();
    renderMenuStates();
    renderProgress();
  }

  function scrollToTask(id) {
    var el = id ? document.querySelector('[data-id="' + id + '"]') : null;
    if (!el) {
      return false;
    }
    safeScrollIntoView(el);
    return true;
  }

  /** 滚动定位（部分环境 / 老旧内核没有 scrollIntoView，失败不报错） */
  function safeScrollIntoView(el) {
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) { /* 静默 */ }
  }

  /* -------- 编辑态：进入 / 退出 -------- */

  function setEditing(on) {
    if (editing === on) {
      return;
    }
    editing = on;
    disarmDelete();

    if (on) {
      playSound("tick");
      renderAll();
      announce("编辑模式已开启：可修改时间段、内容，或添加删除时段");
      return;
    }

    /* 退出编辑：补齐空标题 → 按时间排序 → 保存 */
    var fixed = 0;
    state.schedule.forEach(function (item) {
      if (!item.title || !item.title.trim()) {
        item.title = "未命名时段";
        fixed++;
      } else {
        item.title = item.title.trim();
      }
    });
    sortSchedule();
    persist();
    playSound("tick");
    renderAll();
    announce(fixed ? "已保存，空白标题已补为「未命名时段」" : "已保存，按时段顺序排好了");
  }

  /* -------- 编辑态：增删 / 恢复默认 / 防误删 -------- */

  /** 写盘节流：输入框连续输入时不必每次落盘 */
  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      persist();
    }, 300);
  }

  function addItem() {
    if (!editing) {
      return;
    }
    var last = state.schedule[state.schedule.length - 1];
    var start = last ? last.end : "07:00";
    var end = addMinutes(start, 60);
    var item = {
      id: newId(),
      start: start,
      end: end,
      title: "",
      details: "",
      category: "学习",
      badges: []
    };
    state.schedule.push(item);
    persist();
    focusAfterRender = item.id;
    pendingScrollId = item.id;
    renderAll();
    announce("已添加时段 " + start + " — " + end + "，可直接填写内容");
  }

  function removeItem(id) {
    var idx = -1;
    state.schedule.forEach(function (it, i) {
      if (it.id === id) {
        idx = i;
      }
    });
    if (idx < 0) {
      return;
    }
    var removed = state.schedule.splice(idx, 1)[0];
    delete state.completed.daily[id];
    persist();
    renderAll();
    announce("已删除「" + (removed.title || "未命名时段") + "」");
  }

  function handleDelete(btn, id) {
    if (armedDelete.btn === btn) {
      disarmDelete();
      playSound("tick");
      removeItem(id);
      return;
    }
    disarmDelete();
    armedDelete.btn = btn;
    armedDelete.id = id;
    btn.classList.add("is-armed");
    playSound("tick");
    announce("再点一次即可删除该时段");
    armedDelete.timer = setTimeout(disarmDelete, 3500);
  }

  function disarmDelete() {
    if (armedDelete.timer) {
      clearTimeout(armedDelete.timer);
    }
    if (armedDelete.btn) {
      armedDelete.btn.classList.remove("is-armed");
    }
    armedDelete = { btn: null, id: null, timer: null };
  }

  function armRestore() {
    els.restoreBtn.classList.add("is-armed");
    els.restoreBtn.dataset.arm = "1";
    els.restoreBtn.textContent = "确认恢复?";
    announce("再点一次将把今日安排恢复为默认 35 个时段");
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(disarmRestore, 3500);
  }

  function disarmRestore() {
    clearTimeout(restoreTimer);
    restoreTimer = null;
    els.restoreBtn.classList.remove("is-armed");
    els.restoreBtn.dataset.arm = "";
    els.restoreBtn.textContent = "恢复默认";
  }

  function restoreDefault() {
    state.schedule = buildDefaultSchedule();
    persist();
    disarmRestore();
    renderAll();
    announce("已恢复默认计划");
  }

  function armReset() {
    els.resetBtn.classList.add("is-armed");
    els.resetBtn.dataset.arm = "1";
    els.resetLabel.textContent = "确认重置?";
    announce("已进入重置确认：再次点击将清空当前视图（" + MODE_LABELS[state.mode] + "）的打卡");
    clearTimeout(resetTimer);
    resetTimer = setTimeout(disarmReset, 3500);
  }

  function disarmReset() {
    clearTimeout(resetTimer);
    resetTimer = null;
    els.resetBtn.classList.remove("is-armed");
    els.resetBtn.dataset.arm = "";
    els.resetLabel.textContent = "重置";
  }

  function resetToday() {
    /* 只清空当前视图，不影响另一个视图 */
    state.completed[state.mode] = {};
    persist();
    disarmReset();
    renderStates();
    renderMenuStates();
    renderProgress();
    renderNow();
    announce(MODE_LABELS[state.mode] + "打卡已重置");
  }

  function announce(msg) {
    els.announcer.textContent = "";
    window.setTimeout(function () {
      els.announcer.textContent = msg;
    }, 30);
  }

  function bindEvents() {
    els.modeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        playSound("tick");
        var mode = btn.dataset.mode;
        if (mode !== state.mode) {
          if (editing) {
            setEditing(false); // 切视图前先落盘排序
          }
          state.mode = mode;
          persist();
          renderAll();
          announce("已切换到" + MODE_LABELS[mode]);
        }
      });
    });

    els.editBtn.addEventListener("click", function () {
      setEditing(!editing);
    });

    els.restoreBtn.addEventListener("click", function () {
      playSound("tick");
      if (els.restoreBtn.dataset.arm === "1") {
        restoreDefault();
      } else {
        armRestore();
      }
    });

    els.resetBtn.addEventListener("click", function () {
      playSound("tick");
      if (els.resetBtn.dataset.arm === "1") {
        resetToday();
      } else {
        armReset();
      }
    });

    els.fab.addEventListener("click", function () {
      playSound("tick");
      if (state.mode !== "daily" || editing) {
        return;
      }
      var cur = findCurrent(dailyTasks(), timeToMin(formatHM(getNow())));
      if (cur) {
        scrollToTask(cur.id);
      }
    });

    els.nowCard.addEventListener("click", function (e) {
      if (state.mode !== "daily" || editing || e.target.closest("button, a")) {
        return;
      }
      scrollToTask(els.nowCard.dataset.scrollId);
    });
    els.nowCard.addEventListener("keydown", function (e) {
      if (state.mode !== "daily" || editing) {
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        scrollToTask(els.nowCard.dataset.scrollId);
      }
    });

    /* Esc 退出编辑 */
    document.addEventListener("keydown", function (e) {
      if (editing && e.key === "Escape") {
        setEditing(false);
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        tick();
      }
    });
    window.addEventListener("focus", tick);
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    els = {
      appDate: document.getElementById("app-date"),
      appClock: document.getElementById("app-clock"),
      modeButtons: Array.prototype.slice.call(document.querySelectorAll(".mode-btn")),
      editBtn: document.getElementById("edit-btn"),
      editLabel: document.getElementById("edit-btn-label"),
      editBar: document.getElementById("edit-bar"),
      restoreBtn: document.getElementById("restore-btn"),
      resetBtn: document.getElementById("reset-btn"),
      resetLabel: document.getElementById("reset-btn-label"),
      progressText: document.getElementById("progress-text"),
      progressPct: document.getElementById("progress-pct"),
      progressFill: document.getElementById("progress-fill"),
      progressTrack: document.getElementById("progress-track"),
      taskList: document.getElementById("task-list"),
      listHeading: document.getElementById("list-heading"),
      nowCard: document.getElementById("now-card"),
      nowStatus: document.getElementById("now-status"),
      nowTime: document.getElementById("now-time"),
      nowTitle: document.getElementById("now-title"),
      nowDetails: document.getElementById("now-details"),
      nowMeta: document.getElementById("now-meta"),
      fab: document.getElementById("fab-back-now"),
      announcer: document.getElementById("announcer")
    };

    bindEvents();
    renderAll();
    window.setInterval(tick, 15000);

    /* 便于调试与自动化测试（只读工具，不暴露可变状态） */
    window.SCHEDULE_APP = {
      version: STORAGE_VERSION,
      storageKey: STORAGE_KEY,
      localDateKey: localDateKey,
      timeToMin: timeToMin,
      durText: durText,
      mode: function () { return state.mode; },
      isEditing: function () { return editing; },
      schedule: function () {
        return state.schedule.map(function (it) {
          return { id: it.id, start: it.start, end: it.end, title: it.title };
        });
      },
      menuTotal: MENU_TOTAL
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
