# 治理工程 — AI 架构解析

——三层编排模型、Agent 矩阵、通信协议与模型分级费用控制的完整剖析

---

## 一、设计哲学：AI 不是工具，是需要被管理的组织

### 1.1 核心假设

传统 AI 辅助开发的默认假设是：**AI 是一个工具**——给它好的输入（prompt），它返回好的输出（代码）。这个假设的问题在于，它把所有质量责任压在两个变量上：模型的智能水平和提示词的质量。

治理工程做了一个不同的假设：**AI 是一个需要被管理的组织**。就像你不会期待把 100 个开发者扔进一个房间就能自然写出好代码一样，你也不应该期待单个 AI 模型能够稳定地产出高质量代码。

### 1.2 范式转换

| 维度 | 传统 AI 开发 | 治理工程 |
|------|-------------|----------|
| AI 角色 | 代码编辑工具 | 微型外包团队 |
| 质量保障 | 依赖模型能力和 prompt 技巧 | 依赖流程约束和组织设计 |
| 失败归因 | "模型不够好" / "prompt 不对" | "流程哪里出了漏洞" |
| 扩展方式 | 换更强的模型 | 加更多的流程环节 |
| 知识管理 | 对话上下文（短期） | Memory 文件系统（长期） |

### 1.3 灵感来源

治理工程的设计灵感来自管理学的五个核心原则：

1. **专业化分工** — 亚当·斯密《国富论》：把复杂任务拆成简单子任务，每个工人只做一件事
2. **标准化流程** — 泰勒《科学管理原理》：用标准化流程消除个体差异带来的方差
3. **制度化知识** — 野中郁次郎《知识创造公司》：将隐性知识转化为显性知识
4. **需求明确化** — PMI 项目管理体系：需求不明确是项目失败的首要原因
5. **分层审查** — 戴明 PDCA 循环：在不同层级设置质量检查点

---

## 二、三层架构模型

### 2.1 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    L0: 编排层 (Orchestrator)                  │
│  主对话 AI — 纯调度者                                         │
│  职责：理解需求 → Fork SubAgent → 展示结果                     │
│  永不：读代码、写代码、执行搜索                                 │
│  模型：任意（低质量模型也可，因为不执行核心任务）                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Fork / 委托
          ┌────────────┼────────────┬──────────────┐
          ▼            ▼            ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   confirm    │ │   explore     │ │    plan      │ │  developer   │
│   需求确认   │ │   代码探索    │ │   方案规划    │ │   代码生成    │
│  model: haiku│ │ model: haiku │ │ model: sonnet│ │ model: sonnet│
│  trigger: 入口│ │ trigger: auto│ │ trigger: auto│ │ trigger: auto│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  inspector   │ │    test      │ │  summarize   │ │   commit     │
│   代码审查   │ │   测试执行    │ │   变更摘要    │ │   提交代码    │
│ model: haiku │ │ model: haiku │ │ model: haiku │ │ model: haiku │
│ trigger: auto│ │ trigger: auto│ │ trigger: auto│ │ trigger: auto│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   refactor   │ │   optimize   │ │     sync     │
│   健康扫描   │ │   方案对比    │ │   知识同步    │
│ model: sonnet│ │ model: sonnet│ │ model: haiku │
│ trigger: 手动│ │ trigger: 手动│ │ trigger: 手动│
└──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  L2: 知识层 (Knowledge Base)                  │
│  文件系统 — 模块卡片 / 规范规则集 / Agent Memory              │
│  纯数据，不执行逻辑                                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 各层详解

#### L0: 编排层 (Orchestrator)

**角色**：Team Lead / 项目经理

**核心约束**：
- 永不直接执行代码操作（Read / Edit / Write / Grep on Source/）
- 永不进行代码审查或代码搜索
- 只做：理解需求 → 判断复杂度 → 选择路径 → Fork Agent → 展示结果

