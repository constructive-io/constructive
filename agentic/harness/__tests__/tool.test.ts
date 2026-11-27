import path from 'node:path';

import { z } from 'zod';

import { defineHarnessTool, type HarnessTool, normalizeToolParams, strictObject, TOOL_FAILURE_CODES, TOOL_FAILURE_MEANINGS } from '../src';

const greetTool = defineHarnessTool({
  name: 'greet',
  label: 'Greet',
  description: 'Greet whoever the caller names.',
  parameters: z.object({ name: z.string(), loudly: z.boolean().optional() }),
  effect: 'read',
  async execute(params, ctx) {
    const greeting = `hello ${params.name} from ${ctx.cwd}`;
    return {
      content: [{ type: 'text', text: params.loudly ? greeting.toUpperCase() : greeting }],
      details: { greeted: params.name },
    };
  },
});

const deleteEntryTool = defineHarnessTool({
  name: 'delete_entry',
  label: 'Delete entry',
  description: 'Delete an entry.',
  parameters: z.object({ id: z.string() }),
  effect: 'destructive',
  async execute() {
    return { content: [], details: null };
  },
});

describe('a harness tool', () => {
  it('executes against nothing but params and a context', async () => {
    await expect(greetTool.execute({ name: 'dan' }, { cwd: '/work' })).resolves.toEqual({
      content: [{ type: 'text', text: 'hello dan from /work' }],
      details: { greeted: 'dan' },
    });
  });

  it('infers params from its own zod schema', async () => {
    // `loudly` is typed as boolean|undefined here — if defineHarnessTool widened
    // the schema to z.ZodType this would not compile.
    const result = await greetTool.execute({ name: 'dan', loudly: true }, { cwd: '/work' });

    expect(result.content[0]).toEqual({ type: 'text', text: 'HELLO DAN FROM /WORK' });
    expect(result.details.greeted).toBe('dan');
  });

  it('is assignable to the erased contract, so a registry can hold a mixed set', () => {
    const tools: HarnessTool[] = [greetTool, deleteEntryTool];

    expect(tools.map((tool) => tool.name)).toEqual(['greet', 'delete_entry']);
  });
});

describe('the contract', () => {
  it('names no harness in its dependencies', () => {
    const pkg = require(path.join(__dirname, '..', 'package.json')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });

    expect(deps.filter((dep) => dep.startsWith('@earendil-works/'))).toEqual([]);
  });
});

describe('TOOL_FAILURE_MEANINGS', () => {
  it('says each code in one sentence of its own', () => {
    const sentences = TOOL_FAILURE_CODES.map((code) => TOOL_FAILURE_MEANINGS[code]);
    expect(sentences.filter((sentence) => !sentence?.trim())).toEqual([]);
    expect(new Set(sentences).size).toBe(sentences.length);
  });
});

describe('normalizeToolParams', () => {
  const rule = strictObject('a rule', { permissive: z.boolean().optional(), role: z.string().optional() });
  const schema = strictObject('the input', {
    table_name: z.string(),
    preset: z.string().optional(),
    default_value: z.union([z.string(), z.null()]).optional(),
    policies: z.array(rule).optional(),
  });

  it('removes null for an optional key that does not take it, at every depth, and keeps it where the key takes null', () => {
    expect(normalizeToolParams(schema, { table_name: 't', preset: null, default_value: null, policies: [{ permissive: null, role: 'r' }] })).toEqual({
      table_name: 't',
      default_value: null,
      policies: [{ role: 'r' }],
    });
  });

  it('leaves null for a required key, for the parse to refuse', () => {
    expect(normalizeToolParams(schema, { table_name: null })).toEqual({ table_name: null });
  });

  it('works on a schema an adapter extends, and inside z.preprocess, which validates after it', () => {
    const extended = schema.extend({ approved_plan: z.string().optional() });
    const registered = z.preprocess((value) => normalizeToolParams(extended, value), extended);

    expect(normalizeToolParams(extended, { table_name: 't', approved_plan: null })).toEqual({ table_name: 't' });
    expect(registered.safeParse({ table_name: 't', approved_plan: null, preset: null })).toEqual({ success: true, data: { table_name: 't' } });
    expect(normalizeToolParams(extended, { table_name: 't', preset: null })).toEqual(normalizeToolParams(extended, { table_name: 't' }));
    expect(normalizeToolParams(extended, { table_name: 't', default_value: null })).not.toEqual(normalizeToolParams(extended, { table_name: 't' }));
  });
});
