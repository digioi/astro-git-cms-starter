import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export interface GitCMSOptions {
  /**
   * Path to the content directory relative to the project root.
   * Defaults to 'content'.
   */
  contentDir?: string;

  /**
   * Base path for the CMS editor UI.
   * Defaults to '/_cms'.
   */
  base?: string;
}

export function gitcms(options: GitCMSOptions = {}): AstroIntegration {
  const contentDir = options.contentDir ?? 'content';
  const cmsBase = options.base ?? '/_cms';

  return {
    name: 'gitcms',

    hooks: {
      'astro:config:setup': ({ command, config, injectRoute, updateConfig, logger }) => {
        // Only activate in dev mode — completely absent from production builds
        if (command === 'build') {
          logger.info('gitcms: build mode detected, CMS routes disabled.');
          return;
        }

        logger.info(`gitcms: injecting CMS routes at ${cmsBase}`);

        const routesDir = fileURLToPath(new URL('./routes', import.meta.url));

        // Resolve the project's src directory so injected routes can import
        // project files (Layout, mdxComponents) via a stable alias
        const srcDir = fileURLToPath(config.srcDir);

        // CMS index — lists all content files
        injectRoute({
          pattern: cmsBase,
          entrypoint: resolve(routesDir, '_cms/index.astro'),
          prerender: false,
        });

        // Editor — side-by-side MDX editor + preview iframe
        injectRoute({
          pattern: `${cmsBase}/edit/[...slug]`,
          entrypoint: resolve(routesDir, '_cms/edit/[...slug].astro'),
          prerender: false,
        });

        // Content API — read and write MDX files
        injectRoute({
          pattern: `${cmsBase}/api/content/[...slug]`,
          entrypoint: resolve(routesDir, '_cms/api/content/[...slug].ts'),
          prerender: false,
        });

        // Preview route — live on-demand MDX rendering, dev only
        injectRoute({
          pattern: '/preview/[...slug]',
          entrypoint: resolve(routesDir, 'preview/[...slug].astro'),
          prerender: false,
        });

        // Pass config down to the routes via Vite define + alias
        updateConfig({
          vite: {
            resolve: {
              alias: {
                // Allows injected routes to import project src files with a
                // stable path: '@gitcms-project/layouts/Layout.astro' etc.
                '@gitcms-project': srcDir,
              },
            },
            define: {
              'import.meta.env.GITCMS_CONTENT_DIR': JSON.stringify(contentDir),
              'import.meta.env.GITCMS_BASE': JSON.stringify(cmsBase),
            },
            build: {
              rollupOptions: {
                external: ['@mdx-js/mdx', 'gray-matter'],
              },
            },
          },
        });
      },
    },
  };
}
