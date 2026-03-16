/**
 * Shared M:N test fixtures for Post ←→ Tag via PostTag junction table
 */
import type { CleanFieldType, CleanRelations, CleanTable } from '../../../types/schema';

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as CleanFieldType,
  string: { gqlType: 'String', isArray: false } as CleanFieldType,
};

const emptyRelations: CleanRelations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: [],
};

export const tagTable: CleanTable = {
  name: 'Tag',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
  ],
  relations: emptyRelations,
  query: {
    all: 'tags',
    one: 'tag',
    create: 'createTag',
    update: 'updateTag',
    delete: 'deleteTag',
  },
};

export const postTagTable: CleanTable = {
  name: 'PostTag',
  fields: [
    { name: 'postId', type: fieldTypes.uuid },
    { name: 'tagId', type: fieldTypes.uuid },
  ],
  relations: {
    ...emptyRelations,
    belongsTo: [
      {
        fieldName: 'post',
        isUnique: false,
        referencesTable: 'Post',
        type: 'Post',
        keys: [{ name: 'postId', type: fieldTypes.uuid }],
      },
      {
        fieldName: 'tag',
        isUnique: false,
        referencesTable: 'Tag',
        type: 'Tag',
        keys: [{ name: 'tagId', type: fieldTypes.uuid }],
      },
    ],
  },
  query: {
    all: 'postTags',
    one: 'postTag',
    create: 'createPostTag',
    update: null,
    delete: 'deletePostTag',
  },
};

export const postWithM2NTable: CleanTable = {
  name: 'Post',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'title', type: fieldTypes.string },
    { name: 'content', type: fieldTypes.string },
  ],
  relations: {
    ...emptyRelations,
    hasMany: [
      {
        fieldName: 'postTags',
        isUnique: false,
        referencedByTable: 'PostTag',
        type: 'PostTagsConnection',
        keys: [{ name: 'postId', type: fieldTypes.uuid }],
      },
    ],
    manyToMany: [
      {
        fieldName: 'tags',
        rightTable: 'Tag',
        junctionTable: 'PostTag',
        type: 'PostTagsManyToManyConnection',
      },
    ],
  },
  query: {
    all: 'posts',
    one: 'post',
    create: 'createPost',
    update: 'updatePost',
    delete: 'deletePost',
  },
};
