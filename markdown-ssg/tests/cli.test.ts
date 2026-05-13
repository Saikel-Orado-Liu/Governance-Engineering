import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildAll } from '../src/cli.js';
import { convertFile } from '../src/index.js';

// ===========================================================================
// Setup: temporary directories
// ===========================================================================
let tmpDir: string;
let srcDir: string;
let outDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'ssg-test-'));
  srcDir = join(tmpDir, 'src');
  outDir = join(tmpDir, 'out');
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ===========================================================================
// buildAll
// ===========================================================================
describe('buildAll', () => {
  it('builds a single .md file to .html', async () => {
    writeFileSync(join(srcDir, 'hello.md'), '# Hello\n\nWorld', 'utf-8');

    const results = await buildAll(srcDir, outDir);

    expect(results).toHaveLength(1);
    expect(results[0].file).toBe('hello.html');
    expect(results[0].status).toBe('ok');

    const htmlPath = join(outDir, 'hello.html');
    expect(existsSync(htmlPath)).toBe(true);
    const content = readFileSync(htmlPath, 'utf-8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<h1>Hello</h1>');
    expect(content).toContain('<p>World</p>');
    expect(content).toContain('<title>hello</title>');
  });

  it('handles empty source directory (no .md files)', async () => {
    const emptySrc = join(tmpDir, 'empty-src');
    mkdirSync(emptySrc, { recursive: true });
    const emptyOut = join(tmpDir, 'empty-out');
    mkdirSync(emptyOut, { recursive: true });

    const results = await buildAll(emptySrc, emptyOut);
    expect(results).toHaveLength(0);
  });

  it('preserves subdirectory structure', async () => {
    const subSrc = join(srcDir, 'sub');
    mkdirSync(subSrc, { recursive: true });
    writeFileSync(join(subSrc, 'nested.md'), '# Nested', 'utf-8');

    await buildAll(srcDir, outDir);

    const htmlPath = join(outDir, 'sub', 'nested.html');
    expect(existsSync(htmlPath)).toBe(true);
    const content = readFileSync(htmlPath, 'utf-8');
    expect(content).toContain('<h1>Nested</h1>');
  });

  it('skips non-.md files', async () => {
    writeFileSync(join(srcDir, 'readme.txt'), 'Not markdown', 'utf-8');

    const results = await buildAll(srcDir, outDir);
    // Should only have .md results, not .txt
    const mdResults = results.filter((r) => r.file.endsWith('.html'));
    expect(mdResults.length).toBeGreaterThan(0);
    expect(existsSync(join(outDir, 'readme.txt'))).toBe(false);
  });

  it('uses custom template', async () => {
    const customSrc = join(tmpDir, 'custom-src');
    const customOut = join(tmpDir, 'custom-out');
    mkdirSync(customSrc, { recursive: true });
    mkdirSync(customOut, { recursive: true });
    writeFileSync(join(customSrc, 'page.md'), '# Page', 'utf-8');

    const customTemplate = '<html>{{content}}</html>';
    await buildAll(customSrc, customOut, customTemplate, '');

    const content = readFileSync(join(customOut, 'page.html'), 'utf-8');
    expect(content).toBe('<html><h1>Page</h1></html>');
  });

  it('injects CSS content via {{style}}', async () => {
    const cssSrc = join(tmpDir, 'css-src');
    const cssOut = join(tmpDir, 'css-out');
    mkdirSync(cssSrc, { recursive: true });
    mkdirSync(cssOut, { recursive: true });
    writeFileSync(join(cssSrc, 'page.md'), '# Title', 'utf-8');

    await buildAll(cssSrc, cssOut, '{{style}}', 'body { color: red; }');

    const content = readFileSync(join(cssOut, 'page.html'), 'utf-8');
    expect(content).toBe('body { color: red; }');
  });

  it('uses layout from frontmatter when layout file exists', async () => {
    const layoutSrc = join(tmpDir, 'layout-src');
    const layoutOut = join(tmpDir, 'layout-out');
    const layoutDir = join(tmpDir, 'layouts');
    mkdirSync(layoutSrc, { recursive: true });
    mkdirSync(layoutOut, { recursive: true });
    mkdirSync(layoutDir, { recursive: true });

    // Create a layout file
    writeFileSync(join(layoutDir, 'blog.html'), '<div class="blog">{{content}}</div>', 'utf-8');

    // Create a markdown file with frontmatter layout
    writeFileSync(join(layoutSrc, 'post.md'), '---\nlayout: blog\n---\n# Post\n', 'utf-8');

    // Temporarily change cwd so layout resolves to our temp dir
    const originalCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      await buildAll(layoutSrc, layoutOut);
      const content = readFileSync(join(layoutOut, 'post.html'), 'utf-8');
      expect(content).toBe('<div class="blog"><h1>Post</h1></div>');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('falls back to templateStr when layout file does not exist', async () => {
    const fbSrc = join(tmpDir, 'fb-src');
    const fbOut = join(tmpDir, 'fb-out');
    mkdirSync(fbSrc, { recursive: true });
    mkdirSync(fbOut, { recursive: true });

    // Frontmatter references a layout that does not exist
    writeFileSync(join(fbSrc, 'page.md'), '---\nlayout: nonexistent\n---\n# Fallback\n', 'utf-8');

    const fallbackTemplate = '<main>{{content}}</main>';
    await buildAll(fbSrc, fbOut, fallbackTemplate);

    const content = readFileSync(join(fbOut, 'page.html'), 'utf-8');
    expect(content).toBe('<main><h1>Fallback</h1></main>');
  });

  it('falls back to DEFAULT_TEMPLATE when no layout file and no templateStr', async () => {
    const defSrc = join(tmpDir, 'def-src');
    const defOut = join(tmpDir, 'def-out');
    mkdirSync(defSrc, { recursive: true });
    mkdirSync(defOut, { recursive: true });

    writeFileSync(join(defSrc, 'page.md'), '---\nlayout: missing\n---\n# Default\n', 'utf-8');

    const originalCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      await buildAll(defSrc, defOut);
      const content = readFileSync(join(defOut, 'page.html'), 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('<h1>Default</h1>');
    } finally {
      process.chdir(originalCwd);
    }
  });
});

// ===========================================================================
// convertFile
// ===========================================================================
describe('convertFile', () => {
  let convertTmpDir: string;

  beforeAll(() => {
    convertTmpDir = mkdtempSync(join(tmpdir(), 'ssg-convert-'));
  });

  afterAll(() => {
    rmSync(convertTmpDir, { recursive: true, force: true });
  });

  it('converts a single .md file to .html', () => {
    const inputPath = join(convertTmpDir, 'hello.md');
    writeFileSync(inputPath, '# Hello World\n\nThis is a sample markdown file.', 'utf-8');

    convertFile(inputPath);

    const htmlPath = join(convertTmpDir, 'hello.html');
    expect(existsSync(htmlPath)).toBe(true);
    const content = readFileSync(htmlPath, 'utf-8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<h1>Hello World</h1>');
    expect(content).toContain('<p>This is a sample markdown file.</p>');
  });

  it('writes to specified output path', () => {
    const inputPath = join(convertTmpDir, 'custom-output.md');
    writeFileSync(inputPath, '# Output Test', 'utf-8');
    const outputPath = join(convertTmpDir, 'custom.html');

    convertFile(inputPath, outputPath);

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('<h1>Output Test</h1>');
  });

  it('throws error for nonexistent input file', () => {
    expect(() => convertFile('/nonexistent')).toThrow('File not found: /nonexistent');
  });

  it('converts empty markdown to valid HTML', () => {
    const inputPath = join(convertTmpDir, 'empty.md');
    writeFileSync(inputPath, '', 'utf-8');

    const result = convertFile(inputPath);

    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<body>');
  });

  it('handles .MD uppercase extension (case-insensitive regex)', () => {
    const inputPath = join(convertTmpDir, 'CASE_TEST.MD');
    writeFileSync(inputPath, '# Case Test', 'utf-8');

    convertFile(inputPath);

    const htmlPath = join(convertTmpDir, 'CASE_TEST.html');
    expect(existsSync(htmlPath)).toBe(true);
    const content = readFileSync(htmlPath, 'utf-8');
    expect(content).toContain('<h1>Case Test</h1>');
  });

  it('returns the generated HTML string matching written content', () => {
    const inputPath = join(convertTmpDir, 'return-check.md');
    writeFileSync(inputPath, '# Return Value', 'utf-8');

    const result = convertFile(inputPath);

    const htmlPath = join(convertTmpDir, 'return-check.html');
    const fileContent = readFileSync(htmlPath, 'utf-8');
    expect(result).toBe(fileContent);
    expect(result).toContain('<h1>Return Value</h1>');
  });

  it('throws error when output directory does not exist', () => {
    const inputPath = join(convertTmpDir, 'no-dir.md');
    writeFileSync(inputPath, '# Test', 'utf-8');
    const badOutput = join(convertTmpDir, 'nonexistent-dir', 'output.html');

    expect(() => convertFile(inputPath, badOutput)).toThrow();
  });

  it('accepts custom templateStr parameter', () => {
    const inputPath = join(convertTmpDir, 'template-str.md');
    writeFileSync(inputPath, '# Custom Template', 'utf-8');
    const outputPath = join(convertTmpDir, 'template-str.html');

    const customTemplate = '<article>{{content}}</article>';
    convertFile(inputPath, outputPath, customTemplate);

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toBe('<article><h1>Custom Template</h1></article>');
  });

  it('accepts cssContent parameter', () => {
    const inputPath = join(convertTmpDir, 'css-content.md');
    writeFileSync(inputPath, '# Styled', 'utf-8');
    const outputPath = join(convertTmpDir, 'css-content.html');

    convertFile(inputPath, outputPath, '{{style}}', 'h1 { color: blue; }');

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toBe('h1 { color: blue; }');
  });

  it('uses frontmatter layout in convertFile when templateStr not provided', () => {
    const layoutDir = join(tmpDir, 'layouts');
    mkdirSync(layoutDir, { recursive: true });
    writeFileSync(join(layoutDir, 'post.html'), '<main>{{content}}</main>', 'utf-8');

    const inputPath = join(convertTmpDir, 'fm-layout.md');
    writeFileSync(inputPath, '---\nlayout: post\n---\n# Layout Test\n', 'utf-8');
    const outputPath = join(convertTmpDir, 'fm-layout.html');

    const originalCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      convertFile(inputPath, outputPath);
      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toBe('<main><h1>Layout Test</h1></main>');
    } finally {
      process.chdir(originalCwd);
    }
  });
});
