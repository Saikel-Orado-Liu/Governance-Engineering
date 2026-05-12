# 治理工程（Governance Engineering）

——用管理学方法论构建 AI 辅助软件开发的质量保障体系

## 这是什么

**治理工程**是一套 AI 辅助开发的方法论，核心论点是：AI 在软件开发中暴露的质量问题，与人类团队在没有有效管理时暴露的问题，在结构上是同构的。因此管理学中经过验证的设计原则——**专业化分工、标准化流程、制度化知识、需求明确化、分层审查**——可以且应该被映射到 AI 工作流设计中。

治理工程与 [Harness Engineering](https://claude.com/blog/harness-engineering) 构成互补分层：

| 层面   | Harness Engineering | 治理工程                 |
| ------ | ------------------- | ------------------------ |
| 关注点 | 如何约束 AI 的行为  | 应该构建什么样的约束体系 |
| 类比   | CI/CD 基础设施      | 工程文化与开发方法论     |
| 问题   | "如何实现"          | "为何如此设计"           |

## 文档

- [治理工程 — 理论与设计](docs/治理工程%20—%20理论与设计.md) — 学术文档，涵盖方法论演进对比、五大设计原则、三层架构模型、Token 经济学，及与 Harness Engineering 的关系定位
- [治理工程 — UE5 项目参考实现](docs/治理工程%20—%20UE5%20项目参考实现.md) — 基于 Claude Code 的完整落地指南与可运行模板

## 配套实现

本仓库提供两套可运行的 Claude Code 配置：

| 目录    | 说明                                                   |
| ------- | ------------------------------------------------------ |
| `temp/` | 通用模板，适用于任意技术栈的项目初始化                 |
| `ue5/`  | UE5.7+ 专用配置，包含 Epic C++ 编码规范、ue-mcp 适配等 |

每套配置包含：AI 组织章程（CLAUDE.md）、11 个专业化 Agent 定义、Agent 间通信 Schema、Skill 用户入口、阶段闸门 Hooks 配置、团队共享 Memory 结构。

## 核心信条

> 任何时候你对 AI 的产出不满意，**不要问"AI 为什么做不好"，而要问"我的 AI 治理架构哪里出了漏洞"**。因为一个设计良好的系统，其输出的质量不应该依赖于任何单个执行单元的能力。

## 许可

本仓库的文档（`docs/`）、Agent 定义（`temp/.claude/agents/`、`ue5/.claude/agents/`）、Skill 定义（`temp/.claude/skills/`、`ue5/.claude/skills/`）、Schema 定义（`temp/.claude/schemas/`、`ue5/.claude/schemas/`）、规则文件（`temp/.claude/rules/`、`ue5/.claude/rules/`）及所有其他内容均采用 [Apache License 2.0](LICENSE)。

Copyright © 2026 Saikel
