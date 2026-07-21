"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionsGeomModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class CollectionsGeomModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("CollectionsGeom", "collectionsGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "CollectionsGeomFilter", "CollectionsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CollectionsGeom",
            fieldName: "collectionsGeoms",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("CollectionsGeom", "collectionsGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "CollectionsGeomFilter", "CollectionsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CollectionsGeom",
            fieldName: "collectionsGeom",
            document,
            variables,
            transform: (data) => ({
                "collectionsGeom": data.collectionsGeoms?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("CollectionsGeom", "collectionsGeoms", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "CollectionsGeomFilter", "CollectionsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CollectionsGeom",
            fieldName: "collectionsGeom",
            document,
            variables,
            transform: (data) => ({
                "collectionsGeom": data.collectionsGeoms?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("CollectionsGeom", "createCollectionsGeom", "collectionsGeom", args.select, args.data, "CreateCollectionsGeomInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CollectionsGeom",
            fieldName: "createCollectionsGeom",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("CollectionsGeom", "updateCollectionsGeom", "collectionsGeom", args.select, args.where.id, args.data, "UpdateCollectionsGeomInput", "id", "collectionsGeomPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CollectionsGeom",
            fieldName: "updateCollectionsGeom",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("CollectionsGeom", "deleteCollectionsGeom", "collectionsGeom", {
            id: args.where.id
        }, "DeleteCollectionsGeomInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CollectionsGeom",
            fieldName: "deleteCollectionsGeom",
            document,
            variables
        });
    }
}
exports.CollectionsGeomModel = CollectionsGeomModel;
