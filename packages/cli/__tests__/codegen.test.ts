import type { ParsedArgs } from 'inquirerer';

import codegenCommand from '../src/commands/codegen';

const mockRunCodegenHandler = jest.fn<Promise<void>, [Record<string, unknown>, unknown]>();

jest.mock('@constructive-io/graphql-codegen', () => ({
  runCodegenHandler: (argv: Record<string, unknown>, prompter: unknown) => mockRunCodegenHandler(argv, prompter),
}));

const createMockPrompter = () => ({
  prompt: jest.fn(async (argv: any) => argv),
});

describe('codegen command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to runCodegenHandler for endpoint flow', async () => {
    const argv: Partial<ParsedArgs> = {
      endpoint: 'http://localhost:3000/graphql',
      authorization: 'Bearer testtoken',
      output: 'graphql/codegen/dist',
      verbose: true,
      dryRun: true,
      reactQuery: true,
    };
    const mockPrompter = createMockPrompter();

    await codegenCommand(argv, mockPrompter as any, {} as any);

    expect(mockRunCodegenHandler).toHaveBeenCalledWith(argv, mockPrompter);
  });

  it('delegates to runCodegenHandler for db options', async () => {
    const argv: Partial<ParsedArgs> = {
      schemas: 'public,app',
      output: 'graphql/codegen/dist',
      reactQuery: true,
    };
    const mockPrompter = createMockPrompter();

    await codegenCommand(argv, mockPrompter as any, {} as any);

    expect(mockRunCodegenHandler).toHaveBeenCalledWith(argv, mockPrompter);
  });
});
