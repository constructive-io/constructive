import { TestDatabase } from '../../test-utils';
import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';

describe('w-exts Fixture Deployment With Pre-Generated Plan', () => {
  let fixture: CoreDeployTestFixture;
  let db: TestDatabase;

  beforeAll(async () => {
    fixture = new CoreDeployTestFixture('sqitch', 'simple-w-exts');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    db = await fixture.setupTestDatabase();
  });

  afterEach(async () => {
  });

  test('deploys sample-unique-names after generating plan (includePackages=true, includeTags=true)', async () => {
    const mod = fixture.getModuleProject([], 'sample-unique-names');
    mod.writeModulePlan({ includePackages: true, includeTags: true });

    await fixture.deployModule('sample-unique-names', db.name, ['sqitch', 'simple-w-exts']);

    expect(await db.exists('schema', 'unique_names')).toBe(true);
    expect(await db.exists('table', 'unique_names.words')).toBe(true);

    const deployedChanges = await db.getDeployedChanges();
    expect(deployedChanges.some(change => change.package === 'sample-unique-names')).toBe(true);
  });

  test('deploys sample-unique-names after generating plan (includePackages=true, includeTags=false)', async () => {
    const mod = fixture.getModuleProject([], 'sample-unique-names');
    mod.writeModulePlan({ includePackages: true, includeTags: false });

    await fixture.deployModule('sample-unique-names', db.name, ['sqitch', 'simple-w-exts']);

    expect(await db.exists('schema', 'unique_names')).toBe(true);
    expect(await db.exists('table', 'unique_names.words')).toBe(true);

    const deployedChanges = await db.getDeployedChanges();
    expect(deployedChanges.some(change => change.package === 'sample-unique-names')).toBe(true);
  });
  test('deploys sample-unique-names after generating plan (includePackages=false, includeTags=false)', async () => {
    const mod = fixture.getModuleProject([], 'sample-unique-names');
    mod.writeModulePlan({ includePackages: false, includeTags: false });
    await fixture.deployModule('sample-unique-names', db.name, ['sqitch', 'simple-w-exts']);
    expect(await db.exists('schema', 'unique_names')).toBe(true);
    expect(await db.exists('table', 'unique_names.words')).toBe(true);
    const deployedChanges = await db.getDeployedChanges();
    expect(deployedChanges.some(change => change.package === 'sample-unique-names')).toBe(true);
  });

});
