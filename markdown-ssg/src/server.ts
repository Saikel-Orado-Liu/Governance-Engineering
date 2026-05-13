// Markdown SSG — Development Server
// HTTP static server + file watcher + SSE live reload
// =============================================================================

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync, watch, type FSWatcher } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { buildAll } from './cli.js';

// =============================================================================
// Types
// =============================================================================

export interface ServerOptions {
  srcDir: string;
  outDir: string;
  port: number;
  template?: string;
  css: string;
}

export interface ServerHandle {
  close: () => void;
}

// =============================================================================
// SSE Refresh Script (injected into HTML responses)
// =============================================================================

const SSE_SCRIPT = `\n<script>
(function(){var e=new EventSource('/__ssg_reload');e.addEventListener('refresh',function(){console.log('[SSG] change detected, reloading...');location.reload()});e.addEventListener('error',function(){e.close();setTimeout(function(){new EventSource('/__ssg_reload')},3000)})})();
</script>`;

// =============================================================================
// MIME types
// =============================================================================

const BINARY_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico']);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function mimeType(path: string): string {
  const ext = extname(path).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

// =============================================================================
// Request Handler Factory
// =============================================================================

/**
 * Create an HTTP request handler for static file serving with SSE live reload.
 */
function createRequestHandler(
  outDir: string,
  sseClients: ServerResponse[],
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const url = req.url ?? '/';

    // SSE endpoint
    if (url === '/__ssg_reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('data: connected\n\n');
      sseClients.push(res);

      // Remove client on disconnect
      req.on('close', () => {
        const idx = sseClients.indexOf(res);
        if (idx !== -1) sseClients.splice(idx, 1);
      });
      return;
    }

    // Resolve file path and prevent path traversal
    const resolvedOutDir = resolve(outDir);
    let filePath = resolve(resolvedOutDir, url === '/' ? 'index.html' : url);

    // Ensure the resolved path is within the output directory
    if (!filePath.startsWith(resolvedOutDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    // Try index.html for directory-like paths
    if (!extname(filePath)) {
      const withIndex = join(filePath, 'index.html');
      if (existsSync(withIndex)) {
        filePath = withIndex;
      }
    }

    // Serve file
    if (!existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = mimeType(filePath);

    try {
      let content = readFileSync(filePath, BINARY_EXTS.has(ext) ? undefined : 'utf-8');

      // Inject SSE script into HTML
      if (ext === '.html' && typeof content === 'string') {
        content = (content as string).replace('</body>', `${SSE_SCRIPT}\n</body>`);
      }

      const isBinary = typeof content !== 'string';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': isBinary ? (content as Buffer).length : Buffer.byteLength(content as string),
      });

      if (isBinary) {
        res.end(content as Buffer);
      } else {
        res.end(content as string, 'utf-8');
      }
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    }
  };
}

// =============================================================================
// File Watcher Factory
// =============================================================================

/**
 * Create a file watcher on the source directory that triggers a rebuild
 * when a .md file changes (debounced at 300ms).
 */
function createFileWatcher(
  srcDir: string,
  onRebuild: () => void,
): FSWatcher | null {
  let watchTimer: ReturnType<typeof setTimeout> | null = null;

  try {
    const watcher = watch(srcDir, { recursive: true }, (_eventType: string, filename: string | null) => {
      if (!filename) return;
      if (!filename.toLowerCase().endsWith('.md')) return;

      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        console.log(`Change detected: ${filename}`);
        onRebuild();
      }, 300);
    });

    // Store timer ref on watcher for cleanup
    (watcher as FSWatcher & { _timer: typeof watchTimer })._timer = watchTimer;
    return watcher;
  } catch (err) {
    console.error('Failed to start file watcher:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// =============================================================================
// Server Entry Point
// =============================================================================

/**
 * Start a development HTTP server with file watching and live reload via SSE.
 *
 * @returns a handle to close the server and watcher
 */
export function startServer(options: ServerOptions): ServerHandle {
  const { srcDir, outDir, port, template, css } = options;

  // Validate directories
  if (!existsSync(outDir)) {
    throw new Error(`Output directory not found: ${outDir}`);
  }

  // ---- SSE client pool ----
  const sseClients: ServerResponse[] = [];

  function broadcastRefresh(): void {
    const message = 'data: refresh\n\n';
    for (let i = sseClients.length - 1; i >= 0; i--) {
      try {
        sseClients[i].write(message);
      } catch {
        sseClients.splice(i, 1);
      }
    }
  }

  // ---- HTTP server ----
  const server = createServer(createRequestHandler(outDir, sseClients));

  server.listen(port, () => {
    console.log(`SSG server running at http://localhost:${port}`);
    console.log(`Watching ${srcDir} for changes...`);
  });

  // ---- File watcher ----
  const watcher = createFileWatcher(srcDir, async () => {
    try {
      await buildAll(srcDir, outDir, template, css);
      console.log('Rebuild complete, notifying clients...');
      broadcastRefresh();
    } catch (err) {
      console.error('Rebuild error:', err instanceof Error ? err.message : String(err));
    }
  });

  // ---- Return handle ----
  return {
    close: () => {
      try { watcher?.close(); } catch { /* ignore */ }
      server.close();
    },
  };
}
