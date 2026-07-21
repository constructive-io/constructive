"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class CategoryModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Category", "categories", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "CategoryFilter", "CategoryOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Category",
            fieldName: "categories",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("Category", "categories", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "CategoryFilter", "CategoryOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Category",
            fieldName: "category",
            document,
            variables,
            transform: (data) => ({
                "category": data.categories?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Category", "categories", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "CategoryFilter", "CategoryOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Category",
            fieldName: "category",
            document,
            variables,
            transform: (data) => ({
                "category": data.categories?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("Category", "createCategory", "category", args.select, args.data, "CreateCategoryInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Category",
            fieldName: "createCategory",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("Category", "updateCategory", "category", args.select, args.where.id, args.data, "UpdateCategoryInput", "id", "categoryPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Category",
            fieldName: "updateCategory",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("Category", "deleteCategory", "category", {
            id: args.where.id
        }, "DeleteCategoryInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Category",
            fieldName: "deleteCategory",
            document,
            variables
        });
    }
}
exports.CategoryModel = CategoryModel;
