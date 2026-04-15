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
 * Unknown capitalised tags (e.g. a typo like <Images>) are caught by the
 * recmaUnknownComponents plugin at compile time. The plugin rewrites each
 * unknown lookup to `__unknownComponent("TagName")`, calling this factory
 * with the tag name. The factory returns an Astro component (by cloning
 * UnknownComponent's factory and binding `name` as a default prop) so that
 * Astro's renderer accepts it and the component can display the tag name in
 * the /preview warning label.
 */

import Button from './Button.astro';
import Image from './Image.astro';
import UnknownComponent from './UnknownComponent.astro';

/**
 * Factory that returns a version of UnknownComponent with `name` pre-bound.
 * Astro component factories have `isAstroComponentFactory === true` — we
 * preserve that by wrapping the original factory rather than creating a new
 * plain function.
 */
function makeUnknownComponent(name: string) {
  const wrapper = (...args: Parameters<typeof UnknownComponent>) => {
    // Inject `name` into the first argument (the props object).
    const [result, props, slots] = args as [unknown, Record<string, unknown>, unknown];
    return (UnknownComponent as Function)(result, { ...props, name }, slots);
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
