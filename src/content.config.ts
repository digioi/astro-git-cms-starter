import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './content' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    layout: z.string().optional().default('default'),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { pages };
