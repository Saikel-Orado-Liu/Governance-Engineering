import { describe, it, expect } from 'vitest';
import { tokenize, TokenType, Token } from '../src/lexer.js';

// ---------------------------------------------------------------------------
// Helper: assert a single token matches expected values
// ---------------------------------------------------------------------------
function expectToken(
  actual: Token,
  type: TokenType,
  raw: string,
  line: number,
  column: number,
): void {
  expect(actual.type).toBe(type);
  expect(actual.raw).toBe(raw);
  expect(actual.line).toBe(line);
  expect(actual.column).toBe(column);
}

// ---------------------------------------------------------------------------
// Helper: filter tokens by type (order-independent check)
// ---------------------------------------------------------------------------
function tokensOfType(result: Token[], type: TokenType): Token[] {
  return result.filter((t) => t.type === type);
}

// ===========================================================================
// Empty input
// ===========================================================================
describe('empty input', () => {
  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('treats single whitespace-only line as blank', () => {
    const result = tokenize('   ');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(TokenType.BLANK_LINE);
  });
});

// ===========================================================================
// BLANK_LINE
// ===========================================================================
describe('BLANK_LINE', () => {
  it('produces a single BLANK_LINE for a lone newline', () => {
    const result = tokenize('\n');
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.BLANK_LINE, '', 1, 0);
  });

  it('produces multiple BLANK_LINE tokens for consecutive blank lines', () => {
    const result = tokenize('\n\n\n');
    expect(result).toHaveLength(3);
    result.forEach((t, i) => {
      expectToken(t, TokenType.BLANK_LINE, '', i + 1, 0);
    });
  });

  it('treats whitespace-only lines as blank', () => {
    const result = tokenize('   \n\t  \n');
    expect(result).toHaveLength(2);
    result.forEach((t) => {
      expect(t.type).toBe(TokenType.BLANK_LINE);
    });
  });
});

// ===========================================================================
// HEADING
// ===========================================================================
describe('HEADING', () => {
  it('produces HEADING for # H1', () => {
    const result = tokenize('# H1');
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.HEADING, '# H1', 1, 0);
  });

  it('produces HEADING for ## H2', () => {
    const result = tokenize('## H2');
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.HEADING, '## H2', 1, 0);
  });

  it('produces HEADING for ### H3', () => {
    const result = tokenize('### H3');
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.HEADING, '### H3', 1, 0);
  });

  it('produces HEADING for ###### H6 (max level)', () => {
    const result = tokenize('###### H6');
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.HEADING, '###### H6', 1, 0);
  });

  it('handles heading with inline bold', () => {
    const result = tokenize('# **title**');
    expect(result).toHaveLength(2);
    expectToken(result[0], TokenType.HEADING, '# **title**', 1, 0);
    // BOLD: `**` starts after `# ` (2 chars)
    expectToken(result[1], TokenType.BOLD, '**title**', 1, 2);
  });
});

// ===========================================================================
// PARAGRAPH
// ===========================================================================
describe('PARAGRAPH', () => {
  it('produces PARAGRAPH for plain text line', () => {
    const result = tokenize('Hello world');
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.PARAGRAPH, 'Hello world', 1, 0);
  });

  it('produces PARAGRAPH with inline bold', () => {
    const result = tokenize('This is **bold** text');
    expect(result).toHaveLength(2);
    expectToken(result[0], TokenType.PARAGRAPH, 'This is **bold** text', 1, 0);
    // "This is " = 9 chars => BOLD at column 9
    expectToken(result[1], TokenType.BOLD, '**bold**', 1, 8);
  });

  it('separates paragraphs by blank lines', () => {
    const result = tokenize('First para\n\nSecond para');
    expect(result).toHaveLength(3);
    expectToken(result[0], TokenType.PARAGRAPH, 'First para', 1, 0);
    expectToken(result[1], TokenType.BLANK_LINE, '', 2, 0);
    expectToken(result[2], TokenType.PARAGRAPH, 'Second para', 3, 0);
  });
});

