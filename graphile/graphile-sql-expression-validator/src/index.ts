import type { Plugin } from 'graphile-build';
import { parse } from 'pgsql-parser';
import { deparse } from 'pgsql-deparser';

export interface SqlExpressionValidatorOptions {
  allowedFunctions?: string[];
  allowedSchemas?: string[];
  maxExpressionLength?: number;
  allowOwnedSchemas?: boolean;
  getAdditionalAllowedSchemas?: (context: any) => Promise<string[]>;
}

const DEFAULT_ALLOWED_FUNCTIONS = [
  'uuid_generate_v4',
  'gen_random_uuid',
  'now',
  'current_timestamp',
  'current_date',
  'current_time',
  'localtime',
  'localtimestamp',
  'clock_timestamp',
  'statement_timestamp',
  'transaction_timestamp',
  'timeofday',
  'random',
  'setseed',
];

const ALLOWED_NODE_TYPES = new Set([
  'A_Const',
  'TypeCast',
  'A_Expr',
  'FuncCall',
  'CoalesceExpr',
  'NullTest',
  'BoolExpr',
  'CaseExpr',
  'CaseWhen',
]);

const FORBIDDEN_NODE_TYPES = new Set([
  'SelectStmt',
  'InsertStmt',
  'UpdateStmt',
  'DeleteStmt',
  'CreateStmt',
  'AlterTableStmt',
  'DropStmt',
  'TruncateStmt',
  'ColumnRef',
  'SubLink',
  'RangeVar',
  'RangeSubselect',
  'JoinExpr',
  'FromExpr',
]);

function getNodeType(node: any): string | null {
  if (!node || typeof node !== 'object') return null;
  const keys = Object.keys(node);
  if (keys.length === 1) return keys[0];
  return null;
}

function validateAstNode(
  node: any,
  allowedFunctions: string[],
  allowedSchemas: string[],
  path: string[] = []
): { valid: boolean; error?: string } {
  if (!node || typeof node !== 'object') {
    return { valid: true };
  }

  const nodeType = getNodeType(node);

  if (nodeType && FORBIDDEN_NODE_TYPES.has(nodeType)) {
    return {
      valid: false,
      error: `Forbidden node type "${nodeType}" at path: ${path.join('.')}`,
    };
  }

  if (nodeType === 'FuncCall') {
    const funcCall = node.FuncCall;
    const funcName = funcCall?.funcname;

    if (Array.isArray(funcName)) {
      const names = funcName.map((n: any) => n.String?.sval || n.str || '');
      const schemaName = names.length > 1 ? names[0] : null;
      const functionName = names[names.length - 1];

      if (schemaName) {
        if (!allowedSchemas.includes(schemaName)) {
          return {
            valid: false,
            error: `Function schema "${schemaName}" is not in the allowed schemas list`,
          };
        }
      } else {
        if (!allowedFunctions.includes(functionName.toLowerCase())) {
          return {
            valid: false,
            error: `Function "${functionName}" is not in the allowed functions list`,
          };
        }
      }
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const result = validateAstNode(
          value[i],
          allowedFunctions,
          allowedSchemas,
          [...path, key, String(i)]
        );
        if (!result.valid) return result;
      }
    } else if (value && typeof value === 'object') {
      const result = validateAstNode(value, allowedFunctions, allowedSchemas, [
        ...path,
        key,
      ]);
      if (!result.valid) return result;
    }
  }

  return { valid: true };
}

