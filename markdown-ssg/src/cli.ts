#!/usr/bin/env node
// Markdown SSG — CLI Entry Point
// Commands: md-ssg build <src> <out> [--template <path>] [--css <path>]
//           md-ssg serve <src> <out> [--port <port>]
// =============================================================================

import { existsSync, readdirSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { tokenize } from './lexer.js';
import { buildAST } from './ast-build.js';
import { renderToHTML } from './renderer.js';
import { renderTemplate, resolveEffectiveTemplate } from './template.js';
import { parseFrontmatter } from './frontmatter.js';
import { readFileOrExit } from './cli-helpers.js';

// =============================================================================
// CLI Args Parsing
// =============================================================================

interface BuildOptions {
  src: string;
  out: string;
  template?: string;
  css?: string;
}

interface ServeOptions extends BuildOptions {
  port: number;
}

type CliResult =
  | { command: 'build'; opts: BuildOptions }
  | { command: 'serve'; opts: ServeOptions }
  | null;

function parseArgs(): CliResult {
  const args = process.argv.slice(2);
  if (args.length < 1) return null;

  const command = args[0];
  if (command !== 'build' && command !== 'serve') return null;

  if (args.length < 3) return null;

  const src = resolve(args[1]);
  const out = resolve(args[2]);

  let templatePath: string | undefined;
  let cssPath: string | undefined;
  let port = 3000;

  for (let i = 3; i < args.length; i++) {
    switch (args[i]) {
      case '--template':
        templatePath = args[++i];
        break;
      case '--css':
        cssPath = args[++i];
        break;
      case '--port':
        port = parseInt(args[++i], 10);
        if (Number.isNaN(port) || port < 1 || port > 65535) port = 3000;
        break;
    }
  }

  const base: BuildOptions = { src, out, template: templatePath, css: cssPath };

  if (command === 'build') {
    return { command: 'build', opts: base };
  }

  return { command: 'serve', opts: { ...base, port } };
}

// =============================================================================
// Build Pipeline
// =============================================================================

interface FileResult {
  file: string;
  status: 'ok' | 'skipped' | 'error';
  error?: string;
}

const CONCURRENCY = 4;

/**
 * Process a single markdown file and produce its HTML output.
 */
async function processOneFile(
  mdPath: string,
  srcDir: string,
  outDir: string,
  templateStr?: string,
  cssContent?: string,
): Promise<FileResult> {
  const relPath = relative(srcDir, mdPath);
  const htmlRelPath = relPath.replace(/\.md$/i, '.html');
  const outPath = join(outDir, htmlRelPath);

  const content = await readFile(mdPath, 'utf-8');

  // Parse frontmatter and determine effective template
  const { frontmatter, body } = parseFrontmatter(content);
  const effectiveTemplate = resolveEffectiveTemplate(templateStr, frontmatter);

  const tokens = tokenize(body);
  const ast = buildAST(tokens);
  const htmlContent = renderToHTML(ast);

  // Ensure output directory exists
  const outDirPath = join(outDir, dirname(htmlRelPath));
  await mkdir(outDirPath, { recursive: true });

  // Build title from filename (without .md extension)
  const title = relativePathBasename(relPath).replace(/\.md$/i, '');

  const finalHtml = renderTemplate(effectiveTemplate, {
    title,
    style: cssContent ?? '',
    content: htmlContent,
  });

  await writeFile(outPath, finalHtml, 'utf-8');
  return { file: htmlRelPath, status: 'ok' };
}

/**
 * Build all .md files from source directory to output directory.
 * Files are processed in parallel batches (concurrency = {@link CONCURRENCY}).
 * Returns the list of processed files.
 */
export async function buildAll(
  srcDir: string,
  outDir: string,
  templateStr?: string,
  cssContent: string = '',
): Promise<FileResult[]> {
  if (!existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  const mdFiles = collectMdFiles(srcDir);
  const results: FileResult[] = [];

  // Process in parallel batches to limit concurrency
  for (let i = 0; i < mdFiles.length; i += CONCURRENCY) {
    const batch = mdFiles.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((mdPath) =>
        processOneFile(mdPath, srcDir, outDir, templateStr, cssContent).catch(
          (err: unknown) => {
            const relPath = relative(srcDir, mdPath);
            const message = err instanceof Error ? err.message : String(err);
            return { file: relPath, status: 'error' as const, error: message };
          },
        ),
      ),
    );
    results.push(...batchResults);
  }

  return results;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Recursively collect all .md files from a directory.
 */
function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Directory name from a relative path string (works cross-platform).
 */
function dirname(p: string): string {
  const idx = p.lastIndexOf('/');
  const bsIdx = p.lastIndexOf('\\');
  const sep = Math.max(idx, bsIdx);
  return sep === -1 ? '.' : p.slice(0, sep) || '.';
}

/**
 * Basename of a path (works cross-platform).
 */
function relativePathBasename(p: string): string {
  const idx = p.lastIndexOf('/');
  const bsIdx = p.lastIndexOf('\\');
  const sep = Math.max(idx, bsIdx);
  return sep === -1 ? p : p.slice(sep + 1);
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const parsed = parseArgs();
  if (!parsed) {
    console.error('Usage:');
    console.error('  md-ssg build <src> <out> [--template <path>] [--css <path>]');
    console.error('  md-ssg serve <src> <out> [--port <port>]');
    process.exit(1);
  }

  if (parsed.command === 'build') {
    const { src, out, template: templatePath, css: cssPath } = parsed.opts;

    const templateStr = templatePath ? readFileOrExit(templatePath, 'template') : undefined;
    const cssContent = cssPath ? readFileOrExit(cssPath, 'CSS') : '';

    console.log(`Building from ${src} -> ${out}`);
    const results = await buildAll(src, out, templateStr, cssContent);

    let okCount = 0;
    let errorCount = 0;
    for (const r of results) {
      const prefix = r.status === 'ok' ? '  ok' : '  FAIL';
      const suffix = r.error ? ` - ${r.error}` : '';
      console.log(`${prefix} ${r.file}${suffix}`);
      if (r.status === 'ok') okCount++;
      else errorCount++;
    }

    console.log(`\nDone: ${okCount} built, ${errorCount} errors`);
    if (errorCount > 0) process.exit(1);
  } else {
    // serve command
    const { src, out, port, template: templatePath, css: cssPath } = parsed.opts;

    const templateStr = templatePath ? readFileOrExit(templatePath, 'template') : undefined;
    const cssContent = cssPath ? readFileOrExit(cssPath, 'CSS') : '';

    // Initial build
    console.log(`Initial build: ${src} -> ${out}`);
    await buildAll(src, out, templateStr, cssContent);

    // Start server with watcher
    const { startServer } = await import('./server.js');
    startServer({ srcDir: src, outDir: out, port, template: templateStr, css: cssContent });
  }
}

// Only run main when executed as the CLI entry point (not when imported for testing)
const runningDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('cli.js') ||
  process.argv[1]?.replace(/\\/g, '/').endsWith('cli.ts');

if (runningDirectly) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
