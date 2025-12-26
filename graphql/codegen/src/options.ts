export type DocumentFormat = 'gql' | 'ts'
export type FilenameConvention = 'underscore' | 'dashed' | 'camelcase' | 'camelUpper'

export interface GraphQLCodegenOptions {
  input: {
    schema: string
    endpoint?: string
    headers?: Record<string, string>
  }
  output: {
    root: string
    typesFile: string
    operationsDir: string
    sdkFile: string
    reactQueryFile?: string
  }
  documents: {
    format: DocumentFormat
    convention: FilenameConvention
    allowQueries?: string[]
    excludeQueries?: string[]
    excludePatterns?: string[]
  }
  features: {
    emitTypes: boolean
    emitOperations: boolean
    emitSdk: boolean
    emitReactQuery?: boolean
  }
  reactQuery?: {
    fetcher?: 'fetch' | 'graphql-request' | 'hardcoded' | string
    legacyMode?: boolean
    exposeDocument?: boolean
    addInfiniteQuery?: boolean
    reactQueryVersion?: number
  }
  selection?: {
    defaultMutationModelFields?: string[]
    modelFields?: Record<string, string[]>
    mutationInputMode?: 'expanded' | 'model' | 'raw' | 'patchCollapsed'
    connectionStyle?: 'nodes' | 'edges'
    forceModelOutput?: boolean
  }
  scalars?: Record<string, string>
  typeNameOverrides?: Record<string, string>
}

export const defaultGraphQLCodegenOptions: GraphQLCodegenOptions = {
  input: { schema: '', endpoint: '', headers: {} },
  output: {
    root: 'graphql/codegen/dist',
    typesFile: 'types/generated.ts',
    operationsDir: 'operations',
    sdkFile: 'sdk.ts',
    reactQueryFile: 'react-query.ts'
  },
  documents: { format: 'gql', convention: 'dashed', allowQueries: [], excludeQueries: [], excludePatterns: [] },
  features: { emitTypes: true, emitOperations: true, emitSdk: true, emitReactQuery: true },
  reactQuery: { fetcher: 'graphql-request', legacyMode: false, exposeDocument: false, addInfiniteQuery: false, reactQueryVersion: 5 },
  selection: { defaultMutationModelFields: ['id'], modelFields: {}, mutationInputMode: 'patchCollapsed', connectionStyle: 'edges', forceModelOutput: true },
  scalars: {},
  typeNameOverrides: {}
}

export function mergeGraphQLCodegenOptions(base: GraphQLCodegenOptions, overrides: Partial<GraphQLCodegenOptions>): GraphQLCodegenOptions {
  return {
    input: { ...(base.input || {}), ...(overrides.input || {}) },
    output: { ...(base.output || {}), ...(overrides.output || {}) },
    documents: { ...(base.documents || {}), ...(overrides.documents || {}) },
    features: { ...(base.features || {}), ...(overrides.features || {}) },
    selection: { ...(base.selection || {}), ...(overrides.selection || {}) },
    scalars: { ...(base.scalars || {}), ...(overrides.scalars || {}) },
    typeNameOverrides: { ...(base.typeNameOverrides || {}), ...(overrides.typeNameOverrides || {}) }
  } as GraphQLCodegenOptions
}
