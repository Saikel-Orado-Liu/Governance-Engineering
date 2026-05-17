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

| 路径                     | 内容             | 说明                                               |
| ------------------------ | ---------------- | -------------------------------------------------- |
| `CLAUDE.md`              | AI 组织章程      | 纯调度者模式入口                                   |
| `.claude/agents/`        | 12 个 Agent 定义 | 流水线 + 离线 Agent                                |
| `.claude/skills/`        | 6 个 Skill 入口  | confirm / plan / sync / refactor / optimize / init |
| `.claude/schemas/`       | 通信 Schema      | Agent 间数据交换标准                               |
| `.claude/rules/`         | 路径匹配规则     | 架构约束 + 编码规范                                |
| `.claude/agent-memory/`  | 团队记忆         | 跨会话知识持久化                                   |
| `.claude/output-styles/` | 输出样式         | 调度者风格                                         |

### 2.2 初始化

在 Claude Code 对话中输入：

```text
/init
```

Init Agent 将自动：

1. **检测你的语言**（从输入文本自动识别中文/英文），无法判断时询问
2. **扫描项目技术栈**（语言、框架、构建系统、VCS）
3. **推荐 MCP 工具**（从 `mcp-compatibility.yaml` 查找表匹配技术栈），可选联网搜索新工具——询问你安装哪些
4. **替换 `{{PLACEHOLDER}}`** 为实际值
5. **生成 `vcs-config.yaml`** 适配你的 VCS（Git / SVN / Perforce / Mercurial / Plastic SCM）
6. **生成模块卡片**（`docs/ai/modules/`）初稿与编码规范规则集

> [!TIP]
> 如果 `/init` 检测到你的技术栈匹配已知 MCP 工具，会主动推荐。你也可以明确要求特定 MCP："我的项目需要 ue-mcp 集成"。

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

### Q: 小项目适合用治理工程吗？

A: 不太适合。对于单文件脚本或极简项目，治理工程的流程开销大于收益。建议项目有 5 个以上文件、多人协作或对代码质量有较高要求时再使用。

### Q: 如何跳过某些步骤？

A: 不建议跳过。但如果你确定不需要 plan 阶段，可以直接说 "跳过 plan，直接实现"。调度者会尊重这个指令。

### Q: 如何安装 MCP 工具？

A: V1.2 的 `/init` 会自动推荐匹配你技术栈的 MCP 工具。如需事后添加：终端运行 `claude mcp add <名称> -- <安装命令>`，然后运行 `/sync`——sync-agent 会检测到新 MCP 并报告为工具缺口，同时给出应在哪些 Agent 定义中更新的指引。

### Q: 如何更改 AI 的回复语言？

A: 回复语言在 `/init` 时自动检测确定（从你的输入文本中识别）。事后修改：编辑 `.claude/settings.json` 中的 `language` 字段。更改 Agent 思考语言：编辑 `/init` 生成的 `.claude/rules/language.md`。

---

## 七、进阶用法

### 7.1 更改 AI 回复语言

AI 的回复语言在 `/init` 时自动检测确定（从你的输入文本中识别）。事后修改：

**更改主对话语言**：编辑 `.claude/settings.json`：

```json
{
    "language": "简体中文（中国大陆）"
}
```

**更改 Agent 思考语言**：编辑 `/init` 生成的 `.claude/rules/language.md`。该文件会自动注入到每个 Agent 的上下文中。

**重新初始化语言**：再次运行 `/init`，在同一条消息中明确指定语言：

```text
/init 我希望 AI 用英文沟通
```

### 7.2 更换模型与调整思考程度

治理工程的默认模型分配基于常见 API 模型（haiku/sonnet/opus）。你的模型供应可能与默认不同。

**更换 Agent 模型**：编辑 `.claude/agents/<agent-name>.md`，修改 `model` 字段：

```yaml
# 示例：将 developer Agent 切换到 DeepSeek V4
model: deepseek-v4
# 或使用 Claude Opus 获得最高质量
model: claude-opus-4-7
```

**调整思考程度（thinking budget）**：对于需要深度推理的 Agent，指定思考预算：

```yaml
model: claude-sonnet-4-6
thinking:
    budget_tokens: 4000
```

**主对话模型更换**：

```bash
/config model claude-sonnet-4-6
```

| 任务类型                                                         | 推荐模型                                   |
| ---------------------------------------------------------------- | ------------------------------------------ |
| confirm / explore / inspector / test / summarize / commit / sync | 轻量模型（如 haiku、deepseek-chat）        |
| plan / developer / refactor / optimize                           | 高性能模型（如 sonnet、opus、deepseek-v4） |
| 主对话 Orchestrator                                              | 中等模型即可                               |

### 7.3 多 VCS 支持

V1.2 用 VCS 无关层替代了硬编码 Git 命令。模板开箱即支持 **Git、SVN、Perforce、Mercurial、Plastic SCM**。

