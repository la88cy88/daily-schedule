# 一日计划 · 考研 + 力量训练时间表打卡（iOS PWA）

一个纯静态、零依赖的单页打卡应用，顶部两个 Tab（**每日计划 / 每周菜单**）：
按时间段逐项点击完成今日任务，自动高亮“当前”时间段，按本地日期自动重置，
专为 iPhone Safari 及“添加到主屏幕”使用而适配。

- 技术栈：原生 HTML + CSS + JavaScript，无框架、无构建、无 CDN、无后端
- 任务数据：**每日计划** 35 项时间表（t- 前缀，含饮食饮水细节、类别标签与体检红线徽章）+ **每周菜单** 7 天 × 4 餐 = 28 餐次（加餐为训练日/休息日共享勾选位）
- 状态存储：`localStorage`（key：`kaoyan-daily-schedule-v1`，schema version 2），两个视图（daily/menu）打卡相互独立
- 反馈：点击音效（纯 Web Audio 合成，零音频文件）+ 点击震动（iOS Safari 17.4+ Taptic Engine，桌面/安卓 `navigator.vibrate` 降级）

---

## 一、文件结构

| 文件 | 说明 |
|---|---|
| `index.html` | 页面骨架 + iOS PWA meta（apple-touch-icon 180、black-translucent、theme-color 双模式） |
| `styles.css` | 全部样式：卡片式、浅色/深色自动、safe-area 适配、状态色（当前蓝 / 已过橙 / 完成绿） |
| `app.js` | 任务数据（每日计划 TRAINING 数组 + 每周菜单 WEEKLY_MENU 数组）、日期/时间逻辑、渲染、状态持久化与旧数据迁移 |
| `haptics.js` | 点击震动反馈：iOS 17.4+ switch/Taptic 路径 + `navigator.vibrate(10)` 降级，暴露 `window.ScheduleHaptics` |
| `sounds.js` | 点击音效：Web Audio 合成（complete/uncomplete/tick），30ms 节流，暴露 `window.ScheduleSounds` |
| `manifest.webmanifest` | PWA 清单：`display: standalone`、`start_url: "./"`、icons 180/192/512 |
| `icon.svg` | 矢量图标源文件（favicon） |
| `icon-180.png` | **iOS 主屏幕图标（必需，iOS 不支持 SVG 图标）** |
| `icon-192.png` / `icon-512.png` | manifest 图标 |
| `tools/make-icons.py` | 用 Pillow 从同一视觉设计重新生成三个 PNG 的脚本 |
| `tests/run-cdp-tests.mjs` | 自动化验收脚本（Chrome Headless + CDP，Node ≥ 22 可运行，零 npm 依赖） |
| `screenshots/` | 验收截图（每日计划顶部/底部、每周菜单顶部/底部/暗色、深色模式）与 `test-results.json` |

---

## 二、本地预览

在项目根目录执行以下任一命令：

```bash
# Python（无需安装任何东西，推荐）
python -m http.server 8765
# 打开 http://127.0.0.1:8765

# Node npx（需 Node 环境）
npx serve .            # http://localhost:3000
npx http-server -p 8080
```

> 本地预览地址（本次开发会话中已启动）：<http://127.0.0.1:8765>
> （若会话结束后失效，用上面的命令重新启动即可。）
>
> 注意：请勿直接双击 `index.html` 以 `file://` 打开后测试 PWA；
> manifest 与主屏幕安装需要 http(s) 协议。

### 自动化验收测试

```bash
# 先启动本地服务器，再执行（会自动拉起无头 Chrome，无需安装 npm 包）
node tests/run-cdp-tests.mjs
```

环境变量可覆盖：`APP_URL`（默认 `http://127.0.0.1:8765/index.html`）、`CHROME_PATH`（默认 Chrome 安装路径）。

### 一键验收

```bash
# 1) 确认文件真实存在
ls -la index.html styles.css app.js manifest.webmanifest icon.svg icon-180.png icon-192.png icon-512.png README.md
# Windows PowerShell 等价写法：
#   Get-ChildItem index.html,styles.css,app.js,manifest.webmanifest,icon.svg,icon-180.png,icon-192.png,icon-512.png,README.md

# 2) 启动本地静态服务器
python -m http.server 8765

# 3) 跑自动化验收（另开一个终端）
node tests/run-cdp-tests.mjs
# 重点看：85/85 全部通过、控制台 0 错误；screenshots/daily-bottom.png 中最后一张卡未被 FAB 遮挡
```

