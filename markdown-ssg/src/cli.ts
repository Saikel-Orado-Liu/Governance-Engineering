#!/usr/bin/env node
// Markdown SSG — CLI Entry Point
// Commands: md-ssg build <src> <out> [--template <path>] [--css <path>]
//           md-ssg serve <src> <out> [--port <port>]

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { tokenize } from './lexer.js';
import { buildAST } from './ast.js';
import { renderToHTML } from './renderer.js';
import { renderTemplate, DEFAULT_TEMPLATE } from './template.js';

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

/**
 * Build all .md files from source directory to output directory.
 * Returns the list of processed files.
 */
export function buildAll(
  srcDir: string,
  outDir: string,
  templateStr: string = DEFAULT_TEMPLATE,
  cssContent: string = '',
): FileResult[] {
  if (!existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  const mdFiles = collectMdFiles(srcDir);
  const results: FileResult[] = [];

  for (const mdPath of mdFiles) {
    const relPath = relative(srcDir, mdPath);
    const htmlRelPath = relPath.replace(/\.md$/i, '.html');
    const outPath = join(outDir, htmlRelPath);

    try {
      const content = readFileSync(mdPath, 'utf-8');
      const tokens = tokenize(content);
      const ast = buildAST(tokens);
      const htmlContent = renderToHTML(ast);

      // Ensure output directory exists
      const outDirPath = join(outDir, dirname(htmlRelPath));
      if (!existsSync(outDirPath)) {
        mkdirSync(outDirPath, { recursive: true });
      }

      // Build title from filename (without .md extension)
      const title = relativePathBasename(relPath).replace(/\.md$/i, '');

      const finalHtml = renderTemplate(templateStr, {
        title,
        style: cssContent,
        content: htmlContent,
      });

      writeFileSync(outPath, finalHtml, 'utf-8');
      results.push({ file: htmlRelPath, status: 'ok' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ file: relPath, status: 'error', error: message });
    }
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

    let templateStr = DEFAULT_TEMPLATE;
    if (templatePath) {
      try {
        templateStr = readFileSync(resolve(templatePath), 'utf-8');
      } catch {
        console.error(`Error: Cannot read template file: ${templatePath}`);
        process.exit(1);
      }
    }

    let cssContent = '';
    if (cssPath) {
      try {
        cssContent = readFileSync(resolve(cssPath), 'utf-8');
      } catch {
        console.error(`Error: Cannot read CSS file: ${cssPath}`);
        process.exit(1);
      }
    }

    console.log(`Building from ${src} -> ${out}`);
    const results = buildAll(src, out, templateStr, cssContent);

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

    let templateStr = DEFAULT_TEMPLATE;
    if (templatePath) {
      try {
        templateStr = readFileSync(resolve(templatePath), 'utf-8');
      } catch {
        console.error(`Error: Cannot read template file: ${templatePath}`);
        process.exit(1);
      }
    }
    let cssContent = '';
    if (cssPath) {
      try {
        cssContent = readFileSync(resolve(cssPath), 'utf-8');
      } catch {
        console.error(`Error: Cannot read CSS file: ${cssPath}`);
        process.exit(1);
      }
    }

    // Initial build
    console.log(`Initial build: ${src} -> ${out}`);
    buildAll(src, out, templateStr, cssContent);

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
