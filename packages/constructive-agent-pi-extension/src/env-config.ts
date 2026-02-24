import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  CapabilityTag,
  ToolRiskClass,
} from '@constructive-io/constructive-agent';
import type { TSchema } from '@sinclair/typebox';

import type {
  ConstructivePiOperation,
  CreateConstructivePiExtensionOptions,
} from './extension-factory';
import type { OrmSelectPolicy } from './orm-catalog';

const CAPABILITIES: CapabilityTag[] = [
  'read',
  'write',
  'destructive',
  'admin',
  'integration',
  'unsafe',
];

const RISK_CLASSES: ToolRiskClass[] = [
  'read_only',
  'low',
  'high',
  'destructive',
];

const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return defaultValue;
};

const parseNumber = (
  value: string | undefined,
): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const parseSelectPolicy = (
  value: string | undefined,
): OrmSelectPolicy | undefined => {
  const normalized = normalizeString(value);
  if (
    normalized === 'auto-minimal' ||
    normalized === 'require-explicit' ||
    normalized === 'auto-full-scalar'
  ) {
    return normalized;
  }

  return undefined;
};

const parseCapability = (value: unknown, index: number): CapabilityTag => {
  const capability = normalizeString(value);
  if (!capability || !CAPABILITIES.includes(capability as CapabilityTag)) {
    throw new Error(
      `Invalid capability for operation ${index}. Expected one of: ${CAPABILITIES.join(
        ', ',
      )}`,
    );
  }

  return capability as CapabilityTag;
};

const parseRiskClass = (value: unknown, index: number): ToolRiskClass => {
  const riskClass = normalizeString(value);
  if (!riskClass || !RISK_CLASSES.includes(riskClass as ToolRiskClass)) {
    throw new Error(
      `Invalid riskClass for operation ${index}. Expected one of: ${RISK_CLASSES.join(
        ', ',
      )}`,
    );
  }

  return riskClass as ToolRiskClass;
};

const parseSchema = (value: unknown): TSchema | undefined => {
  if (!value) {
    return undefined;
  }

  if (!isObject(value)) {
    throw new Error(
      'Operation parameters must be a JSON object compatible with TypeBox schema shape.',
    );
  }

  return value as TSchema;
};

const parseOperation = (
  value: unknown,
  index: number,
): ConstructivePiOperation => {
  if (!isObject(value)) {
    throw new Error(`Operation ${index} must be an object.`);
  }

  const toolName = normalizeString(value.toolName);
  if (!toolName) {
    throw new Error(`Operation ${index} is missing toolName.`);
  }

  const document = normalizeString(value.document);
  if (!document) {
    throw new Error(`Operation ${index} is missing document.`);
  }

  return {
    toolName,
    label: normalizeString(value.label) || toolName,
    description:
      normalizeString(value.description) ||
      `Run allowlisted Constructive operation ${toolName}.`,
    capability: parseCapability(value.capability, index),
    riskClass: parseRiskClass(value.riskClass, index),
    document,
    parameters: parseSchema(value.parameters),
  };
};