---

## 三、部署

### 方案 A：GitHub Pages（免费，推荐，含自动部署工作流）

仓库已内置自动部署工作流 `.github/workflows/deploy.yml`（push 到 `main` 即自动发布，
也可在 Actions 页手动 `workflow_dispatch`）。完整步骤：

1. 在 GitHub 网页创建仓库：**Public（公开）**——GitHub Pages 免费版要求仓库为 Public，私有仓库需付费套餐；
2. 上传**整个项目根目录**的全部文件，包括：
   `index.html`、`styles.css`、`app.js`、`manifest.webmanifest`、`icon.svg`、
   `icon-180.png`、`icon-192.png`、`icon-512.png`、`README.md`、
   `netlify.toml`、`tools/`、`tests/`、`screenshots/`，以及部署工作流本身；
3. ⚠️ **工作流文件层级不能错**：`deploy.yml` 必须位于仓库的
   `.github/workflows/deploy.yml`（`.github/workflows/` 目录下），不要放到
   `tools/`、`tests/` 或其他目录里，否则 GitHub 不会识别；
4. 打开仓库页 → **Settings → Pages**；
5. **Build and deployment → Source** 选 **GitHub Actions**（不是 “Deploy from a branch”），Save；
6. 首次 push 到 `main` 后（或手动触发），打开仓库 **Actions** 页查看
   “Deploy to GitHub Pages” 工作流，等待绿色完成；
7. 访问 `https://<用户名>.github.io/<仓库名>/`，部署即完成。

工作流说明（无需修改，已按最佳实践配置）：

- 触发条件：`push` 到 `main` 分支 + 手动 `workflow_dispatch`；
- 步骤：`actions/checkout@v4` → `actions/configure-pages` → `actions/upload-pages-artifact`
  （`path: "."`，**整个仓库根目录作为静态站点发布**，`index.html` 位于根目录；
  未写任何排除过滤，`tests/`、`screenshots/`、`tools/` 一并上传，无遗漏风险）→ `actions/deploy-pages`；
- 权限：`contents: read`、`pages: write`、`id-token: write`；
- 运行环境：`ubuntu-latest`；含 `concurrency` 控制避免重复部署冲突；
- GitHub Pages 对 `.webmanifest` 返回正确的 `application/manifest+json`，可直接安装到主屏幕。

### 方案 B：Netlify

两种方式任选：

**B1. Netlify Drop（最快，纯拖拽）**

1. 打开 <https://app.netlify.com/drop>；
2. 把**整个项目文件夹**直接拖入网页（无需 git、无需命令）；
3. 数秒后生成一个即时链接，如 `https://随机名.netlify.app`；
4. ⚠️ 该临时链接**登录认领后才永久保留**：用 GitHub/邮箱账号登录后，
   在 **Site configuration → Site details → Change site name** 里改一个好记的名字即可长期使用。

**B2. 连接 Git 仓库自动部署（读取 `netlify.toml`）**

1. <https://app.netlify.com> → **Add new site → Import an existing project**，选择 GitHub 仓库；
2. 仓库根目录的 `netlify.toml` 已声明 `publish = "."`、`command = ""`（无需构建），
   导入时保持默认即可；
3. 之后每次 push 到 `main` 自动重新部署。

### 方案 C：Vercel

1. 安装 CLI：`npm i -g vercel`；
2. 项目根目录执行 `vercel`（首次按提示登录），Build Command 留空、Output Directory 留空（. 根目录）；
3. 或网页端 <https://vercel.com/new> 导入仓库，框架选 **Other**，直接部署。

> 任选其一后，用 iPhone Safari 打开线上地址即可“添加到主屏幕”。
> 若使用自建静态服务器，请确保 `.webmanifest` 的 MIME 为 `application/manifest+json`
>（`python -m http.server` 与上述平台均正常）。

---

## 四、iPhone Safari “添加到主屏幕”步骤

1. 用 Safari 打开部署地址（本地预览需手机与电脑同一局域网，访问 `http://<电脑IP>:8765`）；
2. 点击底部分享按钮（方框 + 向上箭头）；
3. 选择 **“添加到主屏幕”**；
4. 名称显示为 **“一日计划”**，点 **“添加”**；
5. 主屏幕出现应用图标（即 `icon-180.png`，非截图/白屏）；
6. 点击图标以**独立窗口**打开（无 Safari 地址栏），状态栏为半透明黑，内容延伸至状态栏下方（已通过 `env(safe-area-inset-top)` 适配）。

