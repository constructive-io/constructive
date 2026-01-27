import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

import {
  buildDependencyGraph,
  validateDAG,
  extractPackageFromPath,
  findMatchingPattern,
  assignChangesToPackages,
  buildPackageDependencies,
  detectPackageCycle,
  computeDeployOrder,
  topologicalSortWithinPackage,
  slicePlan,
  PatternStrategy
} from '../../src/slice';
import { ExtendedPlanFile } from '../../src/files/types';

describe('Slice Module', () => {
  const testDir = join(__dirname, 'test-slice');

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('extractPackageFromPath', () => {
    it('should extract package name from schemas path', () => {
      expect(extractPackageFromPath('schemas/auth/tables/users')).toBe('auth');
      expect(extractPackageFromPath('schemas/public/functions/get_user')).toBe('public');
      expect(extractPackageFromPath('schemas/rls/policies/user_policy')).toBe('rls');
    });

    it('should handle extensions folder as core', () => {
      expect(extractPackageFromPath('extensions/uuid-ossp')).toBe('core');
      expect(extractPackageFromPath('extensions/pgcrypto')).toBe('core');
    });

    it('should handle migrate folder as core', () => {
      expect(extractPackageFromPath('migrate/init')).toBe('core');
    });

    it('should handle custom depth', () => {
      expect(extractPackageFromPath('schemas/auth/tables/users', 2)).toBe('auth/tables');
    });

    it('should handle custom prefix', () => {
      expect(extractPackageFromPath('custom/auth/tables/users', 1, 'custom')).toBe('auth');
    });

    it('should return core for paths without schema prefix', () => {
      expect(extractPackageFromPath('init')).toBe('init');
    });
  });

  describe('findMatchingPattern', () => {
    it('should match patterns to package names', () => {
      const strategy: PatternStrategy = {
        type: 'pattern',
        slices: [
          { packageName: 'auth', patterns: ['schemas/*_auth_*/**', 'schemas/auth/**'] },
          { packageName: 'users', patterns: ['schemas/*_users_*/**', 'schemas/users/**'] }
        ]
      };

      expect(findMatchingPattern('schemas/auth/tables/users', strategy)).toBe('auth');
      expect(findMatchingPattern('schemas/app_auth_public/procedures/sign_in', strategy)).toBe('auth');
      expect(findMatchingPattern('schemas/users/tables/profiles', strategy)).toBe('users');
      expect(findMatchingPattern('schemas/app_users_private/functions/get_user', strategy)).toBe('users');
    });

    it('should return undefined for non-matching paths', () => {
      const strategy: PatternStrategy = {
        type: 'pattern',
        slices: [
          { packageName: 'auth', patterns: ['schemas/*_auth_*/**'] }
        ]
      };

      expect(findMatchingPattern('schemas/public/tables/posts', strategy)).toBeUndefined();
      expect(findMatchingPattern('extensions/uuid-ossp', strategy)).toBeUndefined();
    });

    it('should match first pattern in order', () => {
      const strategy: PatternStrategy = {
        type: 'pattern',
        slices: [
          { packageName: 'first', patterns: ['schemas/**'] },
          { packageName: 'second', patterns: ['schemas/auth/**'] }
        ]
      };

      expect(findMatchingPattern('schemas/auth/tables/users', strategy)).toBe('first');
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build graph from plan file', () => {
      const plan: ExtendedPlanFile = {
        package: 'test',
        uri: '',
        changes: [
          { name: 'schemas/auth/tables/users', dependencies: [] },
          { name: 'schemas/auth/tables/posts', dependencies: ['schemas/auth/tables/users'] },
          { name: 'schemas/public/functions/get_user', dependencies: ['schemas/auth/tables/users'] }
        ],
        tags: []
      };

      const graph = buildDependencyGraph(plan);

      expect(graph.nodes.size).toBe(3);
      expect(graph.edges.get('schemas/auth/tables/posts')?.has('schemas/auth/tables/users')).toBe(true);
      expect(graph.reverseEdges.get('schemas/auth/tables/users')?.has('schemas/auth/tables/posts')).toBe(true);
    });
  });

  describe('validateDAG', () => {
    it('should pass for valid DAG', () => {
      const plan: ExtendedPlanFile = {
        package: 'test',
        uri: '',
        changes: [
          { name: 'a', dependencies: [] },
          { name: 'b', dependencies: ['a'] },
          { name: 'c', dependencies: ['b'] }
        ],
        tags: []
      };

      const graph = buildDependencyGraph(plan);
      expect(() => validateDAG(graph)).not.toThrow();
    });

    it('should throw for cycle', () => {
      const plan: ExtendedPlanFile = {
        package: 'test',
        uri: '',
        changes: [
          { name: 'a', dependencies: ['c'] },
          { name: 'b', dependencies: ['a'] },
          { name: 'c', dependencies: ['b'] }
        ],
        tags: []
      };

      const graph = buildDependencyGraph(plan);
      expect(() => validateDAG(graph)).toThrow(/Cycle detected/);
    });
  });

  describe('assignChangesToPackages', () => {
    it('should assign changes using folder strategy', () => {
      const plan: ExtendedPlanFile = {
        package: 'test',
        uri: '',
        changes: [
          { name: 'schemas/auth/tables/users', dependencies: [] },
          { name: 'schemas/auth/tables/posts', dependencies: [] },
          { name: 'schemas/public/functions/get_user', dependencies: [] },
          { name: 'extensions/uuid-ossp', dependencies: [] }
        ],
        tags: []
      };

      const graph = buildDependencyGraph(plan);
      const assignments = assignChangesToPackages(graph, { type: 'folder' });

      expect(assignments.get('auth')?.size).toBe(2);
      expect(assignments.get('public')?.size).toBe(1);
      expect(assignments.get('core')?.size).toBe(1);
    });

    it('should use explicit mapping strategy', () => {
      const plan: ExtendedPlanFile = {
        package: 'test',
        uri: '',
        changes: [
          { name: 'change_a', dependencies: [] },
          { name: 'change_b', dependencies: [] },
          { name: 'change_c', dependencies: [] }
        ],
        tags: []
      };

      const graph = buildDependencyGraph(plan);
      const assignments = assignChangesToPackages(graph, {
        type: 'explicit',
        mapping: {
          'change_a': 'pkg1',
          'change_b': 'pkg1',
          'change_c': 'pkg2'
        }
      });

      expect(assignments.get('pkg1')?.size).toBe(2);
      expect(assignments.get('pkg2')?.size).toBe(1);
    });
  });

  describe('buildPackageDependencies', () => {
    it('should detect cross-package dependencies', () => {
      const plan: ExtendedPlanFile = {
        package: 'test',
        uri: '',
        changes: [
          { name: 'schemas/auth/tables/users', dependencies: [] },
          { name: 'schemas/public/functions/get_user', dependencies: ['schemas/auth/tables/users'] }
        ],
        tags: []
      };

      const graph = buildDependencyGraph(plan);
      const assignments = assignChangesToPackages(graph, { type: 'folder' });
      const pkgDeps = buildPackageDependencies(graph, assignments);

      expect(pkgDeps.get('public')?.has('auth')).toBe(true);
      expect(pkgDeps.get('auth')?.size).toBe(0);
    });
  });

  describe('detectPackageCycle', () => {
    it('should return null for acyclic package deps', () => {
      const deps = new Map<string, Set<string>>();
      deps.set('auth', new Set());
      deps.set('public', new Set(['auth']));
      deps.set('rls', new Set(['auth', 'public']));

      expect(detectPackageCycle(deps)).toBeNull();
    });

    it('should detect package cycle', () => {
      const deps = new Map<string, Set<string>>();
      deps.set('auth', new Set(['rls']));
      deps.set('public', new Set(['auth']));
      deps.set('rls', new Set(['public']));

      const cycle = detectPackageCycle(deps);
      expect(cycle).not.toBeNull();
      expect(cycle!.length).toBeGreaterThan(2);
    });
  });

  describe('computeDeployOrder', () => {
    it('should compute correct deploy order', () => {
      const deps = new Map<string, Set<string>>();
      deps.set('auth', new Set());
      deps.set('public', new Set(['auth']));
      deps.set('rls', new Set(['auth', 'public']));

      const order = computeDeployOrder(deps);

      expect(order.indexOf('auth')).toBeLessThan(order.indexOf('public'));
      expect(order.indexOf('public')).toBeLessThan(order.indexOf('rls'));
    });
  });

  describe('topologicalSortWithinPackage', () => {
    it('should sort changes within package', () => {
      const plan: ExtendedPlanFile = {
        package: 'test',
        uri: '',
        changes: [
          { name: 'a', dependencies: [] },
          { name: 'b', dependencies: ['a'] },
          { name: 'c', dependencies: ['b'] }
        ],
        tags: []
      };

      const graph = buildDependencyGraph(plan);
      const changes = new Set(['a', 'b', 'c']);
      const sorted = topologicalSortWithinPackage(changes, graph);

      expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('b'));
      expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('c'));
    });
  });

  describe('slicePlan', () => {
    it('should slice a plan file into packages', () => {
      const planContent = `%syntax-version=1.0.0
%project=test-project
%uri=https://github.com/test/project

extensions/uuid-ossp 2024-01-01T00:00:00Z Developer <dev@example.com> # UUID extension
schemas/auth/tables/users [extensions/uuid-ossp] 2024-01-02T00:00:00Z Developer <dev@example.com> # Users table
schemas/auth/tables/sessions [schemas/auth/tables/users] 2024-01-03T00:00:00Z Developer <dev@example.com> # Sessions table
schemas/public/functions/get_user [schemas/auth/tables/users] 2024-01-04T00:00:00Z Developer <dev@example.com> # Get user function
schemas/rls/policies/user_policy [schemas/auth/tables/users schemas/public/functions/get_user] 2024-01-05T00:00:00Z Developer <dev@example.com> # User policy
`;
      const planPath = join(testDir, 'slice-test.plan');
      writeFileSync(planPath, planContent);

      const result = slicePlan({
        sourcePlan: planPath,
        outputDir: join(testDir, 'output'),
        strategy: { type: 'folder' }
      });

      expect(result.stats.totalChanges).toBe(5);
      expect(result.stats.packagesCreated).toBeGreaterThan(1);
      expect(result.packages.length).toBeGreaterThan(1);

      // Check that packages are created
      const packageNames = result.packages.map(p => p.name);
      expect(packageNames).toContain('core');
      expect(packageNames).toContain('auth');
      expect(packageNames).toContain('public');
      expect(packageNames).toContain('rls');

      // Check deploy order
      const deployOrder = result.workspace.deployOrder;
      expect(deployOrder.indexOf('core')).toBeLessThan(deployOrder.indexOf('auth'));
      expect(deployOrder.indexOf('auth')).toBeLessThan(deployOrder.indexOf('public'));
    });

    it('should generate cross-package dependencies', () => {
      const planContent = `%syntax-version=1.0.0
%project=test-project

schemas/auth/tables/users 2024-01-01T00:00:00Z Developer <dev@example.com>
schemas/public/functions/get_user [schemas/auth/tables/users] 2024-01-02T00:00:00Z Developer <dev@example.com>
`;
      const planPath = join(testDir, 'cross-deps.plan');
      writeFileSync(planPath, planContent);

      const result = slicePlan({
        sourcePlan: planPath,
        outputDir: join(testDir, 'output2'),
        strategy: { type: 'folder' }
      });

      const publicPkg = result.packages.find(p => p.name === 'public');
      expect(publicPkg).toBeDefined();
      expect(publicPkg!.packageDependencies).toContain('auth');

      // Check that the plan content has cross-package reference
      expect(publicPkg!.planContent).toContain('auth:schemas/auth/tables/users');
    });

    it('should slice using pattern strategy', () => {
      const planContent = `%syntax-version=1.0.0
%project=test-project

schemas/app_auth_public/tables/users 2024-01-01T00:00:00Z Developer <dev@example.com>
schemas/app_auth_public/tables/sessions [schemas/app_auth_public/tables/users] 2024-01-02T00:00:00Z Developer <dev@example.com>
schemas/app_users_public/tables/profiles [schemas/app_auth_public/tables/users] 2024-01-03T00:00:00Z Developer <dev@example.com>
schemas/app_public/functions/get_data 2024-01-04T00:00:00Z Developer <dev@example.com>
`;
      const planPath = join(testDir, 'pattern-test.plan');
      writeFileSync(planPath, planContent);

      const result = slicePlan({
        sourcePlan: planPath,
        outputDir: join(testDir, 'output-pattern'),
        strategy: {
          type: 'pattern',
          slices: [
            { packageName: 'auth', patterns: ['schemas/*_auth_*/**'] },
            { packageName: 'users', patterns: ['schemas/*_users_*/**'] }
          ]
        },
        defaultPackage: 'core'
      });

      expect(result.stats.totalChanges).toBe(4);

      const packageNames = result.packages.map(p => p.name);
      expect(packageNames).toContain('auth');
      expect(packageNames).toContain('users');
      expect(packageNames).toContain('core');

      const authPkg = result.packages.find(p => p.name === 'auth');
      expect(authPkg!.changes.length).toBe(2);

      const usersPkg = result.packages.find(p => p.name === 'users');
      expect(usersPkg!.changes.length).toBe(1);
      expect(usersPkg!.packageDependencies).toContain('auth');

      const corePkg = result.packages.find(p => p.name === 'core');
      expect(corePkg!.changes.length).toBe(1);
    });

    it('should handle pattern strategy with overlapping patterns', () => {
      const planContent = `%syntax-version=1.0.0
%project=test-project

schemas/auth_tokens_public/tables/tokens 2024-01-01T00:00:00Z Developer <dev@example.com>
schemas/auth_sessions_public/tables/sessions 2024-01-02T00:00:00Z Developer <dev@example.com>
`;
      const planPath = join(testDir, 'overlap-test.plan');
      writeFileSync(planPath, planContent);

      const result = slicePlan({
        sourcePlan: planPath,
        outputDir: join(testDir, 'output-overlap'),
        strategy: {
          type: 'pattern',
          slices: [
            { packageName: 'tokens', patterns: ['schemas/*_tokens_*/**'] },
            { packageName: 'sessions', patterns: ['schemas/*_sessions_*/**'] }
          ]
        }
      });

      const packageNames = result.packages.map(p => p.name);
      expect(packageNames).toContain('tokens');
      expect(packageNames).toContain('sessions');

      const tokensPkg = result.packages.find(p => p.name === 'tokens');
      expect(tokensPkg!.changes.length).toBe(1);

      const sessionsPkg = result.packages.find(p => p.name === 'sessions');
      expect(sessionsPkg!.changes.length).toBe(1);
    });
  });
});
