import { describe, it, expect } from 'vitest';
import { renderTemplate, DEFAULT_TEMPLATE } from '../src/template.js';

// ===========================================================================
// renderTemplate
// ===========================================================================
describe('renderTemplate', () => {
  it('replaces {{var}} with value', () => {
    const result = renderTemplate('<h1>{{title}}</h1>', { title: 'My Page' });
    expect(result).toBe('<h1>My Page</h1>');
  });

  it('replaces multiple variables', () => {
    const result = renderTemplate('{{a}} and {{b}}', { a: 'one', b: 'two' });
    expect(result).toBe('one and two');
  });

  it('does not escape {{content}}', () => {
    const result = renderTemplate('{{content}}', {
      content: '<p>Hello</p>',
    });
    expect(result).toBe('<p>Hello</p>');
  });

  it('escapes non-content variables', () => {
    const result = renderTemplate('{{title}}', {
      title: '<script>alert(1)</script>',
    });
    expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('returns empty string for unknown {{key}}', () => {
    const result = renderTemplate('Hello {{unknown}} world', {});
    expect(result).toBe('Hello  world');
  });

  it('renders empty string for missing value when key exists', () => {
    const result = renderTemplate('{{empty}}', { empty: '' });
    expect(result).toBe('');
  });
});

// ===========================================================================
// DEFAULT_TEMPLATE
// ===========================================================================
describe('DEFAULT_TEMPLATE', () => {
  it('contains required template slots', () => {
    expect(DEFAULT_TEMPLATE).toContain('{{title}}');
    expect(DEFAULT_TEMPLATE).toContain('{{style}}');
    expect(DEFAULT_TEMPLATE).toContain('{{content}}');
    expect(DEFAULT_TEMPLATE).toContain('{{nav}}');
    expect(DEFAULT_TEMPLATE).toContain('{{header}}');
    expect(DEFAULT_TEMPLATE).toContain('{{footer}}');
  });

  it('renders a complete HTML document', () => {
    const result = renderTemplate(DEFAULT_TEMPLATE, {
      title: 'Test',
      style: 'body { color: red; }',
      content: '<p>Hello</p>',
    });
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<title>Test</title>');
    expect(result).toContain('body { color: red; }');
    expect(result).toContain('<p>Hello</p>');
  });
});
