/**
 * SQL Schema Transform Cloud Function
 *
 * Transforms schema names in SQL using AST-based parsing with plpgsql-parser.
 * This uses the hydrated heterogeneous parser and de-parser to properly handle
 * both SQL and PL/pgSQL function bodies.
 */

import app from '@constructive-io/knative-job-fn';
import { transformSync, walk as walkPlpgsql, parseSql, Deparser } from 'plpgsql-parser';
import { walk as walkSql } from '@pgsql/traverse';

export interface SchemaTransformParams {
  sql: string;
  schema_mapping: Record<string, string>;
}

export interface SchemaTransformResult {
  transformed_sql: string;
  schemas_found: string[];
  schemas_transformed: Record<string, string>;
}

interface TransformContext {
  schemas_found: Set<string>;
  schemas_transformed: Map<string, string>;
}

function should_transform_schema(
  schema_name: string | undefined,
  schema_mapping: Map<string, string>
): boolean {
  if (!schema_name) return false;
  return schema_mapping.has(schema_name);
}

function transform_name_list(
  names: any[] | undefined,
  schema_mapping: Map<string, string>,
  ctx: TransformContext
): void {
  if (!names || names.length < 2) return;

  const first = names[0];
  if (first?.String?.sval) {
    const schema_name = first.String.sval;
    if (should_transform_schema(schema_name, schema_mapping)) {
      ctx.schemas_found.add(schema_name);
      const new_name = schema_mapping.get(schema_name);
      if (new_name) {
        first.String.sval = new_name;
        ctx.schemas_transformed.set(schema_name, new_name);
      }
    }
  }
}

