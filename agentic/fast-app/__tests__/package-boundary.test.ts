// The package runs in the desktop and in a process with no UI (the cloud
// Job). So its sources import only Node, the packages package.json declares
// and the package itself, and reach everything of a host through the hosts
// (pipeline/host.ts, and db-tools' host). This test reads every file of the
// package and fails on any import, Vite-only feature or host-configuration
// read that would tie it to one host.
//
// Ported from the desktop's portable-boundary test: there the portable set was
// a list of desktop folders, here it is the package, and the allowed packages
// are the ones package.json declares.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';

import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');

const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/** The packages the sources may import: the package's dependencies. */
const PACKAGES = new Set(Object.keys(manifest.dependencies ?? {}));
/**
 * pi is the package's peer dependency and ships ES modules only, so the
 * sources take only its types (the CommonJS build never requires it); tests
 * may run it.
 */
const TYPES_ONLY = new Set(['@earendil-works/pi-coding-agent', '@earendil-works/pi-ai']);
/** What the tests use besides: the dev dependencies (this test's parser among them). */
const TEST_PACKAGES = new Set(Object.keys(manifest.devDependencies ?? {}));

/**
 * Environment variables a source may read: a child process's own, never the
 * host's settings. Tests set up their own environment.
 */
const ENV_READS = new Set(['PATH']);

const isTest = (file: string) => file.startsWith(`${path.join(ROOT, '__tests__')}${path.sep}`);

function walk(entry: string): string[] {
  if (!statSync(entry).isDirectory()) return [entry];
  return readdirSync(entry).flatMap((name) => walk(path.join(entry, name)));
}

const roots = ['src', '__tests__'].map((rel) => path.join(ROOT, rel));
const files = roots.flatMap((root) => walk(root)).filter((file) => /\.tsx?$/.test(file));

const inPackage = (file: string) => roots.some((root) => file.startsWith(`${root}${path.sep}`));

// The file a relative import names, as tsc resolves it.
function resolveLocal(from: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
  return candidates.find((file) => existsSync(file) && statSync(file).isFile()) ?? null;
}

const packageOf = (specifier: string) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

type Use = { specifier: string; typeOnly: boolean; line: number };

function importsOf(source: ts.SourceFile): { uses: Use[]; problems: string[] } {
  const uses: Use[] = [];
  const problems: string[] = [];
  const lineOf = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const typeOnly =
        Boolean(clause?.isTypeOnly) ||
        Boolean(
          clause &&
          !clause.name &&
          bindings &&
          ts.isNamedImports(bindings) &&
          bindings.elements.length > 0 &&
          bindings.elements.every((element) => element.isTypeOnly)
        );
      uses.push({ specifier: node.moduleSpecifier.text, typeOnly, line: lineOf(node) });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      uses.push({
        specifier: node.moduleSpecifier.text,
        typeOnly: node.isTypeOnly,
        line: lineOf(node)
      });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      uses.push({ specifier: node.arguments[0].text, typeOnly: false, line: lineOf(node) });
    } else if (ts.isPropertyAccessExpression(node)) {
      const target = node.expression;
      // The package builds to CommonJS, and jest runs it so: no import.meta anywhere.
      if (ts.isMetaProperty(target) && target.keywordToken === ts.SyntaxKind.ImportKeyword) {
        problems.push(`line ${lineOf(node)}: import.meta.${node.name.text}`);
      }
      if (
        ts.isPropertyAccessExpression(target) &&
        ts.isIdentifier(target.expression) &&
        target.expression.text === 'process' &&
        target.name.text === 'env' &&
        !ENV_READS.has(node.name.text) &&
        !isTest(source.fileName)
      ) {
        problems.push(`line ${lineOf(node)}: process.env.${node.name.text} (the host's setting)`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { uses, problems };
}

function checkUse(file: string, use: Use): string | null {
  const { specifier } = use;
  if (specifier.includes('?')) return `${specifier}: a Vite-only import`;
  if (specifier.startsWith('node:') || builtinModules.includes(specifier)) return null;
  if (specifier.startsWith('@/')) return `${specifier}: an alias; use a relative import`;
  if (specifier.startsWith('.')) {
    const target = resolveLocal(file, specifier);
    if (!target) return `${specifier}: no such file`;
    if (!target.endsWith('.json') && !/\.tsx?$/.test(target)) return `${specifier}: not a module`;
    if (!inPackage(target)) return `${specifier}: outside the package`;
    if (!isTest(file) && isTest(target)) return `${specifier}: a source imports a test file`;
    return null;
  }
  const name = packageOf(specifier);
  if (PACKAGES.has(name) || (TEST_PACKAGES.has(name) && isTest(file))) return null;
  if (TYPES_ONLY.has(name)) {
    return use.typeOnly || isTest(file) ? null : `${specifier}: only its types may be imported`;
  }
  return `${specifier}: not a dependency of the package`;
}

test('the package has its sources and tests', () => {
  assert.ok(files.length > 200, `only ${files.length} files found`);
});

test('every file imports only Node, its packages and the package itself', () => {
  const problems = files.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const found = importsOf(source);
    const bad = found.uses.flatMap((use) => {
      const problem = checkUse(file, use);
      return problem ? [`line ${use.line}: ${problem}`] : [];
    });
    return [...bad, ...found.problems].map((line) => `${path.relative(ROOT, file)} ${line}`);
  });
  assert.deepEqual(problems, []);
});
