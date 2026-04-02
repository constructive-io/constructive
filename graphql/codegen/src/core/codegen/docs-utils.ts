import type { DocsConfig } from '../../types/config';
import type { Argument, Field, Operation, Table, TypeRef, TypeRegistry } from '../../types/schema';
import { getScalarFields, getPrimaryKeyInfo, getWritableFieldNames } from './utils';

export interface GeneratedDocFile {
  fileName: string;
  content: string;
}

export interface SkillDefinition {
  name: string;
  description: string;
  usage: string[];
  examples: { description: string; code: string[] }[];
  language?: string;
}

export interface SkillReferenceDefinition {
  title: string;
  description: string;
  usage: string[];
  examples: { description: string; code: string[] }[];
  language?: string;
}

const CONSTRUCTIVE_LOGO_URL =
  'https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg';

const CONSTRUCTIVE_REPO = 'https://github.com/constructive-io/constructive';

export function getReadmeHeader(title: string): string[] {
  return [
    `# ${title}`,
    '',
    '<p align="center" width="100%">',
    `  <img height="120" src="${CONSTRUCTIVE_LOGO_URL}" />`,
    '</p>',
    '',
    `<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->`,
    '',
  ];
}

export function getReadmeFooter(): string[] {
  return [
    '---',
    '',
    'Built by the [Constructive](https://constructive.io) team.',
    '',
    '## Disclaimer',
    '',
    'AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.',
    '',
    'No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.',
    '',
  ];
}

export function resolveDocsConfig(
  docs: DocsConfig | boolean | undefined,
): DocsConfig {
  if (docs === true) {
    return { readme: true, agents: true, skills: true };
  }
  if (docs === false) {
    return { readme: false, agents: false, skills: false };
  }
  if (!docs) {
    return { readme: true, agents: true, skills: false };
  }
  return {
    readme: docs.readme ?? true,
    agents: docs.agents ?? true,
    skills: docs.skills ?? false,
  };
}

export function formatArgType(arg: Operation['args'][number]): string {
  const t = arg.type;
  if (t.kind === 'NON_NULL' && t.ofType) {
    return `${formatTypeRef(t.ofType)} (required)`;
  }
  return formatTypeRef(t);
}

export function formatTypeRef(
  t: Operation['args'][number]['type'],
): string {
  if (t.kind === 'LIST' && t.ofType) {
    return `[${formatTypeRef(t.ofType)}]`;
  }
  if (t.kind === 'NON_NULL' && t.ofType) {
    return `${formatTypeRef(t.ofType)}!`;
  }
  return t.name ?? 'unknown';
}

export function getEditableFields(table: Table, typeRegistry?: TypeRegistry): Field[] {
  const pk = getPrimaryKeyInfo(table)[0];
  const writableFields = getWritableFieldNames(table, typeRegistry);
  return getScalarFields(table).filter(
    (f) =>
      f.name !== pk.name &&
      f.name !== 'nodeId' &&
      f.name !== 'createdAt' &&
      f.name !== 'updatedAt' &&
      // When a TypeRegistry is available, filter out computed/plugin-added
      // fields (e.g. search scores, trgm similarity) that aren't real columns
      (writableFields === null || writableFields.has(f.name)),
  );
}

/**
 * Identify search/computed fields on a table — fields present in the GraphQL
 * type but NOT in the create input type. These are plugin-added fields like
 * trgm similarity scores, tsvector ranks, searchScore, etc.
 */
export function getSearchFields(table: Table, typeRegistry?: TypeRegistry): Field[] {
  const writableFields = getWritableFieldNames(table, typeRegistry);
  if (writableFields === null) return [];
  const pk = getPrimaryKeyInfo(table)[0];
  return getScalarFields(table).filter(
    (f) =>
      f.name !== pk.name &&
      f.name !== 'nodeId' &&
      f.name !== 'createdAt' &&
      f.name !== 'updatedAt' &&
      !writableFields.has(f.name),
  );
}

