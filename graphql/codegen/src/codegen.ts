import { promises as fs } from 'fs'
import { join, dirname, isAbsolute, resolve } from 'path'
import { buildSchema, buildClientSchema, graphql, getIntrospectionQuery, print } from 'graphql'
const inflection: any = require('inflection')
import { generate as generateGql, GqlMap } from './gql'
import { parseGraphQuery } from 'introspectron'
import { defaultGraphQLCodegenOptions, GraphQLCodegenOptions, mergeGraphQLCodegenOptions } from './options'
import { codegen as runCoreCodegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations'
import * as typescriptGraphqlRequestPlugin from '@graphql-codegen/typescript-graphql-request'
import * as typescriptReactQueryPlugin from '@graphql-codegen/typescript-react-query'
import { GraphQLClient } from 'graphql-request'
import { parse } from '@babel/parser'
import generate from '@babel/generator'
import * as t from '@babel/types'

function addDocumentNodeImport(code: string): string {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript']
  })

  const importDecl = t.importDeclaration(
    [t.importSpecifier(t.identifier('DocumentNode'), t.identifier('DocumentNode'))],
    t.stringLiteral('graphql')
  )
  importDecl.importKind = 'type'

  ast.program.body.unshift(importDecl)

  const output = generate(ast, {}, code)
  return output.code
}

