// Markdown SSG — Parser (AST Builder Proxy)
//
// Thin facade over buildAST that accepts a Token array and returns a
// hierarchical DocumentNode AST.

import { buildAST } from './ast-build.js';
import type { DocumentNode } from './ast.js';
import type { Token } from './lexer.js';

/**
 * Parse a flat Token array into a hierarchical DocumentNode AST.
 *
 * Delegates directly to buildAST.  This layer exists to provide a clean
 * public API surface and to absorb future parsing concerns without
 * coupling callers to the internal AST builder.
 */
export function parse(tokens: Token[]): DocumentNode {
  return buildAST(tokens);
}
