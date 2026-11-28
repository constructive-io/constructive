// Points appstash's default base at a temporary directory for the whole suite,
// so no test can resolve the real home directory when a variable is missing.
const fs = require('fs');
const os = require('os');
const path = require('path');

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-stash-base-'));
process.env.APPSTASH_BASE_DIR = base;
delete process.env.CONSTRUCTIVE_STASH_DIR;

afterAll(() => fs.rmSync(base, { recursive: true, force: true }));
