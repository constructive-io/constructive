import { DocumentNode, print as gqlPrint } from 'graphql';
import { camelize, pluralize, underscore } from 'inflekt';

import {
  createOne,
  deleteOne,
  getAll,
  getCount,
  getMany,
  getOne,
  patchOne,
} from './ast';
import { validateMetaObject } from './meta-object';
import type {
  IntrospectionSchema,
  MetaObject,
  MetaTable,
  MutationDefinition,
  QueryBuilderOptions,
  QueryBuilderResult,
  QueryDefinition,
  QueryFieldSelection,
  QuerySelectionOptions,
} from './types';

export * as MetaObject from './meta-object';

const isObject = (val: unknown): val is object =>
  val !== null && typeof val === 'object';

export class QueryBuilder {
  public _introspection: IntrospectionSchema;
  public _meta: MetaObject;
  private _models!: Record<
    string,
    Record<string, QueryDefinition | MutationDefinition>
  >;
  private _model!: string;
  private _key!: string | null;
  private _queryName!: string;
  private _ast!: DocumentNode | null;
  public _edges!: boolean;
  private _op!: string;
  private _mutation!: string;
  private _select!: QueryFieldSelection[];

  constructor({ meta = {} as MetaObject, introspection }: QueryBuilderOptions) {
    this._introspection = introspection;
    this._meta = meta;
    this.clear();
    this.initModelMap();
    this.pickScalarFields = pickScalarFields.bind(this);
    this.pickAllFields = pickAllFields.bind(this);

    const result = validateMetaObject(this._meta);
    if (typeof result === 'object' && result.errors) {
      throw new Error(
        `QueryBuilder: meta object is invalid:\n${result.message}`,
      );
    }
  }

  /*
   * Save all gql queries and mutations by model name for quicker lookup
   */
  initModelMap(): void {
    this._models = {} as Record<
      string,
      Record<string, QueryDefinition | MutationDefinition>
    >;

    for (const [key, defn] of Object.entries(this._introspection)) {
      if (!this._models[defn.model]) {
        this._models[defn.model] = {};
      }
      this._models[defn.model][key] = defn;
    }
  }

  clear(): void {
    this._model = '';
    this._key = null;
    this._queryName = '';
    this._ast = null;
    this._edges = false;
    this._op = '';
    this._mutation = '';
    this._select = [];
  }

  query(model: string): QueryBuilder {
    this.clear();
    this._model = model;
    return this;
  }

  _findQuery(): string {
    // based on the op, finds the relevant GQL query
    const queries = this._models[this._model];
    if (!queries) {
      throw new Error('No queries found for ' + this._model);
    }

    const matchQuery = Object.entries(queries).find(
      ([_, defn]) => defn.qtype === this._op,
    );

    if (!matchQuery) {
      throw new Error('No query found for ' + this._model + ':' + this._op);
    }

    const queryKey = matchQuery[0];
    return queryKey;
  }

  _findMutation(): string {
    // For mutation, there can be many defns that match the operation being requested
    // .ie: deleteAction, deleteActionBySlug, deleteActionByName
    const matchingDefns = Object.keys(this._introspection).reduce(
      (arr, mutationKey) => {
        const defn = this._introspection[mutationKey];
        if (
          defn.model === this._model &&
          defn.qtype === this._op &&
          defn.qtype === 'mutation' &&
          (defn as MutationDefinition).mutationType === this._mutation
        ) {
          arr = [...arr, { defn, mutationKey }];
        }
        return arr;
      },
      [] as Array<{
        defn: QueryDefinition | MutationDefinition;
        mutationKey: string;
      }>,
    );

    if (matchingDefns.length === 0) {
      throw new Error(
        'no mutation found for ' + this._model + ':' + this._mutation,
      );
    }

    // We only need deleteAction from all of [deleteAction, deleteActionBySlug, deleteActionByName]
    const getInputName = (mutationType: string): string => {
      switch (mutationType) {
        case 'delete': {
          return `Delete${camelize(this._model)}Input`;
        }
        case 'create': {
          return `Create${camelize(this._model)}Input`;
        }
        case 'patch': {
          return `Update${camelize(this._model)}Input`;
        }
        default:
          throw new Error('Unhandled mutation type' + mutationType);
      }
    };

    const matchDefn = matchingDefns.find(
      ({ defn }) => defn.properties.input.type === getInputName(this._mutation),
    );

    if (!matchDefn) {
      throw new Error(
        'no mutation found for ' + this._model + ':' + this._mutation,
      );
    }

    return matchDefn.mutationKey;
  }

  select(selection?: QuerySelectionOptions | null): QueryBuilder {
    const defn = this._introspection[this._key!];

    // If selection not given, pick only scalar fields
    if (selection == null) {
      this._select = this.pickScalarFields(null, defn);
      return this;
    }

    this._select = this.pickAllFields(selection, defn);
    return this;
  }

  edges(useEdges: boolean): QueryBuilder {
    this._edges = useEdges;
    return this;
  }

