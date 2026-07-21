"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerritoriesGeomModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class TerritoriesGeomModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("TerritoriesGeom", "territoriesGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "TerritoriesGeomFilter", "TerritoriesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TerritoriesGeom",
            fieldName: "territoriesGeoms",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("TerritoriesGeom", "territoriesGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "TerritoriesGeomFilter", "TerritoriesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TerritoriesGeom",
            fieldName: "territoriesGeom",
            document,
            variables,
            transform: (data) => ({
                "territoriesGeom": data.territoriesGeoms?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("TerritoriesGeom", "territoriesGeoms", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "TerritoriesGeomFilter", "TerritoriesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TerritoriesGeom",
            fieldName: "territoriesGeom",
            document,
            variables,
            transform: (data) => ({
                "territoriesGeom": data.territoriesGeoms?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("TerritoriesGeom", "createTerritoriesGeom", "territoriesGeom", args.select, args.data, "CreateTerritoriesGeomInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TerritoriesGeom",
            fieldName: "createTerritoriesGeom",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("TerritoriesGeom", "updateTerritoriesGeom", "territoriesGeom", args.select, args.where.id, args.data, "UpdateTerritoriesGeomInput", "id", "territoriesGeomPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TerritoriesGeom",
            fieldName: "updateTerritoriesGeom",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("TerritoriesGeom", "deleteTerritoriesGeom", "territoriesGeom", {
            id: args.where.id
        }, "DeleteTerritoriesGeomInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TerritoriesGeom",
            fieldName: "deleteTerritoriesGeom",
            document,
            variables
        });
    }
}
exports.TerritoriesGeomModel = TerritoriesGeomModel;
