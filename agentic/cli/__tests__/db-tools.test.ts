import { constructiveDbTools } from '@agentic-kit/pi';
import {
  addBackend,
  backendFromEndpoints,
  OVERRIDE_ENV_VARS,
  saveSession,
  selectBackend
} from '@agentic-kit/session';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadConfig } from '../src/config';
import { materializeDbTools } from '../src/db-tools';

describe('materializeDbTools', () => {
  let home: string;
  let prevEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-dbtools-'));
    prevEnv = { ...process.env };
    process.env.CONSTRUCTIVE_STASH_DIR = home;
    for (const name of OVERRIDE_ENV_VARS) delete process.env[name];
  });

  afterEach(() => {
    process.env = prevEnv;
    fs.rmSync(home, { recursive: true, force: true });
  });

  function registeredTools(): string[] {
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
    return registered;
  }

  it('registers every db tool except add_records (row data needs a tenant sign-in the CLI lacks) and create_api_key (a minted key needs secret delivery the CLI lacks)', () => {
    const expected = constructiveDbTools.map((tool) => tool.name).filter((name) => name !== 'add_records' && name !== 'create_api_key');
    expect(registeredTools().sort()).toEqual(expected.sort());
  });

  function loadHost() {
    const config = loadConfig(home);
    const file = materializeDbTools(config, () => {});
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(file!);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getHost } = require('@agentic-kit/pi');
    return getHost();
  }

  it('reads the session stored under CONSTRUCTIVE_STASH_DIR per call', () => {
    const host = loadHost();
    expect(host.account()).toBeNull();

    const { store } = loadConfig(home);
    selectBackend(store, addBackend(store, backendFromEndpoints({ api: 'https://api.example.com/graphql' })).name);
    saveSession(store, { userId: 'stored-user', email: 'dev@example.com', accessToken: 'stored-token', signedInAt: 1, issuedFor: backendFromEndpoints({ api: 'https://api.example.com/graphql' }) });

    expect(host.account()).toMatchObject({ userId: 'stored-user', accessToken: 'stored-token' });
    expect(host.backendConfig()).toMatchObject({ apiEndpoint: 'https://api.example.com/graphql' });
  });

  it('bakes the sign-in hint for pi failure reasons', () => {
    expect(loadHost().signInHint).toBe('Run `agent login` to sign in.');
  });

  it('surfaces `agent login` in the signed-out pi context reason', async () => {
    loadHost();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resolveProjectContext } = require('@agentic-kit/pi');

    const project = path.join(home, 'project');
    fs.mkdirSync(project);
    fs.writeFileSync(path.join(project, '.env'), 'DATABASE_ID=0190f1a0-0000-7000-8000-000000000001\n');

    const result = await resolveProjectContext(project);
    expect(result.context).toBeNull();
    expect(result.code).toBe('missing-credentials');
    expect(result.reason).toContain('Run `agent login` to sign in.');
  });

  const boundProject = () => {
    const project = path.join(home, 'project');
    fs.mkdirSync(project);
    fs.writeFileSync(path.join(project, '.env'), 'DATABASE_ID=0190f1a0-0000-7000-8000-000000000001\n');
    return project;
  };

  it.each([
    ['a credential without an api endpoint', { CONSTRUCTIVE_USER_ID: 'u1', CONSTRUCTIVE_ACCESS_TOKEN: 'secret-token' }],
    ['a plane variable alone', { CONSTRUCTIVE_MODULES_ENDPOINT: 'https://modules.example.com/graphql' }]
  ])('reports no-backend naming CONSTRUCTIVE_API_ENDPOINT for %s, not a missing sign-in', async (_name, env) => {
    loadHost();
    Object.assign(process.env, env);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resolveProjectContext } = require('@agentic-kit/pi');

    const result = await resolveProjectContext(boundProject());
    expect(result.context).toBeNull();
    expect(result.code).toBe('no-backend');
    expect(result.reason).toContain('CONSTRUCTIVE_API_ENDPOINT');
    expect(result.reason).not.toContain('secret-token');
  });

  it('names the missing plane and `agent login` for a context another app wrote', async () => {
    loadHost();
    const { store } = loadConfig(home);
    const api = 'http://api.localhost/graphql';
    store.createContext('localnet', {
      endpoint: api,
      targets: { api: { endpoint: api }, auth: { endpoint: 'http://auth.localhost/graphql' }, modules: { endpoint: 'http://modules.localhost/graphql' }, agent: { endpoint: 'http://agent.localhost/graphql' } }
    });
    store.setCurrentContext('localnet');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resolveProjectContext } = require('@agentic-kit/pi');

    const result = await resolveProjectContext(boundProject());
    expect(result.code).toBe('no-backend');
    expect(result.reason).toMatch(/"localnet" lacks the compute endpoint.*`agent login`/);
  });

  it('says a stored session was issued by another backend instead of only asking to sign in', async () => {
    loadHost();
    const { store } = loadConfig(home);
    selectBackend(store, addBackend(store, backendFromEndpoints({ api: 'https://api.example.com/graphql' })).name);
    saveSession(store, { userId: 'u', email: 'e', accessToken: 'secret-token', signedInAt: 1, issuedFor: backendFromEndpoints({ api: 'http://api.a.localhost/graphql' }) });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resolveProjectContext } = require('@agentic-kit/pi');

    const result = await resolveProjectContext(boundProject());
    expect(result.context).toBeNull();
    expect(result.reason).toContain('was issued for another backend');
    expect(result.reason).toContain('the session was issued for http://api.a.localhost/graphql');
    expect(result.reason).not.toContain('secret-token');
  });
});
