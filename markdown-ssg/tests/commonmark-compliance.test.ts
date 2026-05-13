import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tokenize } from '../src/lexer.js';
import { buildAST } from '../src/ast-build.js';
import { renderToHTML } from '../src/renderer.js';

// =============================================================================
// Types
// =============================================================================

interface SpecCase {
  description: string;
  section: string;
  markdown: string;
  html: string;
}

// =============================================================================
// Load specs
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const specsPath = join(__dirname, 'specs', 'commonmark-specs.json');
const ALL_SPECS: SpecCase[] = JSON.parse(readFileSync(specsPath, 'utf-8'));

// Group by section
const sections = new Map<string, SpecCase[]>();
for (const spec of ALL_SPECS) {
  const list = sections.get(spec.section) ?? [];
  list.push(spec);
  sections.set(spec.section, list);
}

// =============================================================================
// Track results for final report
// =============================================================================

interface SectionResult {
  passed: number;
  total: number;
}

const results = new Map<string, SectionResult>();

function recordResult(section: string, passed: boolean): void {
  const r = results.get(section) ?? { passed: 0, total: 0 };
  r.total++;
  if (passed) r.passed++;
  results.set(section, r);
}

// =============================================================================
// Helpers
// =============================================================================

function render(input: string): string {
  const tokens = tokenize(input);
  const ast = buildAST(tokens);
  return renderToHTML(ast);
}

// =============================================================================
// Tests — grouped by section
// =============================================================================

for (const [section, specs] of sections) {
  describe(`CommonMark §${section}`, () => {
    for (const spec of specs) {
      it(spec.description, () => {
        const actual = render(spec.markdown);
        try {
          expect(actual).toBe(spec.html);
          recordResult(section, true);
        } catch (e) {
          recordResult(section, false);
          throw e;
        }
      });
    }
  });
}

// =============================================================================
// Compliance report
// =============================================================================

afterAll(() => {
  const totalPassed: number[] = [];
  const totalAll: number[] = [];

  for (const [section, r] of results) {
    totalPassed.push(r.passed);
    totalAll.push(r.total);
    const pct = ((r.passed / r.total) * 100).toFixed(1);
    console.log(`  §${section}: ${r.passed}/${r.total} (${pct}%)`);
  }

  const sumPassed = totalPassed.reduce((a, b) => a + b, 0);
  const sumTotal = totalAll.reduce((a, b) => a + b, 0);
  const sumPct = ((sumPassed / sumTotal) * 100).toFixed(1);

  console.log('');
  console.log(`  TOTAL: ${sumPassed}/${sumTotal} (${sumPct}%)`);
  console.log('');
});
