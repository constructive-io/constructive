import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test';

import { LtreeExtensionDetectionPlugin } from '../plugins/detect-ltree';
import { createFolderOperatorFactory } from '../plugins/folder-filter-operators';
import { LtreeCodecPlugin } from '../plugins/ltree-codec';

interface FileNode {
  id: number;
  filename: string;
  path: string;
}

interface AllFilesResult {
  allFiles: {
    nodes: FileNode[];
  };
}

interface CategoryNode {
  id: number;
  name: string;
  treePath: string;
}

interface AllCategoriesResult {
  allCategories: {
    nodes: CategoryNode[];
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

describe('graphile-ltree', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        ConnectionFilterPreset()
      ],
      plugins: [
        LtreeExtensionDetectionPlugin,
        LtreeCodecPlugin
      ],
      schema: {
        connectionFilterOperatorFactories: [
          createFolderOperatorFactory()
        ]
      }
    };

    const connections = await getConnections({
      schemas: ['ltree_test'],
      preset: testPreset,
      useRoot: true,
      authRole: 'postgres'
    }, [
      seed.sqlfile([join(__dirname, './setup.sql')])
    ]);

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;

    await db.client.query('BEGIN');
  });

  afterAll(async () => {
    if (db) {
      try {
        await db.client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors
      }
    }
    if (teardown) {
      await teardown();
    }
  });

  beforeEach(async () => {
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
  });

  // ─── File-path output ──────────────────────────────────────────────────

  describe('file-path output', () => {
    it('returns path as slash-delimited file path', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles {
          nodes { id filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const nodes = result.data!.allFiles.nodes;
      expect(nodes.length).toBe(10);
      const docsFile = nodes.find(n => n.filename === 'contract.pdf');
      expect(docsFile).toBeDefined();
      expect(docsFile!.path).toBe('/projects/alpha/docs');
    });

    it('handles single-label paths', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles {
          nodes { filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const rootFile = result.data!.allFiles.nodes.find(
        n => n.filename === 'root.txt'
      );
      expect(rootFile).toBeDefined();
      expect(rootFile!.path).toBe('/root');
    });

    it('works on other tables with ltree columns', async () => {
      const result = await query<AllCategoriesResult>(`{
        allCategories {
          nodes { name treePath }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const laptops = result.data!.allCategories.nodes.find(
        n => n.name === 'Laptops'
      );
      expect(laptops).toBeDefined();
      expect(laptops!.treePath).toBe('/shop/electronics/laptops');
    });
  });

  // ─── Filter operators (slash-delimited input) ──────────────────────────

  describe('within filter', () => {
    it('finds files within a folder using slash paths', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles(where: { path: { within: "/projects/alpha" } }) {
          nodes { filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const filenames = result.data!.allFiles.nodes.map(n => n.filename);
      expect(filenames).toContain('alpha-spec.pdf');
      expect(filenames).toContain('contract.pdf');
      expect(filenames).toContain('design.png');
      expect(filenames).toContain('budget.xlsx');
      expect(filenames).not.toContain('beta-spec.pdf');
      expect(filenames).not.toContain('root.txt');
    });

    it('includes the exact path itself', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles(where: { path: { within: "/projects/alpha" } }) {
          nodes { filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const paths = result.data!.allFiles.nodes.map(n => n.path);
      expect(paths).toContain('/projects/alpha');
    });
  });

  describe('ancestorOf filter', () => {
    it('finds ancestor folders using slash paths', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles(where: { path: { ancestorOf: "/projects/alpha/docs/images" } }) {
          nodes { filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const paths = result.data!.allFiles.nodes.map(n => n.path);
      expect(paths).toContain('/projects/alpha/docs/images');
      expect(paths).toContain('/projects/alpha/docs');
      expect(paths).toContain('/projects/alpha');
      expect(paths).toContain('/projects');
    });
  });

  describe('glob filter', () => {
    it('matches single-level wildcard with slash paths', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles(where: { path: { glob: "/projects/*" } }) {
          nodes { filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const filenames = result.data!.allFiles.nodes.map(n => n.filename);
      expect(filenames).toContain('alpha-spec.pdf');
      expect(filenames).toContain('beta-spec.pdf');
      expect(filenames).not.toContain('contract.pdf');
    });

    it('matches multi-level wildcard with slash paths', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles(where: { path: { glob: "/projects/*/docs" } }) {
          nodes { filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const filenames = result.data!.allFiles.nodes.map(n => n.filename);
      expect(filenames).toContain('contract.pdf');
      expect(filenames).toContain('proposal.docx');
      expect(filenames).not.toContain('design.png');
    });
  });

  // ─── Slash-to-ltree conversion (round-trip) ────────────────────────────

  describe('slash-to-ltree conversion', () => {
    it('accepts slash paths on input and stores as ltree', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles(where: { path: { within: "/users" } }) {
          nodes { filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const filenames = result.data!.allFiles.nodes.map(n => n.filename);
      expect(filenames).toContain('avatar.jpg');
      expect(filenames).toContain('notes.txt');
    });

    it('dot-delimited input still works (backward compat)', async () => {
      const result = await query<AllFilesResult>(`{
        allFiles(where: { path: { within: "projects.alpha" } }) {
          nodes { filename path }
        }
      }`);
      expect(result.errors).toBeUndefined();
      const filenames = result.data!.allFiles.nodes.map(n => n.filename);
      expect(filenames).toContain('alpha-spec.pdf');
      expect(filenames).toContain('contract.pdf');
    });
  });
});
