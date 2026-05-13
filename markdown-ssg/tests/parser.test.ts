import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import type {
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  BoldNode,
  CodeBlockNode,
  ListNode,
  TextNode,
  LinkNode,
  HorizontalRuleNode,
  BlockquoteNode,
  ItalicNode,
  CodeInlineNode,
  ImageNode,
} from '../src/ast.js';

// ===========================================================================
// Helpers
// ===========================================================================

function build(input: string): DocumentNode {
  const tokens = tokenize(input);
  return parse(tokens);
}

function firstChild<T>(doc: DocumentNode): T {
  return doc.children[0] as T;
}

// ===========================================================================
// Empty input
// ===========================================================================
describe('empty input', () => {
  it('returns empty DocumentNode for empty token array', () => {
    const doc = parse([]);
    expect(doc.type).toBe('document');
    expect(doc.children).toEqual([]);
  });

  it('returns empty DocumentNode for empty string', () => {
    const doc = build('');
    expect(doc.type).toBe('document');
    expect(doc.children).toEqual([]);
  });
});

// ===========================================================================
// HEADING
// ===========================================================================
describe('HEADING', () => {
  it('parses # H1 as heading level 1', () => {
    const doc = build('# H1');
    const h = firstChild<HeadingNode>(doc);
    expect(h.type).toBe('heading');
    expect(h.level).toBe(1);
    expect(h.children).toHaveLength(1);
    expect(h.children[0]).toEqual({ type: 'text', value: 'H1' });
  });

  it('parses ## H2 as heading level 2', () => {
    const doc = build('## H2');
    const h = firstChild<HeadingNode>(doc);
    expect(h.type).toBe('heading');
    expect(h.level).toBe(2);
  });

  it('parses ### H3 as heading level 3', () => {
    const doc = build('### H3');
    const h = firstChild<HeadingNode>(doc);
    expect(h.level).toBe(3);
  });

  it('parses ###### H6 as heading level 6', () => {
    const doc = build('###### H6');
    const h = firstChild<HeadingNode>(doc);
    expect(h.level).toBe(6);
  });

  it('handles heading with inline bold', () => {
    const doc = build('# **title**');
    const h = firstChild<HeadingNode>(doc);
    expect(h.type).toBe('heading');
    expect(h.level).toBe(1);
    expect(h.children).toHaveLength(1);
    expect(h.children[0].type).toBe('bold');
    expect((h.children[0] as BoldNode).children[0]).toEqual({ type: 'text', value: 'title' });
  });

  it('handles heading without space after #', () => {
    const doc = build('#Text');
    const h = firstChild<HeadingNode>(doc);
    expect(h.level).toBe(1);
    expect(h.children).toHaveLength(1);
    expect(h.children[0]).toEqual({ type: 'text', value: 'Text' });
  });

  it('handles heading with only marker', () => {
    const doc = build('#');
    const h = firstChild<HeadingNode>(doc);
    expect(h.level).toBe(1);
    expect(h.children).toHaveLength(1);
    expect(h.children[0]).toEqual({ type: 'text', value: '' });
  });
});

// ===========================================================================
// PARAGRAPH
// ===========================================================================
describe('PARAGRAPH', () => {
  it('parses a simple text paragraph', () => {
    const doc = build('Hello world');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.type).toBe('paragraph');
    expect(p.children).toHaveLength(1);
    expect(p.children[0]).toEqual({ type: 'text', value: 'Hello world' });
  });

  it('parses paragraph with inline bold', () => {
    const doc = build('Hello **world**');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(2);
    expect(p.children[0]).toEqual({ type: 'text', value: 'Hello ' });
    expect(p.children[1].type).toBe('bold');
  });

  it('detects horizontal rule from ---', () => {
    const doc = build('---');
    const hr = firstChild<HorizontalRuleNode>(doc);
    expect(hr.type).toBe('horizontal_rule');
  });

  it('detects blockquote from > text', () => {
    const doc = build('> quoted text');
    const bq = firstChild<BlockquoteNode>(doc);
    expect(bq.type).toBe('blockquote');
    expect(bq.children).toHaveLength(1);
    expect(bq.children[0].type).toBe('paragraph');
  });

  it('detects ordered list from numbered prefix', () => {
    const doc = build('1. first');
    const list = firstChild<ListNode>(doc);
    expect(list.type).toBe('list');
    expect(list.ordered).toBe(true);
    expect(list.children).toHaveLength(1);
  });
});

