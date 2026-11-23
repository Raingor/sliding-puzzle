# 归位 · 数字华容道

蓝白珐琅数字块与深蓝滑轨构成的一方小棋盘。中文、无后端、无账号，独立的 TypeScript + DOM 游戏。

## 仓库与在线试玩

- GitHub：https://github.com/Raingor/sliding-puzzle
- GitHub Pages：https://raingor.github.io/sliding-puzzle/ （19角色版已上线，线上39项头像检查及37项完整玩法回归通过；142项单测和严格构建通过）
- main 推送自动执行单元测试、类型检查、生产构建和 Pages 发布。

## 运行

已在 Node **24.18.0**、npm **11.16.0** 验证；最低 Node 22.12。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
npm run test:browser
GAME_URL=http://localhost:4178 npm run test:browser
```

- 开发：`http://localhost:5178`；生产预览：`http://localhost:4178`。两个端口均为 strictPort，冲突会明确失败，不抢占已有服务。
- `build` 先执行 `tsc --noEmit`，再构建到 `dist/`；Vite `base: './'`，可部署到静态站子目录。
- 浏览器验收使用 Playwright + 本机 Chrome（`channel: 'chrome'`），每个场景新建独立上下文，不操作个人浏览器登录态。可用 `GAME_URL` 指向任意开发/生产站点，`SMOKE_LABEL` 指定本地报告文件前缀。
- 无运行时第三方依赖、远程字体、外部图片或兄弟项目引用。

## 陪你归位 · 19 位人物头像（已上线并完成浏览器验收）

操作区的珐琅陪伴卡显示当前头像和人物名字。点击或按 Enter/Space 展开原生角色选择面板，消消乐的全部 19 位人物均可直接选择，无解锁要求；选中后收起并返回展开按钮焦点。Escape 收起，方向键不会操作游戏棋盘。

仅复制了 19 张 WebP 头像至 `public/characters-2d/`（约 700KB），不包含全身图、PNG 或 Three.js。目录与角色名称独立维护在 `src/characters.ts`，无兄弟项目运行时依赖；图片采用相对 URL 兼容 Pages 子路径。

头像选择单独使用 `puzzle-sliding-character-v1`，保存 `{ version: 1, id }`，不覆盖棋盘或纪录。非法 id、错误版本、坏 JSON、localStorage 属性/读取/写入异常均安全默认或仅在当前会话使用新选择。

本次新增后已执行：**142 条单测通过 / 3 文件**（含新增 30 条角色存储测试），`npm run build` 通过，`node --check scripts/characters-smoke.mjs` 通过，生产目录有 19 张 WebP。子Agent遵照错峰指令未启动浏览器；主Agent随后独立本地与线上均通过39项头像+37项玩法检查。人物版 `b064e7d` 已发布，Pages部署44733718911成功。

协调 Agent 验收命令：

```sh
GAME_URL=http://localhost:4178 SMOKE_LABEL=preview node scripts/characters-smoke.mjs
GAME_URL=http://localhost:4178 npm run test:browser
# 发布后再验，不能用旧版站点代替本地新版：
GAME_URL=https://raingor.github.io/sliding-puzzle/ SMOKE_LABEL=pages node scripts/characters-smoke.mjs
GAME_URL=https://raingor.github.io/sliding-puzzle/ npm run test:browser
```

头像脚本使用独立 Chrome 上下文，覆盖 19 张图片解码、全部角色选择、刷新、键盘和 Escape、非法/不可用存储及 360 宽布局；截图/报告为 `artifacts/characters-<SMOKE_LABEL>-{desktop,mobile}.png` 和 `characters-<SMOKE_LABEL>-report.json`。目前脚本已写入但未运行，没有声称产生新截图。

## 玩法

- 支持 3×3 轻松入门与 4×4 进阶挑战。
- 将数字从左到右、从上到下排列，最后一格留空。
- 点击或轻触空格相邻的数字，数字块会进入空格；不能斜移、跳格或跨行。
- 聚焦棋盘后使用方向键；手机还可在棋盘上真实滑动或使用屏幕方向按钮。
- **方向始终表示数字块的移动方向，不是空格方向。** 例如向左操作：空格右侧的数字向左滑入空位。
- 第一次有效移动开始计时；无效移动不计步。完成后时间冻结并显示结算，可留在完成棋盘或再来一局。
- 切换尺寸与重新开局会生成新棋盘，当前局面会被替换；打开说明不暂停计时。

