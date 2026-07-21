"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionFieldsMap = void 0;
// ============ Connection Fields Map ============
exports.connectionFieldsMap = {
    "Tag": {
        "posts": "Post",
        "postTags": "PostTag"
    },
    "Post": {
        "tags": "Tag",
        "postTags": "PostTag"
    }
};
