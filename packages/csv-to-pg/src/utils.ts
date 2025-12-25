import { ast, nodes } from '@pgsql/utils';
import type { Node } from '@pgsql/types';
import { join, resolve } from 'path';

export const normalizePath = (path: string, cwd?: string): string =>
  path.startsWith('/') ? path : resolve(join(cwd ? cwd : process.cwd(), path));

const lstr = (bbox: string): string => {
  const [lng1, lat1, lng2, lat2] = bbox.split(',').map((a) => a.trim());
  return `LINESTRING(${lng1} ${lat1}, ${lng1} ${lat2}, ${lng2} ${lat2}, ${lng2} ${lat1}, ${lng1} ${lat1})`;
};

const funcCall = (name: string, args: Node[]): Node => {
  return nodes.funcCall({
    funcname: [nodes.string({ sval: name })],
    args
  });
};

const aflt = (num: string | number): Node => nodes.aConst({ fval: ast.float({ fval: String(num) }) });
const aint = (num: number): Node => nodes.aConst({ ival: ast.integer({ ival: num }) });

export const makeLocation = (longitude: string | number | null | undefined, latitude: string | number | null | undefined): Node => {
  if (!longitude || !latitude) {
    return nodes.aConst({ isnull: true });
  }
  return funcCall('st_setsrid', [
    funcCall('st_makepoint', [aflt(longitude), aflt(latitude)]),
    aint(4326)
  ]);
};

// a string in the form of lon,lat,lon,lat
// -118.587533,34.024999,-118.495177,34.13165
export const makeBoundingBox = (bbox: string): Node => {
  return funcCall('st_setsrid', [
    funcCall('st_makepolygon', [
      funcCall('st_geomfromtext', [
        nodes.aConst({ sval: ast.string({ sval: lstr(bbox) }) })
      ])
    ]),
    aint(4326)
  ]);
};

interface TypesMap {
  [key: string]: (record: Record<string, unknown>) => Node;
}

const ValuesLists = ({ types, record }: { types: TypesMap; record: Record<string, unknown> }): Node[] =>
  Object.entries(types).map(([_field, type]) => {
    if (typeof type === 'function') {
      return type(record);
    }
    throw new Error('coercion function missing');
  });

const makeCast = (arg: Node, type: string): Node => ({
  TypeCast: {
    arg,
    typeName: {
      names: [
        {
          String: {
            sval: type
          }
        }
      ],
      typemod: -1
    }
  }
});

const ref = (name: string): Node => ({
  ResTarget: {
    name,
    val: {
      ColumnRef: {
        fields: [
          {
            String: {
              sval: 'excluded'
            }
          },
          {
            String: {
              sval: name
            }
          }
        ]
      }
    }
  }
});

const indexElem = (name: string): Node => ({
  IndexElem: {
    name,
    ordering: 'SORTBY_DEFAULT',
    nulls_ordering: 'SORTBY_NULLS_DEFAULT'
  }
});

import type { OnConflictClause } from '@pgsql/types';

const makeConflictClause = (conflictElems: string[] | undefined, fields: string[]): OnConflictClause | undefined => {
  if (!conflictElems || !conflictElems.length) return undefined;
  const setElems = fields.filter((el) => !conflictElems.includes(el));
  if (setElems.length) {
    return {
      action: 'ONCONFLICT_UPDATE',
      infer: {
        indexElems: conflictElems.map((a) => indexElem(a))
      },
      targetList: setElems.map((a) => ref(a))
    };
  } else {
    return {
      action: 'ONCONFLICT_NOTHING',
      infer: {
        indexElems: conflictElems.map((a) => indexElem(a))
      }
    };
  }
};

interface InsertOneParams {
  schema?: string;
  table: string;
  types: TypesMap;
  record: Record<string, unknown>;
  conflict?: string[];
}

export const InsertOne = ({
  schema = 'public',
  table,
  types,
  record,
  conflict
}: InsertOneParams): Node => ({
  RawStmt: {
    stmt: {
      InsertStmt: {
        relation: {
          schemaname: schema,
          relname: table,
          inh: true,
          relpersistence: 'p'
        },
        cols: Object.keys(types).map((field) => nodes.resTarget({ name: field })),
        selectStmt: {
          SelectStmt: {
            valuesLists: [
              {
                List: {
                  items: ValuesLists({ types, record })
                }
              }
            ],
            op: 'SETOP_NONE',
            limitOption: 'LIMIT_OPTION_DEFAULT'
          }
        },
        onConflictClause: makeConflictClause(conflict, Object.keys(types)),
        override: 'OVERRIDING_NOT_SET'
      }
    },
    stmt_len: 1
  }
});