> 说明：本页使用 `apple-mobile-web-app-capable`、`black-translucent`、
> `apple-touch-icon`(180×180 PNG)、`manifest.display: standalone` 四者共同保证上述效果。
> 本应用未注册 Service Worker（需求未要求离线缓存），独立窗口运行时页面资源走网络；
> 如需完全离线，可在根目录新增 `sw.js` 并在 `index.html` 注册（约 10 行，可按需添加）。
>
> ⚠️ **图标缓存**：iOS 对主屏幕图标有缓存。今后若更新 `icon-180.png`，已安装的旧图标
> **不会自动刷新**——需长按旧图标删除，再重新执行“添加到主屏幕”，才会显示新图标。

---

## 五、localStorage 重置方法

| 方式 | 操作 |
|---|---|
| 应用内 | 点右上角“重置”按钮 → 按钮变为“确认重置?”（3.5 秒内）→ 再点一次；**只清空当前视图**（每日计划或每周菜单），不影响另一个视图 |
| Safari 开发者工具 | 打开页面 → 分享/地址栏旁操作 → 网页检查器（Mac 连真机）→ 控制台执行：`localStorage.removeItem('kaoyan-daily-schedule-v1')` 后刷新 |
| Safari 设置 | 设置 → Safari → 高级 → 网站数据 → 找到该域名 → 删除数据（会清空该站全部存储） |
| 自动重置 | 无需手动：跨日时自动清空**两个视图**（daily + menu）的打卡并写入新日期，当前 Tab（mode）保留 |

存储数据结构（`kaoyan-daily-schedule-v1`，schema version 2）：

```json
{
  "version": 2,
  "date": "2026-10-23",
  "mode": "daily",
  "completed": {
    "daily": { "t-0650": true },
    "menu": { "mon-breakfast": true, "mon-snackTraining": true, "mon-snackRest": true }
  }
}
```

菜单餐次 key 规则：`mon/tue/wed/thu/fri/sat/sun` + `breakfast/lunch/snackTraining/snackRest/dinner`；
其中 `-snackTraining` 与 `-snackRest` 成对出现、成对清除（共享一个勾选位，进度只计 1 次）。

---

## 六、日期与时间逻辑

- “今天”一律由 `localDateKey()` 用 `getFullYear/getMonth/getDate` 生成本地时区日期，
  **不使用 `toISOString()`**，避免 UTC 偏移导致 23:59/00:01 跨日重置错误（已单测验证）。
- 当前时间段 = 当前时间落在 `[task.time, nextTask.time)` 的任务；最后一项（22:30 睡觉）持续至 23:59。
- 早于 06:50：不高亮任何任务，预告卡显示“下一项：06:50 起床”，悬浮按钮隐藏。
- 当前任务即使已勾选完成，仍保持蓝色高亮，并显示“当前 · 已完成”。
- 未完成且时间已过的任务显示橙色左边框 + “已过”徽章。
- 每 15 秒及回到前台时自动校准高亮，无需手动刷新。
- **常驻跨日自动重置（PWA 后台过夜场景）**：`ensureToday()` 挂载在 15 秒定时器与
  `visibilitychange`/`focus`（回到前台）回调中——只要检测到 `localDateKey()` 与
  `state.date` 不一致，立即清空 daily + menu 两个视图的 `completed`、更新 date、
  回写 localStorage 并重渲染，`mode`（当前 Tab）保留。也就是说，页面整夜不关，
  早上回到前台也会自动清零，不只依赖“重新打开页面”（自动化测试见第九节追加项第 7 条）。
- **旧数据迁移（version 1 → 2，自动、不报错）**：读到旧值 `mode="training"` 映射为
  `"daily"`，`completed.training` 并入 `completed.daily`（t-* 打卡保留）；读到
  `mode="rest"` 映射为 `"menu"`，`completed.rest` 直接丢弃（r-* 时间表与菜单餐次无
  对应关系），`completed.menu` 初始化为空对象。迁移后立即回写新结构，全程 try/catch，
  存储不可用时降级为内存态，不白屏（自动化测试见第九节追加项第 11 条）。

---

## 七、每周菜单使用说明

顶部 Tab “每周菜单”展示 7 天 × 4 餐 = 28 个可勾选餐次（周一至周日，每张卡片含
早餐 / 午餐 / 加餐 / 晚餐 + 当天饮水目标）：

