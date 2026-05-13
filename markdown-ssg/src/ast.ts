// Markdown SSG — AST Builder
// Converts flat Token[] into a hierarchical AST

import { Token, TokenType } from './lexer.js';

// =============================================================================
// AST Node Type Definitions
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

// =============================================================================
// Helpers
// =============================================================================

const INLINE_TOKEN_TYPES = new Set([
  TokenType.BOLD,
  TokenType.ITALIC,
  TokenType.CODE_INLINE,
  TokenType.LINK,
  TokenType.IMAGE,
]);

function isInlineToken(token: Token): boolean {
  return INLINE_TOKEN_TYPES.has(token.type);
}

function countHeadingLevel(raw: string): number {
  let count = 0;
  while (count < raw.length && raw[count] === '#') count++;
  return Math.min(count, 6);
}

/**
 * Extract the content text after heading markers.
 */
function headingContent(raw: string): { content: string; colOffset: number } {
  const hashMatch = raw.match(/^#+/);
  const hashLen = hashMatch ? hashMatch[0].length : 0;
  const afterHash = raw.slice(hashLen);
  const spaceLen = afterHash.startsWith(' ') ? 1 : 0;
  return { content: afterHash.slice(spaceLen), colOffset: hashLen + spaceLen };
}

/**
 * Extract inner text content from a BOLD/ITALIC token (strip markers).
 */
function inlineTokenInner(token: Token): string {
  if (token.type === TokenType.BOLD) return token.raw.slice(2, -2);
  if (token.type === TokenType.ITALIC) return token.raw.slice(1, -1);
  return token.raw;
}

// =============================================================================
// Inline Children Builder
// =============================================================================

/**
 * Build a flat array of InlineNode children from a text segment and its
 * overlapping inline tokens.  Tokens are matched by line/column range to
 * determine nesting.
 *
 * @param lineText   — the full raw line text
 * @param allTokens  — all inline tokens on this line
 * @param start      — character offset into lineText (inclusive)
 * @param end        — character offset into lineText (exclusive)
 * @param depth      — recursion depth guard
 */
function buildInlineChildren(
  lineText: string,
  allTokens: Token[],
  start: number,
  end: number,
  depth: number = 0,
): InlineNode[] {
  if (depth > 10 || start >= end) return [];

  // Filter tokens whose range falls within [start, end)
  const local = allTokens.filter(
    (t) => t.column >= start && t.column + t.raw.length <= end,
  ).sort((a, b) => a.column - b.column);

  const children: InlineNode[] = [];
  let cursor = start;

  for (const token of local) {
    // Skip tokens already consumed by a wider parent
    if (token.column < cursor) continue;

    // Plain text before this token
    if (token.column > cursor) {
      children.push({ type: 'text', value: lineText.slice(cursor, token.column) });
    }

    const tokenEnd = token.column + token.raw.length;

    switch (token.type) {
      case TokenType.BOLD: {
        const innerStart = token.column + 2;
        const innerEnd = tokenEnd - 2;
        const innerText = inlineTokenInner(token);
        const subs = buildInlineChildren(lineText, allTokens, innerStart, innerEnd, depth + 1);
        children.push({
          type: 'bold',
          children: subs.length > 0 ? subs : [{ type: 'text', value: innerText }],
        });
        break;
      }
      case TokenType.ITALIC: {
        const innerStart = token.column + 1;
        const innerEnd = tokenEnd - 1;
        const innerText = inlineTokenInner(token);
        const subs = buildInlineChildren(lineText, allTokens, innerStart, innerEnd, depth + 1);
        children.push({
          type: 'italic',
          children: subs.length > 0 ? subs : [{ type: 'text', value: innerText }],
        });
        break;
      }
      case TokenType.CODE_INLINE: {
        children.push({ type: 'code_inline', value: token.raw.slice(1, -1) });
        break;
      }
      case TokenType.LINK: {
        const match = token.raw.match(/\[([^\]]*)\]\(([^)]*)\)/);
        if (match) {
          children.push({ type: 'link', href: match[2], children: [{ type: 'text', value: match[1] }] });
        }
        break;
      }
      case TokenType.IMAGE: {
        const match = token.raw.match(/!\[([^\]]*)\]\(([^)]*)\)/);
        if (match) {
          children.push({ type: 'image', src: match[2], alt: match[1] });
        }
        break;
      }
    }

    cursor = tokenEnd;
  }

  // Remaining text after last token
  if (cursor < end) {
    children.push({ type: 'text', value: lineText.slice(cursor, end) });
  }

  return children;
}

/**
 * Append a list item to the last list in children, or start a new list.
 * Used by both PARAGRAPH and UNORDERED_LIST token handlers.
 */
function appendListItem(
  children: BlockNode[],
  content: string,
  ordered: boolean,
  inlines: Token[],
  prefixLen: number,
): void {
  const shiftedInlines = inlines
    .filter((t) => t.column >= prefixLen)
    .map((t) => ({ ...t, column: t.column - prefixLen }));
  const inlineKids = buildInlineChildren(content, shiftedInlines, 0, content.length);
  const item: ListItemNode = { type: 'list_item', children: inlineKids };

  const last = children[children.length - 1];
  if (last?.type === 'list' && last.ordered === ordered) {
    (last as ListNode).children.push(item);
  } else {
    children.push({ type: 'list', ordered, children: [item] });
  }
}

