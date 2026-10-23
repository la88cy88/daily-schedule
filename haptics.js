/* =========================================================
 * haptics.js —— 点击震动反馈（iOS Taptic Engine + 降级）
 *
 * 对外暴露 window.ScheduleHaptics = { attach(el), detach(el), trigger() }
 *
 * 核心原则（iOS 26.5+/27）：震动必须来自用户对真实 switch 的
 * 直接物理点击。任何脚本调用 .click()、dispatchEvent()、
 * 或在 click handler 里程序化翻转 switch 都不会触发 Taptic Engine。
 *
 * 唯一可行方案：attach(el) 为目标元素叠加
 *   - 一个真实 <input type="checkbox" switch>（保留在 DOM 中，
 *     position:absolute; width/height:1px; opacity:0; pointer-events:none；
 *     不用 display:none / visibility:hidden，否则震动失效）
 *   - 一个透明 <label for=该 input>，作为目标元素最后一个子节点插入：
 *     position:absolute; inset:0; opacity:0; pointer-events:auto; z-index:2;
 *     touch-action:manipulation; -webkit-tap-highlight-color:transparent
 * label 的物理点击由浏览器默认行为原生切换 switch → 触发 Taptic；
 * 同时 click 事件冒泡到父元素，打卡逻辑照常执行。
 * 不做任何手动转发、不 preventDefault、不调用 targetEl.click()。
 *
 * 降级：不支持 switch 的环境（动态创建检测，不用 UA）→
 * navigator.vibrate(10)（仅在真实用户手势内）；都不支持则静默 no-op。
 * ========================================================= */
(function () {
  "use strict";

  var NS = "schedule-haptic";
  var VIBRATE_MS = 10;

  var switchContainer = null;
  var uidCounter = 0;
  var registry = new WeakMap(); // el -> { label, input, onClick }

  function warn(msg, e) {
    try { console.warn("[一日计划·haptics] " + msg, e || ""); } catch (_) { /* 忽略 */ }
  }

  /* ---- 特征检测（不用 UA）：动态创建 <input type=checkbox switch>，
         以 WebKit switch 控件与普通 checkbox 的渲染差异判定 ----
     WebKit switch 控件 UA 样式为 display:inline-flex、固有宽度 ≈51px；
     普通 checkbox 为 inline-block、≈13px。任其其一即可判定支持。 */
  function detectSwitchSupport() {
    try {
      /* 测试钩子：window.__SCHEDULE_HAPTICS_FORCE__ = "switch" | "vibrate" */
      if (window.__SCHEDULE_HAPTICS_FORCE__ === "switch") return true;
      if (window.__SCHEDULE_HAPTICS_FORCE__ === "vibrate") return false;

      var el = document.createElement("input");
      el.type = "checkbox";
      el.setAttribute("switch", "");
      el.style.cssText = "position:absolute;left:-9999px;top:-9999px;";
      document.body.appendChild(el);
      var display = getComputedStyle(el).display;
      var width = el.getBoundingClientRect().width;
      document.body.removeChild(el);
      return display === "inline-flex" || (width > 30 && width < 120);
    } catch (e) {
      return false;
    }
  }

  var SWITCH_SUPPORTED = detectSwitchSupport();

  /* switch 的统一离屏容器（保留在 DOM 中，输入不被 display:none） */
  function container() {
    if (switchContainer && switchContainer.isConnected) {
      return switchContainer;
    }
    switchContainer = document.createElement("div");
    switchContainer.setAttribute("aria-hidden", "true");
    switchContainer.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;";
    document.body.appendChild(switchContainer);
    return switchContainer;
  }

  /* 目标元素内的交互子元素提升到 label 之上（z-index 3），不被整卡 label 拦截；
     子按钮点击不会触发整卡震动（正确行为）；若子按钮自身需要震动，单独 attach。 */
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

  /**
   * 为目标元素叠加震动反馈层。幂等（WeakMap 去重）。
   * 目标元素自动补齐 position:relative / overflow:visible。
   */
  function attach(el) {
    if (!el || typeof el.addEventListener !== "function") return;
    if (registry.has(el)) return;

    try {
      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }
      el.style.overflow = "visible";
    } catch (e) { /* 忽略 */ }

    if (SWITCH_SUPPORTED) {
      try {
        var input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute("switch", "");
        input.className = NS + "-switch";
        input.tabIndex = -1;
        input.setAttribute("aria-hidden", "true");
        input.id = NS + "-sw-" + (++uidCounter);
        /* 不用 display:none / visibility:hidden：保留在 DOM 中 */
        input.style.cssText =
          "position:absolute;width:1px;height:1px;margin:0;opacity:0;pointer-events:none;";
        container().appendChild(input);

        var label = document.createElement("label");
        label.className = NS + "-label";
        label.htmlFor = input.id;
        label.setAttribute("aria-hidden", "true");
        label.style.cssText =
          "position:absolute;inset:0;margin:0;padding:0;display:block;" +
          "opacity:0;pointer-events:auto;z-index:2;cursor:pointer;" +
          "touch-action:manipulation;-webkit-tap-highlight-color:transparent;";
        /* 关键：不绑定任何 click 处理器、不 preventDefault、不手动翻转、
           不转发 click。label 物理点击 → 浏览器原生切换 switch（Taptic）→
           click 冒泡到父元素 → 打卡逻辑照常执行。 */
        el.appendChild(label);
        raiseInteractiveChildren(el);
        registry.set(el, { label: label, input: input, onClick: null });
      } catch (e) {
        warn("attach(switch) 失败", e);
      }
    } else if (navigator.vibrate) {
      try {
        var onClick = function () {
          trigger();
        };
        el.addEventListener("click", onClick);
        registry.set(el, { label: null, input: null, onClick: onClick });
      } catch (e) {
        warn("attach(vibrate) 失败", e);
      }
    }
    /* 其他环境：静默 no-op */
  }

  /** 移除单个元素上的 label / switch / vibrate 监听器 */
  function detach(el) {
    var rec = registry.get(el);
    if (!rec) return;
    try {
      if (rec.onClick) {
        el.removeEventListener("click", rec.onClick);
      }
      if (rec.label && rec.label.parentNode) {
        rec.label.parentNode.removeChild(rec.label);
      }
      if (rec.input && rec.input.parentNode) {
        rec.input.parentNode.removeChild(rec.input);
      }
    } catch (e) {
      warn("detach 失败", e);
    }
    registry.delete(el);
  }

  /** vibrate 降级触发：仅在真实用户手势内调用，避免无手势拦截噪音 */
  function trigger() {
    if (SWITCH_SUPPORTED || !navigator.vibrate) {
      return;
    }
    try {
      var act = navigator.userActivation;
      if (act && act.isActive === false) {
        return;
      }
      navigator.vibrate(VIBRATE_MS);
    } catch (e) {
      warn("vibrate 失败", e);
    }
  }

  window.ScheduleHaptics = {
    attach: attach,
    detach: detach,
    trigger: trigger
  };
})();
