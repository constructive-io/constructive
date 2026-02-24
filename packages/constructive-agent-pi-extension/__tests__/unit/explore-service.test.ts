import { summarizeExploreFailure } from '../../src/explore-service';

describe('summarizeExploreFailure', () => {
  it('adds auth remediation hints for unauthenticated introspection failures', () => {
    const message = summarizeExploreFailure(
      new Error(
        'Failed to generate ORM catalog: Failed to fetch schema: GraphQL errors: UNAUTHENTICATED (source: endpoint: http://api.localhost:3000/graphql)',
      ),
      {
        endpoint: 'http://api.localhost:3000/graphql',
        tokenSource: 'context',
        commandPrefix: 'constructive',
      },
    );

    expect(message).toContain('UNAUTHENTICATED');
    expect(message).toContain('Endpoint: http://api.localhost:3000/graphql');
    expect(message).toContain('Token source: context');
    expect(message).toContain('cnc auth status');
    expect(message).toContain('cnc auth set-token <token>');
    expect(message).toContain('/constructive-auth-set <token>');
  });

  it('returns base error for non-auth failures', () => {
    const message = summarizeExploreFailure(
      new Error('Failed to generate ORM catalog: Connection refused'),
    );

    expect(message).toContain('Failed to generate ORM catalog: Connection refused');
    expect(message).not.toContain('cnc auth set-token');
  });
});