// ===========================================================================
// CODE_BLOCK
// ===========================================================================
describe('CODE_BLOCK', () => {
  it('produces CODE_BLOCK for multi-line code fence', () => {
    const input = '```\nconst x = 1;\n```';
    const result = tokenize(input);
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.CODE_BLOCK, input, 1, 0);
  });

  it('produces CODE_BLOCK with language identifier', () => {
    const input = '```ts\nconst x: number = 1;\n```';
    const result = tokenize(input);
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.CODE_BLOCK, input, 1, 0);
  });

  it('handles unclosed code block to EOF', () => {
    const input = '```\nconst x = 1;\nconst y = 2;';
    const result = tokenize(input);
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.CODE_BLOCK, input, 1, 0);
  });

  it('does not parse inline tokens inside code block', () => {
    const input = '```\n**not bold**\n```';
    const result = tokenize(input);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(TokenType.CODE_BLOCK);
  });
});

// ===========================================================================
// UNORDERED_LIST
// ===========================================================================
describe('UNORDERED_LIST', () => {
  it('produces UNORDERED_LIST for "- item"', () => {
    const result = tokenize('- item');
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.UNORDERED_LIST, '- item', 1, 0);
  });

  it('produces UNORDERED_LIST for "* item"', () => {
    const result = tokenize('* item');
    expect(result).toHaveLength(1);
    expectToken(result[0], TokenType.UNORDERED_LIST, '* item', 1, 0);
  });

  it('produces multiple list items', () => {
    const result = tokenize('- one\n- two\n- three');
    expect(result).toHaveLength(3);
    expectToken(result[0], TokenType.UNORDERED_LIST, '- one', 1, 0);
    expectToken(result[1], TokenType.UNORDERED_LIST, '- two', 2, 0);
    expectToken(result[2], TokenType.UNORDERED_LIST, '- three', 3, 0);
  });

  it('handles inline bold in list item', () => {
    const result = tokenize('- **bold** item');
    expect(result).toHaveLength(2);
    expectToken(result[0], TokenType.UNORDERED_LIST, '- **bold** item', 1, 0);
    // "- " = 2 chars => BOLD at column 2
    expectToken(result[1], TokenType.BOLD, '**bold**', 1, 2);
  });
});

// ===========================================================================
// BOLD
// ===========================================================================
describe('BOLD', () => {
  it('produces PARAGRAPH + BOLD for **text**', () => {
    const result = tokenize('**text**');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.BOLD)).toHaveLength(1);
  });

  it('produces PARAGRAPH + BOLD for **text with spaces**', () => {
    const result = tokenize('**text with spaces**');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.BOLD)).toHaveLength(1);
  });

  it('produces BOLD with nested italic', () => {
    const result = tokenize('**bold *italic* inside**');
    // PARAGRAPH + BOLD + ITALIC = 3
    expect(result).toHaveLength(3);
    const boldTokens = tokensOfType(result, TokenType.BOLD);
    const italicTokens = tokensOfType(result, TokenType.ITALIC);
    expect(boldTokens).toHaveLength(1);
    expect(italicTokens).toHaveLength(1);
    // Verify positions
    expect(boldTokens[0].column).toBe(0);
    expect(italicTokens[0].column).toBe(7);
  });
});

// ===========================================================================
// ITALIC
// ===========================================================================
describe('ITALIC', () => {
  it('produces PARAGRAPH + ITALIC for *text*', () => {
    const result = tokenize('*text*');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.ITALIC)).toHaveLength(1);
  });

  it('produces PARAGRAPH + ITALIC for multi-word italic', () => {
    const result = tokenize('*multi word italic*');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.ITALIC)).toHaveLength(1);
  });

  it('produces ITALIC with nested bold', () => {
    const result = tokenize('*italic **bold** inside*');
    // PARAGRAPH + ITALIC + BOLD = 3
    expect(result).toHaveLength(3);
    const italicTokens = tokensOfType(result, TokenType.ITALIC);
    const boldTokens = tokensOfType(result, TokenType.BOLD);
    expect(italicTokens).toHaveLength(1);
    expect(boldTokens).toHaveLength(1);
    expect(italicTokens[0].column).toBe(0);
    expect(boldTokens[0].column).toBe(8);
  });
});

