"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutesGeomModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class RoutesGeomModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("RoutesGeom", "routesGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "RoutesGeomFilter", "RoutesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RoutesGeom",
            fieldName: "routesGeoms",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("RoutesGeom", "routesGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "RoutesGeomFilter", "RoutesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RoutesGeom",
            fieldName: "routesGeom",
            document,
            variables,
            transform: (data) => ({
                "routesGeom": data.routesGeoms?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("RoutesGeom", "routesGeoms", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "RoutesGeomFilter", "RoutesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RoutesGeom",
            fieldName: "routesGeom",
            document,
            variables,
            transform: (data) => ({
                "routesGeom": data.routesGeoms?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("RoutesGeom", "createRoutesGeom", "routesGeom", args.select, args.data, "CreateRoutesGeomInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RoutesGeom",
            fieldName: "createRoutesGeom",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("RoutesGeom", "updateRoutesGeom", "routesGeom", args.select, args.where.id, args.data, "UpdateRoutesGeomInput", "id", "routesGeomPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RoutesGeom",
            fieldName: "updateRoutesGeom",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("RoutesGeom", "deleteRoutesGeom", "routesGeom", {
            id: args.where.id
        }, "DeleteRoutesGeomInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RoutesGeom",
            fieldName: "deleteRoutesGeom",
            document,
            variables
        });
    }
}
exports.RoutesGeomModel = RoutesGeomModel;
