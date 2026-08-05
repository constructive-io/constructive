import {
  assertI18nRequestContext,
  resolveI18nTableInfo,
} from '../plugin';

function fixture(duplicateSameSchema = false) {
  const idCodec = { name: 'tenant_id', sqlType: { kind: 'tenant_id' } };
  const textCodec = { name: 'text', sqlType: { kind: 'text' } };
  const baseCodec = {
    name: 'posts',
    attributes: {
      id: { codec: idCodec },
      title: { codec: textCodec },
    },
    extensions: {
      pg: { serviceName: 'main', schemaName: 'tenant_a', name: 'posts' },
      tags: { i18n: 'posts_translations' },
    },
  };
  const translationCodec = (schemaName: string) => ({
    name: `${schemaName}PostsTranslations`,
    attributes: {
      posts_id: { codec: idCodec },
      lang_code: { codec: textCodec },
      title: { codec: textCodec, notNull: true },
    },
    extensions: {
      pg: { serviceName: 'main', schemaName, name: 'posts_translations' },
    },
  });
  const tenantATranslation = translationCodec('tenant_a');
  const resources: Record<string, any> = {
    base: {
      codec: baseCodec,
      uniques: [{ isPrimary: true, attributes: ['id'] }],
    },
    tenantATranslation: { codec: tenantATranslation },
    tenantBTranslation: { codec: translationCodec('tenant_b') },
  };
  if (duplicateSameSchema) {
    resources.duplicateTenantATranslation = { codec: tenantATranslation };
  }
  const build = {
    input: { pgRegistry: { pgResources: resources } },
    inflection: { camelCase: (value: string) => value },
    sql: {
      compile: (value: unknown) => ({
        text: value === idCodec.sqlType ? 'tenant_types.tenant_id' : 'text',
        values: [] as unknown[],
      }),
    },
  };
  return { build, baseCodec };
}

describe('i18n exact-build isolation', () => {
  it('resolves only the same-service, same-schema translation resource', () => {
    const { build, baseCodec } = fixture();
    expect(resolveI18nTableInfo(build, baseCodec as any, 'lang_code', ['text']))
      .toMatchObject({
        schemaName: 'tenant_a',
        baseTable: 'posts',
        translationTable: 'posts_translations',
        pkType: 'tenant_types.tenant_id',
      });
  });

  it('fails when the exact translation coordinate is ambiguous', () => {
    const { build, baseCodec } = fixture(true);
    expect(() => resolveI18nTableInfo(build, baseCodec as any, 'lang_code', ['text']))
      .toThrow(/matches=2/);
  });

  it.each([
    [undefined, {}, 1, 'I18N_PG_CLIENT_CONTEXT_UNAVAILABLE'],
    [jest.fn(), null, 1, 'I18N_PG_SETTINGS_UNAVAILABLE'],
    [jest.fn(), {}, undefined, 'I18N_PARENT_ID_UNAVAILABLE'],
  ])('fails closed when request context is incomplete', (withPgClient, pgSettings, id, error) => {
    expect(() => assertI18nRequestContext(withPgClient, pgSettings, id)).toThrow(error);
  });
});
