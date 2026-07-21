"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionsGeogModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class RegionsGeogModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("RegionsGeog", "regionsGeogs", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "RegionsGeogFilter", "RegionsGeogOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RegionsGeog",
            fieldName: "regionsGeogs",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("RegionsGeog", "regionsGeogs", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "RegionsGeogFilter", "RegionsGeogOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RegionsGeog",
            fieldName: "regionsGeog",
            document,
            variables,
            transform: (data) => ({
                "regionsGeog": data.regionsGeogs?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("RegionsGeog", "regionsGeogs", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "RegionsGeogFilter", "RegionsGeogOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "RegionsGeog",
            fieldName: "regionsGeog",
            document,
            variables,
            transform: (data) => ({
                "regionsGeog": data.regionsGeogs?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("RegionsGeog", "createRegionsGeog", "regionsGeog", args.select, args.data, "CreateRegionsGeogInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RegionsGeog",
            fieldName: "createRegionsGeog",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("RegionsGeog", "updateRegionsGeog", "regionsGeog", args.select, args.where.id, args.data, "UpdateRegionsGeogInput", "id", "regionsGeogPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RegionsGeog",
            fieldName: "updateRegionsGeog",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("RegionsGeog", "deleteRegionsGeog", "regionsGeog", {
            id: args.where.id
        }, "DeleteRegionsGeogInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "RegionsGeog",
            fieldName: "deleteRegionsGeog",
            document,
            variables
        });
    }
}
exports.RegionsGeogModel = RegionsGeogModel;
