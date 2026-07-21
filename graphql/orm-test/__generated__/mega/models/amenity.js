"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmenityModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class AmenityModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Amenity", "amenities", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "AmenityFilter", "AmenityOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Amenity",
            fieldName: "amenities",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("Amenity", "amenities", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "AmenityFilter", "AmenityOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Amenity",
            fieldName: "amenity",
            document,
            variables,
            transform: (data) => ({
                "amenity": data.amenities?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Amenity", "amenities", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "AmenityFilter", "AmenityOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Amenity",
            fieldName: "amenity",
            document,
            variables,
            transform: (data) => ({
                "amenity": data.amenities?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("Amenity", "createAmenity", "amenity", args.select, args.data, "CreateAmenityInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Amenity",
            fieldName: "createAmenity",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("Amenity", "updateAmenity", "amenity", args.select, args.where.id, args.data, "UpdateAmenityInput", "id", "amenityPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Amenity",
            fieldName: "updateAmenity",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("Amenity", "deleteAmenity", "amenity", {
            id: args.where.id
        }, "DeleteAmenityInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Amenity",
            fieldName: "deleteAmenity",
            document,
            variables
        });
    }
}
exports.AmenityModel = AmenityModel;