interface InsertManyParams {
  schema?: string;
  table: string;
  types: TypesMap;
  records: Record<string, unknown>[];
  conflict?: string[];
}

export const InsertMany = ({
  schema = 'public',
  table,
  types,
  records,
  conflict
}: InsertManyParams): Node => ({
  RawStmt: {
    stmt: {
      InsertStmt: {
        relation: {
          schemaname: schema,
          relname: table,
          inh: true,
          relpersistence: 'p'
        },
        cols: Object.keys(types).map((field) => nodes.resTarget({ name: field })),
        selectStmt: {
          SelectStmt: {
            valuesLists: records.map((record) => ({
              List: {
                items: ValuesLists({ types, record })
              }
            })),
            op: 'SETOP_NONE',
            limitOption: 'LIMIT_OPTION_DEFAULT'
          }
        },
        onConflictClause: makeConflictClause(conflict, Object.keys(types)),
        override: 'OVERRIDING_NOT_SET'
      }
    },
    stmt_len: 1
  }
});

interface WrapOptions {
  wrap?: string[];
  wrapAst?: (val: Node) => Node;
  cast?: string;
}

export const wrapValue = (val: Node, { wrap, wrapAst, cast }: WrapOptions = {}): Node => {
  if (Array.isArray(wrap)) {
    val = nodes.funcCall({
      funcname: wrap.map((n) => nodes.string({ sval: n })),
      args: [val]
    });
  }
  if (wrapAst) return wrapAst(val);
  if (cast) return makeCast(val, cast);
  return val;
};

interface GetRelatedFieldParams {
  schema?: string;
  table: string;
  refType: string;
  refKey: string;
  refField: string;
  wrap?: string[];
  wrapAst?: (val: Node) => Node;
  cast?: string;
  record: Record<string, unknown>;
  parse: (value: unknown) => unknown;
  from: string[];
}

export const getRelatedField = ({
  schema = 'public',
  table,
  refType,
  refKey,
  refField,
  wrap,
  wrapAst,
  cast,
  record,
  parse,
  from
}: GetRelatedFieldParams): Node => {
  let val: Node;

  const value = parse(record[from[0]]);
  if (typeof value === 'undefined') {
    return nodes.aConst({ isnull: true });
  }

  switch (refType) {
    case 'int':
      val = nodes.aConst({ ival: ast.integer({ ival: value as number }) });
      break;
    case 'float':
      val = nodes.aConst({ fval: ast.float({ fval: String(value) }) });
      break;
    case 'boolean':
    case 'bool':
      val = nodes.string({ sval: value ? 'TRUE' : 'FALSE' });
      break;
    case 'text':
    default:
      val = nodes.aConst({ sval: ast.string({ sval: String(value) }) });
  }

  val = wrapValue(val, { wrap, wrapAst });

  return wrapValue(
    {
      SubLink: {
        subLinkType: 'EXPR_SUBLINK',
        subselect: {
          SelectStmt: {
            targetList: [
              {
                ResTarget: {
                  val: {
                    ColumnRef: {
                      fields: [
                        {
                          String: {
                            sval: refKey
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ],
            fromClause: [
              {
                RangeVar: {
                  schemaname: schema,
                  relname: table,
                  inh: true,
                  relpersistence: 'p'
                }
              }
            ],
            whereClause: {
              A_Expr: {
                kind: 'AEXPR_OP',
                name: [
                  {
                    String: {
                      sval: '='
                    }
                  }
                ],
                lexpr: {
                  ColumnRef: {
                    fields: [
                      {
                        String: {
                          sval: refField
                        }
                      }
                    ]
                  }
                },
                rexpr: val
              }
            },
            op: 'SETOP_NONE',
            limitOption: 'LIMIT_OPTION_DEFAULT'
          }
        }
      }
    },
    { cast }
  );
};