// ---------------------------------------------------------------------------
// Special field categorization — PostGIS, pgvector, Unified Search
// ---------------------------------------------------------------------------

export interface SpecialFieldGroup {
  /** Category key */
  category: 'geospatial' | 'embedding' | 'search';
  /** Human-readable label */
  label: string;
  /** One-line description of this category */
  description: string;
  /** Fields belonging to this category */
  fields: Field[];
}

function isPostGISField(f: Field): boolean {
  const pgType = f.type.pgType?.toLowerCase();
  if (pgType === 'geometry' || pgType === 'geography') return true;
  const gql = f.type.gqlType;
  if (/^(GeoJSON|GeographyPoint|GeographyLineString|GeographyPolygon|GeometryPoint|GeometryLineString|GeometryPolygon|GeographyMulti|GeometryMulti|GeometryCollection|GeographyCollection)/i.test(gql)) return true;
  return false;
}

function isEmbeddingField(f: Field): boolean {
  // VectorCodecPlugin maps pgvector `vector` columns to the `Vector` GQL scalar.
  // This is the primary detection path — no _meta or pgType enrichment needed.
  if (f.type.gqlType === 'Vector') return true;
  // Legacy fallback: name-based heuristic for schemas without VectorCodecPlugin
  if (/embedding$/i.test(f.name) && f.type.isArray && f.type.gqlType === 'Float') return true;
  return false;
}

function isTsvectorField(f: Field): boolean {
  const pgType = f.type.pgType?.toLowerCase();
  if (pgType === 'tsvector') return true;
  // Fallback: PostGraphile maps tsvector columns to the FullText GQL scalar
  if (f.type.gqlType === 'FullText' && !f.type.isArray) return true;
  return false;
}

function isSearchComputedField(f: Field): boolean {
  if (f.name === 'searchScore') return true;
  if (/TrgmSimilarity$/.test(f.name)) return true;
  if (/TsvectorRank$/.test(f.name)) return true;
  if (/Bm25Score$/.test(f.name)) return true;
  return false;
}

/**
 * Check whether the schema's VectorNearbyInput type includes an
 * `includeChunks` field.  When present, tables with embedding columns
 * support transparent chunk-aware vector search.
 */
function hasIncludeChunksCapability(registry?: TypeRegistry): boolean {
  if (!registry) return false;
  const vectorInput = registry.get('VectorNearbyInput');
  if (!vectorInput || vectorInput.kind !== 'INPUT_OBJECT') return false;
  return !!vectorInput.inputFields?.some((f) => f.name === 'includeChunks');
}

/**
 * Categorize "special" fields on a table into PostGIS, pgvector, and
 * Unified Search groups.  Returns only non-empty groups.
 *
 * The function inspects ALL scalar fields (not just computed ones) so that
 * real columns (geometry, vector, tsvector) are also surfaced with
 * descriptive context in generated docs.
 */
export function categorizeSpecialFields(
  table: Table,
  typeRegistry?: TypeRegistry,
): SpecialFieldGroup[] {
  const allFields = getScalarFields(table);
  const computedFields = getSearchFields(table, typeRegistry);
  const computedSet = new Set(computedFields.map((f) => f.name));

  const geospatial: Field[] = [];
  const embedding: Field[] = [];
  const search: Field[] = [];

  for (const f of allFields) {
    if (isPostGISField(f)) {
      geospatial.push(f);
    } else if (isEmbeddingField(f)) {
      embedding.push(f);
    } else if (isTsvectorField(f)) {
      search.push(f);
    } else if (computedSet.has(f.name) && isSearchComputedField(f)) {
      search.push(f);
    }
  }

  const groups: SpecialFieldGroup[] = [];

  if (geospatial.length > 0) {
    groups.push({
      category: 'geospatial',
      label: 'PostGIS geospatial fields',
      description:
        'Geographic/geometric columns managed by PostGIS. Supports spatial queries (distance, containment, intersection) via the Unified Search API PostGIS adapter.',
      fields: geospatial,
    });
  }

  if (embedding.length > 0) {
    const chunkAware = hasIncludeChunksCapability(typeRegistry);
    const baseDesc =
      'High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.';
    const chunkDesc = chunkAware
      ? baseDesc +
        ' Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.'
      : baseDesc;
    groups.push({
      category: 'embedding',
      label: 'pgvector embedding fields',
      description: chunkDesc,
      fields: embedding,
    });
  }

  if (search.length > 0) {
    groups.push({
      category: 'search',
      label: 'Unified Search API fields',
      description:
        'Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.',
      fields: search,
    });
  }

  return groups;
}

