import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadConfig } from '../src/config';
import { materializeDbTools } from '../src/db-tools';

describe('materializeDbTools', () => {
  let home: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-dbtools-'));
  });

  afterEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('writes a loadable extension entry into <agentDir>/extensions', () => {
    const config = loadConfig(home);
    const file = materializeDbTools(config, () => {});
    expect(file).toBe(path.join(config.agentDir, 'extensions', 'constructive-db-tools.js'));
    expect(fs.existsSync(file!)).toBe(true);

    // The generated file bakes in an absolute @agentic-kit/pi entry and
    // evaluates to the extension factory (pi loads it via jiti with CJS interop).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const factory = require(file!);
    expect(typeof factory).toBe('function');

    const registered: string[] = [];
    factory({
      registerTool: (tool: { name: string }) => registered.push(tool.name),
      on: () => {}
    });
    expect(registered).toContain('provision_database');
    expect(registered).toHaveLength(16);
  });

  it('signals a signed-out host until CONSTRUCTIVE_* env vars are set', () => {
    const config = loadConfig(home);
    const file = materializeDbTools(config, () => {});
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(file!);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getHost } = require('@agentic-kit/pi');

    const prev = { ...process.env };
    try {
      delete process.env.CONSTRUCTIVE_USER_ID;
      delete process.env.CONSTRUCTIVE_ACCESS_TOKEN;
      expect(getHost().account()).toBeNull();

      process.env.CONSTRUCTIVE_USER_ID = 'u1';
      process.env.CONSTRUCTIVE_ACCESS_TOKEN = 't1';
      process.env.CONSTRUCTIVE_API_ENDPOINT = 'http://api.localhost:3000/graphql';
      expect(getHost().account()).toMatchObject({ userId: 'u1', accessToken: 't1' });
      expect(getHost().backendConfig()).toMatchObject({
        apiEndpoint: 'http://api.localhost:3000/graphql'
      });
    } finally {
      process.env = prev;
    }
  });
});
