/**
 * Central MDX component map.
 *
 * Every component exported here is available inside any .mdx file
 * rendered through the [...slug] or preview routes — no per-file imports needed.
 *
 * To add a new component to MDX authoring:
 *   1. Build it in src/components/
 *   2. Import and add it to the `mdxComponents` object below.
 */

import Button from './Button.astro';

export const mdxComponents = {
  Button,
} as const;