// ===========================================================================
// CODE_BLOCK
// ===========================================================================
describe('CODE_BLOCK', () => {
  it('detects language from opening fence', () => {
    const doc = build('```ts\nconst x = 1;\n```');
    const cb = firstChild<CodeBlockNode>(doc);
    expect(cb.type).toBe('code_block');
    expect(cb.language).toBe('ts');
    expect(cb.value).toBe('const x = 1;');
  });

  it('sets isValid=true for closed code block', () => {
    const doc = build('```ts\nconst x = 1;\n```');
    const cb = firstChild<CodeBlockNode>(doc);
    expect(cb.isValid).toBe(true);
  });

  it('sets isValid=false for unclosed code block', () => {
    const doc = build('```ts\nconst x = 1;');
    const cb = firstChild<CodeBlockNode>(doc);
    expect(cb.isValid).toBe(false);
  });

  it('does not parse inline tokens inside code block', () => {
    const doc = build('```\n**not bold**\n```');
    const cb = firstChild<CodeBlockNode>(doc);
    expect(cb.type).toBe('code_block');
    expect(cb.value).toBe('**not bold**');
    expect(cb.isValid).toBe(true);
  });

  it('handles code block without language annotation', () => {
    const doc = build('```\nplain code\n```');
    const cb = firstChild<CodeBlockNode>(doc);
    expect(cb.language).toBeUndefined();
    expect(cb.value).toBe('plain code');
    expect(cb.isValid).toBe(true);
  });

  it('handles multi-line code block body', () => {
    const doc = build('```ts\nline 1\nline 2\nline 3\n```');
    const cb = firstChild<CodeBlockNode>(doc);
    expect(cb.language).toBe('ts');
    expect(cb.value).toBe('line 1\nline 2\nline 3');
    expect(cb.isValid).toBe(true);
  });
});

// ===========================================================================
// UNORDERED_LIST
// ===========================================================================
describe('UNORDERED_LIST', () => {
  it('creates unordered list from - items', () => {
    const doc = build('- one\n- two');
    const list = firstChild<ListNode>(doc);
    expect(list.type).toBe('list');
    expect(list.ordered).toBe(false);
    expect(list.children).toHaveLength(2);
  });

  it('handles inline bold in list item', () => {
    const doc = build('- **bold** item');
    const list = firstChild<ListNode>(doc);
    const item = list.children[0];
    expect(item.children).toHaveLength(2);
    expect(item.children[0].type).toBe('bold');
    expect(item.children[1]).toEqual({ type: 'text', value: ' item' });
  });

  it('creates unordered list from * prefix', () => {
    const doc = build('* one\n* two');
    const list = firstChild<ListNode>(doc);
    expect(list.type).toBe('list');
    expect(list.ordered).toBe(false);
    expect(list.children).toHaveLength(2);
  });
});

// ===========================================================================
// Paragraph merging
// ===========================================================================
describe('paragraph merging', () => {
  it('merges adjacent paragraphs separated by line break', () => {
    const doc = build('first line\nsecond line');
    expect(doc.children).toHaveLength(1);
    const p = firstChild<ParagraphNode>(doc);
    expect(p.type).toBe('paragraph');
    expect(p.children).toHaveLength(3);
    expect(p.children[0]).toEqual({ type: 'text', value: 'first line' });
    expect(p.children[1]).toEqual({ type: 'text', value: ' ' });
    expect(p.children[2]).toEqual({ type: 'text', value: 'second line' });
  });

  it('separates paragraphs with blank line in between', () => {
    const doc = build('first\n\nsecond');
    // blank_line stays as separator between two paragraphs
    expect(doc.children).toHaveLength(3);
    expect(doc.children[0].type).toBe('paragraph');
    expect(doc.children[1].type).toBe('blank_line');
    expect(doc.children[2].type).toBe('paragraph');
  });

  it('does not merge paragraphs separated by other block types', () => {
    const doc = build('text\n\n---\n\nmore text');
    expect(doc.children).toHaveLength(5);
    expect(doc.children[0].type).toBe('paragraph');
    expect(doc.children[1].type).toBe('blank_line');
    expect(doc.children[2].type).toBe('horizontal_rule');
    expect(doc.children[3].type).toBe('blank_line');
    expect(doc.children[4].type).toBe('paragraph');
  });
});

