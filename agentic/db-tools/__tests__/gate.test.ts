import type { ConfirmPreviewTable } from '@agentic-kit/harness';

import type { ProjectContext } from '../src/context';
import { constructiveGateDeps, type ConstructiveGateResolvers } from '../src/gate';

const context = { databaseId: 'db-1' } as ProjectContext;
const table: ConfirmPreviewTable = {
  name: 'contact',
  fields: [],
  policies: [],
  relationCount: 0,
};

const resolvers = (
  overrides: Partial<ConstructiveGateResolvers> = {}
): Partial<ConstructiveGateResolvers> => ({
  resolveProjectContext: async () => ({ context, reason: '' }),
  createTemplatePreviewTables: async () => ({ blueprintName: 'crm', tables: [table] }),
  ...overrides,
});

describe('constructiveGateDeps', () => {
  it('previews the tables a template would copy', async () => {
    await expect(
      constructiveGateDeps(resolvers()).resolveTemplatePreview('/p', 'crm', 'CRM')
    ).resolves.toEqual({
      kind: 'template',
      displayName: 'CRM',
      blueprintName: 'crm',
      tables: [table],
    });
  });

  it('has no preview when the blueprint contributes no table', async () => {
    await expect(
      constructiveGateDeps(
        resolvers({
          createTemplatePreviewTables: async () => ({ blueprintName: '', tables: [] }),
        })
      ).resolveTemplatePreview('/p', undefined, 'CRM')
    ).resolves.toBeUndefined();
  });
});
