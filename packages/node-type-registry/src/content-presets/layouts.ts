import type { PagesPreset } from './types';

/**
 * The one layout a site is worth being born with: chrome around its pages.
 *
 * A layout is a page whose content is a block document with a `Slot` in it,
 * stored at the reserved `_layout/default` path — reserved because a request path
 * always begins with `/` and this one does not, so the template is addressable by
 * the page API and by the renderer and by nothing arriving over HTTP. Pages that
 * name no layout are served in it; a page naming another one gets that one or a
 * refusal.
 *
 * Deliberately one preset rather than a set. The value of shipping a layout at
 * all is that a site has something real to author over — a document a tenant can
 * read, edit and publish through the same page API as its prose, instead of a
 * template compiled into the image. That argument is satisfied by one; a
 * `login`/`marketing`/`app` trio would be three guesses at product decisions
 * nobody has made, each of which a tenant would have to delete.
 *
 * What it deliberately does not carry:
 *   - no `meta.robots`: served pages default to `noindex`, and a preset that
 *     flipped a site to indexable as a side effect of installing chrome would
 *     make crawlability an accident;
 *   - no `meta.title`/`description`: those are the page's to state, and a layout
 *     stating them would put the same title on every page that omitted one;
 *   - no class names beyond the semantic ones: there is no stylesheet served with
 *     documents yet, so Tailwind/shadcn classes here would name CSS that never
 *     arrives.
 *
 * The masthead reads `{{ site.title }}` rather than a name, which is what makes
 * one layout serve every tenant: the binding is resolved while rendering,
 * against the site being served, so the seeded document is identical everywhere
 * and correct everywhere.
 */
export const layouts: PagesPreset = {
  kind: 'pages',
  slug: 'layouts',
  label: 'Default page layout',
  description:
    'The starter template a site serves its pages in: a block document with a content slot, stored at the reserved _layout/default page so it is versioned and published exactly like the pages it wraps. Pages that name no layout are served in it — edit it through the page API to change the chrome of every such page.',
  pages: [
    {
      path: '_layout/default',
      kind: 'block_document',
      title: 'Default layout',
      document: {
        formatVersion: '1.0',
        type: 'UISchema',
        id: 'layout-default',
        page: {
          type: 'Page',
          key: 'shell',
          props: {},
          children: [
            {
              type: 'Section',
              key: 'masthead',
              props: { className: 'masthead' },
              // The tenant's own name, resolved per render rather than seeded.
              children: [
                {
                  type: 'Markdown',
                  key: 'brand',
                  props: {},
                  bindings: { content: '{{ site.title }}' },
                  children: []
                }
              ]
            },
            // Where the page goes. A slot nothing fills renders its own
            // children, so the fallback text below is what a layout served with
            // no page in it says — a visible statement rather than a blank page.
            {
              type: 'Slot',
              key: 'content',
              props: { name: 'content' },
              children: [
                {
                  type: 'Markdown',
                  key: 'content-empty',
                  props: { content: 'This layout is serving no page content.' },
                  children: []
                }
              ]
            }
          ]
        }
      }
    }
  ]
};
