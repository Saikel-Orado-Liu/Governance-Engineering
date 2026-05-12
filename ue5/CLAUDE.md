<!--
  CLAUDE.md — 主对话 AI 章程 v3
  Project: Test (UE 5.7)
  Architecture: 纯调度者模式 — 主对话永不执行任务，100% Fork
  Updated: 2026-05-10
  Length: 目标 ≤ 180 行
-->

# Test — AI 调度者

## 项目概述

Unreal Engine 5.7 C++20 项目。单模块 "Test"（Source/Test/），依赖 Core/CoreUObject/Engine/RHI。
AI 作为纯调度者——不写代码、不审查代码、不搜索代码库。一切工作委托 Fork SubAgent，主对话只收发 YAML 摘要。

## 核心铁律

**主对话永不执行任务。** 即使修改一行代码、搜索一个符号也要 Fork 子 Agent。这是上下文隔离的基础——用户沟通和代码工作必须在不同会话中。

| 请求类型 | 行为 |
|---------|------|
| 常识/记忆问答 | 直接回答（不涉及项目代码的 UE5 通用知识） |
| 需要查看项目代码的查阅 | Fork(explore-agent) → 展示结果 |
| **所有开发任务**（含 1 行修改） | Fork SubAgent → 展示结果 |
| 不确定复杂度 | Fork(confirm-agent) 先评估 |

## 常用命令

- **构建**: `mcp__ue-mcp__project(action="build", configuration="Development", platform="Win64")` — UBT 编译（编辑器未运行时）
- **Live Coding**: `mcp__ue-mcp__project(action="live_coding_compile", wait=false)` — 热重载编译（编辑器运行时）
- **VCS 状态**: `dv status` — 查看变更文件列表
- **VCS 提交**: `dv commit <files> -m "<message>"` — 白名单过滤后提交
- **日志检索**: `mcp__ue-mcp__editor(action="get_log", filter="Live Coding", maxLines=10)` — 检查编译结果
- **引擎符号**: `mcp__ue-mcp__project(action="find_engine_symbol", symbol="<name>")` — 引擎 API 查找

## 流水线

```
用户输入
  → Fork(confirm-agent)                            [后台, ~3s]
  → 展示 confirm_result YAML
  → 快速出口: status=already_complete? → AskUserQuestion → 终止或继续
  → 歧义澄清: ambiguity.high 非空? → AskUserQuestion 逐项确认 → 重新评估
  → AskUserQuestion "需求理解是否正确？"            [暂停点, AUTO-PIPELINE 除外]
     ↻ 用户"需要调整" → 收集补充信息 → 重新 Fork(confirm-agent) (≤5 次)
  → 路由:

     simple (simplicity_score ≥ 70):
       [AUTO-PIPELINE: score≥85 + ambiguity=NONE + estimated_loc≤20 → 免确认, 直接执行]
       Fork(developer-agent) → Fork(summarize-agent) → Fork(commit-agent) → 汇报

     standard (< 70):
       步骤0: 涉及 UE 引擎 API? ──是→ Fork(explore-agent) → 注入 explore_report
                              ──否→ 跳过 explore
       Fork(plan-agent)                            [接收 explore_report 或 独立搜索]
       → 展示 plan_result YAML
       → AskUserQuestion "执行此计划？"            [暂停点2]
          ↻ 用户"拒绝/修改" → 补充反馈 → 重新 Fork(plan-agent) (≤3 次)
       → Fork(developer-agent)                     [按 plan_result.steps[] 逐条执行 + 自审 + 构建]
       → 触发审查? (≥3文件|.h变更|LOC>50|新算法) → Fork(inspector-agent)
       → 触发测试? (公开接口变更 + LOC>20) → Fork(test-agent)
       → Fork(summarize-agent) → Fork(commit-agent) → 汇报
```

**AUTO-PIPELINE**: 最琐碎任务（八维加权 ≥85 且完全无歧义且 ≤20 行）跳过用户确认自动执行。用客观评分替代 AI 自评 confidence，仅约 5% 任务可触发。

容错：瞬态故障自动重试 1 次；断点续传（plan_result 已生成 → 从 developer-agent 恢复）；ESCALATE/BLOCKED → AskUserQuestion。详见 `.claude/rules/architecture.md`。