  getMany({ select }: { select?: QuerySelectionOptions } = {}): QueryBuilder {
    this._op = 'getMany';
    this._key = this._findQuery();

    this.queryName(
      camelize(['get', underscore(this._key), 'query'].join('_'), true),
    );

    const defn = this._introspection[this._key];

    this.select(select);
    this._ast = getMany({
      builder: this,
      queryName: this._queryName,
      operationName: this._key,
      query: defn,
      selection: this._select,
    });

    return this;
  }

  all({ select }: { select?: QuerySelectionOptions } = {}): QueryBuilder {
    this._op = 'getMany';
    this._key = this._findQuery();

    this.queryName(
      camelize(['get', underscore(this._key), 'query', 'all'].join('_'), true),
    );

    const defn = this._introspection[this._key];

    this.select(select);
    this._ast = getAll({
      queryName: this._queryName,
      operationName: this._key,
      query: defn,
      selection: this._select,
    });

    return this;
  }

  count(): QueryBuilder {
    this._op = 'getMany';
    this._key = this._findQuery();

    this.queryName(
      camelize(
        ['get', underscore(this._key), 'count', 'query'].join('_'),
        true,
      ),
    );

    const defn = this._introspection[this._key];

    this._ast = getCount({
      queryName: this._queryName,
      operationName: this._key,
      query: defn,
    });

    return this;
  }

  getOne({ select }: { select?: QuerySelectionOptions } = {}): QueryBuilder {
    this._op = 'getOne';
    this._key = this._findQuery();

    this.queryName(
      camelize(['get', underscore(this._key), 'query'].join('_'), true),
    );

    const defn = this._introspection[this._key];
    this.select(select);
    this._ast = getOne({
      builder: this,
      queryName: this._queryName,
      operationName: this._key,
      query: defn,
      selection: this._select,
    });

    return this;
  }

  create({ select }: { select?: QuerySelectionOptions } = {}): QueryBuilder {
    this._op = 'mutation';
    this._mutation = 'create';
    this._key = this._findMutation();

    this.queryName(
      camelize([underscore(this._key), 'mutation'].join('_'), true),
    );

    const defn = this._introspection[this._key] as MutationDefinition;
    this.select(select);
    this._ast = createOne({
      operationName: this._key,
      mutationName: this._queryName,
      mutation: defn,
      selection: this._select,
    });

    return this;
  }

  delete({ select }: { select?: QuerySelectionOptions } = {}): QueryBuilder {
    this._op = 'mutation';
    this._mutation = 'delete';
    this._key = this._findMutation();

    this.queryName(
      camelize([underscore(this._key), 'mutation'].join('_'), true),
    );

    const defn = this._introspection[this._key] as MutationDefinition;

    this.select(select);
    this._ast = deleteOne({
      operationName: this._key,
      mutationName: this._queryName,
      mutation: defn,
    });

    return this;
  }

  update({ select }: { select?: QuerySelectionOptions } = {}): QueryBuilder {
    this._op = 'mutation';
    this._mutation = 'patch';
    this._key = this._findMutation();

    this.queryName(
      camelize([underscore(this._key), 'mutation'].join('_'), true),
    );

    const defn = this._introspection[this._key] as MutationDefinition;

    this.select(select);
    this._ast = patchOne({
      operationName: this._key,
      mutationName: this._queryName,
      mutation: defn,
      selection: this._select,
    });

    return this;
  }

  queryName(name: string): QueryBuilder {
    this._queryName = name;
    return this;
  }

  print(): QueryBuilderResult {
    if (!this._ast) {
      throw new Error('No AST generated. Please call a query method first.');
    }
    const _hash = gqlPrint(this._ast);
    return {
      _hash,
      _queryName: this._queryName,
      _ast: this._ast,
    };
  }

  // Bind methods that will be called with different this context
  pickScalarFields: (
    selection: QuerySelectionOptions | null,
    defn: QueryDefinition,
  ) => QueryFieldSelection[];
  pickAllFields: (
    selection: QuerySelectionOptions,
    defn: QueryDefinition,
  ) => QueryFieldSelection[];
}

/**
 * Pick scalar fields of a query definition
 * @param {Object} defn Query definition
 * @param {Object} meta Meta object containing info about table relations
 * @returns {Array}
 */
