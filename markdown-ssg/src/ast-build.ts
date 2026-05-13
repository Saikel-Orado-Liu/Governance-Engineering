// Markdown SSG — AST Builder
// Converts flat Token[] into a hierarchical DocumentNode AST
// =============================================================================

import { Token, TokenType } from './lexer.js';
import type { DocumentNode, BlockNode, TextNode, ParagraphNode, HeadingNode, CodeBlockNode } from './ast.js';
import { buildInlineChildren, appendListItem } from './ast-inline.js';

// =============================================================================
// Pre-compiled regex constants
// =============================================================================

const RE_HASH_MARKERS = /^#+/;
const RE_LEADING_WS = /^[ \t]+/;
const RE_HRULE = /^---+$/;
const RE_OLIST = /^(\d+)\.\s/;
const RE_FENCE_CLOSE = /^(`+)/;

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
  const hashMatch = raw.match(RE_HASH_MARKERS);
  const hashLen = hashMatch ? hashMatch[0].length : 0;
  const afterHash = raw.slice(hashLen);
  // Consume all leading whitespace (spaces/tabs) after # markers (CommonMark §4.2)
  const wsMatch = afterHash.match(RE_LEADING_WS);
  const spaceLen = wsMatch ? wsMatch[0].length : 0;
  let content = afterHash.slice(spaceLen);
  // Strip trailing closing # sequence and trailing whitespace (CommonMark §4.2)
  content = content.replace(/[ \t]+#+[ \t]*$/, '').replace(/[ \t]+$/, '');
  return { content, colOffset: hashLen + spaceLen };
}

// =============================================================================
// Paragraph Merge
// =============================================================================

/**
 * Merge adjacent ParagraphNode entries in the children array.
 * Consecutive paragraphs (no BlankLineNode or other block between them) are
 * merged into a single ParagraphNode with a TextNode(' ') separator inserted
 * between their respective inline children.
 */
function mergeParagraphNodes(children: BlockNode[]): BlockNode[] {
  const result: BlockNode[] = [];
  for (const node of children) {
    const last = result[result.length - 1];
    if (node.type === 'paragraph' && last?.type === 'paragraph') {
      (last as ParagraphNode).children.push(
        { type: 'text', value: ' ' },
        ...(node as ParagraphNode).children,
      );
    } else {
      result.push(node);
    }
  }
  return result;
}

// =============================================================================
// Block Token Handlers
// =============================================================================

/**
 * Handle BLANK_LINE — fold consecutive blank lines into a single node.
 */
function processBlankLineToken(children: BlockNode[]): void {
  const last = children[children.length - 1];
  if (last?.type !== 'blank_line') {
    children.push({ type: 'blank_line' });
  }
}

/**
 * Handle HEADING — build a HeadingNode with inline children.
 */
function buildHeadingNode(
  token: Token,
  inlineByLine: Map<number, Token[]>,
): HeadingNode {
  const level = countHeadingLevel(token.raw);
  const { content, colOffset } = headingContent(token.raw);
  const inlines = inlineByLine.get(token.line) ?? [];
  const inlineKids = buildInlineChildren(
    token.raw,
    inlines,
    colOffset,
    token.raw.length,
  );
  // Strip trailing closing # sequence and trailing whitespace from last
  // text child (CommonMark §4.2)
  if (inlineKids.length > 0) {
    const last = inlineKids[inlineKids.length - 1];
    if (last.type === 'text') {
      (last as TextNode).value = (last as TextNode).value
        .replace(/[ \t]+#+[ \t]*$/, '')
        .replace(/[ \t]+$/, '');
    }
  }
  return {
    type: 'heading',
    level,
    children: inlineKids.length > 0 ? inlineKids : [{ type: 'text', value: content }],
  };
}

/**
 * Handle PARAGRAPH — may be specialised into horizontal rule, blockquote,
 * ordered/unordered list, or plain paragraph.
 */
function processParagraphToken(
  token: Token,
  inlineByLine: Map<number, Token[]>,
  children: BlockNode[],
): void {
  const raw = token.raw;
  const trimmed = raw.trim();
  const inlines = inlineByLine.get(token.line) ?? [];

  // Horizontal rule: entire line is --- (with optional spaces)
  if (RE_HRULE.test(trimmed)) {
    children.push({ type: 'horizontal_rule' });
    return;
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
    return;
  }

  // Ordered list: 1. ...
  const olMatch = raw.match(RE_OLIST);
  if (olMatch) {
    appendListItem(children, raw.slice(olMatch[0].length), true, inlines, olMatch[0].length);
    return;
  }

  // Unordered list (fallback in case lexer missed it)
  if (raw.startsWith('- ') || raw.startsWith('* ') || raw.startsWith('+ ')) {
    appendListItem(children, raw.slice(2), false, inlines, 2);
    return;
  }

  // Default: plain paragraph
  const inlineKids = buildInlineChildren(raw, inlines, 0, raw.length);
  children.push({ type: 'paragraph', children: inlineKids });
}

/**
 * Handle UNORDERED_LIST — append a list item to the current or new list.
 */
function processUnorderedListToken(
  token: Token,
  inlineByLine: Map<number, Token[]>,
  children: BlockNode[],
): void {
  const raw = token.raw;
  const inlines = inlineByLine.get(token.line) ?? [];
  appendListItem(children, raw.slice(2), false, inlines, 2);
}

/**
 * Handle CODE_BLOCK — fenced or indented.
 */
function buildCodeBlockNode(token: Token): CodeBlockNode {
  const raw = token.raw;
  const lines = raw.split('\n');
  const firstLine = lines[0];

  // Indented code block (§4.4)
  if (firstLine.startsWith('    ') || firstLine.startsWith('\t')) {
    const value = lines.map((l) => {
      if (l.startsWith('\t')) return l.slice(1);
      if (l.startsWith('    ')) return l.slice(4);
      return l; // blank line inside code block
    }).join('\n');
    return { type: 'code_block', language: undefined, value, isValid: true };
  }

  // Fenced code block (§4.5)
  const openingFenceMatch = firstLine.match(RE_FENCE_CLOSE);
  const fenceLen = openingFenceMatch ? openingFenceMatch[1].length : 3;
  const language = firstLine.length > fenceLen ? firstLine.slice(fenceLen).trim() : undefined;
  // Validate closing fence: backtick count >= opening fence length
  const lastLine = lines[lines.length - 1];
  const closingMatch = lastLine.match(RE_FENCE_CLOSE);
  const hasClosingFence = closingMatch !== null && closingMatch[1].length >= fenceLen;
  const codeLines = lines.length > 1 ? lines.slice(1, hasClosingFence ? -1 : undefined) : [];
  const value = codeLines.join('\n');
  const isValid = hasClosingFence;
  return { type: 'code_block', language, value, isValid };
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
      case TokenType.BLANK_LINE:
        processBlankLineToken(children);
        break;

      case TokenType.HEADING:
        children.push(buildHeadingNode(token, inlineByLine));
        break;

      case TokenType.PARAGRAPH:
        processParagraphToken(token, inlineByLine, children);
        break;

      case TokenType.UNORDERED_LIST:
        processUnorderedListToken(token, inlineByLine, children);
        break;

      case TokenType.CODE_BLOCK:
        children.push(buildCodeBlockNode(token));
        break;

      // Unknown / future token types — skip
      // no default
    }
  }

  return { type: 'document', children: mergeParagraphNodes(children) };
}
