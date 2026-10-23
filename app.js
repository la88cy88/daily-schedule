/* =========================================================
 * 一日计划 · 考研 + 力量训练 时间表打卡
 * 纯原生 JS，无依赖。状态持久化：localStorage
 * key: kaoyan-daily-schedule-v1
 * ========================================================= */
(function () {
  "use strict";

  /* ---------------- 常量与任务数据 ---------------- */

  var STORAGE_KEY = "kaoyan-daily-schedule-v1";
  var STORAGE_VERSION = 1;
  var MODES = ["training", "rest"];
  var MODE_LABELS = { training: "运动日", rest: "不运动日" };

  /** 运动日 training */
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

  /** 不运动日 rest */
  var REST = [
    {id:"r-0650",time:"06:50",title:"起床",details:"醒后坐10秒再站，不猛然起身",category:"健康",badges:["血压"]},
    {id:"r-0700",time:"07:00",title:"第一口水 300ml",details:"温水，分3-5分钟小口慢饮，不猛灌",category:"饮水",badges:[]},
    {id:"r-0710",time:"07:10",title:"洗漱 + 颈肩轻活动",details:"收下巴、肩胛后缩各5次，不低头刷手机",category:"健康",badges:["颈椎"]},
    {id:"r-0730",time:"07:30",title:"早餐",details:"水煮蛋/蒸蛋1个 + 好消化主食 + 无糖豆浆/牛奶200-250ml + 少量焯拌菜；不油条不煎蛋",category:"饮食",badges:["脾胃"]},
    {id:"r-0800",time:"08:00",title:"散步 + 播客",details:"喝水100-150ml；走路目视前方，不低头刷屏",category:"休息",badges:["颈椎"]},
    {id:"r-0830",time:"08:30",title:"考研学习①：高难度逻辑科目",details:"屏幕与眼平齐，腰部有支撑；50分钟必起身",category:"学习",badges:["颈椎","前列腺"]},
    {id:"r-0920",time:"09:20",title:"强制起身10分钟",details:"走动、接水、颈肩拉伸；喝水200ml；有尿意即排",category:"休息",badges:["颈椎","前列腺"]},
    {id:"r-0930",time:"09:30",title:"考研学习②",details:"继续高难度内容或切换相近逻辑科目",category:"学习",badges:["颈椎","前列腺"]},
    {id:"r-1020",time:"10:20",title:"起身休息",details:"喝水150ml；远眺",category:"休息",badges:[]},
    {id:"r-1030",time:"10:30",title:"考研学习③",details:"11:00前可再小口喝水100ml",category:"学习",badges:["颈椎","前列腺"]},
    {id:"r-1120",time:"11:20",title:"整理/复盘上午",details:"起身活动，不连续坐满50分钟以上",category:"学习",badges:["颈椎"]},
    {id:"r-1140",time:"11:40",title:"午餐前喝水",details:"100-150ml",category:"饮水",badges:[]},
    {id:"r-1200",time:"12:00",title:"午餐",details:"主食1拳 + 鱼虾/鸡胸/豆腐1掌 + 蔬菜2拳；不喝肉汤、不碰啤酒；七分饱",category:"饮食",badges:["尿酸","脾胃"]},
    {id:"r-1225",time:"12:25",title:"慢走/站立10-15分钟",details:"饭后不立刻躺；走动促尿酸排泄，减轻前列腺压迫",category:"休息",badges:["尿酸","前列腺"]},
    {id:"r-1250",time:"12:50",title:"午休20-30分钟",details:"不超过30分钟；不趴桌压颈",category:"休息",badges:["颈椎"]},
    {id:"r-1320",time:"13:20",title:"午休起床喝水200ml",details:"温水小口",category:"饮水",badges:[]},
    {id:"r-1330",time:"13:30",title:"考研学习④",details:"坐姿同上午；50分钟必起身",category:"学习",badges:["颈椎","前列腺"]},
    {id:"r-1420",time:"14:20",title:"强制起身10分钟",details:"喝水150ml；颈肩活动；排尿，不憋",category:"休息",badges:["颈椎","前列腺"]},
    {id:"r-1430",time:"14:30",title:"考研学习⑤",details:"",category:"学习",badges:["颈椎","前列腺"]},
    {id:"r-1520",time:"15:20",title:"起身休息",details:"喝水150ml",category:"休息",badges:[]},
    {id:"r-1530",time:"15:30",title:"可选加餐",details:"不饿不加餐；饿了选水果半个/无糖酸奶100g/坚果一小把；喝水200ml",category:"饮食",badges:[]},
    {id:"r-1600",time:"16:00",title:"补水/放松",details:"喝水150-200ml",category:"饮水",badges:[]},
    {id:"r-1630",time:"16:30",title:"快走或轻阻力活动20-30分钟",details:"不训练；对尿酸和前列腺均有益；或继续学习",category:"训练",badges:["尿酸","前列腺"]},
    {id:"r-1730",time:"17:30",title:"放松/拉伸",details:"轻活动后拉伸，补水",category:"休息",badges:[]},
    {id:"r-1800",time:"18:00",title:"自由休息/整理",details:"不洗澡；等待晚餐",category:"休息",badges:[]},
    {id:"r-1830",time:"18:30",title:"晚餐",details:"鱼虾/豆腐/豆制品 + 焯蔬菜 + 少量主食；七八分饱；不饮酒、不喝浓汤",category:"饮食",badges:["尿酸","脾胃"]},
    {id:"r-1900",time:"19:00",title:"考研学习⑥",details:"巩固型；50分钟必起身；不憋尿",category:"学习",badges:["颈椎","前列腺"]},
    {id:"r-2000",time:"20:00",title:"强制起身10分钟",details:"喝水150ml；走动、颈肩拉伸；排尿",category:"休息",badges:["颈椎","前列腺"]},
    {id:"r-2010",time:"20:10",title:"考研学习⑦",details:"难度低于晨间",category:"学习",badges:["颈椎"]},
    {id:"r-2100",time:"21:00",title:"不运动日洗澡",details:"温水澡，睡前1-1.5小时完成",category:"休息",badges:["血压"]},
    {id:"r-2120",time:"21:20",title:"护肤、复盘、轻播客",details:"准备第二天；睡前排尿",category:"休息",badges:["前列腺"]},
    {id:"r-2200",time:"22:00",title:"睡前准备",details:"调暗灯光；不大量喝水；睡前排尿",category:"休息",badges:["前列腺"]},
    {id:"r-2220",time:"22:20",title:"上床酝酿",details:"4-7-8呼吸4-6轮或身体扫描；不刷手机",category:"睡眠",badges:["血压"]},
    {id:"r-2230",time:"22:30",title:"睡觉",details:"固定起床时间",category:"睡眠",badges:[]}
  ];

  var SCHEDULES = { training: TRAINING, rest: REST };

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
      mode: "training",
      completed: { training: {}, rest: {} }
    };
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
      if (parsed.mode === "training" || parsed.mode === "rest") {
        state.mode = parsed.mode;
      }
      // 日期不是今天：两个模式的完成状态全部清空，mode 保留
      if (parsed.date === today && parsed.completed && typeof parsed.completed === "object") {
        MODES.forEach(function (mode) {
          if (parsed.completed[mode] && typeof parsed.completed[mode] === "object") {
            state.completed[mode] = Object.assign({}, parsed.completed[mode]);
          }
        });
      }
    }
    return state;
  }

  function persist() {
    storageSet(JSON.stringify(state));
  }

  /* ---------------- 状态 ---------------- */

  var state = loadState();
  persist(); // 启动即写入今日日期（回写跨日重置结果）

  var els = {};
  var lastRenderedHM = "";
  var resetTimer = null;

  function tasksOf(mode) {
    return SCHEDULES[mode] || TRAINING;
  }

  /**
   * 当前时间段索引：最后一个 start <= now 的任务；
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

  /* ---------------- 渲染 ---------------- */

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

  function makeCard(task) {
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", "false");
    card.setAttribute("aria-label", task.time + " " + task.title);
    card.tabIndex = 0;
    card.dataset.id = task.id;

    /* 时间列 */
    var timeCol = document.createElement("div");
    timeCol.className = "task-time";
    var timeEl = document.createElement("span");
    timeEl.className = "time";
    timeEl.textContent = task.time;
    timeCol.appendChild(timeEl);
    timeCol.appendChild(makeChip("已过", "chip-past"));
    card.appendChild(timeCol);

    /* 主体 */
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

    /* 勾选圆 */
    var check = document.createElement("span");
    check.className = "task-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7.5"/></svg>';
    card.appendChild(check);

    /* 事件：整卡点击切换；未来卡内若有 button/a 则排除 */
    card.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) {
        return;
      }
      toggleTask(task.id);
    });

    /* 键盘：Enter / Space 均可切换；Space 阻止默认滚动 */
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        toggleTask(task.id);
      }
    });

    return card;
  }

  function renderList() {
    var listEl = els.taskList;
    listEl.textContent = "";
    var tasks = tasksOf(state.mode);
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
    var tasks = tasksOf(state.mode);
    var nowMin = timeToMin(formatHM(getNow()));
    var curIdx = currentIndex(tasks, nowMin);
    var cards = els.taskList.querySelectorAll(".task-card");

    cards.forEach(function (card, i) {
      var id = card.dataset.id;
      var done = !!state.completed[state.mode][id];
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

  function renderProgress() {
    var tasks = tasksOf(state.mode);
    var total = tasks.length;
    var done = tasks.filter(function (t) {
      return !!state.completed[state.mode][t.id];
    }).length;
    var pct = total ? Math.round((done / total) * 100) : 0;

    els.progressText.textContent = done + "/" + total;
    els.progressPct.textContent = pct + "%";
    els.progressFill.style.width = pct + "%";
    els.progressTrack.setAttribute("aria-valuenow", String(pct));
  }

  function renderNow() {
    var tasks = tasksOf(state.mode);
    var nowMin = timeToMin(formatHM(getNow()));
    var curIdx = currentIndex(tasks, nowMin);
    var card = els.nowCard;

    if (curIdx === -1) {
      /* 早于第一个任务：无当前，显示下一项 */
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
    var done = !!state.completed[state.mode][cur.id];

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
    var tasks = tasksOf(state.mode);
    var nowMin = timeToMin(formatHM(getNow()));
    var curIdx = currentIndex(tasks, nowMin);
    els.fab.hidden = curIdx === -1;
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
    renderList();
    renderStates();
    renderProgress();
    renderNow();
    renderFab();
    renderClock();
  }

  /**
   * 常驻跨日检查：页面不关闭、后台过夜时，日期一变就自动清空两个模式的
   * 完成状态、更新 date 并回写存储。mode 保留。返回是否发生了跨日。
   */
  function ensureToday() {
    var today = localDateKey();
    if (today !== state.date) {
      state.date = today;
      state.completed = { training: {}, rest: {} };
      persist();
      renderDate();
      renderStates();
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

  function toggleTask(id) {
    var map = state.completed[state.mode];
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
    announce("已进入重置确认：再次点击将清空今日所有打卡");
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
    state.completed = { training: {}, rest: {} };
    persist();
    disarmReset();
    renderStates();
    renderProgress();
    renderNow();
    announce("今日打卡已全部重置");
  }

  function announce(msg) {
    els.announcer.textContent = "";
    /* 强制重新触发 aria-live */
    window.setTimeout(function () {
      els.announcer.textContent = msg;
    }, 30);
  }

  function bindEvents() {
    els.modeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.dataset.mode;
        if (mode !== state.mode) {
          state.mode = mode;
          persist();
          renderModeButtons();
          renderList();
          renderStates();
          renderProgress();
          renderNow();
          renderFab();
          announce("已切换到" + MODE_LABELS[mode]);
        }
      });
    });

    els.resetBtn.addEventListener("click", function () {
      if (els.resetBtn.dataset.arm === "1") {
        resetToday();
      } else {
        armReset();
      }
    });

    els.fab.addEventListener("click", function () {
      var tasks = tasksOf(state.mode);
      var nowMin = timeToMin(formatHM(getNow()));
      var curIdx = currentIndex(tasks, nowMin);
      if (curIdx > -1) {
        scrollToTask(tasks[curIdx].id);
      }
    });

    els.nowCard.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) {
        return;
      }
      scrollToTask(els.nowCard.dataset.scrollId);
    });
    els.nowCard.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        scrollToTask(els.nowCard.dataset.scrollId);
      }
    });

    /* 回到前台 / 重新聚焦时立即校准 */
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
      mode: function () { return state.mode; }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
