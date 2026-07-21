"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmsGeomModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class SwarmsGeomModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("SwarmsGeom", "swarmsGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "SwarmsGeomFilter", "SwarmsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "SwarmsGeom",
            fieldName: "swarmsGeoms",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("SwarmsGeom", "swarmsGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "SwarmsGeomFilter", "SwarmsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "SwarmsGeom",
            fieldName: "swarmsGeom",
            document,
            variables,
            transform: (data) => ({
                "swarmsGeom": data.swarmsGeoms?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("SwarmsGeom", "swarmsGeoms", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "SwarmsGeomFilter", "SwarmsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "SwarmsGeom",
            fieldName: "swarmsGeom",
            document,
            variables,
            transform: (data) => ({
                "swarmsGeom": data.swarmsGeoms?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("SwarmsGeom", "createSwarmsGeom", "swarmsGeom", args.select, args.data, "CreateSwarmsGeomInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "SwarmsGeom",
            fieldName: "createSwarmsGeom",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("SwarmsGeom", "updateSwarmsGeom", "swarmsGeom", args.select, args.where.id, args.data, "UpdateSwarmsGeomInput", "id", "swarmsGeomPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "SwarmsGeom",
            fieldName: "updateSwarmsGeom",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("SwarmsGeom", "deleteSwarmsGeom", "swarmsGeom", {
            id: args.where.id
        }, "DeleteSwarmsGeomInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "SwarmsGeom",
            fieldName: "deleteSwarmsGeom",
            document,
            variables
        });
    }
}
exports.SwarmsGeomModel = SwarmsGeomModel;