function getFilename(key: string, convention: GraphQLCodegenOptions['documents']['convention']) {
  if (convention === 'underscore') return inflection.underscore(key)
  if (convention === 'dashed') return inflection.underscore(key).replace(/_/g, '-')
  if (convention === 'camelUpper') return inflection.camelize(key, false)
  return key
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

async function readFileUTF8(p: string) {
  return fs.readFile(p, 'utf8')
}

async function writeFileUTF8(p: string, content: string) {
  await ensureDir(dirname(p))
  await fs.writeFile(p, content, 'utf8')
}

async function getIntrospectionFromSDL(schemaPath: string) {
  const sdl = await readFileUTF8(schemaPath)
  const schema = buildSchema(sdl)
  const q = getIntrospectionQuery()
  const res = await graphql({ schema, source: q })
  return res.data as any
}

async function getIntrospectionFromEndpoint(endpoint: string, headers?: Record<string, string>) {
  const client = new GraphQLClient(endpoint, { headers })
  const q = getIntrospectionQuery()
  const res = await client.request<any>(q)
  return res as any
}

function generateKeyedObjFromGqlMap(gqlMap: GqlMap, selection?: GraphQLCodegenOptions['selection'], typeNameOverrides?: Record<string, string>, typeIndex?: any): Record<string, string> {
  const gen = generateGql(gqlMap, selection as any, typeNameOverrides, typeIndex)
  return Object.entries(gen).reduce<Record<string, string>>((acc, [key, val]) => {
    if (val?.ast) acc[key] = print(val.ast)
    return acc
  }, {})
}

function applyQueryFilters(map: GqlMap, docs: GraphQLCodegenOptions['documents']): GqlMap {
  const allow = (docs.allowQueries || []).filter(Boolean)
  const exclude = (docs.excludeQueries || []).filter(Boolean)
  const patterns = (docs.excludePatterns || []).filter(Boolean)

  let keys = Object.keys(map)
  if (allow.length > 0) keys = keys.filter((k) => allow.includes(k))
  if (exclude.length > 0) keys = keys.filter((k) => !exclude.includes(k))
  if (patterns.length > 0) {
    const regs = patterns.map((p) => {
      try {
        return new RegExp(p)
      } catch {
        return null
      }
    }).filter((r): r is RegExp => !!r)
    keys = keys.filter((k) => !regs.some((r) => r.test(k)))
  }

  return keys.reduce<GqlMap>((acc, k) => {
    acc[k] = map[k]
    return acc
  }, {})
}

async function writeOperationsDocuments(docs: Record<string, string>, dir: string, format: 'gql' | 'ts', convention: GraphQLCodegenOptions['documents']['convention']) {
  await ensureDir(dir)
  const index: string[] = []
  for (const key of Object.keys(docs)) {
    const base = getFilename(key, convention)
    const filename = base + (format === 'ts' ? '.ts' : '.gql')
    if (format === 'ts') {
      const code = `import gql from 'graphql-tag'\nexport const ${key} = gql\`\n${docs[key]}\n\``
      await writeFileUTF8(join(dir, filename), code)
      index.push(`export * from './${base}'`)
    } else {
      await writeFileUTF8(join(dir, filename), docs[key])
    }
  }
  if (format === 'ts') await writeFileUTF8(join(dir, 'index.ts'), index.sort().join('\n'))
}

export async function runCodegen(opts: GraphQLCodegenOptions, cwd: string) {
  const options: GraphQLCodegenOptions = {
    input: { ...(defaultGraphQLCodegenOptions.input), ...(opts.input || {}) },
    output: { ...(defaultGraphQLCodegenOptions.output), ...(opts.output || {}) },
    documents: { ...(defaultGraphQLCodegenOptions.documents), ...(opts.documents || {}) },
    features: { ...(defaultGraphQLCodegenOptions.features), ...(opts.features || {}) },
    selection: { ...(defaultGraphQLCodegenOptions.selection), ...(opts.selection || {}) },
    scalars: { ...(defaultGraphQLCodegenOptions.scalars || {}), ...(opts.scalars || {}) },
    typeNameOverrides: { ...(defaultGraphQLCodegenOptions.typeNameOverrides || {}), ...(opts.typeNameOverrides || {}) }
  }

  const root = join(cwd, options.output.root)
  const typesFile = join(root, options.output.typesFile)
  const operationsDir = join(root, options.output.operationsDir)
  const sdkFile = join(root, options.output.sdkFile)
  const reactQueryFile = join(root, options.output.reactQueryFile || 'react-query.ts')
  const hasSchemaPath = !!options.input.schema && options.input.schema.trim() !== ''
  const hasEndpoint = !!options.input.endpoint && options.input.endpoint.trim() !== ''
  const schemaPath = hasSchemaPath ? (isAbsolute(options.input.schema) ? options.input.schema : resolve(cwd, options.input.schema)) : ''

  const introspection = hasEndpoint
    ? await getIntrospectionFromEndpoint(options.input.endpoint as string, options.input.headers || {})
    : await getIntrospectionFromSDL(schemaPath)
  const { queries, mutations } = parseGraphQuery(introspection)
  const gqlMap: GqlMap = applyQueryFilters({ ...queries, ...mutations }, options.documents)
  let docs: Record<string, string> = {}

  const schema = hasEndpoint
    ? buildClientSchema(introspection as any)
    : buildSchema(await readFileUTF8(schemaPath))

  const typeIndex = buildTypeIndex(introspection)
  if (options.features.emitOperations || options.features.emitSdk || options.features.emitReactQuery) {
    docs = generateKeyedObjFromGqlMap(gqlMap, options.selection, options.typeNameOverrides, typeIndex)
  }

  if (options.features.emitOperations) {
    await writeOperationsDocuments(docs, operationsDir, options.documents.format, options.documents.convention)
  }

  if (options.features.emitTypes) {
    const typesContent = await runCoreCodegen({
      filename: typesFile,
      schema: schema as any,
      documents: [],
      config: { scalars: options.scalars || {} },
      plugins: [{ typescript: {} }],
      pluginMap: { typescript: typescriptPlugin as any }
    })
    await writeFileUTF8(typesFile, typesContent)
  }

  if (options.features.emitSdk) {
    const documents: { location: string; document: any }[] = []
    for (const [name, content] of Object.entries(docs)) {
      try {
        const doc = require('graphql').parse(content)
        documents.push({ location: name, document: doc })
      } catch (e) {}
    }
    const sdkContent = await runCoreCodegen({
      filename: sdkFile,
      schema: schema as any,
      documents,
      config: { scalars: options.scalars || {}, dedupeOperationSuffix: true },
      plugins: [
        { typescript: {} },
        { 'typescript-operations': {} },
        { 'typescript-graphql-request': { dedupeOperationSuffix: true } }
      ],
      pluginMap: {
        typescript: typescriptPlugin as any,
        'typescript-operations': typescriptOperationsPlugin as any,
        'typescript-graphql-request': typescriptGraphqlRequestPlugin as any
      }
    })
    // Fix TS2742: Add missing DocumentNode import using Babel AST
    const sdkContentWithImport = addDocumentNodeImport(sdkContent)
    await writeFileUTF8(sdkFile, sdkContentWithImport)
  }

  if (options.features.emitReactQuery) {
    const documents: { location: string; document: any }[] = []
    for (const [name, content] of Object.entries(docs)) {
      try {
        const doc = require('graphql').parse(content)
        documents.push({ location: name, document: doc })
      } catch (e) {}
    }
    const rqConfig = {
      fetcher: options.reactQuery?.fetcher || 'graphql-request',
      legacyMode: options.reactQuery?.legacyMode || false,
      exposeDocument: options.reactQuery?.exposeDocument || false,
      addInfiniteQuery: options.reactQuery?.addInfiniteQuery || false,
      reactQueryVersion: options.reactQuery?.reactQueryVersion || 5,
      scalars: options.scalars || {}
    } as any
    const rqContent = await runCoreCodegen({
      filename: reactQueryFile,
      schema: schema as any,
      documents,
      config: { ...rqConfig, dedupeOperationSuffix: true },
      plugins: [
        { typescript: {} },
        { 'typescript-operations': {} },
        { 'typescript-react-query': rqConfig }
      ],
      pluginMap: {
        typescript: typescriptPlugin as any,
        'typescript-operations': typescriptOperationsPlugin as any,
        'typescript-react-query': typescriptReactQueryPlugin as any
      }
    })
    await writeFileUTF8(reactQueryFile, rqContent)
  }

  return { root, typesFile, operationsDir, sdkFile }
}

export async function runCodegenFromJSONConfig(configPath: string, cwd: string) {
  const path = isAbsolute(configPath) ? configPath : resolve(cwd, configPath)
  const content = await readFileUTF8(path)
  let overrides: any = {}
  try {
    overrides = JSON.parse(content)
  } catch (e) {
    throw new Error('Invalid JSON config: ' + e)
  }
  const merged = mergeGraphQLCodegenOptions(defaultGraphQLCodegenOptions, overrides as any)
  return runCodegen(merged as GraphQLCodegenOptions, cwd)
}

function buildTypeIndex(introspection: any) {
  const byName: Record<string, any> = {}
  const types = (introspection && introspection.__schema && introspection.__schema.types) || []
  for (const t of types) {
    if (t && typeof t.name === 'string' && t.name.length > 0) byName[t.name] = t
  }
  return {
    byName,
    getInputFieldType(typeName: string, fieldName: string) {
      const typ = byName[typeName]
      if (!typ || typ.kind !== 'INPUT_OBJECT') return null
      const fields = typ.inputFields || []
      const f = fields.find((x: any) => x && x.name === fieldName)
      return f ? f.type : null
    }
  }
}
