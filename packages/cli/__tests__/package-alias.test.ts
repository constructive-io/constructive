import * as fs from 'fs';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(30000);

describe('CLI Package Alias Resolution', () => {
  let fixture: CLIDeployTestFixture;
  let testDb: any;

  beforeAll(async () => {
    fixture = new CLIDeployTestFixture('sqitch', 'simple-w-tags');
    
    // Modify the package.json of my-first to have a scoped npm name
    // This simulates the case where package.json name differs from control file name
    const packageJsonPath = fixture.fixturePath('packages', 'my-first', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    packageJson.name = '@test-scope/my-first';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  });

  beforeEach(async () => {
    testDb = await fixture.setupTestDatabase();
  });

  afterAll(async () => {
    await fixture.cleanup();
    await teardownPgPools();
  });

  it('should deploy using npm package name alias instead of control file name', async () => {
    // Deploy using the scoped npm name (@test-scope/my-first) instead of control file name (my-first)
    const commands = `cnc deploy --database ${testDb.name} --package @test-scope/my-first --yes`;
    
    await fixture.runTerminalCommands(commands, {
      database: testDb.name
    }, true);
    
    // Verify deployment succeeded - the schema should exist
    expect(await testDb.exists('schema', 'myfirstapp')).toBe(true);
    
    // Verify the deployed changes are recorded under the control file name (my-first), not the npm name
    const deployedChanges = await testDb.getDeployedChanges();

    expect(deployedChanges.some((change: any) => change.package === 'my-first')).toBe(true);
  });

  it('should still work with control file name directly (backward compatibility)', async () => {
    // Deploy using the control file name directly
    const commands = `cnc deploy --database ${testDb.name} --package my-first --yes`;
    
    await fixture.runTerminalCommands(commands, {
      database: testDb.name
    }, true);
    
    // Verify deployment succeeded
    expect(await testDb.exists('schema', 'myfirstapp')).toBe(true);
    
    const deployedChanges = await testDb.getDeployedChanges();

    expect(deployedChanges.some((change: any) => change.package === 'my-first')).toBe(true);
  });

  it('should deploy to specific change using npm package name alias', async () => {
    // Deploy to a specific change using the aliased npm name
    const commands = `cnc deploy --database ${testDb.name} --package @test-scope/my-first --to schema_myfirstapp --yes`;
    
    await fixture.runTerminalCommands(commands, {
      database: testDb.name
    }, true);
    
    // Verify only the schema was deployed (not the tables)
    expect(await testDb.exists('schema', 'myfirstapp')).toBe(true);
    
    const deployedChanges = await testDb.getDeployedChanges();

    expect(deployedChanges.find((change: any) => 
      change.package === 'my-first' && change.change_name === 'schema_myfirstapp'
    )).toBeTruthy();
  });

  it('should revert using npm package name alias', async () => {
    // First deploy
    const deployCommands = `cnc deploy --database ${testDb.name} --package @test-scope/my-first --yes`;

    await fixture.runTerminalCommands(deployCommands, {
      database: testDb.name
    }, true);
    
    expect(await testDb.exists('schema', 'myfirstapp')).toBe(true);
    
    // Then revert using the aliased npm name
    const revertCommands = `cnc revert --database ${testDb.name} --package @test-scope/my-first --yes`;

    await fixture.runTerminalCommands(revertCommands, {
      database: testDb.name
    }, true);
    
    // Verify revert succeeded
    expect(await testDb.exists('schema', 'myfirstapp')).toBe(false);
  });
});
