// Markdown SSG — Library Entry Point

import { readFileSync, writeFileSync, existsSync, watch } from 'node:fs';
import { resolve } from 'node:path';
import { tokenize } from './lexer.js';
import { buildAST } from './ast.js';
import { renderToHTML } from './renderer.js';
import { renderTemplate, DEFAULT_TEMPLATE } from './template.js';

// AST types
export type {
  ASTNode,
  BlockNode,
  InlineNode,
  DocumentNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  BoldNode,
  ItalicNode,
  CodeInlineNode,
  CodeBlockNode,
  ListNode,
  ListItemNode,
  LinkNode,
  ImageNode,
  BlockquoteNode,
  HorizontalRuleNode,
  BlankLineNode,
} from './ast.js';

// AST builder
export { buildAST } from './ast.js';

// HTML renderer
export { renderToHTML, escapeHtml } from './renderer.js';

// Mustache template
export { renderTemplate, DEFAULT_TEMPLATE } from './template.js';

// Parser (public API)
export { parse } from './parser.js';

// =============================================================================
// Single-file conversion
// =============================================================================

/**
 * Convert a single markdown file to HTML.
 * @param inputPath - path to the input .md file
 * @param outputPath - optional output path; defaults to input path with .html extension
 * @returns the generated HTML string
 */
export function convertFile(inputPath: string, outputPath?: string): string {
  if (!existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }

  const content = readFileSync(inputPath, 'utf-8');
  const tokens = tokenize(content);
  const ast = buildAST(tokens);
  const htmlContent = renderToHTML(ast);

  const outPath = outputPath ?? inputPath.replace(/\.md$/i, '.html');
  const title = inputPath.replace(/^.*[/\\]/, '').replace(/\.md$/i, '');

  const finalHtml = renderTemplate(DEFAULT_TEMPLATE, {
    title,
    style: '',
    content: htmlContent,
  });

  try {
    writeFileSync(outPath, finalHtml, 'utf-8');
  } catch {
    throw new Error(`Cannot write to ${outPath}`);
  }

  return finalHtml;
}

/**
 * CLI main entry point — hand-written argument parser.
 * Usage: markdown-ssg <input.md> [--output <path>] [--watch]
 */
export function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: markdown-ssg <input.md> [--output <path>] [--watch]');
    process.exit(1);
  }

  const input = args[0];
  let output: string | undefined;
  let watchMode = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output') output = args[++i];
    else if (args[i] === '--watch') watchMode = true;
  }

  try {
    convertFile(input, output);
    console.log(`Built: ${input} -> ${output ?? input.replace(/\.md$/i, '.html')}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (watchMode) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const watcher = watch(resolve(input), () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          convertFile(input, output);
          console.log(`Rebuilt: ${input}`);
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
        }
      }, 300);
    });
    process.on('SIGINT', () => { watcher.close(); process.exit(0); });
    process.on('SIGTERM', () => { watcher.close(); process.exit(0); });
  }
}

// Conditionally run as CLI entry point
const runningDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('index.js') ||
  process.argv[1]?.replace(/\\/g, '/').endsWith('index.ts');

if (runningDirectly) {
  main();
}
