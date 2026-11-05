/**
 * Plan-time text-to-vector embedding.
 *
 * Under Grafast a field's `resolve()` runs after its plan has executed, so the
 * SQL has already been built by the time a resolver wrapper could embed text.
 * Instead, input fields that carry text to embed are tagged with an
 * `EmbedRule` where they are declared, and `planTimeEmbedding` (run from a
 * `finalize` hook) wraps the plan of every object field whose arguments can
 * reach a tagged input field. The wrapper shadows `fieldArgs.getRaw` so every
 * consumer of those arguments (connection-filter's `where` applyPlan, the
 * create/update `args.apply`) reads a step that embeds the text first.
 */

import type { ExecutableStep, FieldArgs } from 'grafast';
import { access, ConstantStep, context, lambda, object } from 'grafast';
import type { GraphQLInputType, GraphQLSchema } from 'graphql';

import type { LlmRequestScope } from './embedder';
import { llmConfigStore, resolveRequestScope } from './embedder';

export type QuotaPolicy = 'degrade' | 'throw';

/** Stored on a GraphQL input field's `extensions[EMBED_EXT]`. */
export type EmbedRule =
  /** `VectorNearbyInput.text`: embedded into the sibling `into` field. */
  | { kind: 'nearby'; into: string; onQuotaExceeded: QuotaPolicy }
  /** `unifiedSearch: String`: becomes `{ __text, __vector }` for graphile-search. */
  | { kind: 'unified'; onQuotaExceeded: QuotaPolicy }
  /** `{col}Text` on a create input or patch. `required` means the column is NOT NULL. */
  | { kind: 'companion'; into: string; required: boolean };

export const EMBED_EXT = 'graphileLlmEmbed';

export type VectorEmbedder = (text: string) => Promise<number[] | null>;

export function embedField<T extends object>(rule: EmbedRule, spec: T): T {
  return { ...spec, extensions: { ...(spec as { extensions?: object }).extensions, [EMBED_EXT]: rule } };
}

/** `build.llmEmbedder` resolves to `{ embedding }`; an empty or missing vector is a failed embed. */
export function toVectorEmbedder(raw: unknown): VectorEmbedder | null {
  if (typeof raw !== 'function') return null;
  return async (text) => {
    const result = await raw(text);
    const vector = result?.embedding;
    return isNonEmptyVector(vector) ? vector : null;
  };
}

