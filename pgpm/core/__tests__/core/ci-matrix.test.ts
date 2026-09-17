import fs from 'fs';
import os from 'os';
import path from 'path';

import { addToCiMatrix, addToMatrixYaml } from '../../src/core/ci-matrix';

const flowWorkflow = `name: CI
jobs:
  test:
    strategy:
      matrix:
        # \`pgpm init\` keeps this list sorted.
        package: [packages/beta]
    steps:
      - run: pnpm test
`;

describe('addToMatrixYaml', () => {
  it('adds to a flow sequence in sorted order', () => {
    expect(addToMatrixYaml(flowWorkflow, 'packages/alpha')).toContain(
      '        package: [packages/alpha, packages/beta]'
    );
  });

  it('keeps comments and the rest of the workflow', () => {
    const updated = addToMatrixYaml(flowWorkflow, 'packages/alpha');
    expect(updated).toContain('# `pgpm init` keeps this list sorted.');
    expect(updated).toContain('      - run: pnpm test');
  });

  it('fills an empty array', () => {
    expect(addToMatrixYaml('        package: []\n', 'packages/alpha')).toBe(
      '        package: [packages/alpha]\n'
    );
  });

  it('adds to a block sequence in sorted order', () => {
    const source = `      matrix:
        package:
          - packages/beta
          - packages/delta
`;
    expect(addToMatrixYaml(source, 'packages/charlie')).toBe(`      matrix:
        package:
          - packages/beta
          - packages/charlie
          - packages/delta
`);
  });

  it('is a no-op when the entry is already listed', () => {
    expect(addToMatrixYaml(flowWorkflow, 'packages/beta')).toBe(flowWorkflow);
  });

  it('leaves quoted entries unquoted but keeps their values', () => {
    expect(addToMatrixYaml(`        package: ['packages/beta']\n`, 'packages/alpha')).toBe(
      '        package: [packages/alpha, packages/beta]\n'
    );
  });

  it('leaves a workflow without the key alone', () => {
    const source = 'name: CI\njobs:\n  test:\n    steps:\n      - run: pnpm test\n';
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(source);
  });

  it('leaves a `package` mapping that is not a sequence alone', () => {
    const source = 'package:\n  name: something\n';
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(source);
  });
});

describe('addToCiMatrix', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-ci-matrix-'));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  const writeWorkflow = (name: string, contents: string) => {
    const dir = path.join(workspace, '.github', 'workflows');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), contents);
  };

  it('updates every workflow with a matrix and reports which changed', () => {
    writeWorkflow('ci.yml', flowWorkflow);
    writeWorkflow('release.yml', 'name: Release\njobs:\n  publish:\n    steps: []\n');

    const changed = addToCiMatrix(workspace, path.join('packages', 'alpha'));

    expect(changed).toEqual(['.github/workflows/ci.yml']);
    expect(
      fs.readFileSync(path.join(workspace, '.github/workflows/ci.yml'), 'utf8')
    ).toContain('package: [packages/alpha, packages/beta]');
  });

  it('does nothing when the workspace has no workflows', () => {
    expect(addToCiMatrix(workspace, 'packages/alpha')).toEqual([]);
  });
});
