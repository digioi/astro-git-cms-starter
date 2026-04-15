/**
 * CMS configuration — defines the frontmatter fields exposed in the Rich Editor
 * form inside the gitcms editor UI.
 *
 * Each entry maps to one form control in the rich editor. The `key` must match
 * the frontmatter key used in your .mdx files. Fields not listed here are
 * silently preserved when round-tripping between MDX and Rich editor modes —
 * they will never be shown in the form but they will never be lost either.
 *
 * Field types:
 *   'text'    → <input type="text">
 *   'boolean' → <input type="checkbox">
 *
 * Pass this config to the gitcms integration in astro.config.mjs:
 *   gitcms({ frontmatter: cmsConfig.frontmatter, ... })
 */

export interface FrontmatterField {
  /** The YAML key as it appears in frontmatter (e.g. "title", "draft") */
  key: string;
  /** Human-readable label shown in the rich editor form */
  label: string;
  /** Controls which form input is rendered */
  type: 'text' | 'boolean';
  /** If true, the field will be marked required in the form */
  required?: boolean;
}

export const cmsConfig = {
  frontmatter: [
    { key: 'title',       label: 'Title',       type: 'text',    required: true  },
    { key: 'description', label: 'Description', type: 'text',    required: false },
    { key: 'draft',       label: 'Draft',       type: 'boolean', required: false },
  ],
} satisfies { frontmatter: FrontmatterField[] };
