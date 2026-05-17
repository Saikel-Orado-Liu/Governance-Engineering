# 版本更新日志

`claude-template/` 模板的所有重要变更。

---

## [V1.2] — 2026-05-17

### Agent 层 VCS 无关化

- **commit-agent 重写**: 不再硬编码 Git 命令。所有 VCS 操作由 `.claude/vcs-config.yaml` 驱动——支持 Git、SVN、Perforce、Mercurial、Plastic SCM。使用 `commit_template` 占位符替换实现跨 VCS 安全提交。
- **sync-agent 升级**: VCS log/diff 操作移交 Skill 层通过 `vcs-config.yaml` 执行。新增步骤 5——MCP 工具缺口检测（已安装到 settings.json 但未注入到任何 Agent `tools:` 列表的 MCP）。
- **新增 `.claude/vcs-config.yaml`**: init-agent 在 `/init` 时生成，将 VCS 类型映射到 status/diff/stage/commit 命令及占位符模板。

### 知识库结构化

- **ADR 格式迁移**: 从 `ADR-<N>.md` markdown 迁移到 `ADR-<NNN>.yaml` 结构化 YAML。机器可查询字段：`status`、`supersedes`/`superseded_by` 决策链、枚举 `type`/`scope`。新增 `adr.schema.yaml`。
- **模块卡片结构化**: 从自由文本迁移到 schema 驱动的 YAML，使用枚举字段（`public_interface.classes[].role`、`constraints[].type`、`constraints[].severity`）。新增 `module-card.schema.yaml`。
- **summarize-agent 重写**: 所有知识写入使用枚举类型和机器可查询规则 ID，替代自然语言描述。自由文本字段硬限制 ≤2 行。自检重新定位为 schema 合规检查。
- **INDEX.yaml 扩展**: 新增 `module_card`、`adr` 持久化存储 schema 条目。

### Init 引擎 V2

- **步骤 0 — 语言检测**: 从用户输入文本自动检测语言（中文/英文），无法判断时回退到 AskUserQuestion。结果驱动 `settings.json` 的 language 字段。
- **步骤 2 — MCP 推荐**: 查询 `mcp-compatibility.yaml` 查找表匹配技术栈推荐 MCP 工具，可选联网搜索新工具。询问用户安装哪些。
- **init-agent 大幅扩展** (+288 行): 生成 `vcs-config.yaml`、VCS 参考文件、MCP 增强的 Agent 定义、项目语言设置。占位符映射扩展了 VCS 特定条目。
- **验证脚本升级**: `validate_init.py` 现检查 VCS 配置、MCP 引用、ADR/模块卡片 Schema、国际化文件。
- **新增参考资料**: `mcp-compatibility.yaml`（MCP 查找表）、`vcs-reference.yaml`（VCS 检测模式）。
- **新资产**: `init-agent.md` 提升到 `.claude/agents/` 作为独立 Agent 定义。

### Schema 扩展

- `summarize-report.schema.yaml` — 新增 `health` 快照（按严重程度统计 lessons/patterns/tech_debt 条目数）、lessons 增加 `type`/`rule`/`severity` 枚举。
- `sync-report.schema.yaml` — 新增 `mcp_tool_gaps` 数组，报告未分配 MCP 工具。

### 模板清理

- **CLAUDE.md 精简**: 流水线图浓缩、移除 HTML 注释头、移除冗长 YAML 传递链、移除语言规则（现由 init 语言检测处理）。

---

## [V1.1] — 2026-05-16

### Schema 外置化与按需注入

- **移除所有 Agent 定义中的内联输出 Schema**。输出 Schema 现仅存于 `.claude/schemas/`，由 Team Lead 按新增的 Schema 注入规则（见 `.claude/rules/architecture.md`）在 Fork prompt 中注入裸 YAML。

### plan-agent 升级为技术债感知型

- **阶段 0 — 技术债分析**: plan-agent 在架构设计前先扫描 `.claude/agent-memory/orchestrator/tech-debt.yaml` + 源码中的弃用 API、不一致模式、重复代码、命名违规、模块耦合。
- **步骤规格细化**: 每个 step 增加 `step_type`、`target`、`purpose`、`fields[]`、`functions[]`、`tech_debt_warnings[]`。算法函数（新数据结构或 >20 LOC）须附加 `algorithm_steps[]`。
- **复杂度三档**: `small`（≤20 LOC, 单文件）| `medium`（21-50 LOC, 或 2 文件）| `large`（>50 LOC 或 ≥3 文件）。
- **自检清单**: 6 项 → 10 项。

### 新增记忆文件

- `.claude/agent-memory/summarize/` 下新增 `health-report.yaml`、`verified-patterns.yaml` 结构化模板。
- `lessons-learned.yaml` 重置为空初始状态（移除项目特定数据）。

### 流水线终止规则

- `dispatcher.md`: 汇报完毕后必须立即停止——不追问、不自行开启新任务。
- `CLAUDE.md`: 两条流水线路径末尾均标记 `→ [终止]`。

### Skill 入口适配

- 全部 6 个 Skill 入口更新为在 Fork prompt 中注入外部 Schema YAML。

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
