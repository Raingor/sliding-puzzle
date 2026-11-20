# 实施进度

日期：2026-11-20。写入限本项目。协调 Agent 添加的 .github/workflows/deploy.yml 保持不动。

## 已完成节点

1. 已读根计划和 2048 package/tsconfig/vite/.gitignore，加载 frontend-design；SendMessage main 汇报启动。
2. 创建独立 skeleton 并 npm install（47 packages，0 vulnerabilities）；Node v24.18.0/npm11.16.0；dev5178、preview4178 均 strictPort。SendMessage 汇报骨架完成。
3. 纯规则/注入随机/合法打乱与逆回放测试；安全本地记录与校验续局；珐琅主棋盘、输入与结算完整。SendMessage 汇报规则/界面完成。
4. 完整单测与生产构建通过；开发/生产分别实机浏览器验证通过，截图产出并视觉复核。SendMessage 汇报最终验收节点。

## 已执行命令及真实结果

在项目目录中等价执行以下命令（工具以 npm --prefix 指定绝对目录）：

- `npm install`：成功，0 vulnerabilities；生成独立 package-lock.json。
- 最终 `npm ci`：成功，0 vulnerabilities；npm 提示可选 fsevents 安装脚本尚未授权，不影响后续测试/构建（未变更授权配置）。
- 最终 `npm test`：**112 passed / 2 files**。
- `npm run build`：**tsc --noEmit + Vite 通过**，相对资源基址。
- `npm run dev`：本 Agent 服务运行于 **http://localhost:5178**。
- `npm run preview`：本 Agent服务运行于 **http://localhost:4178**。
- 首次 `npm run test:browser`：测试脚本等待 aria-disabled 元素 enabled 超时；改为物理鼠标坐标点击后重跑通过。产品规则不变。
- 最终 `npm run test:browser`：**36 checks passed**（dev5178）。
- 最终 `GAME_URL=http://localhost:4178 npm run test:browser`：**36 checks passed**（preview4178）。

两轮覆盖真实点击/键盘、手机 tap、CDP 四方向 touch swipe、方向按钮、3/4 阶最后一步胜利和刷新成绩、新纪录、续局、重开、快速点击、尺寸切换、说明模态框/焦点、reduced-motion、损坏与禁用存储。均无 pageerror、console error、失败请求或 HTTP 错误。

## 产物与交接

`artifacts/dev-report.json` 与 `artifacts/preview-report.json` 各记录36项；两组 dev/preview 的 desktop、four、mobile、narrow-four、victory PNG。1440×900、390×844、360 宽已检查，桌面/手机经 magpie-vision 复核无实际可见重叠或截断。

服务保持运行供协调 Agent 复核。不终止他人服务。未执行 Git/commit/push/部署/memory/Artifact，也未改根计划或其他游戏。

## 主 Agent 发布与线上回归
- 独立复跑112单测、构建与本地36项浏览器验收通过后，创建 https://github.com/Raingor/sliding-puzzle 并推送。
- 首次线上验收暴露dialog异步close处理器抢焦点的真实竞争，交回原Agent移除重复恢复逻辑，增加确定性回归及严格真实Tab焦点断言。
- 修复提交 `80b87e1`，Actions https://github.com/Raingor/sliding-puzzle/actions/runs/44716787330 成功。
- 站点 https://raingor.github.io/sliding-puzzle/ ，修复后线上37/37浏览器检查通过，无页面/控制台/资源错误。
- 修复后的开发和生产preview均37项通过，112单测与构建仍通过。线上报告 `artifacts/pages-report.json`。

## 新增人物头像（本地实现，尚未浏览器/线上验收）

- 只读消消乐catalog，复制19张WebP到本项目public/characters-2d（约700KB），无全身图/PNG/Three或兄弟运行时依赖。
- 新增src/characters.ts与characters.css；操作区珐琅陪伴卡显示头像和名字，原生details展开19选项。选择后收起聚焦summary，Esc收起；游戏方向键监听和已修复dialog焦点逻辑保持不变。
- 独立key `puzzle-sliding-character-v1`，版本/非法id/JSON/读写异常安全降级；不混用棋盘存档。
- 新增src/characters.test.ts：30条角色校验/存储测试；最终npm test为142通过/3文件；npm run build通过且dist有19张WebP；node --check scripts/characters-smoke.mjs通过。
- 遵照协调Agent错峰指令，本轮没有启动任何浏览器，不宣称新版截图、触屏或线上验收已通过。上节37项线上结果是头像加入前的历史。
- 新脚本scripts/characters-smoke.mjs用独立Chrome/GAME_URL覆盖19图片、全角色选择/刷新、键盘/Esc、不抢棋盘、非法及禁用/配额存储、360宽。运行后写artifacts/characters-<SMOKE_LABEL>-desktop.png、mobile.png与report.json；现在仅完成脚本语法验证。
- 交接命令：`GAME_URL=http://localhost:4178 SMOKE_LABEL=preview node scripts/characters-smoke.mjs`，再`GAME_URL=http://localhost:4178 npm run test:browser`。发布后把GAME_URL改为https://raingor.github.io/sliding-puzzle/，SMOKE_LABEL=pages复跑两脚本。
- 本轮未Git/推送/部署/memory，未改根计划或其他游戏；服务没有新启停，保留既有5178/4178供协调Agent复核。

## 主Agent人物版发布验收（2026-11-20）
- 代码提交 `b064e7d` 已推送main，Pages工作流 https://github.com/Raingor/sliding-puzzle/actions/runs/44733718911 成功。
- 主Agent独立单测与生产构建通过；本地与线上均通过 39 项人物检查和 37 项完整玩法回归。
- 线上地址 https://raingor.github.io/sliding-puzzle/ ，全部19张头像加载、选择与刷新保存、键盘与360px手机、存储异常降级通过；无页面、控制台或HTTP资源错误。
- 新版已上线，上文子Agent“未启动浏览器/待主Agent发布”仅为历史交接状态；截图和JSON位于忽略的artifacts目录，不提交构建/凭据。
