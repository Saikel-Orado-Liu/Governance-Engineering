import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lexer.js';
import { buildAST } from '../src/ast.js';
import type {
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  BoldNode,
  ItalicNode,
  HorizontalRuleNode,
  BlockquoteNode,
  ListNode,
  ListItemNode,
  CodeBlockNode,
  BlankLineNode,
} from '../src/ast.js';

// ===========================================================================
// Helpers
// ===========================================================================

function build(input: string): DocumentNode {
  const tokens = tokenize(input);
  return buildAST(tokens);
}

function firstChild<T>(doc: DocumentNode): T {
  return doc.children[0] as T;
}

// ===========================================================================
// Empty input
// ===========================================================================
describe('empty input', () => {
  it('returns DocumentNode with empty children for empty string', () => {
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
    expect(h.children[0]).toEqual({ type: 'text', value: 'H2' });
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
});

// ===========================================================================
// PARAGRAPH → special types
// ===========================================================================
describe('paragraph detection', () => {
  it('detects horizontal rule from ---', () => {
    const doc = build('---');
    const hr = firstChild<HorizontalRuleNode>(doc);
    expect(hr.type).toBe('horizontal_rule');
  });

  it('detects blockquote from > ', () => {
    const doc = build('> quoted text');
    const bq = firstChild<BlockquoteNode>(doc);
    expect(bq.type).toBe('blockquote');
    expect(bq.children).toHaveLength(1);
    expect(bq.children[0].type).toBe('paragraph');
    const para = bq.children[0] as ParagraphNode;
    expect(para.children[0]).toEqual({ type: 'text', value: 'quoted text' });
  });

  it('detects ordered list from 1. ', () => {
    const doc = build('1. first');
    const list = firstChild<ListNode>(doc);
    expect(list.type).toBe('list');
    expect(list.ordered).toBe(true);
    expect(list.children).toHaveLength(1);
    const item = list.children[0] as ListItemNode;
    expect(item.children[0]).toEqual({ type: 'text', value: 'first' });
  });

  it('merges consecutive ordered list items', () => {
    const doc = build('1. first\n2. second');
    const list = firstChild<ListNode>(doc);
    expect(list.type).toBe('list');
    expect(list.ordered).toBe(true);
    expect(list.children).toHaveLength(2);
  });

  it('detects unordered list from - ', () => {
    const doc = build('- item');
    const list = firstChild<ListNode>(doc);
    expect(list.type).toBe('list');
    expect(list.ordered).toBe(false);
    expect(list.children).toHaveLength(1);
  });
});

// ===========================================================================
// UNORDERED_LIST (lexer-recognized)
// ===========================================================================
describe('UNORDERED_LIST', () => {
  it('creates unordered List with items from - lines', () => {
    const doc = build('- one\n- two');
    const list = firstChild<ListNode>(doc);
    expect(list.type).toBe('list');
    expect(list.ordered).toBe(false);
    expect(list.children).toHaveLength(2);
    const item0 = list.children[0] as ListItemNode;
    expect(item0.children[0]).toEqual({ type: 'text', value: 'one' });
  });

  it('handles inline bold in list item', () => {
    const doc = build('- **bold** item');
    const list = firstChild<ListNode>(doc);
    const item = list.children[0] as ListItemNode;
    expect(item.children).toHaveLength(2);
    expect(item.children[0].type).toBe('bold');
    expect((item.children[0] as BoldNode).children[0]).toEqual({ type: 'text', value: 'bold' });
    expect(item.children[1]).toEqual({ type: 'text', value: ' item' });
  });
});

// ===========================================================================
// Nested inline
// ===========================================================================
describe('nested inline tokens', () => {
  it('produces Bold containing Italic for **bold *italic* inside**', () => {
    const doc = build('**bold *italic* inside**');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(1);
    const bold = p.children[0] as BoldNode;
    expect(bold.type).toBe('bold');
    expect(bold.children).toHaveLength(3);
    expect(bold.children[0]).toEqual({ type: 'text', value: 'bold ' });
    expect(bold.children[1].type).toBe('italic');
    const italic = bold.children[1] as ItalicNode;
    expect(italic.children[0]).toEqual({ type: 'text', value: 'italic' });
    expect(bold.children[2]).toEqual({ type: 'text', value: ' inside' });
  });

  it('produces Bold and separate Italic for mixed inline', () => {
    const doc = build('text **bold** and *italic*');
    const p = firstChild<ParagraphNode>(doc);
    expect(p.children).toHaveLength(4);
    expect(p.children[0]).toEqual({ type: 'text', value: 'text ' });
    expect(p.children[1].type).toBe('bold');
    expect(p.children[2]).toEqual({ type: 'text', value: ' and ' });
    expect(p.children[3].type).toBe('italic');
  });
});

// ===========================================================================
// CODE_BLOCK
// ===========================================================================
describe('CODE_BLOCK', () => {
  it('creates CodeBlock with language and content', () => {
    const doc = build('```ts\nconst x = 1;\n```');
    const cb = firstChild<CodeBlockNode>(doc);
    expect(cb.type).toBe('code_block');
    expect(cb.language).toBe('ts');
    expect(cb.value).toBe('const x = 1;');
  });

  it('does not parse inline tokens inside code block', () => {
    const doc = build('```\n**not bold**\n```');
    const cb = firstChild<CodeBlockNode>(doc);
    expect(cb.type).toBe('code_block');
    expect(cb.value).toBe('**not bold**');
  });
});

// ===========================================================================
// BLANK_LINE
// ===========================================================================
describe('BLANK_LINE', () => {
  it('creates BlankLine node for blank lines', () => {
    const doc = build('a\n\nb');
    const blank = doc.children[1] as BlankLineNode;
    expect(blank.type).toBe('blank_line');
  });
});

// ===========================================================================
// Integration
// ===========================================================================
describe('mixed document', () => {
  it('builds a complete document AST', () => {
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
