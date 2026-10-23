/* =========================================================
 * haptics.js —— 点击震动反馈（iOS Taptic Engine + 降级）
 *
 * 暴露 window.ScheduleHaptics = { tap(el), mount(el), detach(el), destroy() }
 *
 * 原理：iOS Safari 不支持 navigator.vibrate。Safari 17.4+ 支持
 * <input type="checkbox" switch> 原生开关控件，用户切换时触发 Taptic Engine。
 * 程序化 .click() 可能不产生震动，因此用透明 <label for> 承接真实点击：
 *   tap label → label click（preventDefault 阻止默认转发）→ 手动切换 switch
 *   （原生开关翻转 → Taptic）→ 事件冒泡到目标元素 → 打卡逻辑（唯一入口）。
 *
 * 降级链：iOS Safari ≥17.4 走 switch；否则 navigator.vibrate(10)；
 * 都不支持则静默 no-op。任何失败只 console.warn，绝不阻断打卡。
 *
 * 硬约束 A：label z-index 高（2）；目标元素内若有 button/a/[role=button]，
 * 将其提升到 z-index 3，避免遮挡正常交互；目标元素保持
 * position: relative（原本 static 时）+ overflow: visible。
 * 硬约束 B：label click 先 preventDefault；per-element 80ms 防抖锁
 * （tap() 返回 false 表示重复通道），打卡 toggle 只保留唯一入口。
 * ========================================================= */
