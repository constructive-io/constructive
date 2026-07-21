"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesGeogModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class CitiesGeogModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("CitiesGeog", "citiesGeogs", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "CitiesGeogFilter", "CitiesGeogOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CitiesGeog",
            fieldName: "citiesGeogs",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("CitiesGeog", "citiesGeogs", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "CitiesGeogFilter", "CitiesGeogOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CitiesGeog",
            fieldName: "citiesGeog",
            document,
            variables,
            transform: (data) => ({
                "citiesGeog": data.citiesGeogs?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("CitiesGeog", "citiesGeogs", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "CitiesGeogFilter", "CitiesGeogOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CitiesGeog",
            fieldName: "citiesGeog",
            document,
            variables,
            transform: (data) => ({
                "citiesGeog": data.citiesGeogs?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("CitiesGeog", "createCitiesGeog", "citiesGeog", args.select, args.data, "CreateCitiesGeogInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CitiesGeog",
            fieldName: "createCitiesGeog",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("CitiesGeog", "updateCitiesGeog", "citiesGeog", args.select, args.where.id, args.data, "UpdateCitiesGeogInput", "id", "citiesGeogPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CitiesGeog",
            fieldName: "updateCitiesGeog",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("CitiesGeog", "deleteCitiesGeog", "citiesGeog", {
            id: args.where.id
        }, "DeleteCitiesGeogInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CitiesGeog",
            fieldName: "deleteCitiesGeog",
            document,
            variables
        });
    }
}
exports.CitiesGeogModel = CitiesGeogModel;
