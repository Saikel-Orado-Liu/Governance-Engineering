// Markdown SSG — AST Node Type Definitions
// =============================================================================

export type ASTNode =
  | DocumentNode
  | HeadingNode
  | ParagraphNode
  | TextNode
  | BoldNode
  | ItalicNode
  | CodeInlineNode
  | CodeBlockNode
  | ListNode
  | ListItemNode
  | LinkNode
  | ImageNode
  | BlockquoteNode
  | HorizontalRuleNode
  | BlankLineNode;

export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | CodeBlockNode
  | ListNode
  | BlockquoteNode
  | HorizontalRuleNode
  | BlankLineNode;

export type InlineNode =
  | TextNode
  | BoldNode
  | ItalicNode
  | CodeInlineNode
  | LinkNode
  | ImageNode;

// — Document (root)
export interface DocumentNode {
  type: 'document';
  children: BlockNode[];
}

// — Heading (h1–h6)
export interface HeadingNode {
  type: 'heading';
  level: number;
  children: InlineNode[];
}

// — Paragraph
export interface ParagraphNode {
  type: 'paragraph';
  children: InlineNode[];
}

// — Text (leaf)
export interface TextNode {
  type: 'text';
  value: string;
}

// — Bold
export interface BoldNode {
  type: 'bold';
  children: InlineNode[];
}

// — Italic
export interface ItalicNode {
  type: 'italic';
  children: InlineNode[];
}

// — Inline code
export interface CodeInlineNode {
  type: 'code_inline';
  value: string;
}

// — Fenced code block
export interface CodeBlockNode {
  type: 'code_block';
  language?: string;
  value: string;
  readonly isValid: boolean;
}

// — List (ordered or unordered), children are list items
export interface ListNode {
  type: 'list';
  ordered: boolean;
  children: ListItemNode[];
}

// — List item
export interface ListItemNode {
  type: 'list_item';
  children: InlineNode[];
}

// — Link
export interface LinkNode {
  type: 'link';
  href: string;
  children: InlineNode[];
}

// — Image (void element)
export interface ImageNode {
  type: 'image';
  src: string;
  alt: string;
}

// — Blockquote
export interface BlockquoteNode {
  type: 'blockquote';
  children: BlockNode[];
}

// — Horizontal rule
export interface HorizontalRuleNode {
  type: 'horizontal_rule';
}

// — Blank line (renders as nothing but can separate blocks)
export interface BlankLineNode {
  type: 'blank_line';
}
