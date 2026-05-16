# 版本更新日志

`claude-template/` 模板的所有重要变更。

---

## [V1.0] — 2026-04-30

### 初始发布

- **CLAUDE.md** — 纯调度者模式 AI 章程，含 `{{PLACEHOLDER}}` 占位符供 `/init` 替换项目特定内容。
- **11 个 Agent 定义** — 8 个流水线 Agent（confirm / explore / plan / developer / inspector / test / summarize / commit）+ 3 个离线 Agent（refactor / optimize / sync）。
- **6 个 Skill 入口** — confirm（需求确认）/ plan（架构设计）/ sync（知识同步）/ refactor（代码健康扫描）/ optimize（方案评估）/ init（项目初始化引擎）。
- **13 个 YAML 通信 Schema** — 覆盖全部流水线和离线操作的 Agent 间标准化数据交换契约。
- **架构规则** — Fork 决策矩阵、SIMPLE vs STANDARD 双路径调度、断点续传容错机制、YAML 数据隔离防注入规则。
- **编码规范模板** — 通用编码规范文件，供 `/init` 生成技术栈特定规则。
- **团队共享记忆** — 3 个示例记忆结构（orchestrator 技术债务 / summarize 经验教训 / sync 同步状态）。
- **输出样式** — 极简调度者风格定义。
- **项目设置** — PreToolUse / PostToolUse / Notification 阶段闸门 hooks 配置。
- **Init 引擎** — Agent 定义 + 占位符映射（9 个占位符）+ 4 种编码规范模板（C++/UE、Python、Rust、TypeScript/React）+ 项目模式库 + 验证脚本 + 评估用例。
- **.claudeignore** — 排除构建产物、依赖目录、IDE 生成文件。
