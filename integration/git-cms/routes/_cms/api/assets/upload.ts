/**
 * Asset upload API
 *
 * POST /_cms/api/assets/upload
 *   Body: multipart/form-data with a `file` field
 *   Returns: { ok: true, path: "/src/assets/filename.ext" }
 *
 * GET  /_cms/api/assets/upload  (used as /_cms/api/assets/list — see list route)
 *   Not used here; kept as a 405 guard.
 *
 * Files are written to src/assets/ so Astro's build-time image
 * optimisation pipeline can process them. This is intentional —
 * see AGENTS.md for the rationale.
 */

import type { APIRoute } from 'astro';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { Buffer } from 'node:buffer';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return json({ error: 'Expected multipart/form-data' }, 400);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'Failed to parse form data' }, 400);
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return json({ error: 'No file field in form data' }, 400);
  }

  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return json({ error: `File type not allowed: ${ext}` }, 415);
  }

  if (file.size > MAX_SIZE_BYTES) {
    return json({ error: 'File exceeds 10 MB limit' }, 413);
  }

  // Sanitise filename: lowercase, replace spaces/unsafe chars with hyphens
  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-');

  const assetsDir = resolve('src/assets');
  if (!existsSync(assetsDir)) {
    await mkdir(assetsDir, { recursive: true });
  }

  const destPath = join(assetsDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destPath, buffer);

  // Return the path as it would be used in an MDX <Image> component
  const publicPath = `/src/assets/${safeName}`;

  return json({ ok: true, name: safeName, path: publicPath }, 200);
};

export const GET: APIRoute = () => {
  return json({ error: 'Use POST to upload a file' }, 405);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
