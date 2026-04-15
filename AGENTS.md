# AGENTS.md

Guidance for AI agents working on this codebase. Read this before making any changes.

---

## What this project is

This is an **Astro-based site generator that uses Git as a CMS**. The core idea:

- Content is stored as `.mdx` files in the `/content` directory
- Git is the source of truth — commits, branches, and PRs are the publishing workflow
- A built-in CMS editor (the `gitcms` integration) lets authors edit MDX files in the browser and save them to disk, where they can be staged and committed via Git
- The design system is token-driven — all visual decisions live in `/config/tokens.ts` and are exposed as CSS custom properties globally

The long-term vision is a CMS where:
1. An editor writes or modifies content in the browser (`/_cms`)
2. Changes are saved as `.mdx` files on disk
3. Git operations (stage, commit, branch, PR) are triggered through the CMS interface
4. The static site is rebuilt on merge — making Git the publish/review workflow

---

## Project structure

```
/
├── astro.config.mjs          # Astro config — integrations registered here
├── config/
│   └── tokens.ts             # Design token definitions (as const, TypeScript)
├── content/                  # MDX content files — this is the CMS data layer
│   └── *.mdx                 # Each file becomes a page at its slug
├── integration/              # The gitcms Astro integration (future npm package)
│   ├── index.ts              # Integration factory — injectRoute, updateConfig
│   └── routes/
│       ├── _cms/             # CMS editor UI routes (/_cms, /_cms/edit/[...slug])
│       │   ├── index.astro   # Content file list
│       │   ├── edit/
│       │   │   └── [...slug].astro  # Side-by-side MDX editor + preview iframe
│       │   └── api/
│       │       └── content/
│       │           └── [...slug].ts # GET/POST file read-write API
│       └── preview/
│           └── [...slug].astro      # Live on-demand MDX preview route
├── public/                   # Static assets
└── src/
    ├── components/           # Design system components
    │   ├── Button.astro      # Example component with variant/size props
    │   └── mdx-components.ts # Central component map exposed to MDX authors
    ├── content.config.ts     # Astro Content Collections schema (Zod)
    ├── layouts/
    │   └── Layout.astro      # Base HTML layout — imports tokens.css globally
    ├── pages/
    │   ├── index.astro       # Homepage — renders content/index.mdx
    │   └── [...slug].astro   # Dynamic route for all other content pages
    └── styles/
        └── tokens.css        # CSS custom properties derived from config/tokens.ts
```

---

## Routing

| URL | Source | Notes |
|-----|--------|-------|
| `/` | `src/pages/index.astro` | Renders `content/index.mdx` via Content Collections |
| `/<slug>` | `src/pages/[...slug].astro` | Renders any other `content/<slug>.mdx`; drafts hidden in production |
| `/preview/<slug>` | `integration/routes/preview/[...slug].astro` | **Dev only** — live on-demand render, reads file from disk on every request |
| `/_cms` | `integration/routes/_cms/index.astro` | **Dev only** — lists all content files |
| `/_cms/edit/<slug>` | `integration/routes/_cms/edit/[...slug].astro` | **Dev only** — MDX editor + preview iframe |
| `/_cms/api/content/<slug>` | `integration/routes/_cms/api/content/[...slug].ts` | **Dev only** — file read/write API |

The `gitcms` integration gates all its routes behind `command !== 'build'`. In production, none of `/_cms` or `/preview` exist.

---

## The gitcms integration

The integration lives at `/integration/index.ts` and is loaded in `astro.config.mjs`:

```js
import { gitcms } from './integration/index.ts';

export default defineConfig({
  integrations: [
    mdx(),
    gitcms({ contentDir: 'content', base: '/_cms' }),
  ],
});
```

**Options:**
- `contentDir` — path to the content directory relative to project root (default: `'content'`)
- `base` — URL base for the CMS UI (default: `'/_cms'`)

**When adding new routes to the integration**, inject them in `integration/index.ts` using `injectRoute()` inside the `command !== 'build'` guard. Route files live in `integration/routes/`.

