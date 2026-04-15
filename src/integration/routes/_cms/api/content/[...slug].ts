/**
 * Content API — read and write MDX files in the content directory.
 *
 * GET  /_cms/api/content/<slug>  → returns raw MDX file contents
 * POST /_cms/api/content/<slug>  → writes body as the new file contents
 */

import type { APIRoute } from 'astro';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

function getContentPath(slug: string): string {
  const contentDir = import.meta.env.GITCMS_CONTENT_DIR ?? 'content';
  const contentRoot = resolve(contentDir);
  return join(contentRoot, `${slug}.mdx`);
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filePath = getContentPath(slug);

  if (!existsSync(filePath)) {
    return new Response(JSON.stringify({ error: 'File not found', slug }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const content = await readFile(filePath, 'utf-8');

  return new Response(JSON.stringify({ slug, content }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ params, request }) => {
  const slug = params.slug;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as { content?: string };

  if (typeof body.content !== 'string') {
    return new Response(JSON.stringify({ error: 'body.content must be a string' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filePath = getContentPath(slug);

  // Ensure any nested directories exist (e.g. content/blog/my-post.mdx)
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(filePath, body.content, 'utf-8');

  return new Response(JSON.stringify({ ok: true, slug }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
