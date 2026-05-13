// Markdown SSG — Frontmatter Parser
// Parses YAML-like frontmatter blocks between --- delimiters.
// Only handles key: value pairs (no nested YAML, no lists).
// Zero external dependencies.

/**
 * Parse frontmatter from markdown content.
 *
 * Extracts the first `---` delimited block at the start of the content.
 * Only lines matching `key: value` are parsed. All other lines in the
 * frontmatter block are silently ignored.
 *
 * @param content — raw markdown file content
 * @returns parsed frontmatter map (or null if no valid frontmatter) and the remaining body content
 */
export function parseFrontmatter(
  content: string,
): { frontmatter: Record<string, string> | null; body: string } {
  // Must start with ---
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return { frontmatter: null, body: content };
  }

  // Skip the opening delimiter
  const rest = content.startsWith('---\r\n') ? content.slice(5) : content.slice(4);

  // Handle empty frontmatter: closing --- immediately follows opening ---
  if (rest.startsWith('---')) {
    let bodyStart = 3; // skip '---'
    if (bodyStart < rest.length && rest[bodyStart] === '\r') bodyStart++;
    if (bodyStart < rest.length && rest[bodyStart] === '\n') bodyStart++;
    const body = rest.slice(bodyStart);
    return { frontmatter: {}, body };
  }

  // Find the closing --- (must be at the start of a line, preceded by \n)
  const endIndex = rest.indexOf('\n---');
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  // Extract frontmatter lines (between the delimiters)
  const frontmatterLines = rest.slice(0, endIndex);

  // Extract body: everything after the closing ---\n
  let bodyStartInRest = endIndex + 4; // skip '\n---'

  // Skip optional newline right after the closing ---
  if (bodyStartInRest < rest.length && rest[bodyStartInRest] === '\r') {
    bodyStartInRest++;
  }
  if (bodyStartInRest < rest.length && rest[bodyStartInRest] === '\n') {
    bodyStartInRest++;
  }

  const body = bodyStartInRest < rest.length ? rest.slice(bodyStartInRest) : '';

  // Parse key: value pairs
  const frontmatter: Record<string, string> = {};
  const lines = frontmatterLines.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(': ');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    if (key.length === 0) continue;
    const value = line.slice(colonIndex + 2).trim();
    frontmatter[key] = value;
  }

  return { frontmatter, body };
}
