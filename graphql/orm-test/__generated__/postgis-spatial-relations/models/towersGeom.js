"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowersGeomModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class TowersGeomModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("TowersGeom", "towersGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "TowersGeomFilter", "TowersGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TowersGeom",
            fieldName: "towersGeoms",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("TowersGeom", "towersGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "TowersGeomFilter", "TowersGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TowersGeom",
            fieldName: "towersGeom",
            document,
            variables,
            transform: (data) => ({
                "towersGeom": data.towersGeoms?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("TowersGeom", "towersGeoms", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "TowersGeomFilter", "TowersGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TowersGeom",
            fieldName: "towersGeom",
            document,
            variables,
            transform: (data) => ({
                "towersGeom": data.towersGeoms?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("TowersGeom", "createTowersGeom", "towersGeom", args.select, args.data, "CreateTowersGeomInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TowersGeom",
            fieldName: "createTowersGeom",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("TowersGeom", "updateTowersGeom", "towersGeom", args.select, args.where.id, args.data, "UpdateTowersGeomInput", "id", "towersGeomPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TowersGeom",
            fieldName: "updateTowersGeom",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("TowersGeom", "deleteTowersGeom", "towersGeom", {
            id: args.where.id
        }, "DeleteTowersGeomInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TowersGeom",
            fieldName: "deleteTowersGeom",
            document,
            variables
        });
    }
}
exports.TowersGeomModel = TowersGeomModel;