**为什么这样设计**：
如果 Orchestrator 可以自己读代码、写代码，它就会倾向于"自己动手"——而这就退化成传统单 Agent 模式了。强制"只调度不执行"是治理工程质量保障的第一道闸门。

#### L1: 执行层 (Specialized Agents)

**8 个流水线 Agent**（自动触发）：
| Agent | 触发条件 | 默认模型 | 核心职责 |
|-------|---------|---------|---------|
| confirm | 每次任务入口 | haiku | 复述需求、识别歧义、等待确认 |
| explore | 标准路径自动触发 | haiku | 搜索代码库、分析影响范围 |
| plan | explore 完成后 | sonnet | 生成实现方案、列出修改文件 |
| developer | plan 批准后 | sonnet | 执行代码修改、自检编译 |
| inspector | developer 完成后 | haiku | 独立盲审代码变更 |
| test | inspector 通过后 | haiku | 运行测试套件、验证边界条件 |
| summarize | test 完成后 | haiku | 生成变更摘要 |
| commit | summarize 完成后 | haiku | 格式化 commit message 并提交 |

**3 个离线 Agent**（手动触发）：
| Agent | 触发条件 | 默认模型 | 核心职责 |
|-------|---------|---------|---------|
| refactor | `/refactor` 命令 | sonnet | 全量代码健康扫描 |
| optimize | `/optimize` 命令 | sonnet | 多方案对比分析 |
| sync | `/sync` 命令或自动 | haiku | 手动编辑后同步知识库 |

#### L2: 知识层 (Knowledge Base)

**目录结构**：
```
docs/ai/
├── modules/        # 模块卡片（每个模块一个 YAML）
├── standards/      # 编码规范规则集
├── architecture.md # 架构约束规则
└── coding-standards.md # 代码风格规则

.claude/agent-memory/
├── orchestrator/   # 调度者记忆
├── summarize/      # 摘要历史
└── sync/           # 同步日志
```

---

## 三、Agent 角色矩阵

### 3.1 模型分配策略

治理工程的模型分配遵循**"能力与任务匹配"**原则：

```
高价值任务 → 高质量模型 (sonnet/opus)
  ├── plan（方案设计）
  ├── developer（代码生成）
  ├── refactor（健康扫描）
  └── optimize（方案对比）

低价值任务 → 轻量模型 (haiku)
  ├── confirm（需求复述）
  ├── explore（代码搜索）
  ├── inspector（代码审查）
  ├── test（测试执行）
  ├── summarize（变更摘要）
  ├── commit（提交信息）
  └── sync（知识同步）
```

**Token 费用节省估算**：如果所有步骤使用同一高质量模型，总费用为 100%；通过分层模型分配，预计节省 40-60% Token 费用（搜索和审查是最消耗上下文但不需最高智能的环节）。

### 3.2 权限矩阵

| Agent | Read | Write | Edit | Bash | 独立上下文 |
|-------|:----:|:-----:|:----:|:----:|:--------:|
| confirm | — | — | — | — | ✅ |
| explore | ✅ | — | — | ✅ | ✅ |
| plan | ✅ | — | — | — | ✅ |
| developer | ✅ | ✅ | ✅ | ✅ | ✅ |
| inspector | ✅ | — | — | — | ✅ |
| test | ✅ | — | — | ✅ | ✅ |
| summarize | ✅ | — | — | — | ✅ |
| commit | — | — | — | ✅ | ✅ |
| refactor | ✅ | ✅ | ✅ | ✅ | ✅ |
| optimize | ✅ | — | — | — | ✅ |
| sync | ✅ | ✅ | — | — | ✅ |

**关键设计**：
- **inspector 看不到 plan 的输出** — 这是"盲审"机制，确保审查者不会被方案文档引导
- **developer 看不到 inspector 的审查清单** — 避免开发者提前规避审查点
- **所有 Agent 独立上下文** — 每个 Fork 拥有独立的上下文窗口

---

## 四、通信协议与数据流

