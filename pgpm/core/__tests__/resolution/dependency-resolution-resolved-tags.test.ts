
import { resolveDependencies } from '../../src/resolution/deps';
import { TestFixture } from '../../test-utils';

let fixture: TestFixture;

beforeAll(() => {
  fixture = new TestFixture('sqitch');
});

afterAll(() => {
  fixture.cleanup();
});

it('sqitch package dependencies with resolved tags [simple-w-tags/1st]', async () => {
  const res = await resolveDependencies(
    fixture.getFixturePath('simple-w-tags', 'packages', 'my-first'),
    'my-first',
    { tagResolution: 'resolve' }
  );
  expect(res).toMatchSnapshot();
});

it('sqitch package dependencies with resolved tags [simple-w-tags/2nd]', async () => {
  const res = await resolveDependencies(
    fixture.getFixturePath('simple-w-tags', 'packages', 'my-second'),
    'my-second',
    { tagResolution: 'resolve' }
  );
  expect(res).toMatchSnapshot();
});

it('sqitch package dependencies with resolved tags [simple-w-tags/3rd]', async () => {
  const res = await resolveDependencies(
    fixture.getFixturePath('simple-w-tags', 'packages', 'my-third'),
    'my-third',
    { tagResolution: 'resolve' }
  );
  expect(res).toMatchSnapshot();
});
describe('w-exts fixture dependency resolution - resolved tags', () => {
  let wExtsFixture: TestFixture;

  beforeAll(() => {
    wExtsFixture = new TestFixture('sqitch', 'simple-w-exts');
  });

  afterAll(() => {
    wExtsFixture.cleanup();
  });

  it('resolves tags to changes from plan only for unique-names', async () => {
    const pkgDir = wExtsFixture.getFixturePath('packages', 'unique-names');
    const res = await resolveDependencies(pkgDir, 'unique-names', {
      tagResolution: 'resolve',
      source: 'plan'
    });
    expect(res).toMatchSnapshot();
  });

  it('resolves tags to changes from sql headers for unique-names', async () => {
    const pkgDir = wExtsFixture.getFixturePath('packages', 'unique-names');
    const res = await resolveDependencies(pkgDir, 'unique-names', {
      tagResolution: 'resolve',
      source: 'sql'
    });
    expect(res).toMatchSnapshot();
  });
});
