/**
 * Central MDX component map.
 *
 * Every component exported here is available inside any .mdx file
 * rendered through the [...slug] or preview routes — no per-file imports needed.
 *
 * To add a new component to MDX authoring:
 *   1. Build it in src/components/
 *   2. Import and add it to the `mdxComponents` object below.
 *
 */

import Button from './Button.astro';
import Image from './Image.astro';
import UnknownComponent from './UnknownComponent.astro';

/**
 * Factory that returns a version of UnknownComponent with `name` pre-bound.
 * Astro component factories have `isAstroComponentFactory === true` — we
 * preserve that by wrapping the original factory rather than creating a new
 * plain function.
 *
 * @param name    - The unresolved MDX tag name (e.g. "Foobar")
 * @param options - Optional flags; set `preview: true` to enable the
 *                  diagnostic rendering in UnknownComponent.
 */
function makeUnknownComponent(name: string, options: { preview?: boolean } = {}) {
  const { preview = false } = options;
  const wrapper = (...args: Parameters<typeof UnknownComponent>) => {
    // Inject `name` and `preview` into the props object.
    const [result, props, slots] = args as unknown as [unknown, Record<string, unknown>, unknown];
    return (UnknownComponent as Function)(result, { ...props, name, preview }, slots);
  };
  // Copy all properties from the original factory so Astro's renderer
  // recognises it as an Astro component (isAstroComponentFactory, etc.).
  Object.assign(wrapper, UnknownComponent);
  return wrapper;
}

export const mdxComponents = {
  Button,
  Image,
  __unknownComponent: makeUnknownComponent,
} as const;

/**
 * Component map for the /preview route.
 * Identical to mdxComponents except unknown tags render a visible diagnostic
 * block instead of silently stripping the tag.
 */
export const previewMdxComponents = {
  ...mdxComponents,
  __unknownComponent: (name: string) => makeUnknownComponent(name, { preview: true }),
} as const;
