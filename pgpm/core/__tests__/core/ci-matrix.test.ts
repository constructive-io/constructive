import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseDocument, visit } from 'yaml';

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

const commentMultiset = (source: string): string[] => {
  const doc = parseDocument(source);
  const comments: string[] = [];
  const add = (comment: string | null | undefined, multiline = false) => {
    if (comment === null || comment === undefined) return;
    const values = multiline ? comment.split('\n') : [comment];
    comments.push(...values.map((value) => value.trim()));
  };

  add(doc.comment);
  add(doc.commentBefore, true);
  if (doc.contents) {
    visit(doc.contents, (_key, node) => {
      if (!node || typeof node !== 'object') return;
      const commented = node as {
        comment?: string | null;
        commentBefore?: string | null;
      };
      add(commented.comment);
      add(commented.commentBefore, true);
    });
  }
  return comments.sort();
};

const commentInvariantCases: [string, string][] = [
  [
    'flow, extra spaces',
    `jobs:
  test:
    strategy:
      matrix:
        package: [  packages/beta ,   packages/delta  ]
`
  ],
  [
    'flow, multiline',
    `jobs:
  test:
    strategy:
      matrix:
        package: [
          packages/beta,
          packages/delta
        ]
`
  ],
  [
    'flow, trailing comma + comment',
    `jobs:
  test:
    strategy:
      matrix:
        package: [packages/beta, packages/delta] # keep sorted
`
  ],
  [
    'block, comment between items',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          # the api
          - packages/beta
          - packages/delta
`
  ],
  [
    'block, inline comments',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          - packages/beta   # api
          - packages/delta  # web
`
  ],
  [
    'block, blank line between items',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          - packages/beta

          - packages/delta
`
  ],
  [
    'block, 2-space indent',
    `jobs:
  test:
    strategy:
      matrix:
        package:
        - packages/beta
        - packages/delta
`
  ],
  [
    'quoted with spaces in value',
    `jobs:
  test:
    strategy:
      matrix:
        package: ["packages/my thing", 'packages/delta']
`
  ],
  [
    'block, quoted',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          - "packages/beta"
          - 'packages/delta'
`
  ],
  [
    'flow, empty with spaces',
    `jobs:
  test:
    strategy:
      matrix:
        package: [ ]
`
  ],
  [
    'CRLF',
    `jobs:\r
  test:\r
    strategy:\r
      matrix:\r
        package: [packages/beta]\r
`
  ],
  [
    'matrix with other keys after',
    `jobs:
  test:
    strategy:
      matrix:
        package: [packages/beta]
        node: [20, 22]
`
  ],
  [
    'block, other key after',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          - packages/beta
        node: [20]
`
  ],
  [
    'anchor',
    `jobs:
  test:
    strategy:
      matrix:
        package: &pkgs [packages/beta]
`
  ],
  [
    'entry equals existing but quoted',
    `jobs:
  test:
    strategy:
      matrix:
        package: ['packages/alpha', packages/beta]
`
  ],
  [
    'comment after last block item',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          - packages/beta
          - packages/delta # last
`
  ],
  [
    'comment above package key',
    `jobs:
  test:
    strategy:
      matrix:
        # package list
        package: [packages/beta, packages/delta]
`
  ],
  [
    'hash inside quoted flow value',
    `jobs:
  test:
    strategy:
      matrix:
        package: ["packages/#beta", packages/delta]
`
  ],
  [
    'hash inside quoted block value',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          - "packages/#beta"
          - packages/delta
`
  ],
  [
    'blank line and comment above first item',
    `jobs:
  test:
    strategy:
      matrix:
        package:

          # first
          - packages/beta
          - packages/delta
`
  ],
  [
    'two-line comment block above first item',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          # first
          # item
          - packages/beta
          - packages/delta
`
  ],
  [
    'comment above item two',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          - packages/beta
          # second
          - packages/delta
`
  ],
  [
    'comment on last line',
    `jobs:
  test:
    strategy:
      matrix:
        package:
          - packages/beta
          - packages/delta # end`
  ],
  [
    'null matrix',
    `jobs:
  test:
    strategy:
      matrix:
        package: null
`
  ],
  [
    'commented multiline flow',
    `jobs:
  test:
    strategy:
      matrix:
        package: [
          packages/beta, # beta
          packages/delta
        ]
`
  ]
];

