// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import { gitcms } from './integration/git-cms/index.ts';
import { recmaUnknownComponents } from './integration/git-cms/recma-unknown-components.js';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    mdx({ recmaPlugins: [recmaUnknownComponents] }),
    gitcms({ contentDir: 'content', base: '/_cms' }),
  ],
  vite: {
    build: {
      rollupOptions: {
        external: ['@mdx-js/mdx', 'gray-matter'],
      },
    },
  },
});
