import { getSafeRequestTarget } from '../request-logger';

describe('getSafeRequestTarget', () => {
  it('removes the complete query string from OAuth browser routes', () => {
    expect(
      getSafeRequestTarget(
        '/auth/google/callback?code=secret-code&state=signed-state&error_description=private'
      )
    ).toBe('/auth/google/callback');
  });

  it('preserves query strings for unrelated routes', () => {
    expect(getSafeRequestTarget('/graphql?query=%7Bviewer%7D')).toBe(
      '/graphql?query=%7Bviewer%7D'
    );
  });
});
