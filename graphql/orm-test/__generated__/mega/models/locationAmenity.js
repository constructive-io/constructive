"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationAmenityModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class LocationAmenityModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("LocationAmenity", "locationAmenities", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "LocationAmenityFilter", "LocationAmenityOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "LocationAmenity",
            fieldName: "locationAmenities",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("LocationAmenity", "locationAmenities", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "LocationAmenityFilter", "LocationAmenityOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "LocationAmenity",
            fieldName: "locationAmenity",
            document,
            variables,
            transform: (data) => ({
                "locationAmenity": data.locationAmenities?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("LocationAmenity", "locationAmenities", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "LocationAmenityFilter", "LocationAmenityOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "LocationAmenity",
            fieldName: "locationAmenity",
            document,
            variables,
            transform: (data) => ({
                "locationAmenity": data.locationAmenities?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("LocationAmenity", "createLocationAmenity", "locationAmenity", args.select, args.data, "CreateLocationAmenityInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "LocationAmenity",
            fieldName: "createLocationAmenity",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("LocationAmenity", "updateLocationAmenity", "locationAmenity", args.select, args.where.id, args.data, "UpdateLocationAmenityInput", "id", "locationAmenityPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "LocationAmenity",
            fieldName: "updateLocationAmenity",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("LocationAmenity", "deleteLocationAmenity", "locationAmenity", {
            id: args.where.id
        }, "DeleteLocationAmenityInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "LocationAmenity",
            fieldName: "deleteLocationAmenity",
            document,
            variables
        });
    }
}
exports.LocationAmenityModel = LocationAmenityModel;