export async function parseAndValidateSqlExpression(
  expression: string,
  options: SqlExpressionValidatorOptions = {}
): Promise<{ valid: boolean; ast?: any; canonicalText?: string; error?: string }> {
  const {
    allowedFunctions = DEFAULT_ALLOWED_FUNCTIONS,
    allowedSchemas = [],
    maxExpressionLength = 10000,
  } = options;

  if (!expression || typeof expression !== 'string') {
    return { valid: false, error: 'Expression must be a non-empty string' };
  }

  if (expression.length > maxExpressionLength) {
    return {
      valid: false,
      error: `Expression exceeds maximum length of ${maxExpressionLength} characters`,
    };
  }

  if (expression.includes(';')) {
    return {
      valid: false,
      error: 'Expression cannot contain semicolons (no stacked statements)',
    };
  }

  try {
    const wrappedSql = `SELECT (${expression})`;
    const parseResult = await parse(wrappedSql);

    if (
      !parseResult ||
      !parseResult.stmts ||
      parseResult.stmts.length !== 1
    ) {
      return { valid: false, error: 'Failed to parse expression' };
    }

    const stmt = (parseResult.stmts[0] as any)?.stmt;
    if (!stmt?.SelectStmt) {
      return { valid: false, error: 'Unexpected parse result structure' };
    }

    const targetList = stmt.SelectStmt.targetList;
    if (!targetList || targetList.length !== 1) {
      return { valid: false, error: 'Expected single expression' };
    }

    const resTarget = targetList[0]?.ResTarget;
    if (!resTarget || !resTarget.val) {
      return { valid: false, error: 'Could not extract expression from parse result' };
    }

    const expressionAst = resTarget.val;

    const validationResult = validateAstNode(
      expressionAst,
      allowedFunctions.map((f) => f.toLowerCase()),
      allowedSchemas
    );

    if (!validationResult.valid) {
      return { valid: false, error: validationResult.error };
    }

    let canonicalText: string;
    try {
      canonicalText = await deparse([expressionAst]);
    } catch (deparseError) {
      return {
        valid: false,
        error: `Failed to deparse expression: ${deparseError}`,
      };
    }

    return {
      valid: true,
      ast: expressionAst,
      canonicalText,
    };
  } catch (parseError: any) {
    return {
      valid: false,
      error: `Failed to parse SQL expression: ${parseError.message || parseError}`,
    };
  }
}

export async function validateAst(
  ast: any,
  options: SqlExpressionValidatorOptions = {}
): Promise<{ valid: boolean; canonicalText?: string; error?: string }> {
  const { allowedFunctions = DEFAULT_ALLOWED_FUNCTIONS, allowedSchemas = [] } =
    options;

  if (!ast || typeof ast !== 'object') {
    return { valid: false, error: 'AST must be a non-null object' };
  }

  const validationResult = validateAstNode(
    ast,
    allowedFunctions.map((f) => f.toLowerCase()),
    allowedSchemas
  );

  if (!validationResult.valid) {
    return { valid: false, error: validationResult.error };
  }

  try {
    const canonicalText = await deparse([ast]);
    return { valid: true, canonicalText };
  } catch (deparseError) {
    return {
      valid: false,
      error: `Failed to deparse AST: ${deparseError}`,
    };
  }
}

const OWNED_SCHEMAS_CACHE_KEY = Symbol('sqlExpressionValidator.ownedSchemas');

async function resolveEffectiveOptions(
  baseOptions: SqlExpressionValidatorOptions,
  gqlContext: any
): Promise<SqlExpressionValidatorOptions> {
  const {
    allowedSchemas = [],
    allowOwnedSchemas = false,
    getAdditionalAllowedSchemas,
    ...rest
  } = baseOptions;

  const effectiveSchemas = [...allowedSchemas];

  if (allowOwnedSchemas && gqlContext?.pgClient) {
    let ownedSchemas: string[] | undefined = gqlContext[OWNED_SCHEMAS_CACHE_KEY];

    if (!ownedSchemas) {
      try {
        const result = await gqlContext.pgClient.query(
          `SELECT schema_name FROM metaschema_public.schema WHERE database_id = jwt_private.current_database_id()`
        );
        ownedSchemas = result.rows.map((row: { schema_name: string }) => row.schema_name);
        gqlContext[OWNED_SCHEMAS_CACHE_KEY] = ownedSchemas;
      } catch (err) {
        ownedSchemas = [];
      }
    }

    effectiveSchemas.push(...ownedSchemas);
  }

  if (getAdditionalAllowedSchemas) {
    try {
      const additionalSchemas = await getAdditionalAllowedSchemas(gqlContext);
      effectiveSchemas.push(...additionalSchemas);
    } catch (err) {
    }
  }

  const uniqueSchemas = [...new Set(effectiveSchemas)];

  return {
    ...rest,
    allowedSchemas: uniqueSchemas,
  };
}

