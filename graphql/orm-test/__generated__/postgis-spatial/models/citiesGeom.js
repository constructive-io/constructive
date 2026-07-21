"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesGeomModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class CitiesGeomModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("CitiesGeom", "citiesGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "CitiesGeomFilter", "CitiesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CitiesGeom",
            fieldName: "citiesGeoms",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("CitiesGeom", "citiesGeoms", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "CitiesGeomFilter", "CitiesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CitiesGeom",
            fieldName: "citiesGeom",
            document,
            variables,
            transform: (data) => ({
                "citiesGeom": data.citiesGeoms?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("CitiesGeom", "citiesGeoms", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "CitiesGeomFilter", "CitiesGeomOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "CitiesGeom",
            fieldName: "citiesGeom",
            document,
            variables,
            transform: (data) => ({
                "citiesGeom": data.citiesGeoms?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("CitiesGeom", "createCitiesGeom", "citiesGeom", args.select, args.data, "CreateCitiesGeomInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CitiesGeom",
            fieldName: "createCitiesGeom",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("CitiesGeom", "updateCitiesGeom", "citiesGeom", args.select, args.where.id, args.data, "UpdateCitiesGeomInput", "id", "citiesGeomPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CitiesGeom",
            fieldName: "updateCitiesGeom",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("CitiesGeom", "deleteCitiesGeom", "citiesGeom", {
            id: args.where.id
        }, "DeleteCitiesGeomInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "CitiesGeom",
            fieldName: "deleteCitiesGeom",
            document,
            variables
        });
    }
}
exports.CitiesGeomModel = CitiesGeomModel;
