import assert from 'node:assert/strict';

import { childEnv, runCommand } from '../../src/pipeline/command';

test('a build command gets no provider key or token from the desktop', async () => {
  const planted = {
    ANTHROPIC_API_KEY: 'sk-ant-api03-plantedplantedplantedplanted',
    OPENAI_API_KEY: 'sk-plantedplantedplantedplantedplanted',
    GITHUB_TOKEN: 'ghp_plantedplantedplantedplantedplanted00',
    CONSTRUCTIVE_ACCESS_TOKEN: 'planted-access-token-value-1234567890',
  };
  const saved = Object.fromEntries(Object.keys(planted).map((k) => [k, process.env[k]]));
  Object.assign(process.env, planted);
  try {
    const env = childEnv({ PORT: '4321', NODE_ENV: undefined });
    for (const name of Object.keys(planted)) assert.equal(env[name], undefined, name);
    assert.equal(env.PATH, process.env.PATH);
    assert.equal(env.PORT, '4321');
    assert.ok(!('NODE_ENV' in env));

    // And through a real child process.
    const result = await runCommand(
      process.execPath,
      ['-e', 'console.log(JSON.stringify(process.env))'],
      {
        cwd: process.cwd(),
      },
    );
    const seen = JSON.parse(result.output) as Record<string, string>;
    for (const [name, value] of Object.entries(planted)) {
      assert.equal(seen[name], undefined, name);
      assert.ok(!result.output.includes(value), `${name}'s value`);
    }
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("a build command never gets the host's NODE_ENV, so pnpm install keeps the dev dependencies", async () => {
  const saved = process.env.NODE_ENV;
  // A cloud Job's image runs with NODE_ENV=production.
  process.env.NODE_ENV = 'production';
  try {
    assert.ok(!('NODE_ENV' in childEnv()));
    assert.ok(!('NODE_ENV' in childEnv({ PORT: '4321' })));
    // A command that needs a mode says so.
    assert.equal(childEnv({ NODE_ENV: 'test' }).NODE_ENV, 'test');

    const result = await runCommand(
      process.execPath,
      ['-e', 'process.stdout.write(process.env.NODE_ENV ?? "unset")'],
      { cwd: process.cwd() }
    );
    assert.equal(result.output, 'unset');
  } finally {
    if (saved === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved;
  }
});