function create_sql_visitor(
  schema_mapping: Map<string, string>,
  ctx: TransformContext
) {
  return {
    RangeVar: (path: any) => {
      const node = path.node;
      if (node.schemaname && should_transform_schema(node.schemaname, schema_mapping)) {
        const schema_name = node.schemaname;
        ctx.schemas_found.add(schema_name);
        const new_name = schema_mapping.get(schema_name);
        if (new_name) {
          node.schemaname = new_name;
          ctx.schemas_transformed.set(schema_name, new_name);
        }
      }
    },

    CreateSchemaStmt: (path: any) => {
      const node = path.node;
      if (node.schemaname && should_transform_schema(node.schemaname, schema_mapping)) {
        const schema_name = node.schemaname;
        ctx.schemas_found.add(schema_name);
        const new_name = schema_mapping.get(schema_name);
        if (new_name) {
          node.schemaname = new_name;
          ctx.schemas_transformed.set(schema_name, new_name);
        }
      }
    },

    CreateStmt: (path: any) => {
      const node = path.node;
      if (node.relation?.schemaname && should_transform_schema(node.relation.schemaname, schema_mapping)) {
        const schema_name = node.relation.schemaname;
        ctx.schemas_found.add(schema_name);
        const new_name = schema_mapping.get(schema_name);
        if (new_name) {
          node.relation.schemaname = new_name;
          ctx.schemas_transformed.set(schema_name, new_name);
        }
      }
    },

    IndexStmt: (path: any) => {
      const node = path.node;
      if (node.relation?.schemaname && should_transform_schema(node.relation.schemaname, schema_mapping)) {
        const schema_name = node.relation.schemaname;
        ctx.schemas_found.add(schema_name);
        const new_name = schema_mapping.get(schema_name);
        if (new_name) {
          node.relation.schemaname = new_name;
          ctx.schemas_transformed.set(schema_name, new_name);
        }
      }
    },

    AlterTableStmt: (path: any) => {
      const node = path.node;
      if (node.relation?.schemaname && should_transform_schema(node.relation.schemaname, schema_mapping)) {
        const schema_name = node.relation.schemaname;
        ctx.schemas_found.add(schema_name);
        const new_name = schema_mapping.get(schema_name);
        if (new_name) {
          node.relation.schemaname = new_name;
          ctx.schemas_transformed.set(schema_name, new_name);
        }
      }
    },

    TruncateStmt: (path: any) => {
      const node = path.node;
      if (node.relations) {
        for (const rel of node.relations) {
          if (rel?.RangeVar?.schemaname && should_transform_schema(rel.RangeVar.schemaname, schema_mapping)) {
            const schema_name = rel.RangeVar.schemaname;
            ctx.schemas_found.add(schema_name);
            const new_name = schema_mapping.get(schema_name);
            if (new_name) {
              rel.RangeVar.schemaname = new_name;
              ctx.schemas_transformed.set(schema_name, new_name);
            }
          }
        }
      }
    },

    CreateTrigStmt: (path: any) => {
      const node = path.node;
      if (node.relation?.schemaname && should_transform_schema(node.relation.schemaname, schema_mapping)) {
        const schema_name = node.relation.schemaname;
        ctx.schemas_found.add(schema_name);
        const new_name = schema_mapping.get(schema_name);
        if (new_name) {
          node.relation.schemaname = new_name;
          ctx.schemas_transformed.set(schema_name, new_name);
        }
      }
    },

    RuleStmt: (path: any) => {
      const node = path.node;
      if (node.relation?.schemaname && should_transform_schema(node.relation.schemaname, schema_mapping)) {
        const schema_name = node.relation.schemaname;
        ctx.schemas_found.add(schema_name);
        const new_name = schema_mapping.get(schema_name);
        if (new_name) {
          node.relation.schemaname = new_name;
          ctx.schemas_transformed.set(schema_name, new_name);
        }
      }
    },

    CreatePolicyStmt: (path: any) => {
      const node = path.node;
      if (node.table?.schemaname && should_transform_schema(node.table.schemaname, schema_mapping)) {
        const schema_name = node.table.schemaname;
        ctx.schemas_found.add(schema_name);
        const new_name = schema_mapping.get(schema_name);
        if (new_name) {
          node.table.schemaname = new_name;
          ctx.schemas_transformed.set(schema_name, new_name);
        }
      }
    },

    FuncCall: (path: any) => {
      const node = path.node;
      transform_name_list(node.funcname, schema_mapping, ctx);
    },

    TypeName: (path: any) => {
      const node = path.node;
      transform_name_list(node.names, schema_mapping, ctx);
    },

    ColumnRef: (path: any) => {
      const node = path.node;
      transform_name_list(node.fields, schema_mapping, ctx);
    },

    GrantStmt: (path: any) => {
      const node = path.node;
      if (node.objtype === 'OBJECT_SCHEMA' && node.objects) {
        for (const obj of node.objects) {
          if (obj?.String?.sval) {
            const schema_name = obj.String.sval;
            if (should_transform_schema(schema_name, schema_mapping)) {
              ctx.schemas_found.add(schema_name);
              const new_name = schema_mapping.get(schema_name);
              if (new_name) {
                obj.String.sval = new_name;
                ctx.schemas_transformed.set(schema_name, new_name);
              }
            }
          }
        }
      }
    },

    VariableSetStmt: (path: any) => {
      const node = path.node;
      if (node.name === 'search_path' && node.args) {
        for (const arg of node.args) {
          if (arg?.String?.sval) {
            const schema_name = arg.String.sval;
            if (should_transform_schema(schema_name, schema_mapping)) {
              ctx.schemas_found.add(schema_name);
              const new_name = schema_mapping.get(schema_name);
              if (new_name) {
                arg.String.sval = new_name;
                ctx.schemas_transformed.set(schema_name, new_name);
              }
            }
          } else if (arg?.A_Const?.sval?.sval) {
            const schema_name = arg.A_Const.sval.sval;
            if (should_transform_schema(schema_name, schema_mapping)) {
              ctx.schemas_found.add(schema_name);
              const new_name = schema_mapping.get(schema_name);
              if (new_name) {
                arg.A_Const.sval.sval = new_name;
                ctx.schemas_transformed.set(schema_name, new_name);
              }
            }
          }
        }
      }
    },

    AlterDefaultPrivilegesStmt: (path: any) => {
      const node = path.node;
      if (node.options) {
        for (const opt of node.options) {
          if (opt?.DefElem?.defname === 'schemas' && opt.DefElem.arg?.List?.items) {
            for (const item of opt.DefElem.arg.List.items) {
              if (item?.String?.sval) {
                const schema_name = item.String.sval;
                if (should_transform_schema(schema_name, schema_mapping)) {
                  ctx.schemas_found.add(schema_name);
                  const new_name = schema_mapping.get(schema_name);
                  if (new_name) {
                    item.String.sval = new_name;
                    ctx.schemas_transformed.set(schema_name, new_name);
                  }
                }
              }
            }
          }
        }
      }
    },

    DropStmt: (path: any) => {
      const node = path.node;
      if (node.removeType === 'OBJECT_SCHEMA' && node.objects) {
        for (const obj of node.objects) {
          if (obj?.List?.items) {
            for (const item of obj.List.items) {
              if (item?.String?.sval) {
                const schema_name = item.String.sval;
                if (should_transform_schema(schema_name, schema_mapping)) {
                  ctx.schemas_found.add(schema_name);
                  const new_name = schema_mapping.get(schema_name);
                  if (new_name) {
                    item.String.sval = new_name;
                    ctx.schemas_transformed.set(schema_name, new_name);
                  }
                }
              }
            }
          } else if (obj?.String?.sval) {
            const schema_name = obj.String.sval;
            if (should_transform_schema(schema_name, schema_mapping)) {
              ctx.schemas_found.add(schema_name);
              const new_name = schema_mapping.get(schema_name);
              if (new_name) {
                obj.String.sval = new_name;
                ctx.schemas_transformed.set(schema_name, new_name);
              }
            }
          }
        }
      }
    },

    CreateFunctionStmt: (path: any) => {
      const node = path.node;
      if (node.funcname && Array.isArray(node.funcname) && node.funcname.length >= 2) {
        const first = node.funcname[0];
        if (first?.String?.sval) {
          const schema_name = first.String.sval;
          if (should_transform_schema(schema_name, schema_mapping)) {
            ctx.schemas_found.add(schema_name);
            const new_name = schema_mapping.get(schema_name);
            if (new_name) {
              first.String.sval = new_name;
              ctx.schemas_transformed.set(schema_name, new_name);
            }
          }
        }
      }
    }
  };
}