## 规则和存储

`src/engine.ts` 与 DOM、存储和计时器无关，随机源与当前时间通过参数注入。每局从目标盘面进行有限次合法移动，3 阶默认 72 步、4 阶 160 步，排除立即逆向；若恰好回到完成态再走一步。因而每局可解且不是完成盘。打乱路径保留在新游戏引擎状态中供测试逆回放，不提供运行时求解器或提示解法。打乱步数不是最优解长度或难度证明。

使用版本化 key `puzzle-sliding-v1`，版本号为 1：

- 分尺寸保存**最少步数**与**最快用时**，两项独立，不宣称来自同一局。
- 保存通过校验的当前棋盘、尺寸、步数、累计用时与状态，刷新可续局。离开页面到重新打开的时间不计入；页面保持打开但处于后台的时间继续计入。
- 校验排列完整性、可解奇偶性、字段类型/数值范围、状态一致性和版本；坏 JSON 或不支持版本回退为新局，坏子字段单独舍弃。
- 捕获 localStorage 属性访问、读取、配额/写入异常；保存不可用会有文字提示，但游戏仍可进行。
- 不存账号、敏感信息或随机打乱路径。

浏览器固定胜利夹具通过上述正式存档格式注入，最后一步仍由真实 UI 输入完成；产品没有全局作弊变量、测试后门或开发态 `/src` 动态导入。

## 原版验证结果（2026-11-20，头像加入前历史）

- `npm test`：**112 条通过 / 2 个文件**。包含 3/4 阶各 40 种子打乱不变量、逆回放、边界、无效操作、计时/胜利与存储异常。
- `npm run build`：严格 TS 检查及 Vite 生产构建通过。
- 开发 `http://localhost:5178`：**36 项真实浏览器检查通过**。
- 生产 `http://localhost:4178`：**36 项真实浏览器检查通过**。
- 覆盖 1440×900、390×844、360 宽；真实点击、键盘、触屏点击、四方向 CDP Touch 滑动、触屏方向键、两尺寸胜利、刷新纪录、续局、快速重开、说明模态框与焦点、reduced-motion、坏存档/不支持版本/禁用存储。
- 两轮无 pageerror、console error、失败请求、HTTP 4xx/5xx。桌面与手机截图经视觉复核无重叠/截断；360 宽无水平溢出。

`artifacts/` 被忽略；验收生成 `dev-report.json`、`preview-report.json`，以及两组 `*-desktop.png`、`*-four.png`、`*-mobile.png`、`*-narrow-four.png`、`*-victory.png`。全页手机截图可垂直滚动，不为挤入一屏压缩棋盘。

## 文件

- `src/engine.ts`：规则、可解性校验、计时模型、移动方向语义。
- `src/storage.ts`：版本化存档、异常降级、纪录更新。
- `src/main.ts` / `src/style.css`：界面、输入、焦点与响应式。
- `src/*.test.ts`：规则与存储单测。
- `scripts/smoke.mjs`：开发及生产通用的独立浏览器验收。
- `task_plan.md` / `progress.md`：本项目实施记录；研究决策在本 README 中，`findings.md` 未生成（子 Agent 工具限制）。

## 边界

首版不包含自动求解、撤销、排行榜或云同步。四阶可能需要较多探索，可随时重新开局。验收要求本机已安装 Chrome；移动端由 Chrome 触屏上下文与 CDP Touch 真实输入协议验证，未声称在实体 iOS/Android 设备上测试。GitHub 仓库/Pages 由主Agent配置和最终验收；人物版现已上线，实际发布记录见progress.md。

## 图标来源

页面 favicon 与界面图标于 2026-11-23 通过 opencli 从 [iconfont.cn](https://www.iconfont.cn/) 搜索采集；图标名称、ID、搜索词与落位见 [ICONS.md](./ICONS.md)。界面图标统一以 `currentColor` 渲染，favicon 使用本项目主题色。
