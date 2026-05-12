---
paths:
  - "src/**/*.ts"
---

# 编码规范（项目特定）

> 此文件由 /init 根据项目类型自动生成。

## 命名规范
- 类/类型/接口: PascalCase，接口不加 I 前缀
- 函数/方法: camelCase
- 常量: UPPER_SNAKE_CASE
- 文件命名与默认导出一致

## TypeScript 规范
- 严格模式开启（strict: true）
- 禁止 any — 用 unknown 或具体类型
- 优先 type 而非 interface（除非需要声明合并）
- 使用 as const 断言字面量类型
- 返回值类型显式标注（公共函数）

## 导入规范
- 导入顺序: 标准库 → 第三方库 → 项目模块 → 类型
- 禁止循环导入
- 优先具名导出

## 代码风格
- 使用 2 空格缩进，禁用 tab
- 优先 const，需要重新赋值时用 let，禁用 var
- async/await 替代原始 Promise
- 模板字符串替代字符串拼接
- 可选链 (?.) 和空值合并 (??) 优先于 && 短路

## 测试规范
- 测试文件放在 .test.ts 同目录
- 使用 vitest 编写测试
- 一个 describe 块对应一个函数/模块
- 优先测试行为而非实现细节

## 禁止事项
- 禁止提交 console.log（提交前清理）
- 禁止未处理的 Promise
- 禁止直接操作 DOM（除非在 Canvas 渲染循环内）