/**
 * Build markdown lines describing special fields for README-style docs.
 * Returns empty array when there are no special fields.
 */
export function buildSpecialFieldsMarkdown(groups: SpecialFieldGroup[]): string[] {
  if (groups.length === 0) return [];
  const lines: string[] = [];
  for (const g of groups) {
    const fieldList = g.fields.map((f) => `\`${f.name}\``).join(', ');
    lines.push(`> **${g.label}:** ${fieldList}`);
    lines.push(`> ${g.description}`);
    lines.push('');
  }
  return lines;
}

/**
 * Build plain-text lines describing special fields for AGENTS-style docs.
 * Returns empty array when there are no special fields.
 */
export function buildSpecialFieldsPlain(groups: SpecialFieldGroup[]): string[] {
  if (groups.length === 0) return [];
  const lines: string[] = [];
  lines.push('SPECIAL FIELDS:');
  for (const g of groups) {
    lines.push(`  [${g.label}]`);
    lines.push(`  ${g.description}`);
    for (const f of g.fields) {
      lines.push(`    ${f.name}: ${cleanTypeName(f.type.gqlType)}`);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Search-specific CLI examples for generated docs
// ---------------------------------------------------------------------------

export interface SearchExample {
  description: string;
  code: string[];
}

/**
 * Build concrete, field-specific CLI examples for tables with search fields.
 * Uses the same field-name derivation logic as buildSearchHandler in
 * table-command-generator.ts so the examples match the actual generated code.
 *
 * Returns an empty array when the table has no search/embedding fields.
 */
export function buildSearchExamples(
  specialGroups: SpecialFieldGroup[],
  toolName: string,
  cmd: string,
): SearchExample[] {
  const examples: SearchExample[] = [];
  const scoreFields: string[] = [];

  for (const group of specialGroups) {
    for (const field of group.fields) {
      // tsvector (FullText scalar) — where input uses the column name directly
      if (field.type.gqlType === 'FullText' && !field.type.isArray) {
        examples.push({
          description: `Full-text search via tsvector (\`${field.name}\`)`,
          code: [
            `${toolName} ${cmd} list --where.${field.name} "search query" --select title,tsvRank`,
          ],
        });
        scoreFields.push('tsvRank');
      }

      // BM25 computed score — bodyBm25Score → bm25Body
      if (/Bm25Score$/.test(field.name)) {
        const baseName = field.name.replace(/Bm25Score$/, '');
        const inputName = `bm25${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`;
        examples.push({
          description: `BM25 keyword search via \`${inputName}\``,
          code: [
            `${toolName} ${cmd} list --where.${inputName}.query "search query" --select title,${field.name}`,
          ],
        });
        scoreFields.push(field.name);
      }

      // Trigram similarity — titleTrgmSimilarity → trgmTitle
      if (/TrgmSimilarity$/.test(field.name)) {
        const baseName = field.name.replace(/TrgmSimilarity$/, '');
        const inputName = `trgm${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`;
        examples.push({
          description: `Fuzzy search via trigram similarity (\`${inputName}\`)`,
          code: [
            `${toolName} ${cmd} list --where.${inputName}.value "approximate query" --where.${inputName}.threshold 0.3 --select title,${field.name}`,
          ],
        });
        scoreFields.push(field.name);
      }

      // pgvector embedding — uses column name, with --auto-embed for text-to-vector
      if (group.category === 'embedding') {
        examples.push({
          description: `Vector similarity search via \`${field.name}\` (manual vector)`,
          code: [
            `# Pass a pre-computed vector array via dot-notation`,
            `${toolName} ${cmd} list --where.${field.name}.vector '[0.1,0.2,0.3]' --where.${field.name}.distance 1.0 --select title,${field.name}VectorDistance`,
          ],
        });
        examples.push({
          description: `Vector semantic search via \`${field.name}\` with --auto-embed`,
          code: [
            `# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)`,
            `EMBEDDER_PROVIDER=ollama ${toolName} ${cmd} search "semantic query" --auto-embed --select title,${field.name}VectorDistance`,
            `EMBEDDER_PROVIDER=ollama ${toolName} ${cmd} list --where.${field.name}.vector "semantic query" --auto-embed --select title,${field.name}VectorDistance`,
          ],
        });
        examples.push({
          description: `Create/update with auto-embedded \`${field.name}\` via --auto-embed`,
          code: [
            `# --auto-embed on create/update converts text strings in vector fields to embeddings before saving`,
            `EMBEDDER_PROVIDER=ollama ${toolName} ${cmd} create --${field.name} "text to embed" --auto-embed`,
            `EMBEDDER_PROVIDER=ollama ${toolName} ${cmd} update --${field.name} "new text to embed" --auto-embed`,
          ],
        });
      }

      // searchScore — composite blend field, useful for ordering
      if (field.name === 'searchScore') {
        scoreFields.push('searchScore');
      }
    }
  }

  // Composite unifiedSearch example (dispatches to all text adapters)
  const hasTextSearch = specialGroups.some(
    (g) => g.category === 'search' && g.fields.some(
      (f) => f.type.gqlType === 'FullText' || /TrgmSimilarity$/.test(f.name) || /Bm25Score$/.test(f.name),
    ),
  );
  if (hasTextSearch) {
    const fieldsArg = scoreFields.length > 0
      ? `title,${[...new Set(scoreFields)].join(',')}`
      : 'title';
    examples.push({
      description: 'Composite search (unifiedSearch dispatches to all text adapters)',
      code: [
        `${toolName} ${cmd} list --where.unifiedSearch "search query" --select ${fieldsArg}`,
      ],
    });
  }

  // Combined search + pagination + ordering example
  if (examples.length > 0) {
    examples.push({
      description: 'Search with pagination and field projection',
      code: [
        `${toolName} ${cmd} list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore`,
        `${toolName} ${cmd} search "query" --limit 10 --select id,title,searchScore`,
      ],
    });
  }

  return examples;
}

/**
 * Build markdown lines for search-specific examples in README-style docs.
 * Returns empty array when there are no search examples.
 */
export function buildSearchExamplesMarkdown(
  specialGroups: SpecialFieldGroup[],
  toolName: string,
  cmd: string,
): string[] {
  const examples = buildSearchExamples(specialGroups, toolName, cmd);
  if (examples.length === 0) return [];
  const lines: string[] = [];
  lines.push('**Search Examples:**');
  lines.push('');
  for (const ex of examples) {
    lines.push(`*${ex.description}:*`);
    lines.push('```bash');
    for (const c of ex.code) {
      lines.push(c);
    }
    lines.push('```');
    lines.push('');
  }
  return lines;
}

/**
 * Represents a flattened argument for docs/skills generation.
 * INPUT_OBJECT args are expanded to dot-notation fields.
 */
export interface FlattenedArg {
  /** Flag name for CLI usage, e.g. 'input.email' or 'clientMutationId' */
  flag: string;
  /** Human-readable type string */
  type: string;
  /** Whether the argument is required */
  required: boolean;
  /** Description from schema */
  description?: string;
}

function unwrapNonNull(typeRef: TypeRef): { inner: TypeRef; required: boolean } {
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return { inner: typeRef.ofType, required: true };
  }
  return { inner: typeRef, required: false };
}

function resolveBaseType(typeRef: TypeRef): TypeRef {
  if ((typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') && typeRef.ofType) {
    return resolveBaseType(typeRef.ofType);
  }
  return typeRef;
}

/**
 * Strip internal type prefixes for cleaner docs display.
 * e.g. 'ConstructiveInternalTypeEmail' -> 'Email'
 */
export function cleanTypeName(name: string): string {
  if (name.startsWith('ConstructiveInternalType')) {
    return name.slice('ConstructiveInternalType'.length);
  }
  return name;
}

function getScalarTypeName(typeRef: TypeRef): string {
  const base = resolveBaseType(typeRef);
  return cleanTypeName(base.name ?? 'String');
}

/**
 * Flatten operation args for docs/skills, expanding INPUT_OBJECT types
 * to dot-notation fields (e.g. input.email, input.password).
 * Mirrors the logic in arg-mapper.ts buildQuestionsArray.
 */
/**
 * Resolve inputFields for an INPUT_OBJECT type.
 * Checks the TypeRef first, then falls back to the TypeRegistry.
 */
function resolveInputFields(
  typeRef: TypeRef,
  registry?: TypeRegistry,
): Argument[] | undefined {
  if (typeRef.inputFields && typeRef.inputFields.length > 0) {
    return typeRef.inputFields;
  }
  if (registry && typeRef.name) {
    const resolved = registry.get(typeRef.name);
    if (resolved?.kind === 'INPUT_OBJECT' && resolved.inputFields && resolved.inputFields.length > 0) {
      return resolved.inputFields;
    }
  }
  return undefined;
}

export function flattenArgs(args: Argument[], registry?: TypeRegistry): FlattenedArg[] {
  const result: FlattenedArg[] = [];
  for (const arg of args) {
    const { inner, required } = unwrapNonNull(arg.type);
    const base = resolveBaseType(arg.type);

    // Try to resolve inputFields from the inner type first (unwrapped NON_NULL)
    const innerFields = inner.kind === 'INPUT_OBJECT'
      ? resolveInputFields(inner, registry)
      : undefined;

    if (innerFields) {
      for (const field of innerFields) {
        const { required: fieldRequired } = unwrapNonNull(field.type);
        result.push({
          flag: `${arg.name}.${field.name}`,
          type: getScalarTypeName(field.type),
          required: required && fieldRequired,
          description: field.description,
        });
      }
    } else {
      // Try the base type (unwrapped LIST+NON_NULL)
      const baseFields = base.kind === 'INPUT_OBJECT'
        ? resolveInputFields(base, registry)
        : undefined;

      if (baseFields) {
        for (const field of baseFields) {
          const { required: fieldRequired } = unwrapNonNull(field.type);
          result.push({
            flag: `${arg.name}.${field.name}`,
            type: getScalarTypeName(field.type),
            required: required && fieldRequired,
            description: field.description,
          });
        }
      } else {
        result.push({
          flag: arg.name,
          type: getScalarTypeName(arg.type),
          required,
          description: arg.description,
        });
      }
    }
  }
  return result;
}

/**
 * Build CLI flags string from flattened args.
 * e.g. '--input.email <String> --input.password <String>'
 */
export function flattenedArgsToFlags(flatArgs: FlattenedArg[]): string {
  return flatArgs.map((a) => `--${a.flag} <${a.type}>`).join(' ');
}

// ---------------------------------------------------------------------------
// Type-aware placeholder helpers for code examples
// ---------------------------------------------------------------------------

/**
 * Generate a type-aware placeholder for a table field value in code examples.
 * Returns a quoted placeholder string, e.g. `'<UUID>'`, `'<String>'`, `'<Int>'`.
 */
export function fieldPlaceholder(field: Field): string {
  return `'<${cleanTypeName(field.type.gqlType)}>'`;
}

/**
 * Generate a type-aware placeholder for a primary key value in code examples.
 * PrimaryKeyField has `gqlType` directly (not nested under `.type`).
 */
export function pkPlaceholder(pk: { gqlType: string }): string {
  return `'<${cleanTypeName(pk.gqlType)}>'`;
}

/**
 * Generate a type-aware placeholder for an operation argument value.
 *
 * - Scalar args: `'<String>'`
 * - INPUT_OBJECT with resolvable fields (up to a limit): `{ email: '<String>', password: '<String>' }`
 * - INPUT_OBJECT without resolvable fields: `'<TypeName>'`
 *
 * The result is a ready-to-embed JS expression (quotes included for scalars).
 */
export function argPlaceholder(arg: Argument, registry?: TypeRegistry): string {
  const { inner } = unwrapNonNull(arg.type);

  if (inner.kind === 'INPUT_OBJECT') {
    const fields = resolveInputFields(inner, registry);
    if (fields && fields.length > 0) {
      const meaningful = fields.filter((f) => f.name !== 'clientMutationId');
      if (meaningful.length > 0 && meaningful.length <= 5) {
        const parts = meaningful.map((f) => {
          const typeName = cleanTypeName(getScalarTypeName(f.type));
          return `${f.name}: '<${typeName}>'`;
        });
        return '{ ' + parts.join(', ') + ' }';
      }
    }
    if (inner.name) {
      return `'<${cleanTypeName(inner.name)}>'`;
    }
  }

  const typeName = cleanTypeName(getScalarTypeName(arg.type));
  return `'<${typeName}>'`;
}

export function gqlTypeToJsonSchemaType(gqlType: string): string {
  switch (gqlType) {
    case 'Int':
      return 'integer';
    case 'Float':
      return 'number';
    case 'Boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

export function buildSkillFile(
  skill: SkillDefinition,
  referenceNames?: string[],
): string {
  const lang = skill.language ?? 'bash';
  const lines: string[] = [];

  // YAML frontmatter (Agent Skills format)
  lines.push('---');
  lines.push(`name: ${skill.name}`);
  lines.push(`description: ${skill.description}`);
  lines.push('---');
  lines.push('');

  lines.push(`# ${skill.name}`);
  lines.push('');
  lines.push('<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->');
  lines.push('');
  lines.push(skill.description);
  lines.push('');
  lines.push('## Usage');
  lines.push('');
  lines.push(`\`\`\`${lang}`);
  for (const u of skill.usage) {
    lines.push(u);
  }
  lines.push('```');
  lines.push('');
  lines.push('## Examples');
  lines.push('');
  for (const ex of skill.examples) {
    lines.push(`### ${ex.description}`);
    lines.push('');
    lines.push(`\`\`\`${lang}`);
    for (const cmd of ex.code) {
      lines.push(cmd);
    }
    lines.push('```');
    lines.push('');
  }

  if (referenceNames && referenceNames.length > 0) {
    lines.push('## References');
    lines.push('');
    lines.push('See the `references/` directory for detailed per-entity API documentation:');
    lines.push('');
    for (const name of referenceNames) {
      lines.push(`- [${name}](references/${name}.md)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function buildSkillReference(ref: SkillReferenceDefinition): string {
  const lang = ref.language ?? 'bash';
  const lines: string[] = [];

  lines.push(`# ${ref.title}`);
  lines.push('');
  lines.push('<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->');
  lines.push('');
  lines.push(ref.description);
  lines.push('');
  lines.push('## Usage');
  lines.push('');
  lines.push(`\`\`\`${lang}`);
  for (const u of ref.usage) {
    lines.push(u);
  }
  lines.push('```');
  lines.push('');
  lines.push('## Examples');
  lines.push('');
  for (const ex of ref.examples) {
    lines.push(`### ${ex.description}`);
    lines.push('');
    lines.push(`\`\`\`${lang}`);
    for (const cmd of ex.code) {
      lines.push(cmd);
    }
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}
