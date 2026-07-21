"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class TagModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Tag", "tags", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "TagFilter", "TagOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Tag",
            fieldName: "tags",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("Tag", "tags", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "TagFilter", "TagOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Tag",
            fieldName: "tag",
            document,
            variables,
            transform: (data) => ({
                "tag": data.tags?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Tag", "tags", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "TagFilter", "TagOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Tag",
            fieldName: "tag",
            document,
            variables,
            transform: (data) => ({
                "tag": data.tags?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("Tag", "createTag", "tag", args.select, args.data, "CreateTagInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Tag",
            fieldName: "createTag",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("Tag", "updateTag", "tag", args.select, args.where.id, args.data, "UpdateTagInput", "id", "tagPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Tag",
            fieldName: "updateTag",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("Tag", "deleteTag", "tag", {
            id: args.where.id
        }, "DeleteTagInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Tag",
            fieldName: "deleteTag",
            document,
            variables
        });
    }
}
exports.TagModel = TagModel;
