/**
 * ORM types for computed fields: a field that takes arguments and/or returns
 * an object type cannot be selected as `field: true`.
 */
import { generateInputTypesFile } from '../../core/codegen/orm/input-types-generator';
import type { Table, TypeRef, TypeRegistry } from '../../types/schema';

const ref = (kind: TypeRef['kind'], name: string | null, ofType?: TypeRef): TypeRef => ({
  kind,
  name,
  ofType,
});

const assetTable: Table = {
  name: 'Asset',
  fields: [
    { name: 'id', type: { gqlType: 'UUID', isArray: false } },
    { name: 'filename', type: { gqlType: 'String', isArray: false } },
    {
      name: 'uploadUrl',
      type: { gqlType: 'String', isArray: false },
      args: [{ name: 'width', type: ref('SCALAR', 'Int'), isRequired: false }],
    },
    { name: 'uploadVersions', type: { gqlType: 'AssetVersion', isArray: true } },
    {
      name: 'uploadVersion',
      type: { gqlType: 'AssetVersion', isArray: false },
      args: [{ name: 'name', type: ref('SCALAR', 'String'), isRequired: true }],
    },
  ],
  relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
  query: {
    all: 'assets',
    one: 'asset',
    create: null,
    update: 'updateAsset',
    delete: 'deleteAsset',
  },
};

const registry: TypeRegistry = new Map([
  [
    'AssetPatch',
    {
      kind: 'INPUT_OBJECT',
      name: 'AssetPatch',
      inputFields: [{ name: 'filename', type: ref('SCALAR', 'String') }],
    },
  ],
  [
    'AssetVersion',
    {
      kind: 'OBJECT',
      name: 'AssetVersion',
      fields: [
        { name: 'url', type: ref('NON_NULL', null, ref('SCALAR', 'String')) },
        { name: 'width', type: ref('SCALAR', 'Int') },
      ],
    },
  ],
]);

const normalize = (code: string): string => code.replace(/\s+/g, ' ');

describe('ORM types for computed fields', () => {
  const content = normalize(
    generateInputTypesFile(registry, new Set(), [assetTable]).content,
  );
  const selectStart = content.indexOf('export type AssetSelect = {');
  const selectType = content.slice(
    selectStart,
    content.indexOf('export ', selectStart + 1),
  );

  it('types a field with arguments as { args, select? }', () => {
    expect(selectType).toContain(
      'uploadUrl?: { args: { width?: number; }; select?: Record<string, boolean>; };',
    );
  });

  it('requires a sub-selection for a field returning an object type', () => {
    expect(selectType).toContain('uploadVersions?: { select: AssetVersionSelect; };');
    expect(selectType).not.toContain('uploadVersions?: boolean');
    expect(selectType).toContain(
      'uploadVersion?: { args: { name: string; }; select: AssetVersionSelect; };',
    );
  });

  it('emits the object type and its Select type instead of an unknown alias', () => {
    expect(content).toContain('export interface AssetVersion {');
    expect(content).toContain('export type AssetVersionSelect = {');
    expect(content).not.toContain('export type AssetVersion = unknown');
  });

  it('keeps computed fields out of the patch type', () => {
    const patch = content.slice(
      content.indexOf('export interface AssetPatch {'),
      content.indexOf('}', content.indexOf('export interface AssetPatch {')),
    );
    expect(patch).toContain('filename?:');
    expect(patch).not.toContain('uploadUrl');
    expect(patch).not.toContain('uploadVersions');
  });
});
