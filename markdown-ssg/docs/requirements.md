# Markdown SSG — 需求规格

> 本文件为需求基准，Confirm Agent 基于此进行需求确认。

## 功能需求

### FR-01: Markdown 解析 (CommonMark 兼容)
- 块级元素：段落、标题(ATX/Setext)、列表(有序/无序)、代码块、引用、水平线
- 行内元素：粗体、斜体、代码、链接、图片
- 目标：通过 commonmark-spec 测试套件（649 用例）

### FR-02: 模板引擎
- 布局模板 + 内容插槽
- 模板变量替换
- 支持自定义 CSS

### FR-03: CLI 工具
- `md-ssg build <src> <out>` — 构建静态站点
- `md-ssg serve` — 开发服务器 + 热重载

### FR-04: 文件系统监视
- watch 模式：源文件变更时自动重建

## 非功能需求
- 解析器与渲染器解耦（AST 为接口边界）
- XSS 防护：所有 HTML 输出必须转义
- 性能：解析 1000 个 markdown 文件不超过 5 秒
