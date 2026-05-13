import { describe, it, expect } from 'vitest';
import { renderToHTML, escapeHtml } from '../src/renderer.js';
import { buildAST } from '../src/ast.js';
import { tokenize } from '../src/lexer.js';

// ===========================================================================
// escapeHtml
// ===========================================================================
describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('escapes XSS vector', () => {
    const input = '<script>alert(1)</script>';
    expect(escapeHtml(input)).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('passes plain text through unchanged', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world');
  });
});

// ===========================================================================
// Helper: tokenize + buildAST → renderToHTML
// ===========================================================================
function render(input: string): string {
  const tokens = tokenize(input);
  const ast = buildAST(tokens);
  return renderToHTML(ast);
}

// ===========================================================================
// Block elements
// ===========================================================================
describe('block elements', () => {
  it('renders heading h1', () => {
    expect(render('# Title')).toBe('<h1>Title</h1>');
  });

  it('renders heading h2', () => {
    expect(render('## Section')).toBe('<h2>Section</h2>');
  });

  it('renders heading h6', () => {
    expect(render('###### Tiny')).toBe('<h6>Tiny</h6>');
  });

  it('renders paragraph', () => {
    expect(render('Hello world')).toBe('<p>Hello world</p>');
  });

  it('renders horizontal rule', () => {
    expect(render('---')).toBe('<hr />');
  });

  it('renders blockquote', () => {
    expect(render('> quoted')).toBe('<blockquote><p>quoted</p></blockquote>');
  });
});

// ===========================================================================
// Inline elements
// ===========================================================================
describe('inline elements', () => {
  it('renders bold', () => {
    expect(render('**bold**')).toBe('<p><strong>bold</strong></p>');
  });

  it('renders italic', () => {
    expect(render('*italic*')).toBe('<p><em>italic</em></p>');
  });

  it('renders inline code', () => {
    expect(render('`code`')).toBe('<p><code>code</code></p>');
  });

  it('renders link', () => {
    expect(render('[text](https://example.com)')).toBe('<p><a href="https://example.com">text</a></p>');
  });

  it('renders image', () => {
    expect(render('![alt](img.png)')).toBe('<p><img src="img.png" alt="alt" /></p>');
  });
});

// ===========================================================================
// Lists
// ===========================================================================
describe('lists', () => {
  it('renders unordered list', () => {
    expect(render('- one\n- two')).toBe('<ul><li>one</li>\n<li>two</li></ul>');
  });

  it('renders ordered list', () => {
    expect(render('1. first\n2. second')).toBe('<ol><li>first</li>\n<li>second</li></ol>');
  });
});

// ===========================================================================
// Code block
// ===========================================================================
describe('code block', () => {
  it('renders fenced code block', () => {
    const md = '```\nconst x = 1;\n```';
    expect(render(md)).toBe('<pre><code>const x = 1;</code></pre>');
  });

  it('renders code block with language', () => {
    const md = '```ts\nconst x: number = 1;\n```';
    expect(render(md)).toBe('<pre><code class="language-ts">const x: number = 1;</code></pre>');
  });
});

// ===========================================================================
// Nesting
// ===========================================================================
describe('nesting', () => {
  it('renders bold containing italic', () => {
    expect(render('**bold *italic* inside**')).toBe(
      '<p><strong>bold <em>italic</em> inside</strong></p>',
    );
  });
});

// ===========================================================================
// XSS
// ===========================================================================
describe('XSS prevention', () => {
  it('escapes script tag in paragraph', () => {
    const result = render('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('escapes in heading', () => {
    const result = render('# <script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });
});

// ===========================================================================
// Empty / edge cases
// ===========================================================================
describe('edge cases', () => {
  it('returns empty string for empty input', () => {
    expect(render('')).toBe('');
  });

  it('renders blank lines as empty strings', () => {
    const result = render('a\n\nb');
    // BlankLine renders as '' which produces an extra \n when joined
    expect(result).toBe('<p>a</p>\n\n<p>b</p>');
  });
});