- **打卡方式**：点整行（勾选圆圈直径 32px，整行可点）切换“已吃/未吃”，支持键盘
  Enter/Space；完成态为灰色文字 + 浅绿底 + 绿色删除线（不用 opacity 压暗）。
- **加餐共享勾选**：加餐行内同时显示“训练日加餐”与“休息日加餐”两个标签，共享一个
  勾选位——勾选后两个标签同时显示完成态、两个存储键（`-snackTraining`/`-snackRest`）
  同时写入，但进度只计 1 次。
- **进度**：菜单视图顶部进度条显示“已吃餐次/28”。
- **无时间高亮**：菜单视图没有“当前”高亮、“已过”徽章和“回到当前”悬浮按钮
  （这些仅属于每日计划视图）；菜单视图同样支持二次确认重置，且**只清当前视图**。
- **饮水提示**：每张菜单卡底部显示“训练日 约 X ml · 休息日 约 Y ml · 少量多次”。

---

## 八、音效与震动反馈

由 [haptics.js](D:/文档/deepseek-harness/default-workspace/haptics.js) 与 [sounds.js](D:/文档/deepseek-harness/default-workspace/sounds.js) 两个独立模块提供，
与打卡逻辑完全解耦（任何一方失败只 `console.warn`，绝不阻断打卡）：

| 模块 | 机制 |
|---|---|
| **震动** | iOS Safari 不支持 `navigator.vibrate`。Safari 17.4+ 检测到 `<input type="checkbox" switch>` 支持时，为每个目标元素叠加透明 `<label for>`（绝对定位覆盖整卡、`opacity:0`、`z-index:2`）指向离屏隐藏 switch：真实点击由 label 承接 → `preventDefault` 后手动切换 switch → 触发原生 Taptic Engine；事件冒泡到元素自身的点击处理器完成打卡（唯一入口）。桌面/安卓且存在 `navigator.vibrate` 时降级为 `vibrate(10)`（仅在真实用户手势内调用，避免无手势拦截噪音）。其他环境静默 no-op |
| **音效** | 纯 Web Audio 合成：`complete`（880→1320 Hz 上扬，50ms，gain 0.12）、`uncomplete`（880→660 Hz 下沉，38ms，gain 0.08）、`tick`（600 Hz 轻触，18ms，gain 0.05）；首次手势同步 `resume()` 并预热静音 buffer，`visibilitychange` 回前台自动恢复；**30ms 节流**防连点爆音 |

- 挂载范围：每日计划任务卡、每周菜单勾选行、顶部 Tab、重置按钮、回到当前悬浮按钮。
- 防双触发：label click 先 `preventDefault`；per-element **80ms 防抖锁**仅作用于
  switch 路径（该路径才存在 label/switch 双通道），重复通道被拦截、状态干净翻转一次，
  “连点 10 次翻转 10 次”实测通过。
- 层级避让：目标元素置为 `position: relative; overflow: visible`；若内部存在
  `button/a/[role=button]`，自动提升到 `z-index: 3`（高于 label 的 2），不被遮挡。
- 重挂载：每次视图渲染先 `destroy()` 再挂载，切换 Tab 不泄漏旧 overlay。
- 测试钩子：页面加载前设置 `window.__SCHEDULE_HAPTICS_FORCE__ = "switch" | "vibrate"`
  可强制走指定路径；`window.ScheduleSounds.debug = { attempts, throttled, played }`
  供节流断言使用。

---

## 九、测试结果（2026-10-23，Chrome Headless 模拟 iPhone 390×844 @3x）

自动化脚本 `tests/run-cdp-tests.mjs` 共 **85/85 项断言全部通过，控制台 0 错误**
（脚本输出口径 85 项；`screenshots/test-results.json` 另含最终“控制台零错误”复核一条）。
截图与原始结果见 `screenshots/`（`daily-top.png`、`daily-bottom.png`、`menu-top.png`、
`menu-bottom.png`、`dark-top.png`、`menu-dark.png`、`test-results.json`）。

### 原 10 项验收