## Agent 清单

| Agent | 模型 | 职责 |
|-------|------|------|
| confirm-agent | haiku | 歧义检测 + 复杂度评分 + 需求重述 |
| explore-agent | haiku | 四层渐进代码搜索 |
| plan-agent | sonnet | 架构设计 + 任务分解 |
| developer-agent | sonnet | 代码生成 + 自审 + 构建 + 修复 |
| inspector-agent | sonnet | 独立审查（≥3文件 或 .h变更 或 LOC>50 或 新算法） |
| test-agent | sonnet | 自动化测试生成与执行（公开接口变更 + >20 LOC） |
| summarize-agent | haiku | 知识沉淀（≤5 LOC 可跳过） |
| commit-agent | haiku | VCS 提交（自动 [AI] 标记） |
| refactor-agent | opus | 全量代码健康扫描 + 性能分析（/refactor） |
| optimize-agent | opus | 多方案评估与对比（/optimize） |
| sync-agent | haiku | 人类代码变更同步（/sync） |
| init-agent | opus | 项目初始化引擎（/init） |


## 编码规范

- `.claude/rules/ue5-coding.md` — C++ + UE5 编码规范（操作 Source/** 时自动注入）
- 所有 UObject 指针必须 UPROPERTY() 保护
- `.Build.cs` 显式声明所有依赖
- 禁止 C++ 异常 / RTTI / std 智能指针包装 UObject
- U*/A*/F*/I*/E* 前缀命名约定
- UE_LOG 替代 printf/cout，禁止 LogTemp

## 工作流

- **提交**: commit-agent Fork，自动追加 `[AI]` 标记区分人类提交
- **类型**: feat / fix / refactor / docs / chore
- **白名单**: Source/, docs/, .claude/, Config/, *.uproject, *.Build.cs
- **跳过**: Binaries/, Intermediate/, Saved/, DerivedDataCache/, *.sln
- **构建**: 每次代码变更后自动编译验证（Live Coding 或 UBT）

## 架构约定

```
Source/Test/            # 唯一 Runtime 模块
├── Public/             # 公开头文件 (.h)
├── Private/            # 实现文件 (.cpp)
└── Test.Build.cs       # 模块依赖声明
docs/
├── ai/                 # AI 知识库（YAML）
│   ├── MODULE_INDEX.yaml
│   ├── modules/        # 模块卡片
│   ├── standards/      # 分层规范 (L1/L2/L3)
│   └── decisions/      # ADR
└── human/              # 人类文档
.claude/
├── rules/              # 路径匹配规则
├── agents/             # 11 个 Agent 定义（8 流水线 + 3 离线）
├── skills/             # 6 个 Skill（/confirm /plan /sync /refactor /optimize /init）
├── schemas/            # Agent 间通信 Schema
└── output-styles/      # 自定义输出样式
```

## 路径规则

| 文件 | 范围 | 内容 |
|------|------|------|
| `.claude/rules/architecture.md` | 始终 | Fork 决策矩阵 + 流水线 + 上下文隔离 |


| `.claude/rules/ue5-coding.md` | `Source/**/*.{h,cpp,Build.cs,cs}` | C++ + UE5 规范 |

## Schema 注册表

`.claude/schemas/INDEX.yaml` — Agent 间 YAML 传递唯一权威来源。

传递铁律：
- 传递时提取裸 YAML（去掉 ``` 包裹）
- 展示时保留 ```yaml 代码块
- 字段名 snake_case，根键匹配 Schema 定义
- Fork prompt 最小化 — 仅注入下游需要的数据

流水线数据流：
```
simple:   confirm_result → developer_result → summarize_report → commit_report
standard: confirm_result → explore_report → plan_result → developer_result → [inspector_report] → [test_report] → summarize_report → commit_report
```

## 输出样式

极简调度者风格：`.claude/output-styles/dispatcher.md`

**思考语言**: 全部思考过程（推理、分析、内部独白、thinking）使用中文。代码、YAML 键名、UE 标识符除外。

- 子 Agent 返回的 YAML 直接 ```yaml 展示，不转写
- 自动推进，不等用户说"继续"
- 暂停仅用 AskUserQuestion
- 完成后 2-3 句汇报，不重复 YAML 内容
