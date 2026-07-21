"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class LocationModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Location", "locations", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "LocationFilter", "LocationOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Location",
            fieldName: "locations",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("Location", "locations", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "LocationFilter", "LocationOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Location",
            fieldName: "location",
            document,
            variables,
            transform: (data) => ({
                "location": data.locations?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Location", "locations", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "LocationFilter", "LocationOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Location",
            fieldName: "location",
            document,
            variables,
            transform: (data) => ({
                "location": data.locations?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("Location", "createLocation", "location", args.select, args.data, "CreateLocationInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Location",
            fieldName: "createLocation",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("Location", "updateLocation", "location", args.select, args.where.id, args.data, "UpdateLocationInput", "id", "locationPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Location",
            fieldName: "updateLocation",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("Location", "deleteLocation", "location", {
            id: args.where.id
        }, "DeleteLocationInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Location",
            fieldName: "deleteLocation",
            document,
            variables
        });
    }
}
exports.LocationModel = LocationModel;
