"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworksGeomModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class NetworksGeomModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("NetworksGeom", "networksGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "NetworksGeomFilter", "NetworksGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "NetworksGeom",
            fieldName: "networksGeoms",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("NetworksGeom", "networksGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "NetworksGeomFilter", "NetworksGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "NetworksGeom",
            fieldName: "networksGeom",
            document,
            variables,
            transform: (data) => ({
                "networksGeom": data.networksGeoms?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("NetworksGeom", "networksGeoms", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "NetworksGeomFilter", "NetworksGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "NetworksGeom",
            fieldName: "networksGeom",
            document,
            variables,
            transform: (data) => ({
                "networksGeom": data.networksGeoms?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("NetworksGeom", "createNetworksGeom", "networksGeom", args.select, args.data, "CreateNetworksGeomInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "NetworksGeom",
            fieldName: "createNetworksGeom",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("NetworksGeom", "updateNetworksGeom", "networksGeom", args.select, args.where.id, args.data, "UpdateNetworksGeomInput", "id", "networksGeomPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "NetworksGeom",
            fieldName: "updateNetworksGeom",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("NetworksGeom", "deleteNetworksGeom", "networksGeom", {
            id: args.where.id
        }, "DeleteNetworksGeomInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "NetworksGeom",
            fieldName: "deleteNetworksGeom",
            document,
            variables
        });
    }
}
exports.NetworksGeomModel = NetworksGeomModel;
