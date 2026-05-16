# 治理工程 — 使用指南

——从初始化到日常开发的完整操作说明

---

## 一、环境准备

### 前提条件

- [Claude Code](https://claude.com/claude-code) CLI 已安装并登录
- 一个 Git 仓库（新项目或现有项目均可）
- 基本的命令行操作能力

### 检查清单

```bash
# 确认 Claude Code 可用
claude --version

# 确认在项目根目录
cd /path/to/your/project
git status
```

---

## 二、快速开始（5 分钟）

### 2.1 复制模板

```bash
# 从治理工程仓库复制模板到你的项目
cp -r /path/to/Governance-Engineering/claude-template/. .
```

模板包含：

| 路径                     | 内容             | 说明                                        |
| ------------------------ | ---------------- | ------------------------------------------- |
| `CLAUDE.md`              | AI 组织章程      | 纯调度者模式入口                            |
| `.claude/agents/`        | 11 个 Agent 定义 | 流水线 + 离线 Agent                         |
| `.claude/skills/`        | 6 个 Skill 入口  | confirm / plan / sync / refactor / optimize / init |
| `.claude/schemas/`       | 通信 Schema      | Agent 间数据交换标准                        |
| `.claude/rules/`         | 路径匹配规则     | 架构约束 + 编码规范                         |
| `.claude/agent-memory/`  | 团队记忆         | 跨会话知识持久化                            |
| `.claude/output-styles/` | 输出样式         | 调度者风格                                  |

### 2.2 初始化

在 Claude Code 对话中输入：

```text
/init
```

Init Agent 将自动：

1. 扫描项目技术栈（语言、框架、构建系统）
2. 将 `CLAUDE.md` 中的 `{{PLACEHOLDER}}` 替换为实际值
3. 生成模块卡片（`docs/ai/modules/`）初稿
4. 配置编码规范规则集

> [!TIP]
> `/init` 不会自动安装 MCP 工具。如果你需要特定的 MCP 集成（如 ue-mcp），请在初始化时明确告知 AI："我的项目需要 ue-mcp 集成"。

### 2.3 验证

初始化完成后，确认以下文件已生成：

```bash
ls CLAUDE.md
ls docs/ai/modules/
ls docs/ai/standards/
```

---

## 三、每日开发工作流

治理工程的工作流是自动化的。你只需要描述需求，调度者会自动路由到正确的流程。

### 3.1 标准工作流（复杂需求）

```
你的需求描述
  → confirm Agent: 复述需求，识别歧义，等待你确认
  → explore Agent: 搜索代码库，分析影响范围
  → plan Agent: 生成实现方案，列出修改文件
  → developer Agent: 执行代码修改
  → inspector Agent: 独立审查代码变更
  → test Agent: 运行测试套件
  → summarize Agent: 生成变更摘要
  → commit Agent: 提交代码
```

### 3.2 简化工作流（简单需求）

当调度者判断需求简单（`simplicity_score >= 70`）时，自动走简化路径：

```
你的需求描述
  → confirm Agent: 确认需求
  → developer Agent: 直接执行修改
  → summarize Agent: 生成摘要
  → commit Agent: 提交
```

跳过 explore 和 plan 阶段，节省约 40% 时间。

### 3.3 实际对话示例

**标准需求：**

> 用户：添加用户登录功能，支持邮箱和密码登录，错误次数超过 5 次锁定 30 分钟。

调度者自动 Fork confirm Agent → confirm 输出复述 → 你确认 → Fork explore Agent → Fork plan Agent → 你批准方案 → Fork developer Agent → Fork inspector Agent → Fork test Agent → Fork commit Agent。

**简单需求：**

> 用户：把配置文件里的端口从 3000 改成 8080。

调度者判断 simplicity_score=95 → Fork confirm Agent → Fork developer Agent → 直接完成。

---

## 四、命令参考

### 4.1 `/init`

初始化项目治理架构。仅需运行一次。

```text
/init
```

**何时使用**：项目首次接入治理工程时。

**输出**：适配后的 `CLAUDE.md`、`docs/ai/modules/`、`docs/ai/standards/`。

### 4.2 `/optimize <方案描述>`

对比多个架构方案，输出推荐方案。

```text
/optimize 用户认证系统用 JWT 还是 Session？
```

**何时使用**：在开始编码前，存在多个可行方案时。

**输出**：对比分析 + 推荐方案 + 理由。

### 4.3 `/refactor`

全量代码健康扫描。

```text
/refactor
```

**何时使用**：里程碑节点、代码腐化严重时。

**输出**：健康报告 + 自动修复 + 改进建议。

### 4.4 `/sync`

将手动修改同步回 AI 知识库。

```text
/sync
```

**何时使用**：你在 Claude Code 之外手动修改了代码，或在 Claude Code 中手动修改了不在 AI 管辖范围内的文件。

**输出**：更新 `docs/ai/modules/` 和 `docs/ai/standards/` 中的相关条目。

### 4.5 自动流水线（无需手动调用）

日常开发中以下流程是自动触发的，你无需手动调用任何命令：

```
confirm → plan → develop → inspect → test → commit
```

你只需要描述需求，调度者负责调度。

---

## 五、最佳实践

### 5.1 需求描述

- **越具体越好。** "添加一个 REST API 端点，接受 JSON body `{name, email}`，返回 201 Created 和用户 ID，输入验证：name 非空、email 格式合法" 远好于"加个用户 API"
- **包含边界条件。** 明确异常情况如何处理
- **指明涉及范围。** "这个修改只影响 auth 模块和 user 模块"

### 5.2 确认环节

- **认真阅读 confirm Agent 的输出。** 这是最重要的质量闸门
- **confirm 输出不对 → 直接纠正。** 不要让错误的确认进入 plan 阶段
- **不确定的地方标注出来。** "X 部分我不确定，你先按照 A 方案做"

### 5.3 方案批准

- **plan 输出需要你明确批准。** 不批准就不会执行
- **关注修改文件列表。** 如果 plan 要修改你不想动的文件，立刻提出
- **没有权限直接说"只读"。** AI 不会强行修改

### 5.4 审查环节

- **inspector Agent 独立于 developer Agent。** 它看不到 plan 的详细内容，确保审查是真正"盲审"
- **如果 inspector 发现问题，developer 会自动重新修改**
- **最多重试 3 次。** 3 次编译失败后升级到人工处理

### 5.5 知识库维护

- **手动修改代码后务必运行 `/sync`** — 否则 AI 知识库与代码不一致
- **添加新模块后运行 `/sync`** — 让 AI 知道新模块的存在

---

## 六、常见问题

### Q: 为什么 AI 不直接开始写代码？

A: 这是治理工程的设计初衷。AI 必须先 confirm（确认理解需求），因为大多数质量问题源于需求不明确。confirm 环节确保 AI 和你的理解一致。

### Q: confirm 花了很长时间怎么办？

A: 对于简单需求（改个配置、修个 typo），调度者会自动走简化路径，confirm 非常快。如果复杂需求的 confirm 过慢，说明你的需求描述可能需要细化——更具体的输入会让 confirm 更快。

### Q: 对话突然卡死了怎么办？

A: 这是一个已知的 Claude Code 兼容性问题（详见版本说明）。AI 可能已经完成任务，但可视化界面未更新。尝试：1) 等待 30 秒；2) 输入 `/clear` 刷新对话；3) 重新打开项目。代码修改通常已经保存。

