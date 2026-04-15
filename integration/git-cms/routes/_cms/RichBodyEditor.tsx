/**
 * RichBodyEditor — MDXEditor island for the gitcms rich editor mode.
 *
 * Communication with the surrounding Astro/vanilla-JS page:
 *   - Reads `window.__gitcmsInitialBody` for the initial markdown value on mount.
 *   - On mount, echoes the initial value back via `gitcms:body-change` so the
 *     save logic has the correct value even if the user saves without editing.
 *   - Listens for `gitcms:set-body` custom events to reset the editor content
 *     (fired when switching from MDX → Rich mode), and echoes the new value back
 *     immediately (setMarkdown does not trigger onChange).
 *   - Fires `gitcms:body-change` on every user edit.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  jsxPlugin,
  GenericJsxEditor,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  toolbarPlugin,
  UndoRedo,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

declare global {
  interface Window {
    __gitcmsInitialBody?: string;
    __gitcmsGetBody?: () => string;
    __gitcmsSetBody?: (markdown: string) => void;
  }
}

interface Props {
  cmsBase?: string;
}

export default function RichBodyEditor({ cmsBase = '/_cms' }: Props) {
  const editorRef = useRef<MDXEditorMethods>(null);

  // Read the initial body that the vanilla JS set on window before this mounts.
  const initialBody = typeof window !== 'undefined'
    ? (window.__gitcmsInitialBody ?? '')
    : '';

  // Expose get/set methods on window so the vanilla JS save logic can
  // read and write the editor content synchronously without relying on events.
  useEffect(() => {
    window.__gitcmsGetBody = () => editorRef.current?.getMarkdown() ?? '';
    window.__gitcmsSetBody = (markdown: string) => {
      editorRef.current?.setMarkdown(markdown);
    };
    return () => {
      delete window.__gitcmsGetBody;
      delete window.__gitcmsSetBody;
    };
  }, []);

  // Every user edit fires gitcms:body-change with the serialized markdown.
  const handleChange = useCallback((markdown: string) => {
    window.dispatchEvent(new CustomEvent('gitcms:body-change', { detail: markdown }));
  }, []);

  // Image upload: POST to the existing asset upload API and return the URL.
  const imageUploadHandler = useCallback(async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${cmsBase}/api/assets/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Upload failed: HTTP ${res.status}`);
    }
    const { path } = await res.json();
    return path as string;
  }, [cmsBase]);

  return (
    <div className="rich-body-editor" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <MDXEditor
        ref={editorRef}
        markdown={initialBody}
        onChange={handleChange}
        className="dark-theme dark-editor"
        contentEditableClassName="rich-body-editor__content"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin({ imageUploadHandler }),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              '':   'Plain text',
              js:   'JavaScript',
              ts:   'TypeScript',
              jsx:  'JSX',
              tsx:  'TSX',
              css:  'CSS',
              html: 'HTML',
              json: 'JSON',
              md:   'Markdown',
              sh:   'Shell',
            },
          }),
          jsxPlugin({
            jsxComponentDescriptors: [
              {
                // Wildcard: match any capitalised JSX tag not otherwise known.
                // MDXEditor preserves the tag name and attributes, and
                // GenericJsxEditor renders a neutral "unknown component" block
                // in the rich editor so the author can still see and move it.
                name: '*',
                kind: 'flow',
                props: [],
                hasChildren: true,
                Editor: GenericJsxEditor,
              },
            ],
          }),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertImage />
                <Separator />
                <InsertTable />
                <InsertThematicBreak />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
}