function transform_plpgsql_type_ast(
  typname: string,
  schema_mapping: Map<string, string>,
  ctx: TransformContext
): string {
  let suffix = '';
  let base_typname = typname;

  const rowtype_match = typname.match(/(%rowtype|%type)$/i);
  if (rowtype_match) {
    suffix = rowtype_match[1];
    base_typname = typname.substring(0, typname.length - suffix.length);
  }

  let needs_transform = false;
  for (const old_schema of schema_mapping.keys()) {
    if (base_typname.startsWith(old_schema + '.') || base_typname.startsWith('"' + old_schema + '".')) {
      needs_transform = true;
      break;
    }
  }

  if (!needs_transform) {
    return typname;
  }

  try {
    const sql = `SELECT NULL::${base_typname}`;
    const parse_result = parseSql(sql);

    if (!parse_result?.stmts?.[0]?.stmt) {
      return transform_plpgsql_type_string(typname, schema_mapping, ctx);
    }

    const sql_visitor = {
      TypeName: (path: any) => {
        const type_node = path.node;
        if (type_node.names && Array.isArray(type_node.names)) {
          transform_name_list(type_node.names, schema_mapping, ctx);
        }
      }
    };

    walkSql(parse_result.stmts[0].stmt, sql_visitor);

    const deparsed = Deparser.deparse(parse_result.stmts[0].stmt);

    const match = deparsed.match(/SELECT\s+NULL::(.+)/i);
    if (match) {
      const transformed_typname = match[1].trim().replace(/;$/, '');
      return transformed_typname + suffix;
    }

    return transform_plpgsql_type_string(typname, schema_mapping, ctx);
  } catch {
    return transform_plpgsql_type_string(typname, schema_mapping, ctx);
  }
}

