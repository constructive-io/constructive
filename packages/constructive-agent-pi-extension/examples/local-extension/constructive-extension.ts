import { Type } from '@sinclair/typebox';

import {
  createConstructivePiExtension,
  type ConstructivePiOperation,
} from '@constructive-io/constructive-agent-pi-extension';

const operations: ConstructivePiOperation[] = [
  {
    toolName: 'create_project',
    label: 'Create Project',
    description: 'Create a project through Constructive GraphQL',
    capability: 'write',
    riskClass: 'low',
    document: `
      mutation CreateProject($name: String!) {
        createProject(input: { name: $name }) {
          project {
            id
            name
          }
        }
      }
    `,
    parameters: Type.Object({
      name: Type.String({
        description: 'Project name',
      }),
    }),
  },
  {
    toolName: 'get_project_by_id',
    label: 'Get Project By ID',
    description: 'Read a project by id',
    capability: 'read',
    riskClass: 'read_only',
    document: `
      query GetProject($id: ID!) {
        project(id: $id) {
          id
          name
        }
      }
    `,
    parameters: Type.Object({
      id: Type.String({
        description: 'Project id',
      }),
    }),
    mapVariables: (args: Record<string, unknown>) => ({
      id: args.id,
    }),
  },
];

export default createConstructivePiExtension({
  operations,
  endpoint: process.env.CONSTRUCTIVE_GRAPHQL_ENDPOINT,
  resolveAccessToken: async () => process.env.CONSTRUCTIVE_ACCESS_TOKEN,
  nonInteractiveApproval: 'deny',
});
