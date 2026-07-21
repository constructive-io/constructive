"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostTagModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class PostTagModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("PostTag", "postTags", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "PostTagFilter", "PostTagOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "PostTag",
            fieldName: "postTags",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("PostTag", "postTags", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "PostTagFilter", "PostTagOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "PostTag",
            fieldName: "postTag",
            document,
            variables,
            transform: (data) => ({
                "postTag": data.postTags?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("PostTag", "createPostTag", "postTag", args.select, args.data, "CreatePostTagInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "PostTag",
            fieldName: "createPostTag",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("PostTag", "updatePostTag", "postTag", args.select, args.where.postId, args.data, "UpdatePostTagInput", "postId", "postTagPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "PostTag",
            fieldName: "updatePostTag",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("PostTag", "deletePostTag", "postTag", {
            postId: args.where.postId,
            tagId: args.where.tagId
        }, "DeletePostTagInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "PostTag",
            fieldName: "deletePostTag",
            document,
            variables
        });
    }
}
exports.PostTagModel = PostTagModel;
