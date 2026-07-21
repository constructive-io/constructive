"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemedicineClinicModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class TelemedicineClinicModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("TelemedicineClinic", "telemedicineClinics", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "TelemedicineClinicFilter", "TelemedicineClinicOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TelemedicineClinic",
            fieldName: "telemedicineClinics",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("TelemedicineClinic", "telemedicineClinics", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "TelemedicineClinicFilter", "TelemedicineClinicOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TelemedicineClinic",
            fieldName: "telemedicineClinic",
            document,
            variables,
            transform: (data) => ({
                "telemedicineClinic": data.telemedicineClinics?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("TelemedicineClinic", "telemedicineClinics", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "TelemedicineClinicFilter", "TelemedicineClinicOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "TelemedicineClinic",
            fieldName: "telemedicineClinic",
            document,
            variables,
            transform: (data) => ({
                "telemedicineClinic": data.telemedicineClinics?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("TelemedicineClinic", "createTelemedicineClinic", "telemedicineClinic", args.select, args.data, "CreateTelemedicineClinicInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TelemedicineClinic",
            fieldName: "createTelemedicineClinic",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("TelemedicineClinic", "updateTelemedicineClinic", "telemedicineClinic", args.select, args.where.id, args.data, "UpdateTelemedicineClinicInput", "id", "telemedicineClinicPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TelemedicineClinic",
            fieldName: "updateTelemedicineClinic",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("TelemedicineClinic", "deleteTelemedicineClinic", "telemedicineClinic", {
            id: args.where.id
        }, "DeleteTelemedicineClinicInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "TelemedicineClinic",
            fieldName: "deleteTelemedicineClinic",
            document,
            variables
        });
    }
}
exports.TelemedicineClinicModel = TelemedicineClinicModel;