### Q: 小项目适合用治理工程吗？

A: 不太适合。对于单文件脚本或极简项目，治理工程的流程开销大于收益。建议项目有 5 个以上文件、多人协作或对代码质量有较高要求时再使用。

### Q: 如何跳过某些步骤？

A: 不建议跳过。但如果你确定不需要 plan 阶段，可以直接说 "跳过 plan，直接实现"。调度者会尊重这个指令。

### Q: AI 缺少特定工具（如 MCP）怎么办？

A: 在 `/init` 时或对话中明确告知 AI："我的项目使用 ue-mcp"，AI 会相应调整架构配置。如果运行时才发现缺少工具，直接告诉主对话 AI 安装即可。

---

## 七、进阶用法

### 7.1 更换模型与调整思考程度

治理工程的默认模型分配基于常见 API 模型（haiku/sonnet/opus）。但你的模型供应可能与默认不同，或者你需要在特定环节使用更深度思考的模型。

**更换 Agent 模型**：编辑 `.claude/agents/<agent-name>.md`，修改 `model` 字段：

```yaml
# 示例：将 developer Agent 切换到 DeepSeek V4
model: deepseek-v4
# 或使用 Claude Opus 获得最高质量
model: claude-opus-4-7
```

**调整思考程度（thinking budget）**：对于需要深度推理的 Agent（plan、developer），可以在 Agent 定义中指定思考程度：

```yaml
# 为 developer Agent 增加思考预算（适合复杂代码生成）
model: claude-sonnet-4-6
thinking:
    budget_tokens: 4000
```

**主对话模型更换**：主对话 AI（Orchestrator）使用的模型在 Claude Code 配置中设置，`CLAUDE.md` 中的 Agent 模型分配不影响主对话：

```bash
# 通过 /config 切换主对话模型
/config model claude-sonnet-4-6
```

**建议的模型分配策略**：

| 任务类型                                                         | 推荐模型                                                 | 原因                         |
| ---------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| confirm / explore / inspector / test / summarize / commit / sync | 轻量模型（如 claude-haiku、deepseek-chat）               | 结构化任务，不需要高推理能力 |
| plan / developer / refactor / optimize                           | 高性能模型（如 claude-sonnet、claude-opus、deepseek-v4） | 需要深度推理和代码生成能力   |
| 主对话 Orchestrator                                              | 中等模型即可                                             | 只做调度，不执行核心任务     |

