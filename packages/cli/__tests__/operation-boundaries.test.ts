import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('registry operation boundaries', () => {
  it('does not access mutable process state from command modules', () => {
    const runtimeDirectory = join(__dirname, '..', 'src', 'runtime');
    const violations = readdirSync(runtimeDirectory)
      .filter((file) => file.endsWith('.ts'))
      .flatMap((file) => {
        const source = readFileSync(join(runtimeDirectory, file), 'utf8');
        return [
          ...source.matchAll(
            /(?:process\.(?:chdir|cwd|env|exit|exitCode)|console\.(?:debug|error|info|log|warn))\b/g
          ),
        ].map((match) => `${file}:${match.index}:${match[0]}`);
      });

    expect(violations).toEqual([]);
  });
});