function isNonEmptyVector(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Binds the embedder to one request: the identity its claims carry and the
 * per-database model overrides, resolved on first use.
 */
function forRequest(embedder: VectorEmbedder | null, graphqlContext: unknown): VectorEmbedder | null {
  if (!embedder) return null;
  let scope: Promise<LlmRequestScope> | undefined;
  return async (text) => {
    scope ??= resolveRequestScope(graphqlContext);
    const resolved = await scope;
    const startTime = Date.now();
    const vector = await llmConfigStore.run(resolved, () => embedder(text));
    if (vector) {
      console.log(`[graphile-llm] embed: dims=${vector.length}, latency=${Date.now() - startTime}ms`);
    }
    return vector;
  };
}

export function createEmbedIndex(graphql: any) {
  const { getNamedType, isInputObjectType, isListType, isNonNullType } = graphql;
  const reachesMemo = new WeakMap<object, boolean>();

  const inputObjectFields = (type: any): any[] => Object.values<any>(type.getFields());
  const namedInputObject = (field: any): any => {
    const named = getNamedType(field.type);
    return isInputObjectType(named) ? named : null;
  };

  // Filter types are cyclic (AND/OR/NOT, forward and backward relations), so
  // reachability is a fixed point over everything reachable from `type`; a
  // depth-first walk that memoizes a provisional answer mid-cycle gets it wrong.
  function reaches(type: GraphQLInputType): boolean {
    const start = getNamedType(type);
    if (!isInputObjectType(start)) return false;
    const known = reachesMemo.get(start);
    if (known !== undefined) return known;

    const pending: any[] = [];
    const stack: any[] = [start];
    const seen = new Set<any>();
    while (stack.length > 0) {
      const node = stack.pop();
      if (seen.has(node) || reachesMemo.has(node)) continue;
      seen.add(node);
      pending.push(node);
      for (const field of inputObjectFields(node)) {
        const child = namedInputObject(field);
        if (child) stack.push(child);
      }
    }

    const hit = new Set<any>(
      pending.filter((node) => inputObjectFields(node).some((f) => f.extensions?.[EMBED_EXT]))
    );
    const isHit = (node: any) => hit.has(node) || reachesMemo.get(node) === true;
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of pending) {
        if (hit.has(node)) continue;
        if (inputObjectFields(node).some((f) => {
          const child = namedInputObject(f);
          return child !== null && isHit(child);
        })) {
          hit.add(node);
          changed = true;
        }
      }
    }

    for (const node of pending) reachesMemo.set(node, hit.has(node));
    return reachesMemo.get(start);
  }

  async function applyRule(
    rule: EmbedRule,
    fieldName: string,
    typeName: string,
    value: Record<string, any>,
    next: Record<string, any>,
    embed: VectorEmbedder | null
  ): Promise<void> {
    const text = value[fieldName];

    switch (rule.kind) {
    case 'nearby': {
      delete next[fieldName];
      const hasVector = isNonEmptyVector(value[rule.into]);
      const hasText = typeof text === 'string';
      if (hasVector && hasText) {
        throw new Error(
          `${typeName}: provide exactly one of \`${rule.into}\` or \`${fieldName}\`, not both.`
        );
      }
      if (!hasVector && !hasText) {
        throw new Error(
          `${typeName}: provide exactly one of \`${rule.into}\` or \`${fieldName}\`; neither was given.`
        );
      }
      if (hasVector) return;
      if (!embed) {
        throw new Error(
          `${typeName}: \`${fieldName}\` needs an embedding provider and none is configured; ` +
          `send \`${rule.into}\` instead.`
        );
      }
      const vector = await embed(text);
      if (vector) {
        next[rule.into] = vector;
      } else if (rule.onQuotaExceeded === 'throw') {
        throw new Error(
          `${typeName}: embedding failed (provider unavailable). ` +
          'Set onQuotaExceeded to \'degrade\' to fall back to the other filters.'
        );
      }
      return;
    }

    case 'unified': {
      if (typeof text !== 'string' || text.trim().length === 0 || !embed) return;
      const vector = await embed(text);
      if (vector) {
        next[fieldName] = { __text: text, __vector: vector };
      } else if (rule.onQuotaExceeded === 'throw') {
        throw new Error(
          `${fieldName}: embedding failed (provider unavailable). ` +
          'onQuotaExceeded is set to \'throw\'; set it to \'degrade\' for text-only fallback.'
        );
      }
      return;
    }

    case 'companion': {
      delete next[fieldName];
      const hasVector = isNonEmptyVector(value[rule.into]);
      const hasText = typeof text === 'string';
      if (hasVector && hasText) {
        throw new Error(
          `${typeName}: provide exactly one of \`${rule.into}\` or \`${fieldName}\`, not both.`
        );
      }
      if (hasVector) return;
      if (!hasText) {
        if (rule.required) {
          throw new Error(
            `${typeName}: provide exactly one of \`${rule.into}\` or \`${fieldName}\`; neither was given.`
          );
        }
        return;
      }
      if (!embed) {
        throw new Error(
          `EMBED_NOT_CONFIGURED: Cannot embed ${fieldName} — no embedding provider configured. ` +
          'Set defaultEmbedder in GraphileLlmPreset options or EMBEDDER_PROVIDER env var.'
        );
      }
      const vector = await embed(text);
      if (!vector) {
        throw new Error(
          `EMBED_FAILED: Cannot embed ${fieldName} — the embedding provider returned no vector.`
        );
      }
      next[rule.into] = vector;
      return;
    }
    }
  }

  /** Returns `value` itself when its type cannot reach a tagged field. */
  async function embedValue(type: any, value: any, embed: VectorEmbedder | null): Promise<any> {
    if (value == null) return value;
    const inner = isNonNullType(type) ? type.ofType : type;
    if (isListType(inner)) {
      if (!Array.isArray(value) || !reaches(inner.ofType)) return value;
      return Promise.all(value.map((item: any) => embedValue(inner.ofType, item, embed)));
    }
    if (!isInputObjectType(inner) || !reaches(inner)) return value;

    const next: Record<string, any> = { ...value };
    const jobs: Promise<void>[] = [];
    for (const [name, field] of Object.entries<any>(inner.getFields())) {
      const rule = field.extensions?.[EMBED_EXT] as EmbedRule | undefined;
      if (rule) {
        jobs.push(applyRule(rule, name, inner.name, value, next, embed));
      } else if (value[name] != null && reaches(field.type)) {
        jobs.push(embedValue(field.type, value[name], embed).then((embedded) => { next[name] = embedded; }));
      }
    }
    await Promise.all(jobs);
    return next;
  }

  return { reaches, embedValue };
}

