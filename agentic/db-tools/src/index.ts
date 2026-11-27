import type { AnyHarnessTool } from '@agentic-kit/harness';

import { configureHost, type ToolsHost } from './host';
import { constructiveDbTools } from './tools';

export { constructiveDbTools };

/** Configure the host and get the tools in one call. */
export function createConstructiveDbTools(host: ToolsHost): readonly AnyHarnessTool[] {
  configureHost(host);
  return constructiveDbTools;
}

export {
  ACCESS_CHECKS,
  type AccessCheck,
  type AccessFinding,
  accessFindings,
  type AccessOperation,
  ADDED_FIELDS,
  type AddedColumn,
  type AddedDefault,
  type AddedField,
  BUILT_IN_SCOPES,
  checkRule,
  type ColumnGap,
  columnGaps,
  type ColumnRead,
  columnsReadByPolicies,
  type DataNodeNeed,
  dataNodesForPolicies,
  defaultFills,
  DERIVED_KEYS,
  explainPolicy,
  fieldsAddedByNodes,
  type MembershipScope,
  type NeededDataNode,
  POLICY_ROLES,
  POLICY_WORDS,
  policyDifference,
  type PolicyWordsTemplate,
  type ResolvedPolicy,
  resolveEntityTypes,
  ROW_ID,
  type RuleProblem,
  TABLE_NEEDS,
  type TableAccessInput,
  type TableField,
  type TableKind,
  type TablePolicy,
  tablePolicyFromBlueprint,
  type TablePrivilege,
} from './access';
export { expandBlueprintDefaults } from './blueprint/blueprint-defaults';
export {
  type AccessPolicy,
  AccessPolicyZod,
  AuthzTypeZod,
  type Blueprint,
  blueprintProblems,
  BlueprintZod,
  type FieldBlueprint,
  type TableBlueprint,
} from './blueprint/blueprint-schema';
export { fieldTypeToTypeName, toFieldDefault, toFieldType } from './blueprint/field-type';
export { isInternalPolicy } from './blueprint/internal-policies';
export {
  BlueprintBuildError,
  buildBlueprint,
  CONSTRUCTION_DEADLINE_MS,
  type ConstructionTableMap,
  readConstructionFailure,
  waitForConstruction,
  type WaitForConstructionOptions,
} from './blueprint-construction';
export {
  CONTEXT_ENV_KEYS,
  CONTEXT_ENV_PREFIX,
  type ContextEnvKey,
  type ContextSource,
  deriveSubdomainEndpoint,
  fromEnvFile,
  fromEnvironment,
  type ModulesClient,
  type ProjectContext,
  type ProjectContextFailureCode,
  resolveDataToken,
  resolveProjectContext,
  type ResolveResult,
} from './context';
export {
  type DatabaseProbe,
  probeBoundDatabase,
  probeDatabase,
  type UnreachableCause,
} from './db-probe';
export { failureFromErrors,type FailureMeaning } from './failure';
export { constructiveGateDeps, type ConstructiveGateResolvers } from './gate';
export {
  type BackendErrorKind,
  classifyBackendErrors,
  type HttpGraphQLResponse,
  postGraphQL,
  statusAdapter,
} from './graphql-http';
export { type PostGraphQLArgs } from './graphql-http';
export {
  type ActiveDataToken,
  configureHost,
  type DataAuthBroker,
  DEFAULT_DATA_TOKEN_SKEW_MS,
  getHost,
  type HostAccount,
  type HostBackendConfig,
  type HostProvisionOverlay,
  noBackendReason,
  type PreviewToken,
  type ProjectBinding,
  type SecretDelivery,
  type StepUpRequest,
  type ToolsHost,
} from './host';
export {
  archiveBindingKeys,
  ARCHIVED_BINDING_KEYS,
  type EnvVars,
  mergeEnv,
  provisionEnvVars,
  readEnv,
} from './provision-database/env-file';
export {
  loadProvisionManifest,
  parseProvisionManifest,
  PROVISION_MANIFEST_FILE,
  type ProvisionManifest,
} from './provision-database/manifest';
export {
  allModulePresets,
  DEFAULT_PROVISION_PRESET,
  getModulePreset,
  type ModulePreset,
  type ProvisionModule,
} from './provision-database/presets';
export {
  provisionDatabase,
  type ProvisionDatabaseDetails,
  type ProvisionFailureCode,
  type ProvisionInput,
} from './provision-database/provision';
export {
  moduleKey,
  type ProvisionOverlay,
  resolveProvisionModules,
} from './provision-database/resolve';
export {
  accessOf,
  type ColumnDefault,
  type FkAction,
  type ModelColumn,
  type ModelForeignKey,
  type ModelPolicy,
  type ModelTable,
  type ObjectCategory,
  readSchemaModel,
  type SchemaModel,
  SchemaReadError,
  type TableAccess,
} from './schema-model';
export { accessState, asWritten, grantWords, planRule, ruleWords, type WrittenRule } from './table-access';
export { toolSchema } from './tool-schema';
export { describePolicyTypeTool, explainAccessTool, type ExplainedRule, type ExplainedTable, setAccessTool } from './tools/access';
export { type AddPoliciesDetails, addPoliciesTool } from './tools/add-policies';
export { type AddRecordsDetails, addRecordsTool } from './tools/add-records';
export { type AddRelationDetails, addRelationTool } from './tools/add-relation';
export { type CreateApiKeyDetails, createApiKeyTool } from './tools/create-api-key';
export { type DescribeSchemaDetails, describeSchemaTool } from './tools/describe-schema';
export { createEntityTypeTool, deleteEntityTypeTool, type EntityTypesDetails, type EntityTypeSummary, listEntityTypesTool } from './tools/entity-types';
export {
  createFieldTool,
  deleteFieldTool,
  deleteTableTool,
  type MutationDetails,
  retypeFieldTool,
  updateFieldTool,
} from './tools/mutations';
export { type ProvisionBlueprintDetails, provisionBlueprintTool } from './tools/provision-blueprint';
export { provisionDatabaseTool, replaceDatabaseTool } from './tools/provision-database';
export { type RunCodegenDetails, type RunCodegenTimings, runCodegenTool } from './tools/run-codegen';
export {
  applyTemplateTool,
  type CreateTemplateDetails,
  createTemplatePreviewTables,
  createTemplateTool,
  deleteTemplateTool,
  type ListTemplatesDetails,
  listTemplatesTool,
  type TemplateDetails,
  updateTemplateTool,
} from './tools/templates';

export default constructiveDbTools;
