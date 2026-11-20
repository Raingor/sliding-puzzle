# 数字华容道实施计划

范围：只写 sliding-puzzle；根计划和兄弟项目只读。不做 Git、部署、memory 或 Artifact；协调 Agent 管理发布与最终复核。

- [x] 读取根计划、通用验收要求与已验证 2048 配置；加载 frontend-design。
- [x] 独立 TS + DOM / Vite / Vitest / Playwright 骨架与 lock；Node 24.18.0。
- [x] 纯规则引擎：3/4 阶、有限合法打乱、无立即逆向、可逆路径、相邻合法移动、计步计时、完成状态。
- [x] 蓝白珐琅视觉；中文、真实鼠标/键盘/触屏滑动与方向按钮；说明与完成模态框；焦点与 reduced-motion。
- [x] 版本化异常安全存储、分尺寸独立纪录、经过排列/奇偶性/状态校验的续局。
- [x] 112 条单测通过；严格 TS 与生产构建通过。
- [x] 开发 5178 与 preview 4178 各 36 项真实 Chrome 验收；1440×900 / 390×844 / 360 宽。
- [x] artifacts 截图和 JSON 报告；桌面/手机视觉复核；文档与真实进度汇报。
- [ ] 协调 Agent 独立复核及 GitHub Pages 发布（不属于本 Agent 操作）。