type EmbedIndex = ReturnType<typeof createEmbedIndex>;
type FieldPlan = (parent: ExecutableStep, fieldArgs: FieldArgs, info: unknown) => unknown;

function withEmbeddedArgs(
  originalPlan: FieldPlan,
  argNames: string[],
  embeddable: Set<string>,
  index: EmbedIndex,
  embedder: VectorEmbedder | null
): FieldPlan {
  return function planWithEmbeddedArgs(parent, fieldArgs, info) {
    const originalGetRaw = fieldArgs.getRaw as (path?: string | ReadonlyArray<string | number>) => ExecutableStep;
    const roots = new Map<string, ExecutableStep>();

    const rootStep = (argName: string): ExecutableStep => {
      let $root = roots.get(argName);
      if ($root) return $root;
      const $raw = originalGetRaw.call(fieldArgs, argName);
      const absent = $raw instanceof ConstantStep && $raw.data === undefined;
      if (absent || !embeddable.has(argName)) {
        $root = $raw;
      } else {
        const type = fieldArgs.typeAt(argName);
        $root = $raw.withLayerPlan(() =>
          lambda({ raw: $raw, ctx: context() } as any, ({ raw, ctx }: any) =>
            index.embedValue(type, raw, forRequest(embedder, ctx))
          )
        );
      }
      roots.set(argName, $root);
      return $root;
    };

    // grafast reads `fieldArgs.getRaw` through the object (apply, processAfter,
    // `$arg` getters, getBaked), so shadowing it here reaches every consumer.
    fieldArgs.getRaw = function getRawEmbedded(path?: string | ReadonlyArray<string | number>) {
      if (path === undefined) {
        const steps = Object.fromEntries(argNames.map((n) => [n, rootStep(n)]));
        return steps[argNames[0]].withLayerPlan(() => object(steps)) as any;
      }
      const [argName, ...rest] = typeof path === 'string' ? [path] : path;
      if (!embeddable.has(argName as string)) return originalGetRaw.call(fieldArgs, path);
      const $root = rootStep(argName as string);
      return (rest.length === 0 ? $root : $root.withLayerPlan(() => access($root, rest))) as any;
    } as typeof fieldArgs.getRaw;

    return originalPlan(parent, fieldArgs, info);
  };
}

const processedSchemas = new WeakSet<GraphQLSchema>();

/**
 * Wraps the plan of every object field whose arguments reach a tagged input
 * field. Runs in `finalize` because args are attached after the
 * `GraphQLObjectType_fields_field` hook. Idempotent per schema, so every plugin
 * that tags fields can call it without depending on the others being loaded.
 */
export function planTimeEmbedding(schema: GraphQLSchema, build: any): GraphQLSchema {
  if (processedSchemas.has(schema)) return schema;
  processedSchemas.add(schema);

  const { graphql } = build;
  const index = createEmbedIndex(graphql);
  const embedder = toVectorEmbedder(build.llmEmbedder);

  for (const type of Object.values<any>(schema.getTypeMap())) {
    if (!graphql.isObjectType(type) || type.name.startsWith('__')) continue;
    for (const field of Object.values<any>(type.getFields())) {
      const grafastExt = field.extensions?.grafast;
      if (typeof grafastExt?.plan !== 'function') continue;
      const embeddable = new Set<string>(
        field.args.filter((a: any) => index.reaches(a.type)).map((a: any) => a.name)
      );
      if (embeddable.size === 0) continue;
      const argNames = field.args.map((a: any) => a.name);
      grafastExt.plan = withEmbeddedArgs(grafastExt.plan, argNames, embeddable, index, embedder);
    }
  }
  return schema;
}