function transform_plpgsql_type_string(
  typname: string,
  schema_mapping: Map<string, string>,
  ctx: TransformContext
): string {
  for (const [old_schema, new_schema] of schema_mapping.entries()) {
    if (typname.startsWith(old_schema + '.')) {
      const rest = typname.substring(old_schema.length + 1);
      ctx.schemas_found.add(old_schema);
      ctx.schemas_transformed.set(old_schema, new_schema);
      return new_schema + '.' + rest;
    }
    if (typname.startsWith('"' + old_schema + '".')) {
      const rest = typname.substring(old_schema.length + 3);
      ctx.schemas_found.add(old_schema);
      ctx.schemas_transformed.set(old_schema, new_schema);
      return '"' + new_schema + '".' + rest;
    }
  }
  return typname;
}

function walk_plpgsql_for_schemas(
  node: any,
  schema_mapping: Map<string, string>,
  ctx: TransformContext
): void {
  if (node === null || node === undefined || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walk_plpgsql_for_schemas(node[i], schema_mapping, ctx);
    }
    return;
  }

  if ('PLpgSQL_type' in node) {
    const pl_type = node.PLpgSQL_type;
    if (pl_type.typname) {
      if (typeof pl_type.typname === 'object' && pl_type.typname.kind === 'type-name') {
        const sql_visitor = create_sql_visitor(schema_mapping, ctx);
        walkSql(pl_type.typname.typeNameNode, sql_visitor);
      } else if (typeof pl_type.typname === 'string') {
        pl_type.typname = transform_plpgsql_type_ast(
          pl_type.typname,
          schema_mapping,
          ctx
        );
      }
    }
  }

  for (const value of Object.values(node)) {
    walk_plpgsql_for_schemas(value, schema_mapping, ctx);
  }
}

export function transformSqlSchemas(
  sql: string,
  schema_mapping: Map<string, string>
): SchemaTransformResult {
  const ctx: TransformContext = {
    schemas_found: new Set<string>(),
    schemas_transformed: new Map<string, string>()
  };

  if (schema_mapping.size === 0 || !sql.trim()) {
    return {
      transformed_sql: sql,
      schemas_found: [],
      schemas_transformed: {}
    };
  }

  const transformed_sql = transformSync(sql, (transform_ctx) => {
    const sql_visitor = create_sql_visitor(schema_mapping, ctx);

    if (transform_ctx.sql?.stmts) {
      for (const stmt of transform_ctx.sql.stmts) {
        if (stmt?.stmt) {
          walkSql(stmt.stmt, sql_visitor);
        }
      }
    }

    for (const fn of transform_ctx.functions) {
      if (fn.plpgsql?.hydrated) {
        walkPlpgsql(fn.plpgsql.hydrated, {}, {
          walkSqlExpressions: true,
          sqlVisitor: sql_visitor
        });

        walk_plpgsql_for_schemas(fn.plpgsql.hydrated, schema_mapping, ctx);
      }
    }
  }, { hydrate: true, pretty: true });

  return {
    transformed_sql,
    schemas_found: Array.from(ctx.schemas_found),
    schemas_transformed: Object.fromEntries(ctx.schemas_transformed)
  };
}

export const transformSchemas = async (
  params: SchemaTransformParams
): Promise<SchemaTransformResult> => {
  const { sql, schema_mapping } = params;

  if (!sql) {
    throw new Error('Missing required parameter: sql');
  }

  if (!schema_mapping || typeof schema_mapping !== 'object') {
    throw new Error('Missing required parameter: schema_mapping');
  }

  const mapping = new Map<string, string>(Object.entries(schema_mapping));

  const result = transformSqlSchemas(sql, mapping);

  // eslint-disable-next-line no-console
  console.log('[sql-schema-transform] Transformed SQL:', {
    schemas_found: result.schemas_found,
    schemas_transformed: result.schemas_transformed
  });

  // eslint-disable-next-line no-console
  console.log('[sql-schema-transform] Output SQL:');
  // eslint-disable-next-line no-console
  console.log(result.transformed_sql);

  return result;
};

app.post('/', async (req: any, res: any, next: any) => {
  try {
    const params = (req.body || {}) as SchemaTransformParams;

    const result = await transformSchemas(params);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default app;

if (require.main === module) {
  const port = Number(process.env.PORT ?? 8080);
  (app as any).listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[sql-schema-transform] listening on port ${port}`);
  });
}