(function () {
  "use strict";

  var NS = "schedule-haptic";
  var FORWARD_LOCK_MS = 80;   // 双通道防抖锁
  var VIBRATE_MS = 10;        // 安卓/桌面降级震动时长

  var switchContainer = null;
  var uidCounter = 0;
  var lastForward = new WeakMap(); // el -> 上次转发时间戳
  var registry = new WeakMap();    // el -> { label, sw }

  function warn(msg, e) {
    try { console.warn("[一日计划·haptics] " + msg, e || ""); } catch (_) { /* 忽略 */ }
  }

  /* ---- 特征检测：iOS Safari 17.4+ 的 switch 控件 ---- */
  function detectSwitchPath() {
    try {
      /* 测试钩子：window.__SCHEDULE_HAPTICS_FORCE__ = "switch" | "vibrate" */
      if (window.__SCHEDULE_HAPTICS_FORCE__ === "switch") return true;
      if (window.__SCHEDULE_HAPTICS_FORCE__ === "vibrate") return false;
      var ua = navigator.userAgent || "";
      if (!/iP(hone|ad|od)/.test(ua)) return false;
      if (!/Safari/.test(ua) || /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(ua)) return false;
      var m = ua.match(/OS (\d+)[._](\d+)/);
      if (!m) return false;
      var major = parseInt(m[1], 10);
      var minor = parseInt(m[2], 10);
      return major > 17 || (major === 17 && minor >= 4);
    } catch (e) {
      return false;
    }
  }

  var SWITCH_PATH = detectSwitchPath();

  /* 隐藏 switch 的统一容器（off-screen，不可聚焦、不参与布局） */
  function container() {
    if (switchContainer && switchContainer.isConnected) {
      return switchContainer;
    }
    switchContainer = document.createElement("div");
    switchContainer.setAttribute("aria-hidden", "true");
    switchContainer.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;" +
      "opacity:0;pointer-events:none;";
    document.body.appendChild(switchContainer);
    return switchContainer;
  }

  function labelStyleText() {
    return "position:absolute;inset:0;margin:0;padding:0;display:block;" +
      "opacity:0;pointer-events:auto;z-index:2;cursor:pointer;" +
      "touch-action:manipulation;-webkit-tap-highlight-color:transparent;";
  }

  /* 硬约束 A：目标元素内的交互子元素提升到 label 之上，避免被遮挡 */
  function raiseInteractiveChildren(el) {
    try {
      var kids = el.querySelectorAll("button, a, [role='button']");
      Array.prototype.forEach.call(kids, function (child) {
        if (child === el) return;
        if (getComputedStyle(child).position === "static") {
          child.style.position = "relative";
        }
        child.style.zIndex = "3";
      });
    } catch (e) { /* 忽略 */ }
  }

  /** 为目标元素叠加透明 label + 隐藏 switch（switch 路径）。可重复调用，幂等。 */
  function mount(el) {
    if (!el || typeof el.addEventListener !== "function") return;
    if (registry.has(el)) return;
    if (!SWITCH_PATH) return; // 非 switch 路径：反馈由 tap() 里的 vibrate 负责

    try {
      /* 硬约束 A：目标元素 position: relative（原本 static 时）+ overflow: visible */
      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }
      el.style.overflow = "visible";

      var sw = document.createElement("input");
      sw.type = "checkbox";
      sw.setAttribute("switch", "");
      sw.className = NS + "-switch";
      sw.tabIndex = -1;
      sw.setAttribute("aria-hidden", "true");
      sw.id = NS + "-sw-" + (++uidCounter);

      var label = document.createElement("label");
      label.className = NS + "-label";
      label.htmlFor = sw.id;
      label.setAttribute("aria-hidden", "true");
      label.style.cssText = labelStyleText();

      /* 硬约束 B：先 preventDefault，再手动切换 switch 产生震动 */
      label.addEventListener("click", function (e) {
        if (e && e.preventDefault) {
          e.preventDefault();
        }
        try {
          sw.checked = !sw.checked;
        } catch (err) {
          warn("switch 切换失败", err);
        }
      });

      container().appendChild(sw);
      el.appendChild(label);
      raiseInteractiveChildren(el);
      registry.set(el, { label: label, sw: sw });
    } catch (e) {
      warn("挂载失败", e);
    }
  }

  /**
   * 点击主入口（app.js 在点击处理器内调用）。
   * 返回 true = 允许转发（正常点击）；false = 80ms 内重复通道，应丢弃。
   * 防抖锁仅作用于 switch 路径（该路径才存在 label click / switch 合成 click
   * 双通道的可能）；vibrate 路径无 overlay、无双通道，不设锁，
   * 保证桌面/安卓快速连点每次都能干净翻转。
   */
  function tap(el) {
    if (SWITCH_PATH) {
      var now = Date.now();
      var last = lastForward.get(el) || 0;
      if (now - last < FORWARD_LOCK_MS) {
        return false; // 双通道重复触发，拦截
      }
      lastForward.set(el, now);
    }

    if (!SWITCH_PATH && navigator.vibrate) {
      try {
        /* 仅在真实用户手势内调用 vibrate：无手势的程序化调用会被浏览器
           拦截并产生控制台噪音，静默降级即可（打卡逻辑不受影响）。 */
        var act = navigator.userActivation;
        if (act && act.isActive === false) {
          return true;
        }
        navigator.vibrate(VIBRATE_MS);
      } catch (e) {
        warn("vibrate 失败", e);
      }
    }
    return true;
  }

  /** 移除单个元素上的 label + switch */
  function detach(el) {
    var rec = registry.get(el);
    if (!rec) return;
    try {
      if (rec.label && rec.label.parentNode) {
        rec.label.parentNode.removeChild(rec.label);
      }
      if (rec.sw && rec.sw.parentNode) {
        rec.sw.parentNode.removeChild(rec.sw);
      }
    } catch (e) {
      warn("detach 失败", e);
    }
    registry.delete(el);
  }

  /** 移除全部 label 与 switch 容器，释放所有锁 */
  function destroy() {
    try {
      document.querySelectorAll("." + NS + "-label").forEach(function (l) {
        if (l.parentNode) l.parentNode.removeChild(l);
      });
      if (switchContainer && switchContainer.parentNode) {
        switchContainer.parentNode.removeChild(switchContainer);
      }
      switchContainer = null;
      registry = new WeakMap();
      lastForward = new WeakMap();
    } catch (e) {
      warn("destroy 失败", e);
    }
  }

  window.ScheduleHaptics = {
    tap: tap,
    mount: mount,
    detach: detach,
    destroy: destroy
  };
})();
