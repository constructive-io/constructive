/**
 * Re-export mutation generators from @constructive-io/graphql-query.
 *
 * The canonical implementations of buildPostGraphileCreate, buildPostGraphileUpdate,
 * and buildPostGraphileDelete now live in graphql-query.
 */
export {
  buildPostGraphileCreate,
  buildPostGraphileDelete,
  buildPostGraphileUpdate,
} from '@constructive-io/graphql-query';
