/**
 * Bundle size analysis script
 *
 * Builds the app with Rollup's generateBundle hook to capture per-module sizes,
 * then groups them by category (generated hooks, ORM, vendor libs, app code).
 *
 * Usage: tsx scripts/analyze-bundle.ts
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { gzipSync, brotliCompressSync } from 'node:zlib';

interface ModuleInfo {
  originalLength: number;
  renderedLength: number;
  removedExports: string[];
  code: string | null;
}

interface ChunkInfo {
  name: string;
  size: number;
  gzip: number;
  brotli: number;
  modules: Record<string, ModuleInfo>;
}

const chunks: ChunkInfo[] = [];

const result = await build({
  configFile: false,
  plugins: [
    react(),
    {
      name: 'capture-bundle-stats',
      generateBundle(_options, bundle) {
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type !== 'chunk') continue;
          const code = Buffer.from(chunk.code);
          chunks.push({
            name: fileName,
            size: code.length,
            gzip: gzipSync(code).length,
            brotli: brotliCompressSync(code).length,
            modules: chunk.modules as Record<string, ModuleInfo>,
          });
        }
      },
    },
  ],
  build: {
    write: false,
    minify: 'esbuild',
  },
  logLevel: 'silent',
});

// Categorize modules
interface Category {
  label: string;
  test: (id: string) => boolean;
}

const categories: Category[] = [
  { label: 'Generated Hooks', test: (id) => id.includes('generated/hooks') },
  { label: 'Generated ORM', test: (id) => id.includes('generated/orm') },
  { label: 'Generated Types', test: (id) => id.includes('generated/') && (id.includes('types.ts') || id.includes('schema-types')) },
  { label: 'React', test: (id) => /node_modules\/(react|react-dom|scheduler)\//.test(id) },
  { label: 'React Query', test: (id) => id.includes('@tanstack/react-query') },
  { label: 'GraphQL (graphql.web + gql-ast)', test: (id) => id.includes('@0no-co/graphql.web') || id.includes('gql-ast') },
  { label: 'GraphQL (graphql 15)', test: (id) => id.includes('node_modules/graphql') },
  { label: 'App Code', test: (id) => !id.includes('node_modules') && !id.includes('generated/') },
];

const catSizes: Record<string, { original: number; rendered: number }> = {};
let uncategorized = 0;

for (const chunk of chunks) {
  for (const [moduleId, info] of Object.entries(chunk.modules)) {
    let matched = false;
    for (const cat of categories) {
      if (cat.test(moduleId)) {
        if (!catSizes[cat.label]) catSizes[cat.label] = { original: 0, rendered: 0 };
        catSizes[cat.label].original += info.originalLength;
        catSizes[cat.label].rendered += info.renderedLength;
        matched = true;
        break;
      }
    }
    if (!matched) {
      uncategorized += info.renderedLength;
    }
  }
}

// Output
console.log('\n========================================');
console.log('  BUNDLE SIZE ANALYSIS');
console.log('========================================\n');

const totalChunk = chunks[0];
if (totalChunk) {
  const fmt = (n: number) => (n / 1024).toFixed(1) + ' KB';
  console.log(`Total bundle: ${fmt(totalChunk.size)} minified | ${fmt(totalChunk.gzip)} gzip | ${fmt(totalChunk.brotli)} brotli\n`);
}

console.log('By category (rendered/minified size in bundle):');
console.log('─'.repeat(60));

const sorted = Object.entries(catSizes).sort((a, b) => b[1].rendered - a[1].rendered);
const totalRendered = sorted.reduce((sum, [, v]) => sum + v.rendered, 0) + uncategorized;

for (const [label, { original, rendered }] of sorted) {
  const pct = ((rendered / totalRendered) * 100).toFixed(1);
  const pad = label.padEnd(35);
  const renderedKB = (rendered / 1024).toFixed(1).padStart(8);
  const originalKB = (original / 1024).toFixed(1).padStart(8);
  console.log(`  ${pad} ${renderedKB} KB  (${pct.padStart(5)}%)   source: ${originalKB} KB`);
}

if (uncategorized > 0) {
  const pct = ((uncategorized / totalRendered) * 100).toFixed(1);
  console.log(`  ${'Other'.padEnd(35)} ${(uncategorized / 1024).toFixed(1).padStart(8)} KB  (${pct.padStart(5)}%)`);
}

console.log('─'.repeat(60));
console.log(`  ${'TOTAL'.padEnd(35)} ${(totalRendered / 1024).toFixed(1).padStart(8)} KB\n`);

// Tree-shaking effectiveness
const hooksSource = catSizes['Generated Hooks'];
const ormSource = catSizes['Generated ORM'];
if (hooksSource || ormSource) {
  console.log('Tree-shaking effectiveness:');
  console.log('─'.repeat(60));
  if (hooksSource) {
    const ratio = ((1 - hooksSource.rendered / hooksSource.original) * 100).toFixed(1);
    console.log(`  Hooks:  ${(hooksSource.original / 1024).toFixed(0)} KB source → ${(hooksSource.rendered / 1024).toFixed(1)} KB in bundle  (${ratio}% eliminated)`);
  }
  if (ormSource) {
    const ratio = ((1 - ormSource.rendered / ormSource.original) * 100).toFixed(1);
    console.log(`  ORM:    ${(ormSource.original / 1024).toFixed(0)} KB source → ${(ormSource.rendered / 1024).toFixed(1)} KB in bundle  (${ratio}% eliminated)`);
  }
  console.log('');
}

// Module count
let totalModules = 0;
let generatedModules = 0;
for (const chunk of chunks) {
  for (const moduleId of Object.keys(chunk.modules)) {
    totalModules++;
    if (moduleId.includes('generated/')) generatedModules++;
  }
}
console.log(`Modules: ${totalModules} total, ${generatedModules} generated (${(totalModules - generatedModules)} vendor/app)\n`);
