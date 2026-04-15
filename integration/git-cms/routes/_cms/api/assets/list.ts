/**
 * Asset list API
 *
 * GET /_cms/api/assets/list
 *   Returns: { assets: [{ name, path, size, modified }] }
 */

import type { APIRoute } from 'astro';
import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg',
]);

export const GET: APIRoute = async () => {
  const assetsDir = resolve('src/assets');

  if (!existsSync(assetsDir)) {
    return json({ assets: [] }, 200);
  }

  const entries = await readdir(assetsDir, { withFileTypes: true });

  const assets = await Promise.all(
    entries
      .filter(e => e.isFile() && IMAGE_EXTENSIONS.has(
        e.name.slice(e.name.lastIndexOf('.')).toLowerCase()
      ))
      .map(async (e) => {
        const stats = await stat(join(assetsDir, e.name));
        return {
          name: e.name,
          path: `/src/assets/${e.name}`,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
  );

  assets.sort((a, b) => b.modified.localeCompare(a.modified));

  return json({ assets }, 200);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