export function loadConstructiveOperationsFromFile(
  filePath: string,
): ConstructivePiOperation[] {
  const absolutePath = resolve(process.cwd(), filePath);
  const raw = readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Constructive operation file ${absolutePath} must be a JSON array.`,
    );
  }

  return parsed.map((entry, index) => parseOperation(entry, index));
}

export function createConstructivePiOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CreateConstructivePiExtensionOptions {
  const operationsFile = normalizeString(env.CONSTRUCTIVE_OPERATIONS_FILE);
  const operations = operationsFile
    ? loadConstructiveOperationsFromFile(operationsFile)
    : undefined;

  const nonInteractiveApproval =
    normalizeString(env.CONSTRUCTIVE_NON_INTERACTIVE_APPROVAL) === 'allow'
      ? 'allow'
      : 'deny';

  let extraHeaders: Record<string, string> | undefined;
  const rawExtraHeaders = normalizeString(env.CONSTRUCTIVE_EXTRA_HEADERS_JSON);
  if (rawExtraHeaders) {
    const parsed = JSON.parse(rawExtraHeaders) as unknown;
    if (!isObject(parsed)) {
      throw new Error(
        'CONSTRUCTIVE_EXTRA_HEADERS_JSON must be a JSON object with string values.',
      );
    }

    extraHeaders = {};
    for (const [key, value] of Object.entries(parsed)) {
      const normalizedValue = normalizeString(value);
      if (!normalizedValue) {
        continue;
      }

      extraHeaders[key] = normalizedValue;
    }
  }

  return {
    operations,
    includeHealthCheckTool: parseBoolean(
      env.CONSTRUCTIVE_INCLUDE_HEALTH_CHECK,
      true,
    ),
    endpoint: normalizeString(env.CONSTRUCTIVE_GRAPHQL_ENDPOINT),
    accessToken: normalizeString(env.CONSTRUCTIVE_ACCESS_TOKEN),
    actorId: normalizeString(env.CONSTRUCTIVE_ACTOR_ID),
    tenantId: normalizeString(env.CONSTRUCTIVE_TENANT_ID),
    databaseId: normalizeString(env.CONSTRUCTIVE_DATABASE_ID),
    apiName: normalizeString(env.CONSTRUCTIVE_API_NAME),
    metaSchema: normalizeString(env.CONSTRUCTIVE_META_SCHEMA),
    origin: normalizeString(env.CONSTRUCTIVE_ORIGIN),
    userAgent: normalizeString(env.CONSTRUCTIVE_USER_AGENT),
    extraHeaders,
    nonInteractiveApproval,
    enableCommands: parseBoolean(env.CONSTRUCTIVE_ENABLE_COMMANDS, true),
    enableAuthSetCommand: parseBoolean(
      env.CONSTRUCTIVE_ENABLE_AUTH_SET,
      true,
    ),
    commandPrefix:
      normalizeString(env.CONSTRUCTIVE_COMMAND_PREFIX) || 'constructive',
    explore: {
      enabled: parseBoolean(env.CONSTRUCTIVE_EXPLORE_ENABLED, true),
      cacheDir: normalizeString(env.CONSTRUCTIVE_EXPLORE_CACHE_DIR),
      ttlMs: parseNumber(env.CONSTRUCTIVE_EXPLORE_TTL_MS),
      commandName: normalizeString(env.CONSTRUCTIVE_EXPLORE_COMMAND),
      forceRefreshArg: normalizeString(
        env.CONSTRUCTIVE_EXPLORE_FORCE_REFRESH_ARG,
      ),
    },
    ormDispatcher: {
      enabled: parseBoolean(env.CONSTRUCTIVE_ORM_DISPATCHER_ENABLED, true),
      strict: parseBoolean(env.CONSTRUCTIVE_ORM_DISPATCHER_STRICT, true),
      toolName: normalizeString(env.CONSTRUCTIVE_ORM_DISPATCHER_TOOL_NAME),
      selectPolicy: parseSelectPolicy(env.CONSTRUCTIVE_ORM_SELECT_POLICY),
    },
    codegen: {
      outputDir: normalizeString(env.CONSTRUCTIVE_CODEGEN_OUTPUT_DIR),
      docs: {
        agents: parseBoolean(env.CONSTRUCTIVE_CODEGEN_DOCS_AGENTS, true),
        mcp: parseBoolean(env.CONSTRUCTIVE_CODEGEN_DOCS_MCP, true),
        skills: parseBoolean(env.CONSTRUCTIVE_CODEGEN_DOCS_SKILLS, false),
      },
    },
    legacyDocumentTools: parseBoolean(
      env.CONSTRUCTIVE_LEGACY_DOCUMENT_TOOLS,
      false,
    ),
  };
}
