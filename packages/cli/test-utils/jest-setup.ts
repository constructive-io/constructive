import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { versionRequest } from '../src/commands/account';

// A test that leaves CONSTRUCTIVE_STASH_DIR unset would open the real ~/.constructive. appstash takes
// APPSTASH_BASE_DIR in that case, so every test file gets a temporary one.
process.env.APPSTASH_BASE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-appstash-'));

// status asks every backend it shows for its version, and a test's backend may be a real host (api.example.com),
// so no test reaches the network through it unless the test gives it a fetch of its own.
versionRequest.fetch = () => Promise.reject(new TypeError('fetch failed: the tests reach no network'));
