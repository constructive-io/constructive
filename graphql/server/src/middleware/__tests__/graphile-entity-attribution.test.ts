import type { Request } from 'express';

describe('graphile context entity attribution', () => {
  const buildContext = (
    req: Partial<Request>,
    entityType?: string
  ): Record<string, string> => {
    const context: Record<string, string> = {};

    if (entityType && req.databaseId) {
      context['jwt.claims.entity_id'] = req.databaseId;
      context['jwt.claims.entity_type'] = entityType;
    }

    if (req.databaseId) {
      context['jwt.claims.database_id'] = req.databaseId;
    }

    return context;
  };

  it('sets the complete entity pair when configured and the request has a database', () => {
    expect(buildContext({ databaseId: 'db-1' }, 'platform')).toEqual({
      'jwt.claims.database_id': 'db-1',
      'jwt.claims.entity_id': 'db-1',
      'jwt.claims.entity_type': 'platform'
    });
  });

  it('sets no entity claims when the API entity type is not configured', () => {
    expect(buildContext({ databaseId: 'db-1' })).toEqual({
      'jwt.claims.database_id': 'db-1'
    });
  });

  it('sets no entity claims when the request has no database', () => {
    expect(buildContext({}, 'platform')).toEqual({});
  });
});
