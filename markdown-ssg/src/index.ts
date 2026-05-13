// Markdown SSG — Library Entry Point

import { readFileSync, writeFileSync, existsSync, watch } from 'node:fs';
import { resolve } from 'node:path';
import { tokenize } from './lexer.js';
import { buildAST } from './ast.js';
import { renderToHTML } from './renderer.js';
import { renderTemplate, DEFAULT_TEMPLATE, resolveLayoutPath } from './template.js';
import { parseFrontmatter } from './frontmatter.js';

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
 * @param templateStr - optional custom template string; defaults to DEFAULT_TEMPLATE
 * @param cssContent - optional CSS content to inject
 * @returns the generated HTML string
 */
export function convertFile(
  inputPath: string,
  outputPath?: string,
  templateStr?: string,
  cssContent?: string,
): string {
  if (!existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }

  const rawContent = readFileSync(inputPath, 'utf-8');

  // Parse frontmatter and determine effective template
  // --template / templateStr parameter takes priority over frontmatter.layout
  const { frontmatter, body } = parseFrontmatter(rawContent);
  let effectiveTemplate = templateStr ?? DEFAULT_TEMPLATE;
  if (!templateStr && frontmatter?.layout) {
    const layoutContent = resolveLayoutPath(frontmatter.layout);
    if (layoutContent !== null) {
      effectiveTemplate = layoutContent;
    }
  }

  const tokens = tokenize(body);
  const ast = buildAST(tokens);
  const htmlContent = renderToHTML(ast);

  const outPath = outputPath ?? inputPath.replace(/\.md$/i, '.html');
  const title = inputPath.replace(/^.*[/\\]/, '').replace(/\.md$/i, '');

  const finalHtml = renderTemplate(effectiveTemplate, {
    title,
    style: cssContent ?? '',
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
 * Usage: markdown-ssg <input.md> [--output <path>] [--watch] [--template <path>] [--layout <name>] [--css <path>]
 */
export function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: markdown-ssg <input.md> [--output <path>] [--watch] [--template <path>] [--layout <name>] [--css <path>]');
    process.exit(1);
  }

  const input = args[0];
  let output: string | undefined;
  let watchMode = false;
  let templatePath: string | undefined;
  let layoutName: string | undefined;
  let cssPath: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output') output = args[++i];
    else if (args[i] === '--watch') watchMode = true;
    else if (args[i] === '--template') templatePath = args[++i];
    else if (args[i] === '--layout') layoutName = args[++i];
    else if (args[i] === '--css') cssPath = args[++i];
  }

  // Resolve template: --template has highest priority, then --layout
  let templateStr: string | undefined;
  if (templatePath) {
    try {
      templateStr = readFileSync(resolve(templatePath), 'utf-8');
    } catch {
      console.error(`Error: Cannot read template file: ${templatePath}`);
      process.exit(1);
    }
  } else if (layoutName) {
    const layoutContent = resolveLayoutPath(layoutName);
    if (layoutContent === null) {
      console.error(`Error: Layout not found or invalid: ${layoutName}`);
      process.exit(1);
    }
    templateStr = layoutContent;
  }

  let cssContent: string | undefined;
  if (cssPath) {
    try {
      cssContent = readFileSync(resolve(cssPath), 'utf-8');
    } catch {
      console.error(`Error: Cannot read CSS file: ${cssPath}`);
      process.exit(1);
    }
  }

  try {
    convertFile(input, output, templateStr, cssContent);
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
          convertFile(input, output, templateStr, cssContent);
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
