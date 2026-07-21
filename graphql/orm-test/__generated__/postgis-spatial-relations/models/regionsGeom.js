"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionsGeomModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class RegionsGeomModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("RegionsGeom", "regionsGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "RegionsGeomFilter", "RegionsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RegionsGeom",
            fieldName: "regionsGeoms",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("RegionsGeom", "regionsGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "RegionsGeomFilter", "RegionsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RegionsGeom",
            fieldName: "regionsGeom",
            document,
            variables,
            transform: (data) => ({
                "regionsGeom": data.regionsGeoms?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("RegionsGeom", "regionsGeoms", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "RegionsGeomFilter", "RegionsGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RegionsGeom",
            fieldName: "regionsGeom",
            document,
            variables,
            transform: (data) => ({
                "regionsGeom": data.regionsGeoms?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("RegionsGeom", "createRegionsGeom", "regionsGeom", args.select, args.data, "CreateRegionsGeomInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RegionsGeom",
            fieldName: "createRegionsGeom",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("RegionsGeom", "updateRegionsGeom", "regionsGeom", args.select, args.where.id, args.data, "UpdateRegionsGeomInput", "id", "regionsGeomPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RegionsGeom",
            fieldName: "updateRegionsGeom",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("RegionsGeom", "deleteRegionsGeom", "regionsGeom", {
            id: args.where.id
        }, "DeleteRegionsGeomInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RegionsGeom",
            fieldName: "deleteRegionsGeom",
            document,
            variables
        });
    }
}
exports.RegionsGeomModel = RegionsGeomModel;
