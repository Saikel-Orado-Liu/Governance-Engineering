---
paths:
  - "backend/src/**/*.py"
  - "frontend/src/**/*.{ts,tsx,js,jsx}"
---

# 编码规范（项目特定）

> 此文件由 /init 根据项目类型自动生成。

## Python 编码规范 (backend/src/)

### 代码风格
- 遵循 PEP 8
- 4 空格缩进，禁用 tab
- 每行最多 100 字符（ruff line-length=100, target=py312）
- 导入顺序：标准库 → 第三方 → 本地模块
- 绝对导入优于相对导入

### 类型注解
- 所有公共函数必须有 type hints
- 使用 from __future__ import annotations（Python 3.10+）
- Optional[X] 优于 X | None（跨版本兼容）

### 代码质量
- 优先 dataclass / Pydantic 而非裸 dict
- 上下文管理器 with 语句管理资源
- f-strings 优先于 .format() 和 % 格式化
- 列表推导简洁时优先于 map/filter
- async/await 用于 I/O 密集型操作

### 测试
- 使用 pytest
- 测试函数名以 test_ 开头
- 使用 fixtures 而非 setUp/tearDown
- 一个测试文件对应一个模块

### 安全
- 通过 Bandit 扫描（零高危漏洞）
- 所有 API 输入通过 Pydantic 验证

### 禁止
- 禁止裸 except:
- 禁止 from module import *
- 禁止可变默认参数
- 禁止用 == 比较 True/False/None
- 禁止未使用的 import
- 禁止过长的函数（>50 行考虑拆分）

## TypeScript / React 编码规范 (frontend/src/)

### 命名规范
- 组件：PascalCase（如 UserProfile.tsx）
- hooks：use 前缀 PascalCase（如 useAuth.ts）
- 工具函数：camelCase（如 formatDate.ts）
- 常量：UPPER_SNAKE_CASE
- 类型/接口：PascalCase，接口不加 I 前缀
- 文件命名与默认导出一致

### TypeScript
- 严格模式开启（strict: true）
- 禁止 any — 用 unknown 或具体类型
- 优先 type 而非 interface（除非需要声明合并）
- 使用 as const 断言字面量类型
- 返回值类型显式标注（公共函数）

### React
- 函数组件 + hooks，禁止 class 组件
- 一个组件一个文件
- props 类型定义在组件文件内（或 types.ts）
- 禁止在 render 中创建内联函数/对象（用 useCallback/useMemo）
- useEffect 必须有依赖数组和清理函数
- 禁止直接修改 state（用 setState 回调）

### 导入规范
- 导入顺序：React → 第三方库 → 项目模块 → 类型
- 禁止循环导入
- 优先具名导出

### 代码风格
- 使用 2 空格缩进，禁用 tab
- 优先 const，需要重新赋值时用 let，禁用 var
- async/await 替代原始 Promise
- 模板字符串替代字符串拼接
- 可选链 (?.) 和空值合并 (??) 优先于 && 短路

### 测试
- 测试文件放在 __tests__/ 或 .test.ts 同目录
- 组件测试用 @testing-library/react
- 一个 describe 块对应一个组件/函数
- 优先测试用户行为而非实现细节

### 禁止
- 禁止 console.log 提交（用 logger 工具）
- 禁止未处理的 Promise
- 禁止在条件语句中使用 hooks
- 禁止直接操作 DOM（除非在 useEffect 内）
- 禁止使用 index 作为 key
