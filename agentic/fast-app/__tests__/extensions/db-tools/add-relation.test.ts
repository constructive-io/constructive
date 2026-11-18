// Tests for the pure relation-blueprint builder. Run with:
//   pnpm test -- __tests__/extensions/db-tools/add-relation.test.ts

import assert from 'node:assert/strict';

import { buildRelation } from '@agentic-kit/db-tools/tools/add-relation-schema';

test('belongs_to defaults: NO ACTION delete + nullable FK', () => {
  const [rel] = buildRelation({
    source_table: 'books',
    target_table: 'authors',
    field_name: 'author_id',
  })!;
  assert.deepEqual(rel, {
    $type: 'RelationBelongsTo',
    source_table: 'books',
    target_table: 'authors',
    field_name: 'author_id',
    delete_action: 'a', // always present — the backend rejects an absent delete_action
    is_required: false, // a NOT NULL FK would fail against an already-populated table
  });
});

test('belongs_to honors explicit delete_action and is_required', () => {
  const [rel] = buildRelation({
    relation_type: 'belongs_to',
    source_table: 'comments',
    target_table: 'posts',
    field_name: 'post_id',
    delete_action: 'c',
    is_required: true,
  })!;
  assert.equal(rel.delete_action, 'c');
  assert.equal((rel as { is_required: boolean }).is_required, true);
});

test('many_to_many builds a junction relation with a default delete_action', () => {
  const [rel] = buildRelation({
    relation_type: 'many_to_many',
    source_table: 'posts',
    target_table: 'tags',
    junction_table_name: 'post_tags',
  })!;
  assert.deepEqual(rel, {
    $type: 'RelationManyToMany',
    source_table: 'posts',
    target_table: 'tags',
    junction_table_name: 'post_tags',
    delete_action: 'a',
  });
});
