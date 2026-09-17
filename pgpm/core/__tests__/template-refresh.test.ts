import { execFileSync } from 'child_process';
import fs from 'fs';
import { CacheManager } from 'genomic';
import os from 'os';
import path from 'path';

import {
  _resetTemplateRefreshMemo,
  describeTemplateSource,
  inspectTemplate,
  refreshTemplateCache,
} from '../src';
const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' });

describe('template cache refresh', () => {
  let root: string;
  let bareDir: string;
  let workDir: string;
  let cacheBaseDir: string;
  let templateRepo: string;

  beforeEach(() => {
    _resetTemplateRefreshMemo();
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-template-refresh-'));
    bareDir = path.join(root, 'template.git');
    workDir = path.join(root, 'work');
    cacheBaseDir = path.join(root, 'cache');
    fs.mkdirSync(bareDir);
    git(root, 'init', '--bare', bareDir);
    git(root, 'clone', bareDir, workDir);
    git(workDir, 'config', 'user.name', 'Template Test');
    git(workDir, 'config', 'user.email', 'template@example.com');
    fs.mkdirSync(path.join(workDir, 'module'), { recursive: true });
    fs.writeFileSync(
      path.join(workDir, 'module', '.boilerplate.json'),
      JSON.stringify({ type: 'module', requiresWorkspace: false })
    );
    git(workDir, 'add', 'module/.boilerplate.json');
    git(workDir, 'commit', '-m', 'initial template');
    git(workDir, 'branch', '-M', 'main');
    git(workDir, 'push', 'origin', 'main');
    git(bareDir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    templateRepo = `file://${bareDir}`;
  });

  afterEach(() => {
    delete process.env.PGPM_TEMPLATE_OFFLINE;
    fs.rmSync(root, { recursive: true, force: true });
    _resetTemplateRefreshMemo();
  });

  it('refreshes only when the remote revision changes or force is requested', () => {
    const first = refreshTemplateCache({
      templateRepo,
      branch: 'main',
      cacheBaseDir,
      toolName: 'pgpm-refresh-test',
    });
    expect(first.remoteSha).toMatch(/^[0-9a-f]{40}$/);
    expect(first.refreshed).toBe(true);

    const cm = new CacheManager({ toolName: 'pgpm-refresh-test', baseDir: cacheBaseDir });
    const key = cm.createKey(templateRepo, 'main');
    expect(fs.existsSync(path.join(cm.getMetadataDir(), `${key}.ref.json`))).toBe(true);

    inspectTemplate({
      fromPath: 'module',
      templateRepo,
      branch: 'main',
      cacheBaseDir,
      toolName: 'pgpm-refresh-test',
    });
    _resetTemplateRefreshMemo();
    const second = refreshTemplateCache({
      templateRepo,
      branch: 'main',
      cacheBaseDir,
      toolName: 'pgpm-refresh-test',
    });
    expect(second.refreshed).toBe(false);
    expect(fs.existsSync(path.join(cm.getReposDir(), key))).toBe(true);

    fs.writeFileSync(path.join(workDir, 'module', 'new.txt'), 'new revision\n');
    git(workDir, 'add', 'module/new.txt');
    git(workDir, 'commit', '-m', 'update template');
    git(workDir, 'push', 'origin', 'main');
    _resetTemplateRefreshMemo();
    const changed = refreshTemplateCache({
      templateRepo,
      branch: 'main',
      cacheBaseDir,
      toolName: 'pgpm-refresh-test',
    });
    expect(changed.refreshed).toBe(true);
    expect(fs.existsSync(path.join(cm.getReposDir(), key))).toBe(false);

    _resetTemplateRefreshMemo();
    const forced = refreshTemplateCache({
      templateRepo,
      branch: 'main',
      cacheBaseDir,
      toolName: 'pgpm-refresh-test',
      force: true,
    });
    expect(forced.refreshed).toBe(true);
  });

  it('keeps the cache when offline', () => {
    const info = refreshTemplateCache({
      templateRepo,
      branch: 'main',
      cacheBaseDir,
      toolName: 'pgpm-refresh-test',
    });
    const cm = new CacheManager({ toolName: 'pgpm-refresh-test', baseDir: cacheBaseDir });
    const key = cm.createKey(templateRepo, 'main');
    fs.mkdirSync(path.join(cm.getReposDir(), key), { recursive: true });

    _resetTemplateRefreshMemo();
    process.env.PGPM_TEMPLATE_OFFLINE = '1';
    const offline = refreshTemplateCache({
      templateRepo,
      branch: 'main',
      cacheBaseDir,
      toolName: 'pgpm-refresh-test',
      force: true,
    });
    expect(offline.offline).toBe(true);
    expect(offline.refreshed).toBe(false);
    expect(fs.existsSync(path.join(cm.getReposDir(), key))).toBe(true);
    expect(info.remoteSha).toBeTruthy();
  });

  it('describes an https source with its short revision and fetch age', () => {
    const source = 'https://github.com/owner/repo.git';
    const cm = new CacheManager({ toolName: 'pgpm-describe-test', baseDir: cacheBaseDir });
    const key = cm.createKey(source, 'main');
    cm.set(key, root);
    expect(
      describeTemplateSource(
        {
          repo: source,
          branch: 'main',
          remoteSha: 'abcdef1234567890abcdef1234567890abcdef12',
          refreshed: false,
          offline: false,
          local: false,
        },
        { toolName: 'pgpm-describe-test', cacheBaseDir }
      )
    ).toMatch(/^using owner\/repo@main \(abcdef1, fetched \d+s ago\)$/);
  });
});