> [!NOTE]
> 你使用的模型可能与默认配置不同。请根据自己的 API 访问情况调整各 Agent 的 `model` 字段。模型能力越弱，流程约束的角色就越重要——好的流程可以弥补模型能力的不足。

### 7.2 集成 Linter 与测试工具

**在 test Agent 中集成 Linter**：默认的 test Agent 只运行测试套件。你可以修改它来同时运行 Linter 检查。

编辑 `.claude/agents/test.md`，添加 Linter 执行指令：

```yaml
# 扩展 test Agent 的运行步骤
steps: 1. 运行项目测试套件（npm test / pytest / cargo test 等）
    2. 运行 Linter 检查（见下方对应语言）
    3. 如果测试或 Linter 任一失败，报告失败原因并返回 developer 修改
```

**常见 Linter 集成命令**：

| 技术栈                | Linter 命令                   | 安装方式                                                                |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| TypeScript/JavaScript | `npx eslint . --format json`  | `npm install -D eslint`                                                 |
| Python                | `ruff check .` 或 `flake8 .`  | `pip install ruff`                                                      |
| Rust                  | `cargo clippy -- -D warnings` | 内置                                                                    |
| Go                    | `golangci-lint run`           | `go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest` |
| C++                   | `clang-tidy -p build/`        | apt/brew 安装                                                           |

**自定义测试钩子**：在 `.claude/settings.json` 中配置 PostToolUse hook，在每次文件修改后自动触发 Linter：

```json
{
    "hooks": {
        "PostToolUse": [
            {
                "matcher": "Edit|Write",
                "hooks": [
                    {
                        "type": "command",
                        "command": "npx eslint --fix ${CLAUDE_TOOL_FILE_PATH} || true"
                    }
                ]
            }
        ]
    }
}
```

### 7.3 添加 MCP 支持

治理工程的模板不会自动配置 MCP 工具。你需要手动添加。

**步骤 1 — 安装 MCP 服务器**：以 ue-mcp 为例：

```bash
# 在 Claude Code 中注册 MCP 服务器
claude mcp add ue-mcp -- <安装命令>
```

**步骤 2 — 告知 Init Agent**：如果你在项目初始化阶段，告诉 AI：

```text
/init
我的项目需要以下 MCP 集成：
- ue-mcp（Unreal Engine 编辑器交互）
- 如果有其他 MCP 工具也一并列出

请确保架构配置中考虑这些工具的能力边界。
```

**步骤 3 — 更新 Agent 权限**：对于需要使用 MCP 工具的 Agent，编辑其定义文件添加权限：

```yaml
# 例如：给 explore Agent 添加 ue-mcp 权限
model: haiku
permissions:
    - Read
    - Search
    - mcp__ue-mcp__*
    - Grep
```

**步骤 4 — 更新路由规则**：在 `CLAUDE.md` 中添加 MCP 相关的路由规则：

```markdown
## MCP 集成

- 涉及 Unreal Engine 相关操作时，Fork explore Agent（已配置 ue-mcp）
- ue-mcp 操作包括：资产操作、关卡编辑、蓝图读写、动画编辑等
```

**常见 MCP 集成场景**：

| MCP 工具       | 用途                     | 需要权限的 Agent         |
| -------------- | ------------------------ | ------------------------ |
| ue-mcp         | Unreal Engine 编辑器操作 | explore, developer       |
| github-mcp     | GitHub Issues/PR 管理    | plan, summarize, commit  |
| postgres-mcp   | 数据库查询               | explore, developer, test |
| filesystem-mcp | 跨项目文件访问           | explore, sync            |

### 7.4 自定义 Agent

编辑 `.claude/agents/<agent-name>.md` 即可修改 Agent 的行为和权限。

```yaml
# 示例：给 developer Agent 添加 Sonnet 模型
model: sonnet
permissions:
    - Read
    - Write
    - Edit
    - Bash
```

### 7.5 扩展工作流

在 `.claude/skills/` 下添加新的 Skill 文件，然后注册到 `CLAUDE.md` 即可扩展工作流。

### 7.6 健康度监控

关注五个关键指标：

| 指标       | 健康阈值                        | 警示阈值 |
| ---------- | ------------------------------- | -------- |
| 知识覆盖率 | >80% 模块有卡片                 | <60%     |
| 审查拦截率 | 10-30% issues 被 inspector 发现 | <5%      |
| 一次通过率 | >60% developer 一次编译通过     | <30%     |
| 人工升级率 | <10% 任务升级到人工             | >25%     |
| Sync 延迟  | 手动修改后 24h 内 sync          | >48h     |
