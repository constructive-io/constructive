import { resolve } from 'path';

import { RoleMapping } from '@pgpmjs/types';
import { CompiledExtensionInstall, compileExtensionInstall, CompileExtensionInstallOptions } from './compile';
import { ExtensionProvide, readExtensionsManifest } from './manifest';

/**
 * Build a grant role-name map (workspace portability profile) from the
 * configured {@link RoleMapping}. Keys are the conceptual role names a module
 * author writes in its manifest (`anonymous`/`authenticated`/`administrator`);
 * values are the actual role names for this database.
 */
export function roleMapFromRoles(roles?: RoleMapping): Record<string, string> | undefined {
  if (!roles) return undefined;
  const map: Record<string, string> = {};
  for (const key of ['anonymous', 'authenticated', 'administrator', 'authenticatedClient'] as const) {
    const value = roles[key];
    if (value) map[key] = value;
  }
  return Object.keys(map).length > 0 ? map : undefined;
}

/**
 * Find a declarative install for an external extension by scanning the resolved
 * local modules for an `extensions.json` that `provides` it, and compiling it.
 *
 * Returns `undefined` when no module declares the extension — the caller then
 * falls back to the legacy `CREATE EXTENSION ... CASCADE` (no schema, no grants).
 * The first declaring module wins; a later contradictory declaration throws.
 */
export function findExtensionInstall(
  extname: string,
  localModules: string[],
  modules: Record<string, { path: string }>,
  workspacePath: string,
  options: CompileExtensionInstallOptions = {}
): CompiledExtensionInstall | undefined {
  let winner: { moduleName: string; provide: ExtensionProvide } | undefined;

  for (const moduleName of localModules) {
    const mod = modules[moduleName];
    if (!mod) continue;
    const manifest = readExtensionsManifest(resolve(workspacePath, mod.path));
    const provide = manifest?.provides?.[extname];
    if (!provide) continue;

    if (winner && !sameProvide(winner.provide, provide)) {
      throw new Error(
        `Conflicting extensions.json "provides" for "${extname}": ` +
          `module "${winner.moduleName}" and module "${moduleName}" declare incompatible ` +
          `install schema/grants. Exactly one provider (or identical declarations) is required.`
      );
    }
    if (!winner) winner = { moduleName, provide };
  }

  return winner ? compileExtensionInstall(extname, winner.provide, options) : undefined;
}

/** Structural equality of two provide declarations (order-insensitive grants). */
function sameProvide(a: ExtensionProvide, b: ExtensionProvide): boolean {
  return normalizeProvide(a) === normalizeProvide(b);
}

function normalizeProvide(p: ExtensionProvide): string {
  const grants = (p.grants ?? [])
    .map(g => ({
      privileges: g.privileges,
      on: g.on,
      to: (Array.isArray(g.to) ? [...g.to] : [g.to]).sort()
    }))
    .sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  return JSON.stringify({
    schema: p.schema ?? null,
    relocatable: p.relocatable ?? null,
    ifNotExists: p.ifNotExists ?? null,
    cascade: p.cascade ?? null,
    createSchema: p.createSchema ?? null,
    dropSchema: p.dropSchema ?? null,
    grants
  });
}