describe('addToMatrixYaml', () => {
  it.each(commentInvariantCases)(
    'preserves the comment multiset for %s',
    (_name, source) => {
      const output = addToMatrixYaml(source, 'packages/alpha');
      expect(commentMultiset(output)).toEqual(commentMultiset(source));
    }
  );

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

  it('keeps trailing comments attached to their entries', () => {
    const source = workflow(
      [
        '        package:',
        '          - packages/beta   # api',
        '          - packages/delta  # web'
      ].join('\n')
    );
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(
      workflow(
        [
          '        package:',
          '          - packages/alpha',
          '          - packages/beta  # api',
          '          - packages/delta  # web'
        ].join('\n')
      )
    );
  });

  it('moves a comment line with its block entry', () => {
    const source = workflow(
      [
        '        package:',
        '          # the api',
        '          - packages/beta',
        '          - packages/delta'
      ].join('\n')
    );
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(
      workflow(
        [
          '        package:',
          '          - packages/alpha',
          '          # the api',
          '          - packages/beta',
          '          - packages/delta'
        ].join('\n')
      )
    );
  });

  it('moves an inter-item comment with its block entry', () => {
    const source = workflow(
      [
        '        package:',
        '          - packages/beta',
        '          # the web',
        '          - packages/delta'
      ].join('\n')
    );
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(
      workflow(
        [
          '        package:',
          '          - packages/alpha',
          '          - packages/beta',
          '          # the web',
          '          - packages/delta'
        ].join('\n')
      )
    );
  });

  it('preserves multiline flow formatting', () => {
    const source = workflow(
      [
        '        package: [',
        '          packages/beta,',
        '          packages/delta',
        '        ]'
      ].join('\n')
    );
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(
      workflow(
        [
          '        package: [',
          '          packages/alpha,',
          '          packages/beta,',
          '          packages/delta',
          '        ]'
        ].join('\n')
      )
    );
  });

  it('leaves a flow sequence with comments untouched', () => {
    const source = workflow('        package: [packages/beta, packages/delta] # keep');
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(source);
  });

  it('leaves a flow item with a comment untouched', () => {
    const source = workflow('        package: [packages/beta, packages/delta] # keep');
    const commented = source.replace(
      'package: [packages/beta, packages/delta]',
      `package: [packages/beta, # keep beta
          packages/delta]`
    );
    expect(addToMatrixYaml(commented, 'packages/alpha')).toBe(commented);
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

  it('keeps CRLF workflows unchanged outside the matrix edit', () => {
    const source = `name: CI\r\njobs:\r\n  test:\r\n    strategy:\r\n      matrix:\r\n        package: [packages/beta]\r\n`;
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(
      `name: CI\r\njobs:\r\n  test:\r\n    strategy:\r\n      matrix:\r\n        package: [packages/alpha, packages/beta]\r\n`
    );
  });

  it('keeps anchors and sibling matrix keys intact', () => {
    const source = `jobs:
  test:
    strategy:
      matrix:
        package: &pkgs [packages/beta]
        node: [20, 22]
`;
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(`jobs:
  test:
    strategy:
      matrix:
        package: &pkgs [packages/alpha, packages/beta]
        node: [20, 22]
`);
  });

  it('keeps quoted values containing spaces', () => {
    const source = workflow(
      `        package: ["packages/my thing", 'packages/delta']`
    );
    expect(addToMatrixYaml(source, 'packages/alpha')).toBe(
      workflow(`        package: [packages/alpha, 'packages/delta', "packages/my thing"]`)
    );
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