const SqlExpressionValidatorPlugin: Plugin = (
  builder,
  options: { sqlExpressionValidator?: SqlExpressionValidatorOptions } = {}
) => {
  const validatorOptions = options.sqlExpressionValidator || {};

  builder.hook(
    'GraphQLObjectType:fields:field',
    (field: any, build: any, context: any) => {
      const {
        scope: { isRootMutation, fieldName, pgFieldIntrospection: table },
      } = context;

      if (!isRootMutation || !table) {
        return field;
      }

      const sqlExpressionColumns = build.pgIntrospectionResultsByKind.attribute
        .filter((attr: any) => attr.classId === table.id)
        .filter((attr: any) => attr.tags?.sqlExpression);

      if (sqlExpressionColumns.length === 0) {
        return field;
      }

      const defaultResolver = (obj: Record<string, any>) => obj[fieldName];
      const { resolve: oldResolve = defaultResolver, ...rest } = field;

      return {
        ...rest,
        async resolve(
          source: any,
          args: any,
          gqlContext: any,
          info: any
        ) {
          const effectiveOptions = await resolveEffectiveOptions(
            validatorOptions,
            gqlContext
          );

          for (const attr of sqlExpressionColumns) {
            const textGqlName = build.inflection.column(attr);

            const rawSqlAstFieldTag = attr.tags?.rawSqlAstField;
            const astDbName =
              typeof rawSqlAstFieldTag === 'string' && rawSqlAstFieldTag.trim()
                ? rawSqlAstFieldTag.trim()
                : `${attr.name}_ast`;

            const astAttr = build.pgIntrospectionResultsByKind.attribute.find(
              (a: any) => a.classId === table.id && a.name === astDbName
            );

            let astGqlName: string | null = null;
            if (astAttr) {
              astGqlName = build.inflection.column(astAttr);
            } else if (typeof rawSqlAstFieldTag === 'string' && rawSqlAstFieldTag.trim()) {
              throw new Error(
                `@rawSqlAstField points to missing column "${astDbName}" on ${table.namespaceName}.${table.name}`
              );
            }

            const inputPath = findInputPath(args, textGqlName);
            const astInputPath = astGqlName ? findInputPath(args, astGqlName) : null;

            if (inputPath) {
              const textValue = getNestedValue(args, inputPath);
              if (textValue !== undefined && textValue !== null) {
                const result = await parseAndValidateSqlExpression(
                  textValue,
                  effectiveOptions
                );

                if (!result.valid) {
                  throw new Error(
                    `Invalid SQL expression in ${textGqlName}: ${result.error}`
                  );
                }

                setNestedValue(args, inputPath, result.canonicalText);

                if (astGqlName && (astInputPath || canSetAstColumn(args, inputPath, astGqlName))) {
                  const astPath = astInputPath || replaceLastSegment(inputPath, astGqlName);
                  setNestedValue(args, astPath, result.ast);
                }
              }
            }

            if (astInputPath && !inputPath && astGqlName) {
              const astValue = getNestedValue(args, astInputPath);
              if (astValue !== undefined && astValue !== null) {
                const result = await validateAst(astValue, effectiveOptions);

                if (!result.valid) {
                  throw new Error(
                    `Invalid SQL expression AST in ${astGqlName}: ${result.error}`
                  );
                }

                const textPath = replaceLastSegment(astInputPath, textGqlName);
                if (canSetColumn(args, astInputPath, textGqlName)) {
                  setNestedValue(args, textPath, result.canonicalText);
                }
              }
            }
          }

          return oldResolve(source, args, gqlContext, info);
        },
      };
    }
  );
};

function findInputPath(obj: any, key: string, path: string[] = []): string[] | null {
  if (!obj || typeof obj !== 'object') return null;

  for (const [k, v] of Object.entries(obj)) {
    if (k === key) {
      return [...path, k];
    }
    if (v && typeof v === 'object') {
      const result = findInputPath(v, key, [...path, k]);
      if (result) return result;
    }
  }
  return null;
}

function getNestedValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

function setNestedValue(obj: any, path: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (current[path[i]] === undefined) {
      current[path[i]] = {};
    }
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
}

function replaceLastSegment(path: string[], newSegment: string): string[] {
  return [...path.slice(0, -1), newSegment];
}

function canSetAstColumn(args: any, textPath: string[], astColumnName: string): boolean {
  const parentPath = textPath.slice(0, -1);
  const parent = getNestedValue(args, parentPath);
  return parent && typeof parent === 'object';
}

function canSetColumn(args: any, astPath: string[], columnName: string): boolean {
  const parentPath = astPath.slice(0, -1);
  const parent = getNestedValue(args, parentPath);
  return parent && typeof parent === 'object';
}

export default SqlExpressionValidatorPlugin;
