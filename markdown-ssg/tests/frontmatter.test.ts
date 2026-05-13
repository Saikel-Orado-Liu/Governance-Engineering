import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../src/frontmatter.js';

// ===========================================================================
// parseFrontmatter
// ===========================================================================
describe('parseFrontmatter', () => {
  it('parses standard frontmatter with key: value pairs', () => {
    const content = `---
title: My Page
layout: default
---
# Content body

Paragraph here.`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({ title: 'My Page', layout: 'default' });
    expect(result.body).toBe('# Content body\n\nParagraph here.');
  });

  it('returns null frontmatter when no --- delimiter exists', () => {
    const content = '# Just a heading\n\nSome text.';
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe('# Just a heading\n\nSome text.');
  });

  it('returns null frontmatter when closing --- is missing', () => {
    const content = `---
title: Broken
Some text without closing.`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(content);
  });

  it('returns empty frontmatter for --- followed immediately by ---', () => {
    const content = `---
---
# Content`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('# Content');
  });

  it('skips non-key:value lines in frontmatter', () => {
    const content = `---
title: My Page
- list item
complex: value
just a line without colon
---
Body text.`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({ title: 'My Page', complex: 'value' });
    expect(result.body).toBe('Body text.');
  });

  it('parses only the first --- block when multiple exist', () => {
    const content = `---
layout: first
---
---
layout: second
---
Actual body.`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({ layout: 'first' });
    expect(result.body).toBe('---\nlayout: second\n---\nActual body.');
  });

  it('handles empty value after colon', () => {
    const content = `---
key:
---
Body.`;
    // "key:" without space after colon doesn't match key: value pattern
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('Body.');
  });

  it('handles value with trailing spaces', () => {
    const content = `---
title:   My Page
---
Body.`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({ title: 'My Page' });
    expect(result.body).toBe('Body.');
  });

  it('returns null frontmatter for content starting with --- but not at very start', () => {
    // If the file starts with whitespace before ---, it is not valid frontmatter
    const content = ' \n---\nkey: val\n---\nbody';
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(content);
  });

  it('returns correct body when no extra newline after closing ---', () => {
    const content = '---\nkey: val\n---\nBody';
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({ key: 'val' });
    expect(result.body).toBe('Body');
  });

  it('handles body that is only whitespace after frontmatter', () => {
    const content = '---\nkey: val\n---\n  \n';
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({ key: 'val' });
    expect(result.body).toBe('  \n');
  });
});
