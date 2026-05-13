// Markdown SSG — Library Entry Point

// AST types
export type {
  ASTNode,
  BlockNode,
  InlineNode,
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  BoldNode,
  ItalicNode,
  CodeInlineNode,
  CodeBlockNode,
  ListNode,
  ListItemNode,
  LinkNode,
  ImageNode,
  BlockquoteNode,
  HorizontalRuleNode,
  BlankLineNode,
} from './ast.js';

// AST builder
export { buildAST } from './ast.js';

// HTML renderer
export { renderToHTML, escapeHtml } from './renderer.js';

// Mustache template
export { renderTemplate, DEFAULT_TEMPLATE } from './template.js';

// Parser (public API)
export { parse } from './parser.js';