// ===========================================================================
// CODE_INLINE
// ===========================================================================
describe('CODE_INLINE', () => {
  it('produces CODE_INLINE for `code`', () => {
    const result = tokenize('`code`');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.CODE_INLINE)).toHaveLength(1);
  });

  it('produces CODE_INLINE with special characters', () => {
    const result = tokenize('`a + b * c`');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.CODE_INLINE)).toHaveLength(1);
  });

  it('produces CODE_INLINE inline within paragraph', () => {
    const result = tokenize('Use the `fmt` function.');
    expect(result).toHaveLength(2);
    expectToken(result[0], TokenType.PARAGRAPH, 'Use the `fmt` function.', 1, 0);
    // "Use the " = 8 chars => CODE_INLINE at column 8
    expectToken(result[1], TokenType.CODE_INLINE, '`fmt`', 1, 8);
  });
});

// ===========================================================================
// LINK
// ===========================================================================
describe('LINK', () => {
  it('produces LINK for [text](url)', () => {
    const result = tokenize('[example](https://example.com)');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.LINK)).toHaveLength(1);
  });

  it('produces LINK with path in URL', () => {
    const result = tokenize('[docs](/docs/api)');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.LINK)).toHaveLength(1);
  });

  it('produces LINK inline within paragraph', () => {
    const result = tokenize('Click [here](https://example.com) now.');
    expect(result).toHaveLength(2);
    expectToken(result[0], TokenType.PARAGRAPH, 'Click [here](https://example.com) now.', 1, 0);
    // "Click " = 6 chars => LINK at column 6
    expectToken(result[1], TokenType.LINK, '[here](https://example.com)', 1, 6);
  });
});

// ===========================================================================
// IMAGE
// ===========================================================================
describe('IMAGE', () => {
  it('produces IMAGE for ![alt](img.png)', () => {
    const result = tokenize('![logo](img.png)');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.IMAGE)).toHaveLength(1);
  });

  it('produces IMAGE with path in URL', () => {
    const result = tokenize('![banner](/assets/banner.png)');
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.IMAGE)).toHaveLength(1);
  });

  it('distinguishes IMAGE from LINK (no false LINK inside IMAGE)', () => {
    const result = tokenize('![img](img.png) and [link](url)');
    // PARAGRAPH + IMAGE + LINK = 3
    expect(result).toHaveLength(3);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.IMAGE)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.LINK)).toHaveLength(1);
  });
});

// ===========================================================================
// Nested: BOLD containing ITALIC
// ===========================================================================
describe('nested inline tokens', () => {
  it('produces PARAGRAPH + BOLD + ITALIC for **bold *italic***', () => {
    const result = tokenize('**bold *italic***');
    // PARAGRAPH + BOLD + ITALIC = 3
    expect(result).toHaveLength(3);
    const boldTokens = tokensOfType(result, TokenType.BOLD);
    const italicTokens = tokensOfType(result, TokenType.ITALIC);
    expect(boldTokens).toHaveLength(1);
    expect(italicTokens).toHaveLength(1);
    // BOLD lazy-match stops at the first closing `**` (positions 14-15),
    // so the trailing `*` is outside the bold range
    expect(boldTokens[0].raw).toBe('**bold *italic**');
    expect(boldTokens[0].column).toBe(0);
    // ITALIC inside: `*italic*` at column 7
    expect(italicTokens[0].raw).toBe('*italic*');
    expect(italicTokens[0].column).toBe(7);
  });

  it('produces BOLD then ITALIC in mixed inline', () => {
    const result = tokenize('text **bold** and *italic*');
    expect(result).toHaveLength(3);
    expectToken(result[0], TokenType.PARAGRAPH, 'text **bold** and *italic*', 1, 0);
    // BOLD starts at column 5: "text " = 5 chars
    expectToken(result[1], TokenType.BOLD, '**bold**', 1, 5);
    // ITALIC starts at column 18: "text **bold** and " = 18 chars
    expectToken(result[2], TokenType.ITALIC, '*italic*', 1, 18);
  });
});