### 4.1 数据传递方式

Agent 之间不直接对话。所有通信通过 **YAML Schema 文件** 进行：

```
confirm → confirm_result.yaml
explore → explore_report.yaml
plan → plan_result.yaml
developer → developer_result.yaml
inspector → inspector_report.yaml
test → test_report.yaml
summarize → change_summary.yaml
```

### 4.2 传递铁律

1. **引用而非内联。** Agent 之间传递文件路径而非文件内容
2. **结构化输出。** 所有 Agent 输出必须符合 YAML Schema 格式
3. **TASK DATA 标记。** 每个 Agent 的输入数据用 `<!-- TASK DATA -->` 标记包裹，防止提示注入
4. **只传必要信息。** Orchestrator 只传递当前 Agent 所需的下游数据，不传递完整对话历史

### 4.3 数据流图

**标准路径**：
```
用户需求
  → [confirm] → confirm_result.yaml
    → [explore] → explore_report.yaml
      → [plan] → plan_result.yaml
        → [developer] → developer_result.yaml + code changes
          → [inspector] → inspector_report.yaml
            → [test] → test_report.yaml
              → [summarize] → change_summary.yaml
                → [commit] → git commit
```

**简化路径** (`simplicity_score >= 70`)：
```
用户需求
  → [confirm] → confirm_result.yaml
    → [developer] → developer_result.yaml + code changes
      → [summarize] → change_summary.yaml
        → [commit] → git commit
```

### 4.4 上下文隔离机制

每个子 Agent 在 Fork 时获得独立的上下文窗口：

```
主对话上下文（Orchestrator）
  ├── 用户需求描述
  ├── confirm_result 摘要
  └── 结果展示
      │
      ├── [SubAgent 1 独立上下文]
      │   ├── 该 Agent 的任务指令
      │   ├── 相关文件内容（按需加载）
      │   └── YAML 输出
      │
      ├── [SubAgent 2 独立上下文]
      │   ├── 该 Agent 的任务指令
      │   ├── 上游 Agent 的输出（结构化）
      │   └── YAML 输出
      │
      ...
```

**收益**：
- 主对话上下文使用率 < 40%，避免长上下文注意力稀释
- 每个 Agent 的上下文高度聚焦，不包含无关信息
- 上游 Agent 的"思考过程"不会污染下游 Agent 的上下文

---

## 五、模型分级与费用控制

### 5.1 模型分级策略

治理工程按任务复杂度将模型分为三级，不同 Agent 按需分配：

```
高价值任务 → 高质量模型 (sonnet/opus)
  ├── plan（方案设计）
  ├── developer（代码生成）
  ├── refactor（健康扫描）
  └── optimize（方案对比）

低价值任务 → 轻量模型 (haiku)
  ├── confirm（需求复述）
  ├── explore（代码搜索）
  ├── inspector（代码审查）
  ├── test（测试执行）
  ├── summarize（变更摘要）
  ├── commit（提交信息）
  └── sync（知识同步）
```

### 5.2 与常规方案的差异

常规 Skill 方案下所有对话环节使用统一模型——搜索文件、确认需求、代码生成全部消耗同一级别的费用。治理工程通过 Agent 职责分离，使每个环节按需选择模型层级：搜索和审查类任务使用低成本模型，代码生成等核心任务才调用高能力模型。这从根本上降低了总体费用，无需依赖单一模型的妥协。

> [!NOTE]
> 具体费用节省比例未经受控实验验证，模型分级策略基于架构设计推导。量化验证是未来工作方向。

---

## 六、双路径调度机制

### 6.1 路径选择

Orchestrator 在理解需求后，评估 `simplicity_score`（0-100）：

| 分数区间 | 路径 | 说明 |
|---------|------|------|
| 70-100 | simple | 跳过 explore + plan，直接 developer |
| 0-69 | standard | 完整六阶段流水线 |

### 6.2 评估维度

