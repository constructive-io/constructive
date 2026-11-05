/**
 * Annotations are statements that decorate an object without defining it:
 * COMMENT ON, GRANT/REVOKE, OWNER TO and ALTER DEFAULT PRIVILEGES. They are
 * modeled as keyed state (comment text per target, privilege set per
 * grantee, owner per object) so two sides diff to the exact GRANT/REVOKE/
 * COMMENT/OWNER statements — and their inverses — instead of invalidating the
 * whole object. Builders work at the AST level and deparse once.
 */
import { cleanTree } from '@pgsql/transform';
import { Deparser } from 'plpgsql-parser';

type Node = Record<string, unknown>;

/** JSON with recursively sorted object keys — an insertion-order-proof key. */
export function stablePrint(node: unknown): string {
  if (Array.isArray(node)) return `[${node.map(stablePrint).join(',')}]`;
  if (node && typeof node === 'object') {
    const entries = Object.entries(node as Node)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stablePrint(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(node);
}

const deparse = (node: Node): string => `${Deparser.deparse(node as any, { pretty: false })};`;

export interface AnnotationState {
  /** `${objtype}:${object}` → CommentStmt fields (comment undefined = none). */
  comments: Map<string, { objtype: string; object: unknown; comment?: string }>;
  /**
   * `${objtype}:${objects}:${grantee}` → privilege tokens held (`select`,
   * `insert*` for WITH GRANT OPTION, `all`) and `-token` for privileges
   * explicitly revoked (e.g. pg_dump's `REVOKE ALL ... FROM PUBLIC`).
   */
  grants: Map<string, { objtype: string; objects: unknown; grantee: unknown; privs: Set<string> }>;
  /** `${objtype}:${object}` → OWNER TO statement template with its RoleSpec. */
  owners: Map<string, { template: Node; owner: unknown }>;
  /** `${options}:${objtype}:${grantee}` → default-privilege tokens (same scheme as grants). */
  defaultPrivileges: Map<string, { options: unknown; objtype: string; grantee: unknown; privs: Set<string> }>;
}

export const emptyAnnotations = (): AnnotationState => ({
  comments: new Map(),
  grants: new Map(),
  owners: new Map(),
  defaultPrivileges: new Map()
});

const privTokens = (action: Node): string[] => {
  const privileges = action.privileges as { AccessPriv?: { priv_name?: string; cols?: unknown[] } }[] | undefined;
  if (!privileges || privileges.length === 0) return ['all'];
  return privileges.map(p => {
    const name = p.AccessPriv?.priv_name ?? 'all';
    const cols = p.AccessPriv?.cols;
    return cols && cols.length > 0 ? `${name}(${stablePrint(cleanTree(cols))})` : name;
  });
};

const applyAction = (privs: Set<string>, action: Node): void => {
  const isGrant = Boolean(action.is_grant);
  const option = Boolean(action.grant_option);
  for (const token of privTokens(action)) {
    const held = option ? `${token}*` : token;
    if (isGrant) {
      privs.delete(`-${token}`);
      privs.add(held);
    } else if (privs.has(token) || privs.has(`${token}*`)) {
      privs.delete(token);
      privs.delete(`${token}*`);
    } else {
      privs.add(`-${token}`);
    }
  }
};

/**
 * Fold one statement into the state. Returns false when the statement is
 * not an annotation (the caller keeps it as part of the object definition).
 */
export function absorbAnnotation(state: AnnotationState, stmt: Node): boolean {
  if (stmt.CommentStmt) {
    const c = stmt.CommentStmt as { objtype: string; object: unknown; comment?: string };
    const object = cleanTree(c.object);
    state.comments.set(`${c.objtype}:${stablePrint(object)}`, { objtype: c.objtype, object, comment: c.comment });
    return true;
  }
  if (stmt.GrantStmt) {
    const g = stmt.GrantStmt as Node;
    if (g.targtype !== 'ACL_TARGET_OBJECT') return false;
    const objects = cleanTree(g.objects);
    for (const grantee of (g.grantees as unknown[]) ?? []) {
      const clean = cleanTree(grantee);
      const key = `${g.objtype}:${stablePrint(objects)}:${stablePrint(clean)}`;
      const entry = state.grants.get(key) ?? { objtype: g.objtype as string, objects, grantee: clean, privs: new Set<string>() };
      applyAction(entry.privs, g);
      state.grants.set(key, entry);
    }
    return true;
  }
  if (stmt.AlterDefaultPrivilegesStmt) {
    const d = stmt.AlterDefaultPrivilegesStmt as { options?: { DefElem?: { defname?: string } }[]; action: Node };
    const options = cleanTree(d.options ?? []) as { DefElem?: { defname?: string } }[];
    // `FOR ROLE <current role>` is how pg_dump spells the implicit target role;
    // the key ignores it so a module compares equal to its catalog rendering.
    const keyOptions = options.filter(o => o.DefElem?.defname !== 'roles');
    for (const grantee of (d.action.grantees as unknown[]) ?? []) {
      const clean = cleanTree(grantee);
      const key = `${stablePrint(keyOptions)}:${d.action.objtype}:${stablePrint(clean)}`;
      const entry = state.defaultPrivileges.get(key)
        ?? { options, objtype: d.action.objtype as string, grantee: clean, privs: new Set<string>() };
      applyAction(entry.privs, d.action);
      state.defaultPrivileges.set(key, entry);
    }
    return true;
  }
  if (stmt.AlterOwnerStmt) {
    const o = stmt.AlterOwnerStmt as { objectType: string; object?: unknown; relation?: unknown; newowner: unknown };
    const target = cleanTree(o.object ?? o.relation);
    state.owners.set(`${o.objectType}:${stablePrint(target)}`, {
      template: { AlterOwnerStmt: { ...cleanTree(o), newowner: undefined } },
      owner: cleanTree(o.newowner)
    });
    return true;
  }
  if (stmt.AlterTableStmt) {
    const at = stmt.AlterTableStmt as { relation: unknown; objtype: string; cmds?: { AlterTableCmd?: Node }[] };
    const cmds = at.cmds ?? [];
    if (cmds.length === 1 && cmds[0].AlterTableCmd?.subtype === 'AT_ChangeOwner') {
      const relation = cleanTree(at.relation);
      state.owners.set(`${at.objtype}:${stablePrint(relation)}`, {
        template: { AlterTableStmt: { relation, objtype: at.objtype, cmds: [{ AlterTableCmd: { subtype: 'AT_ChangeOwner', behavior: 'DROP_RESTRICT' } }] } },
        owner: cleanTree(cmds[0].AlterTableCmd.newowner)
      });
      return true;
    }
  }
  return false;
}

export interface AnnotationStep {
  sql: string;
  inverse: string;
  /** Set when the inverse cannot be derived (names the gap). */
  incomplete?: string;
}

const grantNode = (isGrant: boolean, objtype: string, objects: unknown, tokens: string[], grantee: unknown): Node => {
  const option = tokens.some(t => t.endsWith('*'));
  const names = tokens.map(t => t.replace(/\*$/, ''));
  const privileges = names.includes('all')
    ? undefined
    : names.map(n => {
      const m = /^([a-z_ ]+)\((.*)\)$/.exec(n);
      return m
        ? { AccessPriv: { priv_name: m[1], cols: JSON.parse(m[2].replace(/\]$/, ']')) } }
        : { AccessPriv: { priv_name: n } };
    });
  return {
    GrantStmt: {
      is_grant: isGrant || undefined,
      targtype: 'ACL_TARGET_OBJECT',
      objtype,
      objects,
      privileges,
      grantees: [grantee],
      grant_option: isGrant && option ? true : undefined,
      behavior: 'DROP_RESTRICT'
    }
  };
};

const defaultPrivilegesNode = (isGrant: boolean, options: unknown, objtype: string, tokens: string[], grantee: unknown): Node => {
  const grant = grantNode(isGrant, objtype, undefined, tokens, grantee).GrantStmt as Node;
  return {
    AlterDefaultPrivilegesStmt: {
      options,
      action: { ...grant, targtype: 'ACL_TARGET_DEFAULTS', objects: undefined }
    }
  };
};

/**
 * Privileges PUBLIC holds by default (what an explicit REVOKE .. FROM PUBLIC
 * actually takes away). Per the GRANT docs: none on tables, columns,
 * sequences, schemas, foreign servers/wrappers, large objects, tablespaces or
 * parameters; CONNECT and TEMPORARY on databases; EXECUTE on functions and
 * procedures; USAGE on languages and types (including domains).
 */
const PUBLIC_DEFAULT_PRIVILEGES: Record<string, string[]> = {
  OBJECT_DATABASE: ['connect', 'temporary'],
  OBJECT_FUNCTION: ['execute'],
  OBJECT_PROCEDURE: ['execute'],
  OBJECT_ROUTINE: ['execute'],
  OBJECT_TYPE: ['usage'],
  OBJECT_DOMAIN: ['usage'],
  OBJECT_LANGUAGE: ['usage']
};

const isPublicRole = (grantee: unknown): boolean =>
  (grantee as { RoleSpec?: { roletype?: string } } | undefined)?.RoleSpec?.roletype === 'ROLESPEC_PUBLIC';

/**
 * Privilege-set delta as GRANT/REVOKE statements with exact inverses.
 * `-token` entries are explicit revocations: adding one is a REVOKE (once, even
 * when the same token was also held); dropping one only re-grants what the
 * grantee holds by default (PUBLIC on functions/types/databases), since no
 * grant existed. The inverse of an added revoke restores exactly that default,
 * never ALL: a revoke of a privilege nobody held has nothing to put back.
 */
function diffPrivileges(
  from: Set<string>,
  to: Set<string>,
  build: (isGrant: boolean, tokens: string[]) => Node,
  objtype: string,
  grantee: unknown
): AnnotationStep[] {
  const steps: AnnotationStep[] = [];
  const positive = (set: Set<string>): string[] => [...set].filter(t => !t.startsWith('-')).sort();
  const negative = (set: Set<string>): string[] => [...set].filter(t => t.startsWith('-')).map(t => t.slice(1)).sort();
  const fromPos = positive(from);
  const toPos = positive(to);
  const granted = toPos.filter(t => !fromPos.includes(t));
  const revoked = fromPos.filter(t => !toPos.includes(t));
  const fromNeg = negative(from);
  const toNeg = negative(to);
  const newlyRevoked = toNeg.filter(t => !fromNeg.includes(t) && !revoked.includes(t));
  const byDefault = isPublicRole(grantee) ? PUBLIC_DEFAULT_PRIVILEGES[objtype] ?? [] : [];
  const heldByDefault = (tokens: string[]): string[] => tokens.includes('all') ? byDefault : tokens.filter(t => byDefault.includes(t));
  const unrevoked = heldByDefault(fromNeg.filter(t => !toNeg.includes(t) && !granted.includes(t)));
  if (revoked.length > 0) {
    steps.push({ sql: deparse(build(false, revoked)), inverse: deparse(build(true, revoked)) });
  }
  if (granted.length > 0) {
    steps.push({ sql: deparse(build(true, granted)), inverse: deparse(build(false, granted)) });
  }
  if (newlyRevoked.length > 0) {
    const restore = heldByDefault(newlyRevoked);
    steps.push({
      sql: deparse(build(false, newlyRevoked)),
      inverse: restore.length > 0 ? deparse(build(true, restore)) : '-- pgpm: nothing to restore; the grantee held none of these privileges'
    });
  }
  if (unrevoked.length > 0) {
    steps.push({ sql: deparse(build(true, unrevoked)), inverse: deparse(build(false, unrevoked)) });
  }
  return steps;
}

/** Statements (with inverses) turning `from`'s annotations into `to`'s. */
export function diffAnnotations(from: AnnotationState, to: AnnotationState, path: string): AnnotationStep[] {
  const steps: AnnotationStep[] = [];

  for (const key of new Set([...from.comments.keys(), ...to.comments.keys()])) {
    const prior = from.comments.get(key);
    const next = to.comments.get(key);
    if (prior?.comment === next?.comment) continue;
    const target = prior ?? next!;
    const stmt = (comment: string | undefined): string =>
      deparse({ CommentStmt: { objtype: target.objtype, object: target.object, comment } });
    steps.push({ sql: stmt(next?.comment), inverse: stmt(prior?.comment) });
  }

  for (const key of new Set([...from.grants.keys(), ...to.grants.keys()])) {
    const prior = from.grants.get(key)?.privs ?? new Set<string>();
    const entry = to.grants.get(key) ?? from.grants.get(key)!;
    const next = to.grants.get(key)?.privs ?? new Set<string>();
    steps.push(...diffPrivileges(prior, next, (isGrant, tokens) => grantNode(isGrant, entry.objtype, entry.objects, tokens, entry.grantee), entry.objtype, entry.grantee));
  }

  for (const key of new Set([...from.defaultPrivileges.keys(), ...to.defaultPrivileges.keys()])) {
    const prior = from.defaultPrivileges.get(key)?.privs ?? new Set<string>();
    const entry = to.defaultPrivileges.get(key) ?? from.defaultPrivileges.get(key)!;
    const next = to.defaultPrivileges.get(key)?.privs ?? new Set<string>();
    steps.push(...diffPrivileges(prior, next, (isGrant, tokens) =>
      defaultPrivilegesNode(isGrant, entry.options, entry.objtype, tokens, entry.grantee), entry.objtype, entry.grantee));
  }

  for (const key of new Set([...from.owners.keys(), ...to.owners.keys()])) {
    const prior = from.owners.get(key);
    const next = to.owners.get(key);
    if (prior && next && stablePrint(prior.owner) === stablePrint(next.owner)) continue;
    const withOwner = (entry: { template: Node; owner: unknown }, owner: unknown): string => {
      const t = JSON.parse(JSON.stringify(entry.template)) as Node;
      if (t.AlterOwnerStmt) (t.AlterOwnerStmt as Node).newowner = owner;
      else ((t.AlterTableStmt as Node).cmds as { AlterTableCmd: Node }[])[0].AlterTableCmd.newowner = owner;
      return deparse(t);
    };
    if (prior && next) {
      steps.push({ sql: withOwner(next, next.owner), inverse: withOwner(prior, prior.owner) });
    } else if (next) {
      steps.push({
        sql: withOwner(next, next.owner),
        inverse: `-- pgpm: previous owner of ${key.split(':')[0]} unknown; restore manually`,
        incomplete: `${path}: OWNER TO has no derivable inverse (previous owner not declared)`
      });
    } else {
      steps.push({
        sql: `-- pgpm: new owner unknown; set manually`,
        inverse: withOwner(prior!, prior!.owner),
        incomplete: `${path}: owner removed from the target without a replacement; set OWNER manually`
      });
    }
  }

  return steps;
}
