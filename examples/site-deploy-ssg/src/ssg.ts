/**
 * A deliberately tiny static site generator.
 *
 * Its only job is to produce a directory of files so the deploy half of the
 * example is the interesting half: `@constructive-io/site-deploy` takes any
 * build output, so a real example needs a real build, not a fixture.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';

export interface Page {
  /** Source slug, e.g. `about` — becomes `about.html`. */
  slug: string;
  title: string;
  /** Body markup, already HTML. */
  body: string;
}

const STYLESHEET = `:root { color-scheme: light dark; --fg: #101418; --accent: #2f6feb; }
* { box-sizing: border-box; }
body {
  margin: 0 auto;
  padding: 3rem 1.25rem;
  max-width: 44rem;
  font: 16px/1.65 ui-sans-serif, system-ui, sans-serif;
  color: var(--fg);
}
nav a { margin-right: 1rem; color: var(--accent); text-decoration: none; }
nav a:hover { text-decoration: underline; }
footer { margin-top: 3rem; font-size: 0.85rem; opacity: 0.7; }
code { background: rgba(127, 127, 127, 0.16); padding: 0.1rem 0.3rem; border-radius: 3px; }
`;

/** Wraps a page body in the site layout. */
export function renderPage(page: Page, pages: Page[], banner?: string): string {
  const nav = pages
    .map((p) => `<a href="/${p.slug === 'index' ? '' : `${p.slug}.html`}">${p.title}</a>`)
    .join('\n      ');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${page.title}</title>
    <link rel="stylesheet" href="/assets/site.css" />
  </head>
  <body>
    <nav>
      ${nav}
    </nav>
    <main>
      <h1>${page.title}</h1>
      ${page.body}
    </main>
    <footer>${banner ?? 'Built with the site-deploy example SSG.'}</footer>
  </body>
</html>
`;
}

/**
 * Reads `content/*.html` fragments, wraps each in the layout and writes the
 * build to `outDir`. The first line of a fragment is its title.
 */
export async function buildSite(
  contentDir: string,
  outDir: string,
  options: { banner?: string } = {},
): Promise<string[]> {
  const entries = (await readdir(contentDir)).filter((name) => name.endsWith('.html')).sort();
  const pages: Page[] = [];
  for (const entry of entries) {
    const raw = await readFile(join(contentDir, entry), 'utf8');
    const [titleLine, ...rest] = raw.split('\n');
    pages.push({
      slug: entry.replace(/\.html$/, ''),
      title: titleLine.replace(/^#\s*/, '').trim(),
      body: rest.join('\n').trim(),
    });
  }
  // `index` first so it leads the nav.
  pages.sort((a, b) => (a.slug === 'index' ? -1 : b.slug === 'index' ? 1 : a.slug.localeCompare(b.slug)));

  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'assets'), { recursive: true });

  const written: string[] = [];
  for (const page of pages) {
    const file = `${page.slug}.html`;
    await writeFile(join(outDir, file), renderPage(page, pages, options.banner));
    written.push(file);
  }
  await writeFile(join(outDir, 'assets', 'site.css'), STYLESHEET);
  written.push('assets/site.css');
  await writeFile(
    join(outDir, '404.html'),
    renderPage({ slug: '404', title: 'Not found', body: '<p>No page at that path.</p>' }, pages, options.banner),
  );
  written.push('404.html');
  return written.sort();
}
