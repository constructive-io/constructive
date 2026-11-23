/**
 * Typed map keys for object and sub-object identities. Keys are built and
 * read through these functions only — never assembled from delimiters and
 * never parsed with `split()` — so a key's parts cannot drift from the
 * identity they encode.
 */
import type { ObjectIdentity as NamingIdentity } from '@pgpmjs/naming-spec';
import type { ObjectIdentity } from '@pgsql/transform';

/** Map key for an object identity (kind + schema + table + name). */
export const objectKeyOf = (id: ObjectIdentity): string =>
  JSON.stringify([id.kind, id.schema ?? null, id.table ?? null, id.name]);

/** A sub-object (column / constraint) of a table, as a change group key. */
export type SubObjectKey = Pick<NamingIdentity, 'kind' | 'schema' | 'table' | 'name'>;

export const subObjectKeyOf = (sub: SubObjectKey): string =>
  JSON.stringify(['sub', sub.kind, sub.schema ?? null, sub.table ?? null, sub.name]);

/** Where an undeployed delta atom groups: its object unit, an alteration of it, or an added change. */
export type UnitRef =
  | { kind: 'object'; key: string }
  | { kind: 'alteration'; key: string; name: string }
  | { kind: 'added'; name: string };

export const unitKeyOf = (ref: UnitRef): string =>
  ref.kind === 'object' ? ref.key : JSON.stringify([ref.kind, 'key' in ref ? ref.key : null, ref.name]);
