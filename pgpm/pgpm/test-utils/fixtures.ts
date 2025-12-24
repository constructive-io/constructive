import fs from 'fs';
import os from 'os';
import path from 'path';

import { PgpmPackage } from '@pgpmjs/core';

const { mkdtempSync, rmSync, cpSync } = fs;

export const FIXTURES_PATH = path.resolve(__dirname, '../../../__fixtures__');

export const getFixturePath = (...paths: string[]) =>
  path.join(FIXTURES_PATH, ...paths);

export class TestFixture {
  readonly tempDir: string;
  readonly tempFixtureDir: string;

  constructor(...fixturePath: string[]) {
    this.tempDir = mkdtempSync(path.join(os.tmpdir(), 'pgpm-test-'));

    if (fixturePath.length > 0) {
      const originalFixtureDir = getFixturePath(...fixturePath);
      this.tempFixtureDir = path.join(this.tempDir, ...fixturePath);
      cpSync(originalFixtureDir, this.tempFixtureDir, { recursive: true });
    } else {
      this.tempFixtureDir = this.tempDir;
    }
  }

  fixturePath(...paths: string[]) {
    return path.join(this.tempFixtureDir, ...paths);
  }

  cleanup() {
    rmSync(this.tempDir, { recursive: true, force: true });
  }

  getModuleProject(workspacePath: string[], moduleName: string): PgpmPackage | null {
    const wsPath = this.fixturePath(...workspacePath);
    const modulePath = path.join(wsPath, 'packages', moduleName);
    
    if (!fs.existsSync(modulePath)) {
      return null;
    }
    
    return new PgpmPackage(modulePath);
  }
}