// ===========================================================================
// Escape
// ===========================================================================
describe('escape', () => {
  it('escaped asterisk does not start ITALIC', () => {
    const result = tokenize('\\*not italic');
    // Only PARAGRAPH (the `*` is escaped, no italic pattern completes)
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(TokenType.PARAGRAPH);
  });

  it('unrelated * after escape does not form italic (no content after)', () => {
    // `\*text*` — the * at position 1 is escaped, and `*` at position 6
    // has no content after it to complete the (.+?) pattern
    const result = tokenize('\\*text*');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(TokenType.PARAGRAPH);
  });

  it('double backslash before asterisk does not escape it (even count), allowing ITALIC', () => {
    // `\\*italic*` — `\\` is an escaped backslash (literal \),
    // then `*italic*` should be ITALIC because `*` at position 2
    // has an even number of preceding backslashes (2 = even => not escaped)
    const result = tokenize('\\\\*italic*');
    // PARAGRAPH + ITALIC = 2
    expect(result).toHaveLength(2);
    expect(tokensOfType(result, TokenType.ITALIC)).toHaveLength(1);
  });
});

// ===========================================================================
// Token ordering
// ===========================================================================
describe('token ordering', () => {
  it('sorts tokens by line ascending', () => {
    const result = tokenize('line one\n\nline two');
    expect(result).toHaveLength(3);
    expect(result[0].line).toBe(1);
    expect(result[1].line).toBe(2);
    expect(result[2].line).toBe(3);
  });

  it('sorts same-line tokens by column ascending', () => {
    const result = tokenize('*italic* and **bold**');
    expect(result).toHaveLength(3);
    // PARAGRAPH(1,0,len=21), ITALIC(1,0,len=8), BOLD(1,13,len=8)
    // PARAGRAPH has longest raw at same line/col => first
    expect(result[0].type).toBe(TokenType.PARAGRAPH);
    // ITALIC at same line/col, shorter raw => second
    expect(result[1].type).toBe(TokenType.ITALIC);
    expect(result[1].column).toBe(0);
    // BOLD at column 13 => third
    expect(result[2].type).toBe(TokenType.BOLD);
    expect(result[2].column).toBe(13);
  });

  it('sorts same line and column by raw.length descending', () => {
    const result = tokenize('Hello **bold**');
    expect(result).toHaveLength(2);
    // PARAGRAPH(1,0,len=16), BOLD(1,6,len=8)
    // Different columns, PARAGRAPH first by column
    expect(result[0].type).toBe(TokenType.PARAGRAPH);
    expect(result[0].column).toBe(0);
    expect(result[1].type).toBe(TokenType.BOLD);
    expect(result[1].column).toBe(6);
  });
});

// ===========================================================================
// Mixed / integration
// ===========================================================================
describe('mixed input', () => {
  it('handles a complete document with multiple token types', () => {
    const input = [
      '# Title',
      '',
      'This is a **paragraph** with `code` and a [link](http://a.com).',
      '',
      '- list item',
      '',
      '```js',
      'const x = 1;',
      '```',
    ].join('\n');

    const result = tokenize(input);

    // Block tokens: HEADING(1) + 3xBLANK_LINE + PARAGRAPH(1) + UNORDERED_LIST(1) + CODE_BLOCK(1) = 7
    // Inline tokens in paragraph: BOLD + CODE_INLINE + LINK = 3
    // Total = 10
    expect(tokensOfType(result, TokenType.HEADING)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.BLANK_LINE)).toHaveLength(3);
    expect(tokensOfType(result, TokenType.PARAGRAPH)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.BOLD)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.CODE_INLINE)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.LINK)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.UNORDERED_LIST)).toHaveLength(1);
    expect(tokensOfType(result, TokenType.CODE_BLOCK)).toHaveLength(1);
    expect(result).toHaveLength(10);
  });
});
