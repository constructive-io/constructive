import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import docker from '../src/commands/docker';

jest.mock('child_process', () => ({ spawn: jest.fn() }));
jest.mock('../src/utils/doctor', () => ({
  getDockerStatus: jest.fn().mockResolvedValue({ binary: true, daemon: true })
}));

const spawnMock = jest.mocked(spawn);

function reply(stdout = '', code = 0, stderr = '') {
  spawnMock.mockImplementationOnce(() => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter()
    });
    queueMicrotask(() => {
      child.stdout.emit('data', stdout);
      child.stderr.emit('data', stderr);
      child.emit('close', code);
    });
    return child as ReturnType<typeof spawn>;
  });
}

function commands() {
  return spawnMock.mock.calls.map(([, args]) => args);
}

beforeEach(() => {
  spawnMock.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('pgpm docker PostgreSQL ownership', () => {
  it.each([
    ['start', true, true, ''],
    ['start', true, false, ''],
    ['start', false, false, 'fun'],
    ['stop', false, true, ''],
    ['stop', false, false, '']
  ])('refuses %s (recreate=%s, running=%s, owner=%s)', async (action, recreate, running, owner) => {
    reply(`foreign-id ${running} ${owner}`);
    await expect(docker({ _: [action], recreate }, undefined, undefined)).rejects.toThrow(
      'is not managed by pgpm'
    );
    expect(commands()).toEqual([expect.arrayContaining(['container', 'inspect', 'postgres'])]);
  });

  it.each([true, false])('recreates a labeled container (running=%s)', async (running) => {
    reply(`owned-id ${running} pgpm`);
    reply();
    reply();
    await docker({ _: ['start'], recreate: true }, undefined, undefined);
    expect(commands()).toEqual([
      expect.arrayContaining(['container', 'inspect', 'postgres']),
      ['rm', '-f', 'owned-id'],
      expect.arrayContaining(['run', '--label', 'io.constructive.managed-by=pgpm'])
    ]);
  });

  it('creates a labeled container when no container has that name', async () => {
    reply('', 1, 'Error response from daemon: No such container: postgres');
    reply();
    await docker({ _: ['start'] }, undefined, undefined);
    expect(commands()[1]).toEqual(expect.arrayContaining(['run', '--label', 'io.constructive.managed-by=pgpm']));
  });

  it.each([
    ['start', false],
    ['stop', true]
  ])('uses the inspected ID for %s', async (action, running) => {
    reply(`owned-id ${running} pgpm`);
    reply();
    await docker({ _: [action] }, undefined, undefined);
    expect(commands()[1]).toEqual([action, 'owned-id']);
  });

  it('does not stop an optional service owned by somebody else', async () => {
    reply('owned-id false pgpm');
    reply('foreign-id true');
    await expect(docker({ _: ['stop'], rustfs: true }, undefined, undefined)).rejects.toThrow(
      'Container "rustfs" is not managed by pgpm'
    );
    expect(commands()).toEqual([
      expect.arrayContaining(['inspect', 'postgres']),
      expect.arrayContaining(['inspect', 'rustfs'])
    ]);
  });
});
