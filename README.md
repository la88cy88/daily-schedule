# 一日计划 · 考研 + 力量训练时间表打卡（iOS PWA）

一个纯静态、零依赖的单页打卡应用：按时间段逐项点击完成今日任务，自动高亮“当前”时间段，
按本地日期自动重置，专为 iPhone Safari 及“添加到主屏幕”使用而适配。

- 技术栈：原生 HTML + CSS + JavaScript，无框架、无构建、无 CDN、无后端
- 任务数据：运动日 35 项 / 不运动日 34 项，含饮食饮水细节、类别标签与体检红线徽章（血压 / 尿酸 / 颈椎 / 前列腺 / 脾胃）
- 状态存储：`localStorage`（key：`kaoyan-daily-schedule-v1`），两个模式完成状态相互独立

---

## 一、文件结构

| 文件 | 说明 |
|---|---|
| `index.html` | 页面骨架 + iOS PWA meta（apple-touch-icon 180、black-translucent、theme-color 双模式） |
| `styles.css` | 全部样式：卡片式、浅色/深色自动、safe-area 适配、状态色（当前蓝 / 已过橙 / 完成绿） |
| `app.js` | 任务数据（training/rest 两组数组）、日期/时间逻辑、渲染与状态持久化 |
| `manifest.webmanifest` | PWA 清单：`display: standalone`、`start_url: "./"`、icons 180/192/512 |
| `icon.svg` | 矢量图标源文件（favicon） |
| `icon-180.png` | **iOS 主屏幕图标（必需，iOS 不支持 SVG 图标）** |
| `icon-192.png` / `icon-512.png` | manifest 图标 |
| `tools/make-icons.py` | 用 Pillow 从同一视觉设计重新生成三个 PNG 的脚本 |
| `tests/run-cdp-tests.mjs` | 自动化验收脚本（Chrome Headless + CDP，Node ≥ 22 可运行，零 npm 依赖） |
| `screenshots/` | 验收截图（浅色顶部 / 浅色底部 / 深色）与 `test-results.json` |

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
# 重点看：54/54 全部通过、控制台 0 错误；screenshots/light-bottom.png 中最后一张卡未被 FAB 遮挡
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
| 应用内 | 点右上角“重置”按钮 → 按钮变为“确认重置?”（3.5 秒内）→ 再点一次；两模式完成状态全部清空 |
| Safari 开发者工具 | 打开页面 → 分享/地址栏旁操作 → 网页检查器（Mac 连真机）→ 控制台执行：`localStorage.removeItem('kaoyan-daily-schedule-v1')` 后刷新 |
| Safari 设置 | 设置 → Safari → 高级 → 网站数据 → 找到该域名 → 删除数据（会清空该站全部存储） |
| 自动重置 | 无需手动：每天首次打开时检测到存储日期不是今天，自动清空两个模式的打卡并写入今天 |

存储数据结构（`kaoyan-daily-schedule-v1`）：

```json
{
  "version": 1,
  "date": "2026-10-23",
  "mode": "training",
  "completed": { "training": { "t-0650": true }, "rest": { "r-0700": true } }
}
```

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
  `state.date` 不一致，立即清空 training/rest 两个模式的 `completed`、更新 date、
  回写 localStorage 并重渲染，`mode` 保留。也就是说，页面整夜不关，早上回到前台
  也会自动清零，不只依赖“重新打开页面”（自动化测试见第七节追加项第 7 条）。

---

## 七、测试结果（2026-10-23，Chrome Headless 模拟 iPhone 390×844 @3x）

自动化脚本 `tests/run-cdp-tests.mjs` 共 **54 项断言全部通过，控制台 0 错误**。
截图与原始结果见 `screenshots/`（`light-top.png`、`light-bottom.png`、`dark-top.png`、`test-results.json`）。

### 原 10 项验收

| # | 验收项 | 结果 |
|---|---|---|
| 1 | 本地静态服务器打开，无控制台错误 | ✔ 54 断言运行全程 `console.error` / 未捕获异常 = 0 |
| 2 | 390×844 无横向滚动；可点击区域 ≥44px；底部按钮不被遮挡 | ✔ overflow=0px；全部交互元素 ≥44×44；滚到底时最后一张卡 `bottom ≤` 悬浮按钮 `top` |
| 3 | 点击任务卡切换完成；刷新后保持 | ✔ 点击→`aria-checked=true`、绿色左边框、删除线；完成态用“灰色文字 + 浅绿底”表达（**不使用整体 opacity 降透明度**，保证对比度）；刷新后 1/35 保留 |
| 4 | 运动日/不运动日完成状态互不影响 | ✔ training 1/35 与 rest 1/34 独立，切换往返不串 |
| 5 | date 改为昨天后刷新，completed 自动清空 | ✔ 两模式全清空、mode 保留、date 更新为今天 |
| 6 | 当前时间段“当前”高亮；已过未完成显示“已过” | ✔ 08:35 → 唯一当前 t-0830，已过徽章恰 5 个；06:40 无当前；23:59 当前 t-2230 |
| 7 | 进度数字、百分比、进度条一致 | ✔ 1/35·3%·3% 与 3/35·9%·9%·aria-valuenow 全部一致 |
| 8 | 暗色模式对比度可读 | ✔ 任务标题 14.32:1、正文 17.66:1；完成态标题/细节 6.40:1（卡片底）/ 5.01:1（绿底渐变）均 ≥4.5:1 |
| 9 | 自动化/手动校验并记录于 README | ✔ 本表即记录，脚本可复跑 |
| 10 | README 说明本地预览/部署/主屏幕/重置 | ✔ 见第二、三、四、五节 |

