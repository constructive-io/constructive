import path from 'node:path';

import { z } from 'zod';

import { defineHarnessTool, type HarnessTool } from '../src';

const greetTool = defineHarnessTool({
  name: 'greet',
  label: 'Greet',
  description: 'Greet whoever the caller names.',
  parameters: z.object({ name: z.string(), loudly: z.boolean().optional() }),
  async execute(params, ctx) {
    const greeting = `hello ${params.name} from ${ctx.cwd}`;
    return {
      content: [{ type: 'text', text: params.loudly ? greeting.toUpperCase() : greeting }],
      details: { greeted: params.name },
    };
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
    const tools: HarnessTool[] = [greetTool];

    expect(tools.map((tool) => tool.name)).toEqual(['greet']);
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
