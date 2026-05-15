# 版本更新日志

治理工程方法论与参考实现的所有重要变更。

---

## [V1.0] — 2026-04-30

### 初始发布

- **五大设计原则**: 专业化分工、标准化流程、制度化知识、需求明确化、分层审查。
- **三层架构模型**: 编排层 (L0) → 领域层 → 执行层 (L1) → 知识层 (L2)。
- **11 个专业化 Agent**: 8 个流水线 Agent（confirm / explore / plan / developer / inspector / test / summarize / commit）+ 3 个离线 Agent（refactor / optimize / sync）。
- **阶段闸门 Hooks**: PreToolUse / PostToolUse / Notification 三类自动化检查点。
- **结构化 Memory 系统**: 5 层共享记忆层级（对话上下文 → Agent Memory → 模块卡片 → 规范规则 → Git 历史）。
- **模板目录 `temp/`**: 开箱即用的项目配置模板，含 Agent 定义、Skill 入口、通信 Schema、规则文件。
- **纯调度者模式**: 主对话 AI 永不执行代码操作，仅 Fork 子 Agent 完成任务。
- **双路径调度**: 简单需求走 simplified 路径（跳过 explore/plan），复杂需求走 standard 完整流水线。
- **学术文档**: `治理工程 — 理论与设计.md` — 方法论演进对比、五大设计原则、三层架构模型、模型分级与费用控制。
- **实现文档**: `治理工程 — UE5 项目参考实现.md` — 基于 Claude Code 的完整落地指南与可运行模板。
- **示例项目**: task-board / turn-based-strategy / markdown-ssg / scientific-computing / ue5 — 覆盖 5 种技术栈。
