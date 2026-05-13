// Markdown SSG — CLI Helpers
// Shared utilities for CLI entry points
// =============================================================================

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Read a file from disk, exiting the process with an error message on failure.
 */
export function readFileOrExit(filePath: string, label: string): string {
  try {
    return readFileSync(resolve(filePath), 'utf-8');
  } catch {
    console.error(`Error: Cannot read ${label} file: ${filePath}`);
    process.exit(1);
  }
}