| # | 验收项 | 结果 |
|---|---|---|
| 1 | 本地静态服务器打开，无控制台错误 | ✔ 85 断言运行全程 `console.error` / 未捕获异常 = 0（无手势 vibrate 拦截提示为预期噪音，已单独计数为 0） |
| 2 | 390×844 无横向滚动；可点击区域 ≥44px；底部按钮不被遮挡 | ✔ overflow=0px；每日计划与菜单两视图全部交互元素 ≥44×44（菜单勾选圆圈 ≥32×32）；滚到底时最后一张卡 `bottom ≤` 悬浮按钮 `top` |
| 3 | 点击任务卡切换完成；刷新后保持 | ✔ 点击→`aria-checked=true`、绿色左边框、删除线；完成态用“灰色文字 + 浅绿底”表达（**不使用整体 opacity 降透明度**，保证对比度）；刷新后 1/35 保留 |
| 4 | 每日计划/每周菜单打卡互不影响；刷新停留上次 Tab | ✔ daily 1/35 与 menu 1/28 独立，切换往返不串；刷新后停留在上次 Tab（菜单） |
| 5 | date 改为昨天后刷新，completed 自动清空 | ✔ daily+menu 两视图全清空、mode 保留、date 更新为今天 |
| 6 | 当前时间段“当前”高亮；已过未完成显示“已过” | ✔ 08:35 → 唯一当前 t-0830，已过徽章恰 5 个；06:40 无当前；23:59 当前 t-2230 |
| 7 | 进度数字、百分比、进度条一致 | ✔ 1/35·3%·3%、3/35·9%·9%·aria、菜单 1/28·4%·4% 全部一致 |
| 8 | 暗色模式对比度可读 | ✔ 每日计划标题 14.32:1、正文 17.66:1、完成态 6.40/5.01:1；菜单标题 14.32:1、正文 10.72:1、完成态 6.40/5.01:1，均 ≥4.5:1 |
| 9 | 自动化/手动校验并记录于 README | ✔ 本表即记录，脚本可复跑 |
| 10 | README 说明本地预览/部署/主屏幕/重置 | ✔ 见第二、三、四、五节 |

### 追加验收（硬性补丁 + 复核补丁 + 双 Tab 改造）

| # | 验收项 | 结果 |
|---|---|---|
| 1 | 主屏幕图标为 `icon-180.png`，非 SVG/截图 | ✔ `apple-touch-icon` 指向本地 180×180 PNG；180/192/512 PNG 均由 `tools/make-icons.py` 生成且尺寸校验通过 |
| 2 | 刘海屏：顶部不被状态栏遮挡、底部按钮不被 Home 横条遮挡 | ✔ 顶部 `padding-top: env(safe-area-inset-top)`；FAB `bottom: calc(16px + env(safe-area-inset-bottom))`；列表底部预留 `按钮高度 + 24px + safe-area` |
| 3 | date 改昨天后：两视图 completed 全清、mode 保留、date 更新 | ✔ 自动化断言通过（见第 5 项） |
| 4 | 23:59 与 00:01 本地日期边界 | ✔ `localDateKey(new Date(2026,0,1,23,59))==='2026-01-01'`、`(2026,0,2,0,1)==='2026-01-02'` 通过 |
| 5 | Safari 隐私模式 / localStorage 禁用时不白屏、可打卡 | ✔ 注入“localStorage 读取即抛错”后每日计划 35 卡与菜单 7 卡/28 行均正常渲染、可打卡（内存态）、刷新不崩溃，仅 console.warn |
| 6 | 键盘 Enter 与 Space 均可切换；Space 不滚动页面 | ✔ 每日计划任务卡与菜单餐次行两键均生效，Space 触发时 `scrollY` 位移 Δ=0px（`preventDefault` 生效） |
| 7 | 页面常驻跨日（后台过夜）：completed 自动清空、date 更新、mode 保留 | ✔ 伪造 23:58 加载并每日 1/35 + 菜单 1/28 → 日期拨到次日 00:01 后触发 `visibilitychange`：daily+menu 全清 0、date=次日、mode 保留；再打卡后仅靠 **15s 定时器** 跨日也自动清零（两条路径均通过） |
| 8 | 暗色模式下“已完成任务”文字对比度 | ✔ 完成态不再用 `opacity` 压暗，改为灰色文字 + 浅绿渐变底 + 绿色删除线：暗色每日 6.40/5.01:1、暗色菜单 6.40/5.01:1、浅色 7.56:1，均 ≥4.5:1 |
| 9 | iOS 主屏幕图标缓存说明 | ✔ README 第四节已注明：更新 `icon-180.png` 后需删除旧图标并重新“添加到主屏幕” |
| 10 | 顶部仅两个 Tab，无“不运动日”入口 | ✔ 页面仅“每日计划 / 每周菜单”两个 Tab，整页文案无“不运动日”（自动化断言） |
| 11 | 每周菜单 28 餐次 + 训练日/休息日加餐共享勾选 | ✔ 7 卡/28 行；点击周一早餐 → 1/28·4%；勾选加餐 → `-snackTraining` 与 `-snackRest` 两键同写、两标签同时完成态、进度只 +1（2/28·7%）；再点 → 两键同清、回 1/28 |
| 12 | 旧数据迁移 v1→v2（不报错） | ✔ 旧 `mode="training"` → 映射 `"daily"`，`completed.training` 保留（1/35），回写 version 2；旧 `mode="rest"` → 映射 `"menu"`，`completed.rest` 丢弃、`completed.menu={}`（0/28），全程无异常 |
| 13 | 点击音效 + iOS 震动（switch 路径） | ✔ 强制 switch 路径：39 个透明 label + 39 个隐藏 switch 正确挂载（2 Tab + 重置 + FAB + 35 卡）；真实输入事件点击 label → 状态恰好翻转一次 + switch 同步翻转；80ms 防抖锁拦截重复通道（120ms 后干净翻转）；同一卡连点 10 次交替翻转 10 次；切 Tab 重挂载 32/39 个无泄漏 |
| 14 | 音效节流与震动降级 | ✔ 5 卡同步连点：`attempts=5、played=1、throttled=4`（30ms 节流生效，无爆音）；强制 vibrate 路径：不创建任何 label/switch，点击触发 `vibrate(10)` 且打卡成功；无 autoplay 拦截、无手势 vibrate 静默跳过（良性降级计数 0） |

