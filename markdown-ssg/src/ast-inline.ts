// Markdown SSG — AST Inline Children Builder
// Builds InlineNode[] from text segments and overlapping inline tokens
// =============================================================================

import { Token, TokenType } from './lexer.js';
import type { InlineNode, BlockNode, ListItemNode, ListNode } from './ast.js';

// =============================================================================
// Helpers
// =============================================================================

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
 * overlapping inline tokens.  Tokens are matched by column range to determine
 * nesting.
 *
 * Tokens are expected to be pre-sorted by column (ascending).  On each
 * recursive call the entire token list is scanned linearly with column-based
 * skipping, avoiding per-recursion array allocation and re-sorting.
 *
 * @param lineText   — the full raw line text
 * @param allTokens  — all inline tokens on this line, pre-sorted by column
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

  const children: InlineNode[] = [];
  let cursor = start;

  // Linear scan: tokens are pre-sorted by column (ascending).
  // Skip tokens outside [start, end); break early once column >= end.
  for (const token of allTokens) {
    // Past the end bound — no more tokens can be in range
    if (token.column >= end) break;

    // Skip tokens already consumed by a wider parent
    if (token.column < cursor) continue;

    // Token must be fully within [start, end)
    if (token.column < start) continue;
    if (token.column + token.raw.length > end) continue;

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

export { buildInlineChildren, appendListItem };
