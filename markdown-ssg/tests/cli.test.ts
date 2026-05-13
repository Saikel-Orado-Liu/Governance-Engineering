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
  it('builds a single .md file to .html', () => {
    writeFileSync(join(srcDir, 'hello.md'), '# Hello\n\nWorld', 'utf-8');

    const results = buildAll(srcDir, outDir);

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

  it('handles empty source directory (no .md files)', () => {
    const emptySrc = join(tmpDir, 'empty-src');
    mkdirSync(emptySrc, { recursive: true });
    const emptyOut = join(tmpDir, 'empty-out');
    mkdirSync(emptyOut, { recursive: true });

    const results = buildAll(emptySrc, emptyOut);
    expect(results).toHaveLength(0);
  });

  it('preserves subdirectory structure', () => {
    const subSrc = join(srcDir, 'sub');
    mkdirSync(subSrc, { recursive: true });
    writeFileSync(join(subSrc, 'nested.md'), '# Nested', 'utf-8');

    buildAll(srcDir, outDir);

    const htmlPath = join(outDir, 'sub', 'nested.html');
    expect(existsSync(htmlPath)).toBe(true);
    const content = readFileSync(htmlPath, 'utf-8');
    expect(content).toContain('<h1>Nested</h1>');
  });

  it('skips non-.md files', () => {
    writeFileSync(join(srcDir, 'readme.txt'), 'Not markdown', 'utf-8');

    const results = buildAll(srcDir, outDir);
    // Should only have .md results, not .txt
    const mdResults = results.filter((r) => r.file.endsWith('.html'));
    expect(mdResults.length).toBeGreaterThan(0);
    expect(existsSync(join(outDir, 'readme.txt'))).toBe(false);
  });

  it('uses custom template', () => {
    const customSrc = join(tmpDir, 'custom-src');
    const customOut = join(tmpDir, 'custom-out');
    mkdirSync(customSrc, { recursive: true });
    mkdirSync(customOut, { recursive: true });
    writeFileSync(join(customSrc, 'page.md'), '# Page', 'utf-8');

    const customTemplate = '<html>{{content}}</html>';
    buildAll(customSrc, customOut, customTemplate, '');

    const content = readFileSync(join(customOut, 'page.html'), 'utf-8');
    expect(content).toBe('<html><h1>Page</h1></html>');
  });

  it('injects CSS content via {{style}}', () => {
    const cssSrc = join(tmpDir, 'css-src');
    const cssOut = join(tmpDir, 'css-out');
    mkdirSync(cssSrc, { recursive: true });
    mkdirSync(cssOut, { recursive: true });
    writeFileSync(join(cssSrc, 'page.md'), '# Title', 'utf-8');

    buildAll(cssSrc, cssOut, '{{style}}', 'body { color: red; }');

    const content = readFileSync(join(cssOut, 'page.html'), 'utf-8');
    expect(content).toBe('body { color: red; }');
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
});