**工作原理**：`/init` 检测你的 VCS 并生成 `.claude/vcs-config.yaml`：

```yaml
vcs:
    type: git # git | svn | p4 | hg | plastic
    commands:
        status: "git status"
        diff: "git diff"
        stage: "git add"
        commit_base: "git commit"
        commit_template: "git commit {files} -m {message}"
    auto_mark: "[AI]"
```

commit-agent 和 sync-agent 都读取此文件——切换 VCS 时不需要修改任何 Agent 定义。

**事后切换 VCS**：编辑 `.claude/vcs-config.yaml`，更新 `type` 和 `commands` 字段即可。无需修改 Agent 文件。

### 7.4 MCP 工具管理

**`/init` 时自动推荐**：init 引擎查询 `mcp-compatibility.yaml`——将技术栈映射到 MCP 工具的查找表。如果匹配，`/init` 会主动建议相关 MCP 工具并询问你安装哪些。

**事后添加 MCP**：

```bash
# 安装 MCP 服务器
claude mcp add ue-mcp -- <安装命令>
```

然后运行 `/sync`——sync-agent 会在 `settings.json` 中检测到新 MCP，并报告**工具缺口**：哪些 MCP 已安装但尚未注入到任何 Agent 的 `tools:` 列表。它还会指出应更新哪些 Agent 定义。

**手动更新 Agent 权限**：编辑 `.claude/agents/<agent-name>.md`：

```yaml
permissions:
    - Read
    - Search
    - mcp__ue-mcp__*
    - Grep
```

| MCP 工具       | 用途                     | 通常分配                 |
| -------------- | ------------------------ | ------------------------ |
| ue-mcp         | Unreal Engine 编辑器操作 | explore, developer       |
| github-mcp     | GitHub Issues/PR 管理    | plan, summarize, commit  |
| postgres-mcp   | 数据库查询               | explore, developer, test |
| filesystem-mcp | 跨项目文件访问           | explore, sync            |

### 7.5 集成 Linter

编辑 `.claude/agents/test-agent.md` 添加 Linter 步骤。或在 `.claude/settings.json` 中配置 PostToolUse hook：

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

| 技术栈                | Linter 命令                   |
| --------------------- | ----------------------------- |
| TypeScript/JavaScript | `npx eslint . --format json`  |
| Python                | `ruff check .`                |
| Rust                  | `cargo clippy -- -D warnings` |
| Go                    | `golangci-lint run`           |
| C++                   | `clang-tidy -p build/`        |

### 7.6 知识库结构化查询

V1.2 引入了机器可查询的 YAML Schema 用于 AI 知识库。

**ADR（架构决策记录）**：现以 `docs/ai/decisions/ADR-<NNN>.yaml` 存储，替代 markdown 格式。关键字段：

```yaml
adr:
    id: ADR-001
    status: accepted # proposed | accepted | deprecated | superseded
    supersedes: null # 取代了哪个旧 ADR
    superseded_by: null # 被哪个新 ADR 取代
    context:
        problem: "<≤2 行>"
        alternatives:
            - { id: A, rejected_reason: "<≤1 行>" }
    decision:
        reason: "<≤2 行>"
    consequences:
        positive: ["<每条≤1 行>"]
        negative: ["<每条≤1 行>"]
```

**模块卡片**：以 `docs/ai/modules/<name>.yaml` 存储，使用枚举类型字段（`public_interface.classes[].role`、`constraints[].type`、`constraints[].severity`）。机器可查询——plan-agent 在架构设计前可通过 `constraints[].type` 和 `constraints[].severity` 过滤发现约束。

### 7.7 健康度监控

每次任务结束后，summarize-agent 会在 `summarize_report.health` 中写入健康快照：

| 维度         | 追踪内容                               |
| ------------ | -------------------------------------- |
| 经验教训     | 条目数 vs 上限；严重程度分布           |
| 已验证模式   | 已验证模式数量；使用验证频率           |
| 技术债务     | 总条目数；按 critical/major/minor 分布 |
| 按类别的问题 | 模式违规、API 误用、缺失防护等         |

长期关注的指标：

| 指标       | 健康阈值        | 警示阈值 |
| ---------- | --------------- | -------- |
| 知识覆盖率 | >80% 模块有卡片 | <60%     |
| 审查拦截率 | 10-30%          | <5%      |
| 一次通过率 | >60%            | <30%     |
| Sync 延迟  | <24h            | >48h     |

### 7.8 自定义 Agent 与扩展工作流

编辑 `.claude/agents/<agent-name>.md` 即可修改行为、模型和权限。在 `.claude/skills/` 下添加新 Skill 文件，然后注册到 `CLAUDE.md`。以现有 Agent/Skill 文件为模板——每个 Agent 在 `.claude/schemas/` 中都有对应的输出 Schema。
