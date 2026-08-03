import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { saveSession } from '../src/account-store';
import { BACKEND_PRESETS, saveBackendConfig } from '../src/backend-store';
import { loadConfig } from '../src/config';
import { materializeDbTools } from '../src/db-tools';

const CONSTRUCTIVE_VARS = [
  'CONSTRUCTIVE_USER_ID',
  'CONSTRUCTIVE_ACCESS_TOKEN',
  'CONSTRUCTIVE_API_KEY',
  'CONSTRUCTIVE_API_ENDPOINT',
  'CONSTRUCTIVE_MODULES_ENDPOINT'
];

describe('materializeDbTools', () => {
  let home: string;
  let prevEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-dbtools-'));
    prevEnv = { ...process.env };
    process.env.AGENT_HOME = home;
    for (const name of CONSTRUCTIVE_VARS) delete process.env[name];
  });

  afterEach(() => {
    process.env = prevEnv;
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
    expect(registered).toHaveLength(18);
  });

  function loadHost() {
    const config = loadConfig(home);
    const file = materializeDbTools(config, () => {});
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(file!);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getHost } = require('@agentic-kit/pi');
    return { config, host: getHost() };
  }

  it('signals a signed-out host until env vars or a stored session exist', () => {
    const { host } = loadHost();
    expect(host.account()).toBeNull();
    expect(host.backendConfig()).toBeUndefined();

    process.env.CONSTRUCTIVE_USER_ID = 'u1';
    process.env.CONSTRUCTIVE_ACCESS_TOKEN = 't1';
    process.env.CONSTRUCTIVE_API_ENDPOINT = 'http://api.localhost:3000/graphql';
    expect(host.account()).toMatchObject({ userId: 'u1', accessToken: 't1' });
    expect(host.backendConfig()).toMatchObject({
      apiEndpoint: 'http://api.localhost:3000/graphql'
    });
  });

  it('reads the stored session and backend per call when env vars are absent', () => {
    const { config, host } = loadHost();
    expect(host.account()).toBeNull();

    saveSession(config.accountFile, {
      userId: 'stored-user',
      email: 'dev@example.com',
      accessToken: 'stored-token',
      apiKey: 'stored-key',
      signedInAt: 1
    });
    saveBackendConfig(config.backendFile, BACKEND_PRESETS.devnet);

    expect(host.account()).toEqual({
      userId: 'stored-user',
      accessToken: 'stored-token',
      apiKey: 'stored-key'
    });
    expect(host.backendConfig()).toEqual({
      apiEndpoint: BACKEND_PRESETS.devnet.apiEndpoint,
      modulesEndpoint: BACKEND_PRESETS.devnet.modulesEndpoint
    });
  });

  it('lets env vars beat the stored session', () => {
    const { config, host } = loadHost();
    saveSession(config.accountFile, {
      userId: 'stored-user',
      email: 'dev@example.com',
      accessToken: 'stored-token',
      signedInAt: 1
    });

    process.env.CONSTRUCTIVE_USER_ID = 'env-user';
    process.env.CONSTRUCTIVE_ACCESS_TOKEN = 'env-token';
    expect(host.account()).toMatchObject({ userId: 'env-user', accessToken: 'env-token' });
  });

  it('bakes the sign-in hint for pi failure reasons', () => {
    const { host } = loadHost();
    expect(host.signInHint).toBe('Run `agent login` to sign in.');
  });

  it('surfaces `agent login` in the signed-out pi context reason', async () => {
    loadHost();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resolveProjectContext } = require('@agentic-kit/pi');

    const project = path.join(home, 'project');
    fs.mkdirSync(project);
    fs.writeFileSync(path.join(project, '.env'), 'ACCESS_TOKEN=x\nDATABASE_ID=db1\n');

    const result = await resolveProjectContext(project);
    expect(result.context).toBeNull();
    expect(result.code).toBe('missing-credentials');
    expect(result.reason).toContain('Run `agent login` to sign in.');
  });
});
