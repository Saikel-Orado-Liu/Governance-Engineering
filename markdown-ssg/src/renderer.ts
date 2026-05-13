// Markdown SSG — HTML Renderer
// Recursively walks the AST and produces HTML strings

import type {
  DocumentNode,
  BlockNode,
  InlineNode,
  HeadingNode,
  CodeBlockNode,
  ListNode,
} from './ast.js';

// =============================================================================
// HTML Escaping
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

// =============================================================================
// Inline Renderer
// =============================================================================

function renderInline(node: InlineNode): string {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.value);

    case 'bold':
      return `<strong>${node.children.map(renderInline).join('')}</strong>`;

    case 'italic':
      return `<em>${node.children.map(renderInline).join('')}</em>`;

    case 'code_inline':
      return `<code>${escapeHtml(node.value)}</code>`;

    case 'link':
      return `<a href="${escapeHtml(node.href)}">${node.children.map(renderInline).join('')}</a>`;

    case 'image':
      return `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}" />`;
  }
}

// =============================================================================
// Block Renderer
// =============================================================================

function renderBlock(node: BlockNode): string {
  switch (node.type) {
    case 'heading':
      return renderHeading(node);

    case 'paragraph':
      return `<p>${node.children.map(renderInline).join('')}</p>`;

    case 'code_block':
      return renderCodeBlock(node);

    case 'list':
      return renderList(node);

    case 'blockquote':
      return `<blockquote>${node.children.map(renderBlock).join('\n')}</blockquote>`;

    case 'horizontal_rule':
      return '<hr />';

    case 'blank_line':
      return '';
  }
}

function renderHeading(node: HeadingNode): string {
  const tag = `h${node.level}`;
  return `<${tag}>${node.children.map(renderInline).join('')}</${tag}>`;
}

function renderCodeBlock(node: CodeBlockNode): string {
  const langAttr = node.language ? ` class="language-${escapeHtml(node.language)}"` : '';
  return `<pre><code${langAttr}>${escapeHtml(node.value)}</code></pre>`;
}

function renderList(node: ListNode): string {
  const tag = node.ordered ? 'ol' : 'ul';
  const items = node.children.map(
    (li) => `<li>${li.children.map(renderInline).join('')}</li>`,
  );
  return `<${tag}>${items.join('\n')}</${tag}>`;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render an AST node to an HTML string.
 * For a DocumentNode, joins all block children with newlines.
 */
export function renderToHTML(node: DocumentNode): string {
  return node.children.map(renderBlock).join('\n');
}