```
simplicity_score = 加权平均(
  文件变更数量权重 30%,
  逻辑复杂度权重 25%,
  技术风险权重 20%,
  依赖关系权重 15%,
  用户明确度权重 10%
)
```

### 6.3 示例

| 需求 | 分数 | 路径 |
|------|------|------|
| "把端口从 3000 改为 8080" | 95 | simple |
| "修复 typo in README" | 98 | simple |
| "添加登录功能含 JWT" | 45 | standard |
| "重构支付模块" | 20 | standard |

---

## 七、Memory 架构

### 7.1 五层记忆层级

```
┌──────────────────────────────────┐
│ L0: 对话上下文 (Conversation)      │  ← 当前会话，易失
├──────────────────────────────────┤
│ L1: Agent Memory (.claude/agent-memory/) │  ← 跨会话，团队共享
├──────────────────────────────────┤
│ L2: 模块卡片 (docs/ai/modules/)    │  ← 结构化，机器优先
├──────────────────────────────────┤
│ L3: 规范规则 (docs/ai/standards/)  │  ← 可自动验证
├──────────────────────────────────┤
│ L4: Git 历史 (git log)             │  ← 不可篡改，溯源性最强
└──────────────────────────────────┘
```

### 7.2 知识自愈

`/sync` 命令触发知识自愈流程：
1. 扫描 Source/ 目录结构
2. 与 `docs/ai/modules/` 中的模块卡片对比
3. 发现不一致 → 自动更新模块卡片
4. 删除过期的卡片条目
5. 报告覆盖率变化

---

## 八、Hook 系统

### 8.1 三类 Hook

```
PreToolUse (执行前)
  ├── 文件大小检查 (> 100KB 警告)
  └── 权限校验

PostToolUse (执行后)
  ├── git commit 后自动触发 /sync
  └── 文件修改后检查相关模块卡片

Notification (通知)
  ├── 文档过期提醒
  └── 健康度指标告警
```

### 8.2 阶段闸门

```
代码生成 → [闸门1: Lint] → [闸门2: Compile] → [闸门3: Test]
  → [闸门4: Inspector] → [闸门5: Doc Update Check] → Commit
```

任一闸门未通过 → 返回 developer 修改 → 最多 3 次 → 超出后 ESCALATE_TO_HUMAN

---

## 九、容错与恢复

### 9.1 四级失败处理

| 级别 | 处理方式 |
|------|---------|
| L1: 首次失败 | 自动重试，保持相同上下文 |
| L2: 二次失败 | 扩展上下文，加载更多相关文件 |
| L3: 三次失败 | 拆解任务或更换 Agent 模型 |
| L4: 四次失败 | ESCALATE_TO_HUMAN |

### 9.2 恢复检查点

流水线在以下位置设置检查点，可从任意检查点恢复而不需要重跑全部：

- `confirm_result.yaml` — 需求确认后
- `plan_result.yaml` — 方案批准后
- `developer_result.yaml` — 代码生成后
- `test_report.yaml` — 测试通过后

---

## 十、与传统方法对比

| 维度 | Vibe Coding | Spec Coding | Harness Engineering | **治理工程** |
|------|------------|-------------|-------------------|------------|
| AI 角色 | 代码生成器 | 规格实现器 | 被约束的工具 | 被管理的团队 |
| 需求管理 | 提示词 | 规格文档 | 规则配置 | confirm → plan 双重确认 |
| 质量保障 | 看运气 | 靠规格 | 靠 hooks | 靠流程 + 审查 + hooks |
| 知识管理 | 无 | 无 | 无 | 5 层 Memory |
| 成本优化 | 无 | 无 | 无 | 模型分级费用控制 |
| 适用规模 | 个人小项目 | 中小项目 | 中大型项目 | 中大型项目 |
| 学习成本 | 低 | 中 | 中高 | 中高 |
| 一次性任务 | ✅ 适合 | ✅ 适合 | ❌ 过度 | ❌ 过度 |