### 交互细节（实现层面）

- 任务卡 / 菜单餐次行 `role="checkbox"` + `aria-checked`；整卡（整行）点击切换；卡内如有 `button/a` 会被 `closest` 排除。
- 键盘：`Enter` 与 `Space`/`Spacebar` 均切换，`Space` 已 `preventDefault`（两个视图一致）。
- 焦点可见：所有交互元素有 `:focus-visible` 蓝色描边。
- “重置今天”为二次确认（先进入“确认重置?”态，3.5 秒内再点才生效），**只清当前视图**。
- “当前”高亮 / “已过”徽章 / 预告卡 / “回到当前”悬浮按钮仅存在于每日计划视图。
- 点击反馈统一走 `hapticsGate()`（震动闸门 + 80ms 防双触发）+ `ScheduleSounds.play()`：
  打卡/切 Tab/重置/回当前均带震动与音效，但任何模块异常都不阻断原逻辑。
- `prefers-reduced-motion` 下禁用动画与平滑滚动。
- 测试钩子：页面加载前设置 `window.__SCHEDULE_TEST_NOW__ = "HH:MM"` 可固定“当前时间”
  以便复现任意时段（仅影响时分，不影响日期）；`window.__SCHEDULE_HAPTICS_FORCE__ =
  "switch" | "vibrate"` 强制震动路径；`window.ScheduleSounds.debug` 提供音效节流计数。

---

## 十、图标再生成

如需调整图标样式：改 `tools/make-icons.py`（与 `icon.svg` 同一构图：青绿→蓝渐变圆角方块 + 白环 + 对勾）后执行：

```bash
python tools/make-icons.py   # 重新输出 icon-180.png / icon-192.png / icon-512.png
```

---

## 十一、已知说明（非缺陷）

1. **无 Service Worker**：按需求最小文件集交付，未做离线缓存；首次加载需网络。部署到 GitHub Pages 后主屏幕 App 联网可用。
2. **本地局域网预览时 iOS 图标**：`http://<电脑IP>` 非 https，个别 iOS 版本可能不显示主屏幕图标——线上部署（https）后完全正常。
3. **时区**：所有“今天”判断使用设备本地时区；跨时区旅行后首次打开会按新时区重置当天。
4. **旧数据兼容**：schema 已升至 version 2（daily/menu）；老用户升级后由迁移逻辑自动处理，旧“不运动日”打卡（rest）不与菜单对应，按设计丢弃。
5. **音效与震动**：音效依赖用户首次真实手势解锁 AudioContext（首次点击后生效）；iOS 震动依赖 Safari 17.4+ 的 switch 控件（更早版本自动降级为无震动）；桌面浏览器无手势的程序化 `vibrate` 会被浏览器拦截，应用按设计静默跳过。
