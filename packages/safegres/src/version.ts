import { getPackageVersion } from '@inquirerer/utils';

/**
 * The analyzer version stamped into every report and into the SARIF tool
 * record. Read from package.json the same way the CLI reads it, rather than
 * held in a generated constant: a constant only stays true if a sync step runs
 * on the same commit lerna bumps the manifest, and it drifted (1.16.1 against a
 * 1.18.0 manifest) precisely because it doesn't.
 */
export const version = getPackageVersion(__dirname);
