/* =========================================================
 * 一日计划 · 考研时间表 + 每周菜单打卡
 * 纯原生 JS，无依赖。状态持久化：localStorage
 * key: kaoyan-daily-schedule-v1（schema version 2）
 *
 * 双视图（Tab）：
 *   daily —— 每日计划：35 项时间表（t- 前缀），当前高亮/已过徽章/回到当前
 *   menu  —— 每周菜单：7 天 × 4 餐 = 28 餐次（训练日/休息日加餐共享一个勾选位）
 *
 * 旧数据迁移（version 1 → 2，不报错、不丢每日计划数据）：
 *   mode "training" → "daily"，completed.training → completed.daily
 *   mode "rest"     → "menu"，completed.rest 直接丢弃，completed.menu 初始化为空
 * ========================================================= */
(function () {
  "use strict";

  /* ---------------- 常量与任务数据 ---------------- */

  var STORAGE_KEY = "kaoyan-daily-schedule-v1";
  var STORAGE_VERSION = 2;
  var MODES = ["daily", "menu"];
  var MODE_LABELS = { daily: "每日计划", menu: "每周菜单" };

  /** 每日计划（沿用原 training 数组，t- 前缀 35 项） */
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

  function formatHM(d) {
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function weekdayCN(d) {
    return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
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
      console.warn("[一日计划] localStorage 写入失败，状态仅保存在内存中。", e);
      return false;
    }
  }

  function defaultState() {
    return {
      version: STORAGE_VERSION,
      date: localDateKey(),
      mode: "daily",
      completed: { daily: {}, menu: {} }
    };
  }

  /* -------- 旧数据迁移（version 1 → 2，必须不报错） -------- */

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
      // 日期不是今天：两个视图的完成状态全部清空，mode 保留
      if (parsed.date === today) {
        state.completed = normalizeCompleted(parsed.completed);
      }
    }
    return state;
  }

  function persist() {
    storageSet(JSON.stringify(state));
  }

  /* ---------------- 状态 ---------------- */

  var state = loadState();
  persist(); // 启动即回写：跨日重置结果 + v1→v2 迁移后的新结构

  var els = {};
  var lastRenderedHM = "";
  var resetTimer = null;

  function dailyTasks() {
    return TRAINING;
  }

  /**
   * 当前时间段索引（仅每日计划）：最后一个 start <= now 的任务；
   * 早于首个任务返回 -1；最后一个任务持续至 23:59。
   */
  function currentIndex(tasks, nowMin) {
    var idx = -1;
    for (var i = 0; i < tasks.length; i++) {
      if (nowMin >= timeToMin(tasks[i].time)) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
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

  /* ---------------- 渲染：每日计划 ---------------- */

  function makeCard(task) {
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", "false");
    card.setAttribute("aria-label", task.time + " " + task.title);
    card.tabIndex = 0;
    card.dataset.id = task.id;

    var timeCol = document.createElement("div");
    timeCol.className = "task-time";
    var timeEl = document.createElement("span");
    timeEl.className = "time";
    timeEl.textContent = task.time;
    timeCol.appendChild(timeEl);
    timeCol.appendChild(makeChip("已过", "chip-past"));
    card.appendChild(timeCol);

    var body = document.createElement("div");
    body.className = "task-body";

    var titleRow = document.createElement("div");
    titleRow.className = "task-title-row";
    var title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;
    titleRow.appendChild(title);
    titleRow.appendChild(makeChip("当前", "chip-current"));
    body.appendChild(titleRow);

    var meta = document.createElement("div");
    meta.className = "task-meta";
    var cat = document.createElement("span");
    cat.className = "cat";
    cat.setAttribute("data-cat", task.category);
    cat.textContent = task.category;
    meta.appendChild(cat);
    task.badges.forEach(function (b) {
      meta.appendChild(makeBadge(b));
    });
    body.appendChild(meta);

    if (task.details) {
      var details = document.createElement("p");
      details.className = "task-details";
      details.textContent = task.details;
      body.appendChild(details);
    }
    card.appendChild(body);

    var check = document.createElement("span");
    check.className = "task-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = CHECK_SVG;
    card.appendChild(check);

    card.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) {
        return;
      }
      handleDailyToggle(card, task.id);
    });

    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleDailyToggle(card, task.id);
      }
    });

    return card;
  }

  function renderList() {
    var listEl = els.taskList;
    listEl.textContent = "";
    var tasks = dailyTasks();
    var frag = document.createDocumentFragment();
    var lastPart = null;
    tasks.forEach(function (task) {
      var part = partOf(task.time);
      if (part !== lastPart) {
        lastPart = part;
        frag.appendChild(makePartHeader(part));
      }
      frag.appendChild(makeCard(task));
    });
    listEl.appendChild(frag);
  }

  function renderStates() {
    if (state.mode !== "daily") {
      return;
    }
    var tasks = dailyTasks();
    var nowMin = timeToMin(formatHM(getNow()));
    var curIdx = currentIndex(tasks, nowMin);
    var cards = els.taskList.querySelectorAll(".task-card");

    cards.forEach(function (card, i) {
      var id = card.dataset.id;
      var done = !!state.completed.daily[id];
      var isCurrent = i === curIdx;
      var isPast = curIdx > -1 && i < curIdx;

      card.classList.toggle("done", done);
      card.classList.toggle("current", isCurrent);
      card.classList.toggle("past", !done && isPast);
      card.setAttribute("aria-checked", done ? "true" : "false");

      card.querySelector(".chip-current").hidden = !isCurrent;
      card.querySelector(".chip-past").hidden = !(!done && isPast);
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
      handleMealToggle(row, id);
    });
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleMealToggle(row, id);
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
      handleMealToggle(row, id);
    });
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleMealToggle(row, id);
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

  /* ---------------- 渲染：进度 / 预告 / FAB ---------------- */

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
    if (state.mode !== "daily") {
      return;
    }
    var tasks = dailyTasks();
    var nowMin = timeToMin(formatHM(getNow()));
    var curIdx = currentIndex(tasks, nowMin);
    var card = els.nowCard;

    if (curIdx === -1) {
      var first = tasks[0];
      card.classList.add("is-next");
      card.classList.remove("is-done");
      card.dataset.scrollId = first.id;
      card.setAttribute("aria-label", "下一项任务 " + first.time + " " + first.title + "，点击定位");
      els.nowStatus.textContent = "下一项";
      els.nowTime.textContent = first.time;
      els.nowTitle.textContent = first.title;
      els.nowDetails.textContent = first.details;
      els.nowMeta.textContent = MODE_LABELS[state.mode] + " · 今日尚未开始";
      return;
    }

    var cur = tasks[curIdx];
    var next = tasks[curIdx + 1];
    var done = !!state.completed.daily[cur.id];

    card.classList.remove("is-next");
    card.classList.toggle("is-done", done);
    card.dataset.scrollId = cur.id;
    card.setAttribute("aria-label", "当前任务 " + cur.time + " " + cur.title + "，点击定位");

    els.nowStatus.textContent = done ? "当前 · 已完成" : "当前";
    els.nowTime.textContent = cur.time;
    els.nowTitle.textContent = cur.title;
    els.nowDetails.textContent = cur.details || "";
    els.nowMeta.textContent = "进行至 " + (next ? next.time : "23:59");
  }

  function renderFab() {
    var hidden = true;
    if (state.mode === "daily") {
      var tasks = dailyTasks();
      var nowMin = timeToMin(formatHM(getNow()));
      hidden = currentIndex(tasks, nowMin) === -1;
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

  function renderAll() {
    renderDate();
    renderModeButtons();
    if (state.mode === "daily") {
      els.nowCard.hidden = false;
      els.listHeading.textContent = "今日安排";
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
   * mode 保留。返回是否发生了跨日。
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
      if (!dayChanged) {
        renderStates();
        renderNow();
        renderFab();
      }
    }
  }

  /* ---------------- 交互 ---------------- */

  /* ============ 震动 + 音效集成（与打卡逻辑解耦，任何一方失败不阻断打卡） ============ */

  /** 震动闸门：true=允许转发；false=80ms 内重复通道（label click + switch 合成 click） */
  function hapticsGate(el) {
    if (!window.ScheduleHaptics) {
      return true;
    }
    try {
      return window.ScheduleHaptics.tap(el) !== false;
    } catch (e) {
      return true; // 容错：震动模块异常时打卡必须可用
    }
  }

  function playSound(type) {
    if (!window.ScheduleSounds) {
      return;
    }
    try {
      window.ScheduleSounds.play(type);
    } catch (e) { /* 静默：音效失败不影响打卡 */ }
  }

  /** 通用轻触反馈（Tab / 重置 / 回到当前）。返回是否允许继续执行原逻辑。 */
  function feedbackTick(el) {
    if (!hapticsGate(el)) {
      return false;
    }
    playSound("tick");
    return true;
  }

  /** 每日计划任务卡点击：唯一入口，状态恰好翻转一次 */
  function handleDailyToggle(el, id) {
    if (!hapticsGate(el)) {
      return;
    }
    toggleTask(id);
    playSound(state.completed.daily[id] ? "complete" : "uncomplete");
  }

  /** 每周菜单餐次行点击：唯一入口（含加餐共享勾选位） */
  function handleMealToggle(el, id) {
    if (!hapticsGate(el)) {
      return;
    }
    toggleMeal(id);
    playSound(isMealDone(id) ? "complete" : "uncomplete");
  }

  /** 渲染完成后重新挂载震动反馈层（先 destroy 再 mount，避免旧 DOM 泄漏） */
  function mountHaptics() {
    if (!window.ScheduleHaptics) {
      return;
    }
    try {
      window.ScheduleHaptics.destroy();
      els.modeButtons.forEach(function (b) {
        window.ScheduleHaptics.mount(b);
      });
      window.ScheduleHaptics.mount(els.resetBtn);
      window.ScheduleHaptics.mount(els.fab);
      if (state.mode === "daily") {
        els.taskList.querySelectorAll(".task-card").forEach(function (c) {
          window.ScheduleHaptics.mount(c);
        });
      } else {
        els.taskList.querySelectorAll(".menu-row").forEach(function (r) {
          window.ScheduleHaptics.mount(r);
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
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
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
        if (!feedbackTick(btn)) {
          return;
        }
        var mode = btn.dataset.mode;
        if (mode !== state.mode) {
          state.mode = mode;
          persist();
          renderAll();
          announce("已切换到" + MODE_LABELS[mode]);
        }
      });
    });

    els.resetBtn.addEventListener("click", function () {
      if (!feedbackTick(els.resetBtn)) {
        return;
      }
      if (els.resetBtn.dataset.arm === "1") {
        resetToday();
      } else {
        armReset();
      }
    });

    els.fab.addEventListener("click", function () {
      if (!feedbackTick(els.fab)) {
        return;
      }
      if (state.mode !== "daily") {
        return;
      }
      var tasks = dailyTasks();
      var nowMin = timeToMin(formatHM(getNow()));
      var curIdx = currentIndex(tasks, nowMin);
      if (curIdx > -1) {
        scrollToTask(tasks[curIdx].id);
      }
    });

    els.nowCard.addEventListener("click", function (e) {
      if (state.mode !== "daily" || e.target.closest("button, a")) {
        return;
      }
      scrollToTask(els.nowCard.dataset.scrollId);
    });
    els.nowCard.addEventListener("keydown", function (e) {
      if (state.mode !== "daily") {
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        scrollToTask(els.nowCard.dataset.scrollId);
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

    /* 便于调试与自动化测试（只读工具，不暴露状态） */
    window.SCHEDULE_APP = {
      version: STORAGE_VERSION,
      storageKey: STORAGE_KEY,
      localDateKey: localDateKey,
      timeToMin: timeToMin,
      mode: function () { return state.mode; },
      menuTotal: MENU_TOTAL
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
