import { redactSensitiveRequestUrl } from '../request-logger';

describe('redactSensitiveRequestUrl', () => {
  it('redacts OAuth and handoff query secrets while preserving safe routing facts', () => {
    expect(redactSensitiveRequestUrl(
      '/auth/oauth/callback?code=secret-code&state=secret-state&safe=value'
    )).toBe(
      '/auth/oauth/callback?code=%5BREDACTED%5D&state=%5BREDACTED%5D&safe=value'
    );
    expect(redactSensitiveRequestUrl('/callback?error=access_denied')).toBe(
      '/callback?error=%5BREDACTED%5D'
    );
    expect(redactSensitiveRequestUrl('/callback?handoff=secret&site_state=public')).toBe(
      '/callback?handoff=%5BREDACTED%5D&site_state=%5BREDACTED%5D'
    );
  });

  it('does not alter requests without sensitive query parameters', () => {
    expect(redactSensitiveRequestUrl('/graphql?operation=PublicQuery')).toBe(
      '/graphql?operation=PublicQuery'
    );
  });
});
