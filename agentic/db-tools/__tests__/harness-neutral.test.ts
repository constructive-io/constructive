import { execFileSync } from 'node:child_process';
import path from 'node:path';

const packageRoot = path.join(__dirname, '..');

describe('the db tools package', () => {
  it('names no harness in its dependencies', () => {
    const pkg = require(path.join(packageRoot, 'package.json')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = Object.keys({
      ...pkg.dependencies,
      ...pkg.peerDependencies,
      ...pkg.devDependencies
    });

    expect(deps.filter((dep) => dep.startsWith('@earendil-works/'))).toEqual([]);
    expect(deps).not.toContain('@agentic-kit/pi');
  });

  it('imports no harness SDK in any source file', () => {
    // grep -l exits 1 with no output when nothing matches, which is the pass.
    let matches = '';
    try {
      matches = execFileSync(
        'grep',
        [
          '-rlE',
          "(from|require\\()\\s*'(@earendil-works/|@agentic-kit/pi)",
          'src'
        ],
        { cwd: packageRoot, encoding: 'utf8' }
      );
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status !== 1) throw err;
    }

    expect(matches.trim()).toBe('');
  });
});