### 追加验收（6 项硬性补丁 + 3 项复核补丁）

| # | 验收项 | 结果 |
|---|---|---|
| 1 | 主屏幕图标为 `icon-180.png`，非 SVG/截图 | ✔ `apple-touch-icon` 指向本地 180×180 PNG；180/192/512 PNG 均由 `tools/make-icons.py` 生成且尺寸校验通过 |
| 2 | 刘海屏：顶部不被状态栏遮挡、底部按钮不被 Home 横条遮挡 | ✔ 顶部 `padding-top: env(safe-area-inset-top)`；FAB `bottom: calc(16px + env(safe-area-inset-bottom))`；列表底部预留 `按钮高度 + 24px + safe-area` |
| 3 | date 改昨天后：两模式 completed 全清、mode 保留、date 更新 | ✔ 自动化断言通过（见第 5 项） |
| 4 | 23:59 与 00:01 本地日期边界 | ✔ `localDateKey(new Date(2026,0,1,23,59))==='2026-01-01'`、`(2026,0,2,0,1)==='2026-01-02'` 通过 |
| 5 | Safari 隐私模式 / localStorage 禁用时不白屏、可打卡 | ✔ 注入“localStorage 读取即抛错”后页面正常渲染 35 卡、可打卡（内存态）、刷新不崩溃，仅 console.warn |
| 6 | 键盘 Enter 与 Space 均可切换；Space 不滚动页面 | ✔ Tab 聚焦任务卡后两键均生效，Space 触发时 `scrollY` 位移 Δ=0px（`preventDefault` 生效） |
| 7 | 页面常驻跨日（后台过夜）：completed 自动清空、date 更新、mode 保留 | ✔ 伪造 23:58 加载并打卡 1/35 → 日期拨到次日 00:01 后触发 `visibilitychange`：0/35、date=次日、mode 保留；再打卡后仅靠 **15s 定时器** 跨日也自动清零（两条路径均通过） |
| 8 | 暗色模式下“已完成任务”文字对比度 | ✔ 完成态不再用 `opacity: 0.62`（压暗后不达标），改为灰色文字 + 浅绿渐变底 + 绿色删除线：暗色完成态标题/细节 6.40:1（卡片底）与 5.01:1（绿底渐变），浅色完成态 7.56:1，均 ≥4.5:1 |
| 9 | iOS 主屏幕图标缓存说明 | ✔ README 第四节已注明：更新 `icon-180.png` 后需删除旧图标并重新“添加到主屏幕” |

### 交互细节（实现层面）

- 任务卡 `role="checkbox"` + `aria-checked`；整卡点击切换；卡内如有 `button/a` 会被 `closest` 排除。
- 键盘：`Enter` 与 `Space`/`Spacebar` 均切换，`Space` 已 `preventDefault`。
- 焦点可见：所有交互元素有 `:focus-visible` 蓝色描边。
- “重置今天”为二次确认（先进入“确认重置?”态，3.5 秒内再点才生效）。
- `prefers-reduced-motion` 下禁用动画与平滑滚动。
- 测试钩子：在页面加载前设置 `window.__SCHEDULE_TEST_NOW__ = "HH:MM"` 可固定“当前时间”以便复现任意时段（仅影响时分，不影响日期）。

---

## 八、图标再生成

如需调整图标样式：改 `tools/make-icons.py`（与 `icon.svg` 同一构图：青绿→蓝渐变圆角方块 + 白环 + 对勾）后执行：

```bash
python tools/make-icons.py   # 重新输出 icon-180.png / icon-192.png / icon-512.png
```

---

## 九、已知说明（非缺陷）

1. **无 Service Worker**：按需求最小文件集交付，未做离线缓存；首次加载需网络。部署到 GitHub Pages 后主屏幕 App 联网可用。
2. **本地局域网预览时 iOS 图标**：`http://<电脑IP>` 非 https，个别 iOS 版本可能不显示主屏幕图标——线上部署（https）后完全正常。
3. **时区**：所有“今天”判断使用设备本地时区；跨时区旅行后首次打开会按新时区重置当天。
