/* =========================================================
 * sounds.js —— 点击音效（纯 Web Audio API 合成，零音频文件）
 *
 * 暴露 window.ScheduleSounds = { play(type), unlock(), debug }
 *   type: "complete"（880→1320 Hz 上扬）| "uncomplete"（880→660 Hz 下沉）
 *         | "tick"（600 Hz 轻触，可选）
 *
 * 硬约束 C：30ms 节流——同一 30ms 内最多播放一次，防止连点爆音。
 * 解锁：首次真实手势同步调用栈内 resume() 并预热静音 buffer；
 * visibilitychange 切回前台时自动尝试恢复上下文。
 * 与震动解耦：任何失败只 console.warn（一次），绝不阻断打卡逻辑。
 * ========================================================= */
(function () {
  "use strict";

  var THROTTLE_MS = 30;

  var TONES = {
    complete:   { from: 880, to: 1320, dur: 0.050, gain: 0.12, type: "sine" }, // 40–60ms 上扬
    uncomplete: { from: 880, to: 660,  dur: 0.038, gain: 0.08, type: "sine" }, // 30–45ms 下沉
    tick:       { from: 600, to: 600,  dur: 0.018, gain: 0.05, type: "sine" }  // 15–20ms 轻触
  };

  var ctx = null;
  var lastPlayTime = 0;
  var warned = { ctx: false, resume: false };

  /* 调试/测试计数：attempts=总请求、throttled=节流丢弃、played=实际尝试播放 */
  var debug = { attempts: 0, throttled: 0, played: 0 };

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) {
      if (!warned.ctx) {
        warned.ctx = true;
        console.warn("[一日计划·sounds] AudioContext 创建失败，音效已禁用。", e);
      }
      return null;
    }
    return ctx;
  }

  /** 解锁/恢复：resume + 预热静音 buffer（部分 iOS 需要一次无声播放解锁） */
  function unlock() {
    var c = ensureCtx();
    if (!c) return;
    try {
      if (c.state === "suspended") {
        var p = c.resume();
        if (p && typeof p.then === "function") {
          p.then(null, function () { /* 忽略 resume 拒绝（自动播放策略） */ });
        }
      }
      var buf = c.createBuffer(1, 1, 22050);
      var src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
      src.stop(c.currentTime + 0.001);
    } catch (e) {
      if (!warned.resume) {
        warned.resume = true;
        console.warn("[一日计划·sounds] 音频解锁失败。", e);
      }
    }
  }

  function play(type) {
    debug.attempts++;
    var now = Date.now();
    /* 硬约束 C：30ms 节流，防连点爆音 */
    if (now - lastPlayTime < THROTTLE_MS) {
      debug.throttled++;
      return;
    }
    lastPlayTime = now;
    debug.played++;

    try {
      var c = ensureCtx();
      if (!c) return;
      if (c.state === "suspended") {
        var p = c.resume(); // 手势同步调用栈内 resume，规避自动播放拦截
        if (p && typeof p.then === "function") {
          p.then(null, function () { /* 忽略 */ });
        }
      }

      var spec = TONES[type] || TONES.tick;
      var t0 = c.currentTime;
      var osc = c.createOscillator();
      var gain = c.createGain();

      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.from, t0);
      if (spec.to !== spec.from) {
        osc.frequency.exponentialRampToValueAtTime(spec.to, t0 + spec.dur);
      }
      gain.gain.setValueAtTime(spec.gain, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.dur);

      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + spec.dur + 0.02);
    } catch (e) {
      console.warn("[一日计划·sounds] 播放失败。", e);
    }
  }

  /* 首次真实手势同步解锁（主路径是 app.js 在 click 栈内直接调用 play） */
  ["pointerdown", "touchstart", "keydown"].forEach(function (evt) {
    try {
      document.addEventListener(evt, function onFirst() {
        unlock();
        document.removeEventListener(evt, onFirst);
      }, { passive: true });
    } catch (e) { /* 忽略 */ }
  });

  /* 切回前台时自动尝试恢复上下文 */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      unlock();
    }
  });

  window.ScheduleSounds = {
    play: play,
    unlock: unlock,
    debug: debug
  };
})();
