#!/usr/bin/env python3
"""Init 技能验证脚本。检查初始化后的项目结构完整性。"""
import sys
import os
import json
import re

FORCE_AGENTS = ["confirm-agent", "developer-agent", "explore-agent", "plan-agent",
                "inspector-agent", "summarize-agent", "commit-agent"]
OPTIONAL_AGENTS = ["test-agent", "refactor-agent", "optimize-agent", "sync-agent", "init-agent"]
FORCE_SCHEMAS = ["INDEX.yaml", "confirm-result", "developer-result", "inspector-report",
                  "summarize-report", "commit-report"]
FORCE_SKILLS = ["confirm", "plan", "init"]
FORCE_SECTIONS = ["项目概述", "常用命令", "编码规范", "工作流", "架构约定"]


def validate(path: str) -> list[str]:
    errors = []
    claude = os.path.join(path, "CLAUDE.md")
    claude_dir = os.path.join(path, ".claude")

    # 1. CLAUDE.md 存在性 + 强制节
    if not os.path.exists(claude):
        errors.append("CLAUDE.md 不存在")
    else:
        with open(claude, encoding="utf-8", errors="ignore") as f:
            content = f.read()
        for sec in FORCE_SECTIONS:
            if sec not in content:
                errors.append(f"CLAUDE.md 缺少强制节: {sec}")
        n = content.count("\n")
        if n > 200:
            errors.append(f"CLAUDE.md 行数 {n} > 200")

    # 2. .claude/ 目录存在
    if not os.path.isdir(claude_dir):
        errors.append(".claude/ 目录不存在")
        return errors

    # 3. 规则文件
    rules = os.path.join(claude_dir, "rules")
    if not os.path.isdir(rules):
        errors.append(".claude/rules/ 不存在")
    else:
        for r in ["architecture.md"]:
            if not os.path.exists(os.path.join(rules, r)):
                errors.append(f".claude/rules/{r} 缺失")
        # coding-standards.md 或 coding-standards 的变体
        cs = [f for f in os.listdir(rules) if "coding" in f.lower() and f.endswith(".md")]
        if not cs:
            errors.append(".claude/rules/ 中无编码规范文件 (coding-standards*.md)")

    # 4. Agent 文件
    agents = os.path.join(claude_dir, "agents")
    if not os.path.isdir(agents):
        errors.append(".claude/agents/ 不存在")
    else:
        agent_files = os.listdir(agents)
        for a in FORCE_AGENTS:
            if f"{a}.md" not in agent_files:
                errors.append(f"强制 Agent 缺失: {a}.md")
        # 验证 frontmatter
        for af in agent_files:
            if not af.endswith(".md"):
                continue
            apath = os.path.join(agents, af)
            with open(apath, encoding="utf-8", errors="ignore") as f:
                ac = f.read(2000)
            if "name:" not in ac:
                errors.append(f"Agent {af} 缺少 name 字段")
            if "description:" not in ac:
                errors.append(f"Agent {af} 缺少 description 字段")

    # 5. Schema 文件
    schemas = os.path.join(claude_dir, "schemas")
    if not os.path.isdir(schemas):
        errors.append(".claude/schemas/ 不存在")
    else:
        schema_files = os.listdir(schemas)
        for s in FORCE_SCHEMAS:
            found = any(s in sf for sf in schema_files)
            if not found:
                errors.append(f"强制 Schema 缺失: {s}*.yaml")

    # 6. Skill 目录
    skills = os.path.join(claude_dir, "skills")
    if not os.path.isdir(skills):
        errors.append(".claude/skills/ 不存在")
    else:
        skill_dirs = [d for d in os.listdir(skills) if os.path.isdir(os.path.join(skills, d))]
        for s in FORCE_SKILLS:
            if s not in skill_dirs:
                errors.append(f"强制 Skill 缺失: {s}/")
            elif not os.path.exists(os.path.join(skills, s, "SKILL.md")):
                errors.append(f"Skill {s}/SKILL.md 缺失")

    # 7. 占位符残留检查（跳过 init skill 自身——其文档含占位符示例）
    pattern = re.compile(r"\{\{.*?\}\}")
    for root, dirs, files in os.walk(claude_dir):
        dirs[:] = [d for d in dirs if d not in ("__pycache__", ".git")]
        if "skills" in root.replace("\\", "/").split("/"):
            continue
        if "coding-standards-templates" in root:
            continue
        for fname in files:
            if not fname.endswith((".md", ".yaml", ".json", ".yml")):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, encoding="utf-8", errors="ignore") as f:
                    fc = f.read()
                matches = pattern.findall(fc)
                if matches:
                    for m in matches:
                        errors.append(f"占位符残留: {os.path.relpath(fpath, path)} → {m}")
            except:
                pass

    # 8. agent-memory 目录
    mem = os.path.join(claude_dir, "agent-memory")
    if not os.path.isdir(mem):
        errors.append(".claude/agent-memory/ 不存在")
    else:
        for sub in ["summarize", "sync", "orchestrator"]:
            if not os.path.isdir(os.path.join(mem, sub)):
                errors.append(f".claude/agent-memory/{sub}/ 缺失")

    return errors


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "."
    print(f"Init 验证: {os.path.abspath(base)}")
    errors = validate(base)
    if errors:
        print(f"\n发现 {len(errors)} 个问题:")
        for e in errors:
            print(f"  ❌ {e}")
        print(f"\n验证失败")
        sys.exit(1)
    else:
        print("  ✅ 全部通过")
        print(f"\n验证通过")
        sys.exit(0)


if __name__ == "__main__":
    main()
