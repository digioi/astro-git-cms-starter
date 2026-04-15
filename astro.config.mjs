// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import { gitcms } from './integration/git-cms/index.ts';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    mdx(),
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