// =============================================================================
// buildAST — Token[] → DocumentNode
// =============================================================================

/**
 * Build a hierarchical AST from a flat Token array.
 *
 * Processing:
 *   1. Tokens are sorted by (line asc, column asc, raw.length desc).
 *   2. Inline tokens are indexed by line for efficient lookup.
 *   3. Block-level tokens are iterated in order; each one gathers its
 *      associated inline tokens and builds inline children.
 *
 * Paragraph text is further inspected to detect:
 *   - Horizontal rule (---)
 *   - Blockquote (> ...)
 *   - Ordered list (1. ...)
 */
export function buildAST(tokens: Token[]): DocumentNode {
  if (tokens.length === 0) return { type: 'document', children: [] };

  // Stable sort by (line, column, -raw.length)
  const sorted = [...tokens].sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return b.raw.length - a.raw.length;
  });

  // Index inline tokens by line
  const inlineByLine = new Map<number, Token[]>();
  for (const t of sorted) {
    if (isInlineToken(t)) {
      const list = inlineByLine.get(t.line) ?? [];
      list.push(t);
      inlineByLine.set(t.line, list);
    }
  }

  const children: BlockNode[] = [];

  for (const token of sorted) {
    // Skip inline tokens — consumed by block handlers
    if (isInlineToken(token)) continue;

    switch (token.type) {
      // =====================================================================
      // BLANK_LINE
      // =====================================================================
      case TokenType.BLANK_LINE: {
        children.push({ type: 'blank_line' });
        break;
      }

      // =====================================================================
      // HEADING
      // =====================================================================
      case TokenType.HEADING: {
        const level = countHeadingLevel(token.raw);
        const { content, colOffset } = headingContent(token.raw);
        const inlines = inlineByLine.get(token.line) ?? [];
        const inlineKids = buildInlineChildren(
          token.raw,
          inlines,
          colOffset,
          token.raw.length,
        );
        children.push({ type: 'heading', level, children: inlineKids.length > 0 ? inlineKids : [{ type: 'text', value: content }] });
        break;
      }

      // =====================================================================
      // PARAGRAPH — may be specialised into other block types
      // =====================================================================
      case TokenType.PARAGRAPH: {
        const raw = token.raw;
        const trimmed = raw.trim();
        const inlines = inlineByLine.get(token.line) ?? [];

        // Horizontal rule: entire line is --- (with optional spaces)
        if (/^---+$/.test(trimmed)) {
          children.push({ type: 'horizontal_rule' });
          break;
        }

        // Blockquote: > ...
        if (raw.startsWith('> ')) {
          const content = raw.slice(2);
          const shiftedInlines = inlines
            .filter((t) => t.column >= 2)
            .map((t) => ({ ...t, column: t.column - 2 }));
          const inlineKids = buildInlineChildren(content, shiftedInlines, 0, content.length);
          const para: ParagraphNode = { type: 'paragraph', children: inlineKids };
          children.push({ type: 'blockquote', children: [para] });
          break;
        }

        // Ordered list: 1. ...
        const olMatch = raw.match(/^(\d+)\.\s/);
        if (olMatch) {
          appendListItem(children, raw.slice(olMatch[0].length), true, inlines, olMatch[0].length);
          break;
        }

        // Unordered list (fallback in case lexer missed it)
        if (raw.startsWith('- ') || raw.startsWith('* ')) {
          appendListItem(children, raw.slice(2), false, inlines, 2);
          break;
        }

        // Default: plain paragraph
        {
          const inlineKids = buildInlineChildren(raw, inlines, 0, raw.length);
          children.push({ type: 'paragraph', children: inlineKids });
        }
        break;
      }

      // =====================================================================
      // UNORDERED_LIST (handled by lexer)
      // =====================================================================
      case TokenType.UNORDERED_LIST: {
        const raw = token.raw;
        const inlines = inlineByLine.get(token.line) ?? [];
        appendListItem(children, raw.slice(2), false, inlines, 2);
        break;
      }

      // =====================================================================
      // CODE_BLOCK
      // =====================================================================
      case TokenType.CODE_BLOCK: {
        const raw = token.raw;
        const lines = raw.split('\n');
        const firstLine = lines[0]; // ```  or  ```lang
        const language = firstLine.length > 3 ? firstLine.slice(3).trim() : undefined;
        // Content between opening and closing fences (if closing exists)
        const codeLines = lines.length > 1 ? lines.slice(1, lines[lines.length - 1].startsWith('```') ? -1 : undefined) : [];
        const value = codeLines.join('\n');
        children.push({ type: 'code_block', language, value });
        break;
      }

      // Unknown / future token types — skip
      // no default
    }
  }

  return { type: 'document', children };
}
