import { constructiveDbTools } from '@agentic-kit/db-tools';
import { defineHarnessTool } from '@agentic-kit/harness';
import { z } from 'zod';

import type { DshJsonSchema, DshToolRunContext } from '../src';
import { convertDshParameters, toDshTool, toDshTools } from '../src';

/** dsh's enforced keyword set, so a drift in the narrowing is caught here. */
const DSH_KEYWORDS = new Set([
  'type',
  'oneOf',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const',
  'description',
  'title',
  'default',
  'examples'
]);
const DSH_TYPES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']);

/** Every keyword or type dsh would reject, as a path. */
function inSubset(node: DshJsonSchema, path = ''): string[] {
  const violations: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    const at = path === '' ? key : `${path}.${key}`;
    if (!DSH_KEYWORDS.has(key)) violations.push(at);
    if (key === 'type' && typeof value === 'string' && !DSH_TYPES.has(value)) {
      violations.push(at);
    }
    if (key === 'properties') {
      for (const [name, sub] of Object.entries(value as Record<string, DshJsonSchema>)) {
        violations.push(...inSubset(sub, `${at}.${name}`));
      }
    }
    if (key === 'items') violations.push(...inSubset(value as DshJsonSchema, at));
    if (key === 'oneOf') {
      (value as DshJsonSchema[]).forEach((sub, index) => {
        violations.push(...inSubset(sub, `${at}[${index}]`));
      });
    }
  }
  return violations;
}

const runContext = (signal = new AbortController().signal): DshToolRunContext => ({
  callId: 'call-1',
  name: 'echo',
  signal
});

const echo = defineHarnessTool({
  name: 'echo',
  label: 'Echo',
  description: 'Echo a message.',
  promptSnippet: 'echo(message)',
  promptGuidelines: ['Use it to prove the seam.'],
  parameters: z.object({
    message: z.string().describe('Text to echo'),
    times: z.number().int().min(1).max(5).optional()
  }),
  async execute(params, ctx) {
    return {
      content: [{ type: 'text' as const, text: `${params.message} @ ${ctx.cwd}` }],
      details: { echoed: params.message, aborted: ctx.signal?.aborted ?? null }
    };
  }
});

describe('toDshTool', () => {
  it('carries the name, folds the prompt fields into dsh’s one description', () => {
    const tool = toDshTool(echo);
    expect(tool.name).toBe('echo');
    expect(tool.description).toBe(
      'Echo a message.\n\necho(message)\n\n- Use it to prove the seam.'
    );
  });

  it('declares parameters in dsh’s subset', () => {
    const { parameters } = toDshTool(echo);
    expect(parameters.type).toBe('object');
    expect(parameters.required).toEqual(['message']);
    expect(parameters.properties?.message).toEqual({
      type: 'string',
      description: 'Text to echo'
    });
    // min/max are zod's to enforce, not dsh's to read.
    expect(parameters.properties?.times).toEqual({ type: 'integer' });
  });

  it('returns the neutral result as the canonical value and renders its content', async () => {
    const tool = toDshTool(echo, { cwd: () => '/tmp/project' });
    const value = await tool.execute({ message: 'hi' }, runContext());

    expect(value).toEqual({
      content: [{ type: 'text', text: 'hi @ /tmp/project' }],
      details: { echoed: 'hi', aborted: false }
    });
    expect(tool.output.render({ message: 'hi' }, value)).toEqual([
      { type: 'text', text: 'hi @ /tmp/project' }
    ]);
  });

  it('parses arguments with the tool’s own schema, so dropped constraints still hold', async () => {
    const tool = toDshTool(echo);
    await expect(tool.execute({ message: 'hi', times: 9 }, runContext())).rejects.toThrow();
    await expect(tool.execute({}, runContext())).rejects.toThrow();
  });

  it('forwards the caller’s cancellation to the tool', async () => {
    const controller = new AbortController();
    controller.abort();
    const value = (await toDshTool(echo).execute(
      { message: 'hi' },
      runContext(controller.signal)
    )) as { details: { aborted: boolean } };
    expect(value.details.aborted).toBe(true);
  });

  it('renders an image block as its honest text form', () => {
    const image = defineHarnessTool({
      name: 'shot',
      label: 'Shot',
      description: 'Screenshot.',
      parameters: z.object({}),
      async execute() {
        return {
          content: [{ type: 'image' as const, data: 'aGk=', mimeType: 'image/png' }],
          details: null
        };
      }
    });
    const tool = toDshTool(image);
    const rendered = tool.output.render(
      {},
      { content: [{ type: 'image', data: 'aGk=', mimeType: 'image/png' }] }
    );
    expect(rendered).toEqual([
      { type: 'text', text: '{"type":"image","data":"aGk=","mimeType":"image/png"}' }
    ]);
  });

  it('binds a whole tool set in order', () => {
    expect(toDshTools([echo, echo]).map((tool) => tool.name)).toEqual(['echo', 'echo']);
  });
});

describe('convertDshParameters', () => {
  it('reports the constraints it dropped', () => {
    const { dropped } = convertDshParameters(
      z.object({ id: z.string().uuid(), rows: z.array(z.string()).min(1) })
    );
    expect(dropped).toContain('properties.id.format');
    expect(dropped).toContain('properties.rows.minItems');
  });

  it('keeps enums, consts, nested objects and arrays', () => {
    const { parameters } = convertDshParameters(
      z.object({
        action: z.enum(['list', 'create']),
        table: z.object({ name: z.string(), columns: z.array(z.string()) })
      })
    );
    expect(parameters.properties?.action?.enum).toEqual(['list', 'create']);
    expect(parameters.properties?.table?.properties?.columns).toEqual({
      type: 'array',
      items: { type: 'string' }
    });
  });

  it('never leaves `required` naming a property it dropped', () => {
    const { parameters } = convertDshParameters(z.object({ id: z.string() }).catchall(z.string()));
    for (const name of parameters.required ?? []) {
      expect(Object.keys(parameters.properties ?? {})).toContain(name);
    }
  });

  it('converts a disjoint union to dsh’s oneOf', () => {
    const { parameters } = convertDshParameters(
      z.object({ value: z.union([z.string(), z.number()]), note: z.string().nullable() })
    );
    expect(parameters.properties?.value?.oneOf).toEqual([{ type: 'string' }, { type: 'number' }]);
    expect(parameters.properties?.note?.oneOf).toEqual([{ type: 'string' }, { type: 'null' }]);
  });

  it('opens an overlapping union rather than one dsh would reject', () => {
    const { parameters, dropped } = convertDshParameters(
      z.object({
        target: z.union([z.object({ table: z.string() }), z.object({ view: z.string() })])
      })
    );
    expect(parameters.properties?.target).toEqual({});
    expect(dropped).toContain('properties.target.anyOf');
  });

  it('converts every Constructive db tool into dsh’s subset', () => {
    for (const tool of constructiveDbTools) {
      const { parameters } = convertDshParameters(tool.parameters);
      expect(parameters.type).toBe('object');
      expect(inSubset(parameters)).toEqual([]);
    }
  });

  it('refuses a non-object root rather than opening the schema', () => {
    expect(() => convertDshParameters(z.string())).toThrow(/must be an object schema/);
  });

  it('refuses a $ref rather than handing dsh a reference it cannot read', () => {
    type Node = { name: string; children: Node[] };
    const node: z.ZodType<Node> = z.lazy(() =>
      z.object({ name: z.string(), children: z.array(node) })
    );
    expect(() => convertDshParameters(z.object({ root: node }))).toThrow(/\$ref/);
  });
});