function pickScalarFields(
  this: QueryBuilder,
  selection: QuerySelectionOptions | null,
  defn: QueryDefinition,
): QueryFieldSelection[] {
  const model = defn.model;
  const modelMeta = this._meta.tables.find((t) => t.name === model);

  if (!modelMeta) {
    throw new Error(`Model meta not found for ${model}`);
  }

  const isInTableSchema = (fieldName: string): boolean =>
    !!modelMeta.fields.find((field) => field.name === fieldName);

  const pickFrom = (modelSelection: string[]): QueryFieldSelection[] =>
    modelSelection
      .filter((fieldName) => {
        // If not specified or not a valid selection list, allow all
        if (selection == null || !Array.isArray(selection)) return true;
        return Object.keys(selection).includes(fieldName);
      })
      .filter(
        (fieldName) =>
          !isRelationalField(fieldName, modelMeta) &&
          isInTableSchema(fieldName),
      )
      .map((fieldName) => ({
        name: fieldName,
        isObject: false,
        fieldDefn: modelMeta.fields.find((f) => f.name === fieldName),
      }));

  // This is for inferring the sub-selection of a mutation query
  // from a definition model .eg UserSetting, find its related queries in the introspection object, and pick its selection fields
  if (defn.qtype === 'mutation') {
    const relatedQuery =
      this._introspection[`${modelNameToGetMany(defn.model)}`];
    return pickFrom(relatedQuery.selection);
  }

  return pickFrom(defn.selection);
}

/**
 * Pick scalar fields and sub-selection fields of a query definition
 * @param {Object} selection Selection clause object
 * @param {Object} defn Query definition
 * @param {Object} meta Meta object containing info about table relations
 * @returns {Array}
 */
function pickAllFields(
  this: QueryBuilder,
  selection: QuerySelectionOptions,
  defn: QueryDefinition,
): QueryFieldSelection[] {
  const model = defn.model;
  const modelMeta = this._meta.tables.find((t) => t.name === model);

  if (!modelMeta) {
    throw new Error(`Model meta not found for ${model}`);
  }

  const selectionEntries = Object.entries(selection);
  let fields: QueryFieldSelection[] = [];

  const isWhiteListed = (selectValue: unknown): selectValue is boolean => {
    return typeof selectValue === 'boolean' && selectValue;
  };

  for (const entry of selectionEntries) {
    const [fieldName, fieldOptions] = entry;
    // Case
    // {
    //   goalResults: // fieldName
    //    { select: { id: true }, variables: { first: 100 } } // fieldOptions
    // }
    if (isObject(fieldOptions)) {
      if (!isFieldInDefinition(fieldName, defn, modelMeta)) {
        continue;
      }

      const referencedForeignConstraint = modelMeta.foreignConstraints.find(
        (constraint) =>
          constraint.fromKey.name === fieldName ||
          constraint.fromKey.alias === fieldName,
      );

      const selectOptions = fieldOptions as {
        select: Record<string, boolean>;
        variables?: Record<string, unknown>;
      };

      const subFields = Object.keys(selectOptions.select).filter((subField) => {
        return (
          !isRelationalField(subField, modelMeta) &&
          isWhiteListed(selectOptions.select[subField])
        );
      });

      const isBelongTo = !!referencedForeignConstraint;

      const fieldSelection: QueryFieldSelection = {
        name: fieldName,
        isObject: true,
        isBelongTo,
        selection: subFields.map((name) => ({ name, isObject: false })),
        variables: selectOptions.variables as QueryFieldSelection['variables'],
      };

      // Need to further expand selection of object fields,
      // but only non-graphql-builtin, non-relation fields
      // .ie action { id location }
      // location is non-scalar and non-relational, thus need to further expand into { x y ... }
      if (isBelongTo) {
        const getManyName = modelNameToGetMany(
          referencedForeignConstraint.refTable,
        );
        const refDefn = this._introspection[getManyName];
        fieldSelection.selection = pickScalarFields.call(
          this,
          { [fieldName]: true },
          refDefn,
        );
      }

      fields = [...fields, fieldSelection];
    } else {
      // Case
      // {
      //   userId: true // [fieldName, fieldOptions]
      // }
      if (isWhiteListed(fieldOptions)) {
        fields = [
          ...fields,
          {
            name: fieldName,
            isObject: false,
            fieldDefn: modelMeta.fields.find((f) => f.name === fieldName),
          },
        ];
      }
    }
  }

  return fields;
}

function isFieldInDefinition(
  fieldName: string,
  defn: QueryDefinition,
  modelMeta: MetaTable,
): boolean {
  const isReferenced = !!modelMeta.foreignConstraints.find(
    (constraint) =>
      constraint.fromKey.name === fieldName ||
      constraint.fromKey.alias === fieldName,
  );

  return (
    isReferenced ||
    defn.selection.some((selectionItem) => {
      if (typeof selectionItem === 'string') {
        return fieldName === selectionItem;
      }
      if (isObject(selectionItem)) {
        return (selectionItem as { name: string }).name === fieldName;
      }
      return false;
    })
  );
}

// TODO: see if there is a possibility of supertyping table (a key is both a foreign and primary key)
// A relational field is a foreign key but not a primary key
function isRelationalField(fieldName: string, modelMeta: MetaTable): boolean {
  return (
    !modelMeta.primaryConstraints.find((field) => field.name === fieldName) &&
    !!modelMeta.foreignConstraints.find(
      (constraint) => constraint.fromKey.name === fieldName,
    )
  );
}

// Get getMany op name from model
// ie. UserSetting => userSettings
function modelNameToGetMany(model: string): string {
  return camelize(pluralize(underscore(model)), true);
}
