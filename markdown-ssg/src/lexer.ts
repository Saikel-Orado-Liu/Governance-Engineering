// Markdown SSG — Lexer/Tokenizer
// Two-phase: line-level parsing → inline parsing

export enum TokenType {
  HEADING = 'HEADING',
  PARAGRAPH = 'PARAGRAPH',
  BLANK_LINE = 'BLANK_LINE',
  BOLD = 'BOLD',
  ITALIC = 'ITALIC',
  CODE_INLINE = 'CODE_INLINE',
  CODE_BLOCK = 'CODE_BLOCK',
  UNORDERED_LIST = 'UNORDERED_LIST',
  LINK = 'LINK',
  IMAGE = 'IMAGE',
}

export interface Token {
  readonly type: TokenType;
  readonly raw: string;
  readonly line: number;
  readonly column: number;
}

/**
 * Check if a position in the text is escaped by an odd number of preceding
 * backslash characters.
 */
function isEscaped(text: string, position: number): boolean {
  let count = 0;
  let i = position - 1;
  while (i >= 0 && text[i] === '\\') {
    count++;
    i--;
  }
  return count % 2 === 1;
}

/**
 * Phase 2: Scan a line's text for inline tokens (BOLD, ITALIC, CODE_INLINE,
 * LINK, IMAGE) using per-pattern regex matching.
 */
function parseInline(text: string, lineNum: number): Token[] {
  const tokens: Token[] = [];

  // Helper: run a regex on the full text and collect non-escaped matches
  const collectMatches = (pattern: RegExp, type: TokenType): void => {
    const re = new RegExp(pattern.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (!isEscaped(text, match.index)) {
        tokens.push({ type, raw: match[0], line: lineNum, column: match.index });
      }
    }
  };

  // Order matters: IMAGE before LINK (shared `[` syntax),
  // then CODE_INLINE, BOLD, ITALIC
  // IMAGE: ![alt](url)
  collectMatches(/!\[([^\]]*)\]\(([^)]*)\)/, TokenType.IMAGE);
  // LINK: [text](url) — not preceded by `!` (which would be IMAGE)
  collectMatches(/(?<!!)\[([^\]]*)\]\(([^)]*)\)/, TokenType.LINK);
  // CODE_INLINE: `code`
  collectMatches(/`([^`]*)`/, TokenType.CODE_INLINE);
  // BOLD: **text**
  collectMatches(/\*\*(.+?)\*\*/, TokenType.BOLD);
  // ITALIC: *text*  — opening * not preceded/followed by *
  collectMatches(/(?<!\*)\*(?!\*)(.+?)\*/, TokenType.ITALIC);

  return tokens;
}

/**
 * Tokenize a Markdown input string into a flat Token array.
 *
 * Phase 1 splits the text by lines and identifies block-level tokens:
 *   HEADING, PARAGRAPH, BLANK_LINE, CODE_BLOCK, UNORDERED_LIST.
 *
 * Phase 2 scans the content of PARAGRAPH, HEADING, and UNORDERED_LIST tokens
 * for inline tokens: BOLD, ITALIC, CODE_INLINE, LINK, IMAGE.
 *
 * The final array is sorted by (line asc, column asc, raw.length desc).
 */
export function tokenize(input: string): Token[] {
  if (input === '') return [];

  const tokens: Token[] = [];
  const lines = input.split('\n');
  // Remove trailing empty element caused by final newline
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  let lineIdx = 0;

  // ---- Phase 1: Line-level tokenization ----
  while (lineIdx < lines.length) {
    const rawLine = lines[lineIdx];
    const lineNum = lineIdx + 1; // 1-indexed

    // Blank line
    if (rawLine.trim() === '') {
      tokens.push({ type: TokenType.BLANK_LINE, raw: '', line: lineNum, column: 0 });
      lineIdx++;
      continue;
    }

    // Code block: opening fence ```…
    if (rawLine.startsWith('```')) {
      // Count opening fence backtick length (CommonMark §4.5)
      const openingMatch = rawLine.match(/^(`+)/);
      const fenceLen = openingMatch ? openingMatch[1].length : 3;
      const blockLines: string[] = [rawLine];
      lineIdx++;
      while (lineIdx < lines.length) {
        // Closing fence requires backtick count >= opening fence length
        const closeMatch = lines[lineIdx].match(/^(`+)/);
        if (closeMatch && closeMatch[1].length >= fenceLen) {
          // Include closing fence line
          blockLines.push(lines[lineIdx]);
          lineIdx++;
          break;
        }
        blockLines.push(lines[lineIdx]);
        lineIdx++;
      }
      // else: unclosed code block — EOF is the end
      tokens.push({
        type: TokenType.CODE_BLOCK,
        raw: blockLines.join('\n'),
        line: lineNum,
        column: 0,
      });
      continue;
    }

    // Indented code block (4 spaces or tab)
    // Only triggers at start of document or after a blank line
    if ((rawLine.startsWith('    ') || rawLine.startsWith('\t')) &&
        (tokens.length === 0 || tokens[tokens.length - 1].type === TokenType.BLANK_LINE)) {
      const blockLines: string[] = [rawLine];
      lineIdx++;
      while (lineIdx < lines.length) {
        const nextLine = lines[lineIdx];
        if (nextLine.startsWith('    ') || nextLine.startsWith('\t') || nextLine.trim() === '') {
          blockLines.push(nextLine);
          lineIdx++;
        } else {
          break;
        }
      }
      tokens.push({
        type: TokenType.CODE_BLOCK,
        raw: blockLines.join('\n'),
        line: lineNum,
        column: 0,
      });
      continue;
    }

    // Heading: # … ######
    // CommonMark §4.2: requires space/tab/EOL after # markers, rejects 7+ #
    if (/^#{1,6}(?:[ \t]|$)/.test(rawLine)) {
      // Count leading `#` characters to determine level (1-6)
      tokens.push({
        type: TokenType.HEADING,
        raw: rawLine,
        line: lineNum,
        column: 0,
      });
      lineIdx++;
      continue;
    }

    // Unordered list: "- ", "* ", or "+ " at line start
    if (rawLine.startsWith('- ') || rawLine.startsWith('* ') || rawLine.startsWith('+ ')) {
      tokens.push({
        type: TokenType.UNORDERED_LIST,
        raw: rawLine,
        line: lineNum,
        column: 0,
      });
      lineIdx++;
      continue;
    }

    // Default: paragraph
    tokens.push({
      type: TokenType.PARAGRAPH,
      raw: rawLine,
      line: lineNum,
      column: 0,
    });
    lineIdx++;
  }

  // ---- Phase 2: Inline tokenization ----
  const inlineTokens: Token[] = [];
  for (const token of tokens) {
    if (
      token.type === TokenType.PARAGRAPH ||
      token.type === TokenType.HEADING ||
      token.type === TokenType.UNORDERED_LIST
    ) {
      const found = parseInline(token.raw, token.line);
      inlineTokens.push(...found);
    }
  }
  tokens.push(...inlineTokens);

  // ---- Sort: line asc → column asc → raw.length desc ----
  tokens.sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return b.raw.length - a.raw.length;
  });

  return tokens;
}
