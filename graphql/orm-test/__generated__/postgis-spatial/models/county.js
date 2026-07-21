"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountyModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class CountyModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("County", "counties", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "CountyFilter", "CountyOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "County",
            fieldName: "counties",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("County", "counties", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "CountyFilter", "CountyOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "County",
            fieldName: "county",
            document,
            variables,
            transform: (data) => ({
                "county": data.counties?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("County", "counties", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "CountyFilter", "CountyOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "County",
            fieldName: "county",
            document,
            variables,
            transform: (data) => ({
                "county": data.counties?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("County", "createCounty", "county", args.select, args.data, "CreateCountyInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "County",
            fieldName: "createCounty",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("County", "updateCounty", "county", args.select, args.where.id, args.data, "UpdateCountyInput", "id", "countyPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "County",
            fieldName: "updateCounty",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("County", "deleteCounty", "county", {
            id: args.where.id
        }, "DeleteCountyInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "County",
            fieldName: "deleteCounty",
            document,
            variables
        });
    }
}
exports.CountyModel = CountyModel;
