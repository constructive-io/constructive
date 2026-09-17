import fs from 'fs';
import os from 'os';
import path from 'path';

import { addToCiMatrix, addToMatrixYaml } from '../../src/core/ci-matrix';

const workflow = (matrix: string) => `name: CI
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        # \`pgpm init\` keeps this list sorted.
${matrix}
    steps:
      - uses: actions/checkout@v4
        with:
          package: not-a-matrix
      - run: cd ./\${{ matrix.package }} && pnpm test
`;

const flowWorkflow = workflow('        package: [packages/beta]');

describe('addToMatrixYaml', () => {
  it('adds to a flow sequence in sorted order', () => {
    expect(addToMatrixYaml(flowWorkflow, 'packages/alpha')).toBe(
      workflow('        package: [packages/alpha, packages/beta]')
    );
  });

  it('fills an empty array', () => {
    expect(addToMatrixYaml(workflow('        package: []'), 'packages/alpha')).toBe(
      workflow('        package: [packages/alpha]')
    );
  });

  it('adds to a block sequence in sorted order', () => {
    const source = workflow(
      ['        package:', '          - packages/beta', '          - packages/delta'].join('\n')
    );
    expect(addToMatrixYaml(source, 'packages/charlie')).toBe(
      workflow(
        [
          '        package:',
          '          - packages/beta',
          '          - packages/charlie',
          '          - packages/delta'
        ].join('\n')
      )
    );
  });

  it('is a no-op when the entry is already listed', () => {
    expect(addToMatrixYaml(flowWorkflow, 'packages/beta')).toBe(flowWorkflow);
  });

  it('keeps existing entries verbatim, quotes only what needs it', () => {
    expect(
      addToMatrixYaml(workflow(`        package: ['packages/beta']`), 'packages/alpha')
    ).toBe(workflow(`        package: [packages/alpha, 'packages/beta']`));
  });

  it('updates the matrix of every job that has one', () => {
    const source = `name: CI
jobs:
  test:
    strategy:
      matrix:
        package: [packages/beta]
  lint:
    strategy:
      matrix:
        package:
          - packages/beta
`;
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(`name: CI
jobs:
  test:
    strategy:
      matrix:
        package: [packages/alpha, packages/beta]
  lint:
    strategy:
      matrix:
        package:
          - packages/alpha
          - packages/beta
`);
  });

  it('ignores a `package` key that is not a job matrix', () => {
    const source = `name: CI
env:
  package: packages/beta
jobs:
  test:
    steps:
      - uses: some/action@v1
        with:
          package: [packages/beta]
`;
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(source);
  });

  it('leaves a matrix that is not a plain list of strings alone', () => {
    const source = `name: CI
jobs:
  test:
    strategy:
      matrix:
        package: \${{ fromJSON(needs.discover.outputs.packages) }}
`;
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(source);
  });

  it('leaves an unparseable workflow alone', () => {
    const source = 'jobs:\n  test:\n   :\n  - broken: [\n';
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
    ).toBe(workflow('        package: [packages/alpha, packages/beta]'));
  });

  it('does nothing when the workspace has no workflows', () => {
    expect(addToCiMatrix(workspace, 'packages/alpha')).toEqual([]);
  });
});
