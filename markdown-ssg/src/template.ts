// Markdown SSG — Mustache Template Engine
// Simple {{var}} substitution with HTML escaping

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escapeHtml } from './renderer.js';

/**
 * Default HTML5 document template.
 * Slots: {{title}}, {{style}}, {{content}}
 */
export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}}</title>
  <style>{{style}}</style>
</head>
<body>
{{nav}}
{{header}}
{{content}}
{{footer}}
</body>
</html>`;

/**
 * Resolve a layout file by name from the `layouts/` directory.
 * Validates the layout name (only alphanumeric, hyphens, underscores allowed)
 * to prevent path traversal attacks.
 *
 * Returns the layout file content, or `null` if validation fails or the file
 * does not exist.
 *
 * @param layoutName — the layout name (without `.html` extension)
 * @returns the layout file content, or null
 */
export function resolveLayoutPath(layoutName: string): string | null {
  // Prevent path traversal: only allow alphanumeric, hyphens, underscores
  if (!/^[\w-]+$/.test(layoutName)) {
    return null;
  }
  const layoutPath = join(process.cwd(), 'layouts', `${layoutName}.html`);
  try {
    return readFileSync(layoutPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Render a template by substituting {{key}} placeholders.
 *
 * - {{content}} is inserted raw (already HTML-rendered, no escaping).
 * - All other variable values are HTML-escaped.
 * - Unknown {{keys}} that are not in `variables` produce an empty string.
 *
 * @param template  — the mustache template string
 * @param variables — key-value map for substitution
 * @returns the rendered string
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string): string => {
    if (!Object.prototype.hasOwnProperty.call(variables, key)) return '';
    const value = variables[key];
    if (key === 'content') return value;
    return escapeHtml(value);
  });
}
