#!/usr/bin/env python3
"""Init 技能验证脚本。检查初始化后的项目结构完整性、配置格式、MCP 安全。"""
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

# MCP 配置中不应出现的明文凭证关键词
# 匹配 JSON key 中包含敏感词且 value 为长字符串（疑似真实凭证）的情况
# key 中敏感词后可跟后缀（如 AWS_ACCESS_KEY_ID 中的 _ID）
# 值为 <你的...> 占位符的不算泄漏
SENSITIVE_PATTERNS = [
    r'(?i)"[^"]*(?:password|secret|api[_-]?key|access[_-]?key|token)[^"]*"\s*:\s*"[A-Za-z0-9+/=_-]{20,}"',
]


def load_known_placeholders(project_path):
    """从 placeholder-map.yaml 加载所有已知占位符（含标准14个 + 框架适配）"""
    known = set()
    map_path = os.path.join(project_path, ".claude", "skills", "init", "references", "placeholder-map.yaml")
    if not os.path.exists(map_path):
        return known
    try:
        import yaml
        with open(map_path, encoding='utf-8') as f:
            data = yaml.safe_load(f)
        for key in data.get('placeholders', {}):
            known.add(key.upper())
        for mode in data.get('framework_adaptations', {}).values():
            if isinstance(mode, dict) and 'replacements' in mode:
                for key in mode['replacements']:
                    known.add(key.upper())
    except:
        pass
    return known


def validate_mcp_config(claude_dir: str) -> list[str]:
    """验证 MCP 配置的安全性和格式正确性"""
    errors = []
    settings_path = os.path.join(claude_dir, "settings.json")
    if not os.path.exists(settings_path):
        return errors  # settings.json 由其他检查项报告缺失

    try:
        with open(settings_path, encoding='utf-8') as f:
            settings = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"settings.json JSON 格式错误: {e}")
        return errors

    mcp_servers = settings.get("mcpServers")
    if mcp_servers is None:
        return errors  # 无 MCP 配置是合法的

    # 1. 类型检查
    if not isinstance(mcp_servers, dict):
        errors.append("settings.json mcpServers 必须是对象 (dict)")
        return errors

    # 2. 每条 MCP 条目结构验证
    for mcp_id, mcp_config in mcp_servers.items():
        if not isinstance(mcp_config, dict):
            errors.append(f"MCP '{mcp_id}': 配置必须是对象")
            continue

        # 必须有 command 或 args
        if "command" not in mcp_config:
            errors.append(f"MCP '{mcp_id}': 缺少 'command' 字段")

        # args 如果存在必须是数组
        if "args" in mcp_config and not isinstance(mcp_config["args"], list):
            errors.append(f"MCP '{mcp_id}': 'args' 必须是数组")

        # env 如果存在必须是对象
        if "env" in mcp_config and not isinstance(mcp_config["env"], dict):
            errors.append(f"MCP '{mcp_id}': 'env' 必须是对象")

    # 3. 凭证安全检查——检测明文凭证泄漏
    settings_text = json.dumps(settings, indent=2)
    for pattern in SENSITIVE_PATTERNS:
        matches = re.findall(pattern, settings_text)
        for match in matches:
            key = match[0] if isinstance(match, tuple) else match
            errors.append(
                f"settings.json 可能包含明文凭证（{key}=***）。"
                f"manual 类型的 MCP 不应将实际凭证写入配置文件，"
                f"应使用 '<你的凭证>' 占位符"
            )

    # 4. 检查是否有占位符被正确使用
    placeholder_pattern = re.compile(r'<你的\s*\w+>')
    placeholders_found = placeholder_pattern.findall(settings_text)
    if placeholders_found:
        pass  # 有占位符说明 manual MCP 的凭证未被填入，这是安全的

    return errors


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

    # 7. 占位符残留检查（跳过已知占位符）
    known = load_known_placeholders(path)
    pattern = re.compile(r"\{\{(.+?)\}\}")
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
                for m in matches:
                    key = m.strip().upper()
                    if key in known:
                        continue
                    errors.append(f"占位符残留: {os.path.relpath(fpath, path)} → {{{{ {m} }}}}")
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

    # 9. MCP 配置验证
    mcp_errors = validate_mcp_config(claude_dir)
    errors.extend(mcp_errors)

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
