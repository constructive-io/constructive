import * as t from '@babel/types';

import { generateCode, withJsDoc } from '../src/emit/babel';

it('keeps a comment containing a JSDoc terminator inside its block', () => {
  const stmt = withJsDoc(
    t.exportNamedDeclaration(
      t.variableDeclaration('const', [t.variableDeclarator(t.identifier('x'), t.numericLiteral(1))])
    ),
    'Cron spec: {"rule": "*/5 * * * *"}'
  );
  const code = generateCode([stmt]);
  expect(code).toContain('/** Cron spec: {"rule": "*\\/5 * * * *"} */');
  expect(code).toContain('export const x = 1;');
});
