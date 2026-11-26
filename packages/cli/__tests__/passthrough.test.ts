import { PassThrough } from 'stream';

const mockLoaded: string[] = [];
const mockRunCodegenHandler = jest.fn(async (_argv: unknown, _prompter: unknown): Promise<void> => undefined);

jest.mock('@constructive-io/graphql-server', () => {
  mockLoaded.push('@constructive-io/graphql-server');
  return { GraphQLServer: jest.fn() };
});
jest.mock('@constructive-io/graphql-explorer', () => {
  mockLoaded.push('@constructive-io/graphql-explorer');
  return { GraphQLExplorer: jest.fn() };
});
jest.mock('@constructive-io/graphql-codegen', () => {
  mockLoaded.push('@constructive-io/graphql-codegen');
  return { runCodegenHandler: (argv: unknown, prompter: unknown) => mockRunCodegenHandler(argv, prompter) };
});

import { createConstructiveCli } from '../src/cli';

const io = () => ({ stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), env: {} });

const printed = (stream: PassThrough): string => String(stream.read() ?? '');

describe('passthrough commands', () => {
  it('does not load the server, explorer or codegen packages at start-up', async () => {
    const cli = createConstructiveCli();
    expect(await cli.run(['--help'], io())).toBe(0);
    expect(await cli.run(['--llms', '--json'], io())).toBe(0);
    expect(mockLoaded).toEqual([]);
  });

  it('prints nothing of its own once the command returns, also when stdout is not a terminal', async () => {
    const streams = io();
    expect(await createConstructiveCli().run(['codegen', '--endpoint', 'http://api.localhost/graphql'], streams)).toBe(0);
    expect(printed(streams.stdout)).toBe('');
  });

  it('loads codegen only when it runs, and hands it the raw flags', async () => {
    const code = await createConstructiveCli().run(['codegen', '--endpoint', 'http://api.localhost/graphql', '--orm'], io());
    expect(code).toBe(0);
    expect(mockLoaded).toEqual(['@constructive-io/graphql-codegen']);
    expect(mockRunCodegenHandler).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'http://api.localhost/graphql', orm: true }),
      expect.anything()
    );
  });

  it.each(['server', 'explorer', 'codegen'])('answers %s --schema and --help without starting anything (review M3 L6)', async (name) => {
    mockRunCodegenHandler.mockClear();
    const schema = io();
    expect(await createConstructiveCli().run([name, '--schema'], schema)).toBe(0);
    expect(JSON.parse(printed(schema.stdout)).data).toMatchObject({ command: name, passthrough: true, input: null });

    const help = io();
    expect(await createConstructiveCli().run([name, '--help', '--format', 'text'], help)).toBe(0);
    expect(printed(help.stdout)).toContain(`constructive ${name} [OPTIONS]`);
    expect(mockRunCodegenHandler).not.toHaveBeenCalled();
    const { GraphQLServer } = jest.requireMock('@constructive-io/graphql-server');
    const { GraphQLExplorer } = jest.requireMock('@constructive-io/graphql-explorer');
    expect(GraphQLServer).not.toHaveBeenCalled();
    expect(GraphQLExplorer).not.toHaveBeenCalled();
  });
});