**The `@gitcms-project` Vite alias** is injected by the integration so that routes inside `integration/routes/` can import from the host project's `src/` directory without brittle relative paths:

```ts
import Layout from '@gitcms-project/layouts/Layout.astro';
import { mdxComponents } from '@gitcms-project/components/mdx-components';
```

**Future extraction**: When this integration is ready to become its own npm package, the `integration/` folder becomes a standalone package. The import in `astro.config.mjs` changes from `'./integration/index.ts'` to `'@scope/gitcms'`. Nothing else changes.

---

## Design tokens

Tokens are defined in `/config/tokens.ts` as a typed `as const` object. They cover color, typography, spacing, radius, shadow, and transitions.

The companion file `/src/styles/tokens.css` mirrors every token as a CSS custom property on `:root`. This file is imported globally in `src/layouts/Layout.astro`.

**Rules:**
- Components must use `var(--token-name)` — never hardcode colors, spacing, or font values
- Token overrides for a specific component are done at the component's own selector scope, not by modifying the global `:root`
- If a new token category is needed, add it to both `config/tokens.ts` and `src/styles/tokens.css` together

---

## Components

### Where they live

- **Astro components** → `src/components/*.astro`
- **React components** → `src/components/react/*.tsx`
- **Other frameworks** → `src/components/<framework>/`

### Compound components

Components that are internal building blocks of a larger component (e.g. a `MenuItem` inside a `Menu`) are **not** added to `mdx-components.ts`. Only top-level, author-facing components are registered there.

### Exposing components to MDX

All components that content authors should be able to use in `.mdx` files must be added to `src/components/mdx-components.ts`:

```ts
import Button from './Button.astro';
import MyNewComponent from './MyNewComponent.astro';

export const mdxComponents = {
  Button,
  MyNewComponent,
} as const;
```

This map is passed as the `components` prop to every `<Content />` render — both in the static routes and the live preview. Adding a component here makes it available everywhere in MDX with no per-file imports required.

### Component API conventions

Components that authors interact with via MDX attributes should use:
- `variant` — for visual style variants (e.g. `primary`, `secondary`)
- `size` — for size variants (e.g. `sm`, `md`, `lg`)
- Avoid exposing raw CSS class or style props — variants keep the design system controlled

---

## Content

### Creating pages

- **Always create content as an MDX file in `/content/`** — do not create new files in `src/pages/`
- The filename (without `.mdx`) becomes the URL slug. `content/about.mdx` → `/about`
- Nested paths work: `content/blog/my-post.mdx` → `/blog/my-post`
- The only exception: if a user has already created a file in `src/pages/`, modifications isolated to that file are acceptable

### Frontmatter schema

Every content file must include at minimum a `title`. All fields:

```yaml
---
title: string        # required
description: string  # optional — used for <meta name="description">
layout: string       # optional — defaults to 'default' (reserved for future layout variants)
draft: boolean       # optional — defaults to false; drafts are hidden in production builds
---
```

### Using components in MDX

All registered components are available without importing:

```mdx
<Button variant="primary" size="md">Click me</Button>
```

---

## Runtime environment

- **Runtime**: Deno in Node compatibility mode (`deno.json` present)
- **Do not use Deno-specific APIs** — use `node:fs`, `node:path`, etc.
- Package management: `deno add npm:<package>` (not `npm install`)
- Astro output mode: `static` with `@astrojs/node` adapter in standalone mode
- `@mdx-js/mdx` and `gray-matter` are marked as Rollup externals — they are runtime-only server dependencies used by the preview route

---

## What is not built yet (planned)

- **Git operations in the CMS** — stage, commit, branch, and PR from the editor UI
- **Role-based access** — protect `/_cms` routes behind auth middleware
- **Structured frontmatter editor** — config-driven form fields instead of raw YAML in the textarea
- **Navigation** — auto-generated nav from the content tree
- **Additional component variants** — only `Button` exists today
- **Token pipeline integration** — `config/tokens.ts` is compatible with Style Dictionary / Token Pipeline but no build step is wired up yet
