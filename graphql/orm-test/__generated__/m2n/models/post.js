"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = void 0;
const query_builder_1 = require("../query-builder");
const input_types_1 = require("../input-types");
class PostModel {
    constructor(client) {
        this.client = client;
    }
    findMany(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Post", "posts", args.select, {
            where: args?.where,
            orderBy: args?.orderBy,
            first: args?.first,
            last: args?.last,
            after: args?.after,
            before: args?.before,
            offset: args?.offset
        }, "PostFilter", "PostOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Post",
            fieldName: "posts",
            document,
            variables
        });
    }
    findFirst(args) {
        const { document, variables } = (0, query_builder_1.buildFindFirstDocument)("Post", "posts", args.select, {
            where: args?.where,
            orderBy: args?.orderBy
        }, "PostFilter", "PostOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Post",
            fieldName: "post",
            document,
            variables,
            transform: (data) => ({
                "post": data.posts?.nodes?.[0] ?? null
            })
        });
    }
    findOne(args) {
        const { document, variables } = (0, query_builder_1.buildFindManyDocument)("Post", "posts", args.select, {
            where: {
                id: {
                    equalTo: args.id
                }
            },
            first: 1
        }, "PostFilter", "PostOrderBy", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "query",
            operationName: "Post",
            fieldName: "post",
            document,
            variables,
            transform: (data) => ({
                "post": data.posts?.nodes?.[0] ?? null
            })
        });
    }
    create(args) {
        const { document, variables } = (0, query_builder_1.buildCreateDocument)("Post", "createPost", "post", args.select, args.data, "CreatePostInput", input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Post",
            fieldName: "createPost",
            document,
            variables
        });
    }
    update(args) {
        const { document, variables } = (0, query_builder_1.buildUpdateByPkDocument)("Post", "updatePost", "post", args.select, args.where.id, args.data, "UpdatePostInput", "id", "postPatch", input_types_1.connectionFieldsMap, undefined);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Post",
            fieldName: "updatePost",
            document,
            variables
        });
    }
    delete(args) {
        const { document, variables } = (0, query_builder_1.buildDeleteByPkDocument)("Post", "deletePost", "post", {
            id: args.where.id
        }, "DeletePostInput", args.select, input_types_1.connectionFieldsMap);
        return new query_builder_1.QueryBuilder({
            client: this.client,
            operation: "mutation",
            operationName: "Post",
            fieldName: "deletePost",
            document,
            variables
        });
    }
}
exports.PostModel = PostModel;
