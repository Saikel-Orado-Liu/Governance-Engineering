// Markdown SSG — Mustache Template Engine
// Simple {{var}} substitution with HTML escaping

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
{{content}}
</body>
</html>`;

/**
 * Render a template by substituting {{key}} placeholders.
 *
 * - {{content}} is inserted raw (already HTML-rendered, no escaping).
 * - All other variable values are HTML-escaped.
 * - Unknown {{keys}} that are not in `variables` are left as-is.
 *
 * @param template  — the mustache template string
 * @param variables — key-value map for substitution
 * @returns the rendered string
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match: string, key: string): string => {
    if (!Object.prototype.hasOwnProperty.call(variables, key)) return match;
    const value = variables[key];
    if (key === 'content') return value;
    return escapeHtml(value);
  });
}
