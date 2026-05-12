<!--
  CLAUDE.md — 主对话 AI 章程 v3
  Project: Task Board
  Architecture: 纯调度者模式 — 主对话永不执行任务，100% Fork
  Updated: 2026-05-12
  Length: 目标 ≤ 180 行
-->

# Task Board — AI 调度者

## 项目概述

Python 3.11+ / FastAPI + TypeScript 5.6 / React 18 / Vite 6 全栈任务管理应用 项目。双模块 "backend"（backend/src/）FastAPI API 服务 + "frontend"（frontend/src/）React TypeScript SPA
AI 作为纯调度者——不写代码、不审查代码、不搜索代码库。一切工作委托 Fork SubAgent，主对话只收发 YAML 摘要。

## 核心铁律

**主对话永不执行任务。** 即使修改一行代码、搜索一个符号也要 Fork 子 Agent。这是上下文隔离的基础——用户沟通和代码工作必须在不同会话中。

| 请求类型 | 行为 |
|---------|------|
| 常识/记忆问答 | 直接回答（不涉及项目代码的 FastAPI + React 18 通用知识） |
| 需要查看项目代码的查阅 | Fork(explore-agent) → 展示结果 |
| **所有开发任务**（含 1 行修改） | Fork SubAgent → 展示结果 |
| 不确定复杂度 | Fork(confirm-agent) 先评估 |

## 常用命令

- **构建**: `cd frontend && npm run build && cd ../backend && pip install -e .` — TypeScript 编译 + Vite 打包 + Python 包安装
- **测试**: `cd frontend && vitest run && cd ../backend && pytest` — vitest 前端测试 + pytest 后端测试
- **VCS 状态**: `git status` — 查看变更文件列表（需手动 git init）
- **VCS 提交**: `git commit <files> -m '<message>'` — 提交变更（需手动 git init）

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
       步骤0: 涉及外部 API/框架? ──是→ Fork(explore-agent) → 注入 explore_report
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


## 编码规范

- `.claude/rules/coding-standards.md` — 项目编码规范（操作源码文件时自动注入）
- **Python (backend/src/)**: ruff(line-length=100, target=py312), bandit
- **TypeScript (frontend/src/)**: eslint, strict mode

## 工作流

- **提交**: commit-agent Fork，自动追加 `[AI]` 标记区分人类提交
- **类型**: feat / fix / refactor / docs / chore
- **白名单**: 源码目录、docs/、.claude/、项目配置文件
- **跳过**: 构建产物、依赖目录、IDE 生成文件
- **构建**: 每次代码变更后自动编译验证

## 架构约定

```
backend/
├── src/               # Python 后端
│   ├── __init__.py    # 包入口
│   └── main.py        # FastAPI 应用入口
└── pyproject.toml     # Python 项目配置
frontend/
├── src/               # TypeScript/React 前端
│   ├── main.tsx       # 应用入口
│   └── App.tsx        # 根组件
├── package.json       # Node 项目配置
└── vite.config.ts     # Vite 构建配置
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
├── skills/             # 5 个 Skill（/confirm /plan /sync /refactor /optimize）
├── schemas/            # Agent 间通信 Schema
└── output-styles/      # 自定义输出样式
```

## 路径规则

| 文件 | 范围 | 内容 |
|------|------|------|
| `.claude/rules/architecture.md` | 始终 | Fork 决策矩阵 + 流水线 + 上下文隔离 |

| `.claude/rules/language.md` | 始终 | 思考语言强制中文（最高优先级） |
| `.claude/rules/coding-standards.md` | `backend/src/**/*.py + frontend/src/**/*.{ts,tsx}` 或项目源码路径 | 项目编码规范（/init 自动生成） |

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

- 子 Agent 返回的 YAML 直接 ```yaml 展示，不转写
- 自动推进，不等用户说"继续"
- 暂停仅用 AskUserQuestion
- 完成后 2-3 句汇报，不重复 YAML 内容
