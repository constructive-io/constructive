/**
 * Test for formatOutput function
 * Verifies that prettier formats generated code correctly
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { formatOutput } from '../../cli/commands/generate';

describe('formatOutput', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-format-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('formats TypeScript files with prettier options', () => {
    // Write unformatted code (double quotes, missing semicolons)
    const unformatted = `const x = "hello"
const obj = {a: 1,b: 2}
`;
    fs.writeFileSync(path.join(tempDir, 'test.ts'), unformatted);

    const result = formatOutput(tempDir);

    expect(result.success).toBe(true);

    // Verify formatting applied (single quotes, semicolons added)
    const formatted = fs.readFileSync(path.join(tempDir, 'test.ts'), 'utf-8');
    expect(formatted).toContain("'hello'");
    expect(formatted).toContain(';');
  });
});