// ===========================================================================
// Inline nodes
// ===========================================================================
describe('inline nodes', () => {
  it('parses bold as BoldNode child', () => {
    const doc = build('**bold text**');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(1);
    const bold = p.children[0] as BoldNode;
    expect(bold.type).toBe('bold');
    expect(bold.children).toHaveLength(1);
    expect(bold.children[0]).toEqual({ type: 'text', value: 'bold text' });
  });

  it('parses link with href and text', () => {
    const doc = build('[click](https://example.com)');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(1);
    const link = p.children[0] as LinkNode;
    expect(link.type).toBe('link');
    expect(link.href).toBe('https://example.com');
    expect(link.children).toHaveLength(1);
    expect(link.children[0]).toEqual({ type: 'text', value: 'click' });
  });

  it('parses mixed inline bold and text', () => {
    const doc = build('text **bold** and *italic*');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(4);
    expect(p.children[0]).toEqual({ type: 'text', value: 'text ' });
    expect(p.children[1].type).toBe('bold');
    expect(p.children[2]).toEqual({ type: 'text', value: ' and ' });
    expect(p.children[3].type).toBe('italic');
  });

  it('parses italic as ItalicNode', () => {
    const doc = build('*italic text*');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(1);
    const italic = p.children[0] as ItalicNode;
    expect(italic.type).toBe('italic');
    expect(italic.children).toHaveLength(1);
    expect(italic.children[0]).toEqual({ type: 'text', value: 'italic text' });
  });

  it('parses inline code as CodeInlineNode', () => {
    const doc = build('use `code` here');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(3);
    expect(p.children[0]).toEqual({ type: 'text', value: 'use ' });
    const code = p.children[1] as CodeInlineNode;
    expect(code.type).toBe('code_inline');
    expect(code.value).toBe('code');
    expect(p.children[2]).toEqual({ type: 'text', value: ' here' });
  });

  it('parses image as ImageNode', () => {
    const doc = build('![alt text](image.png)');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(1);
    const img = p.children[0] as ImageNode;
    expect(img.type).toBe('image');
    expect(img.src).toBe('image.png');
    expect(img.alt).toBe('alt text');
  });
});

// ===========================================================================
// Mixed document
// ===========================================================================
describe('mixed document', () => {
  it('builds a complete document AST with multiple block types', () => {
    const input = [
      '# Title',
      '',
      'This is a **paragraph**.',
      '',
      '- list item',
      '',
      '```js',
      'const x = 1;',
      '```',
    ].join('\n');

    const doc = build(input);

    expect(doc.type).toBe('document');
    expect(doc.children).toHaveLength(7);

    expect(doc.children[0].type).toBe('heading');
    expect(doc.children[1].type).toBe('blank_line');
    expect(doc.children[2].type).toBe('paragraph');
    expect(doc.children[3].type).toBe('blank_line');
    expect(doc.children[4].type).toBe('list');
    expect(doc.children[5].type).toBe('blank_line');
    expect(doc.children[6].type).toBe('code_block');

    // Paragraph contains bold
    const p = doc.children[2] as ParagraphNode;
    expect(p.children).toHaveLength(3);
    expect(p.children[0]).toEqual({ type: 'text', value: 'This is a ' });
    expect(p.children[1].type).toBe('bold');
    expect(p.children[2]).toEqual({ type: 'text', value: '.' });
  });
});
