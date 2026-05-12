---
paths:
  - "src/**/*.py"
---

# 编码规范 — Python

> 此文件由 /init 根据项目类型自动生成。

## 样式规范

- 遵循 PEP 8，使用 ruff linter（line-length=100）
- 4 空格缩进，禁用 tab
- 导入顺序: 标准库 → 第三方 → 本地模块
- 绝对导入优于相对导入
- f-strings 优先于 .format() 和 % 格式化

## 类型注解

- 所有公共函数必须有 type hints
- 使用 from __future__ import annotations（Python 3.11+）
- mypy strict 模式，零类型警告
- Optional[X] 优于 X | None（跨版本兼容）

## 代码质量

- 所有公共函数含完整 docstring（Google 风格）
- 优先 dataclass / Pydantic 而非裸 dict
- 上下文管理器 with 语句管理资源
- 列表推导简洁时优先于 map/filter
- async/await 用于 I/O 密集型操作

## 测试

- 使用 pytest
- 测试函数名以 test_ 开头
- 使用 fixtures 而非 setUp/tearDown
- 一个测试文件对应一个模块

## 禁止

- 禁止裸 except:
- 禁止 from module import *
- 禁止可变默认参数
- 禁止用 == 比较 True/False/None
- 禁止未使用的 import
- 禁止过长的函数（>50 行考虑拆分）
