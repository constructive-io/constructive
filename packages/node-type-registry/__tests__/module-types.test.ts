import {
  allModulePresets,
  type ModuleEntry,
  type ModulePreset,
  publicModulePresets,
  resolvePresetModules
} from '../src/module-presets';
import {
  allModuleTypes,
  isInternalModule,
  publicModuleTypes
} from '../src/module-types';

function moduleEntries(
  preset: (typeof allModulePresets)[number]
): Array<[string, Record<string, unknown>]> {
  return preset.modules.map((entry) => {
    if (typeof entry === 'string') return [entry, {}];
    return entry;
  });
}

function hasModule(
  entries: Array<[string, Record<string, unknown>]>,
  name: string,
  scope?: string
): boolean {
  return entries.some(
    ([entryName, options]) =>
      entryName === name && (scope === undefined || options.scope === scope)
  );
}

describe('module type registry', () => {
  test('matches the complete module registry', () => {
    expect(allModuleTypes.map(({ name }) => name)).toEqual([
      'agent_module',
      'api_surface_module',
      'app_module',
      'billing_module',
      'billing_provider_module',
      'catalog_module',
      'cluster_module',
      'compute_log_module',
      'connected_accounts_module',
      'content_preset_module',
      'crypto_addresses_module',
      'database_settings_module',
      'db_preset_module',
      'db_usage_module',
      'devices_module',
      'domain_module',
      'email_sender_module',
      'emails_module',
      'events_module',
      'function_deployment_module',
      'function_invocation_module',
      'function_module',
      'graph_execution_module',
      'graph_module',
      'hierarchy_module',
      'i18n_module',
      'identity_providers_module',
      'inference_log_module',
      'infra_config_module',
      'image_module',
      'infra_module',
      'infra_secrets_module',
      'integration_providers_module',
      'internal_secrets_module',
      'internal_config_module',
      'invites_module',
      'k8s_admission_module',
      'limits_module',
      'membership_types_module',
      'memberships_module',
      'merkle_store_module',
      'namespace_module',
      'notifications_module',
      'oauth_requests_module',
      'pages_module',
      'capabilities_module',
      'phone_numbers_module',
      'plans_module',
      'principal_auth_module',
      'profiles_module',
      'rate_limit_meters_module',
      'rate_limits_module',
      'repository_module',
      'machine_module',
      'resource_module',
      'rls_module',
      'route_module',
      'scope_types_module',
      'session_secrets_module',
      'sessions_module',
      'site_surface_module',
      'storage_log_module',
      'storage_module',
      'transfer_log_module',
      'user_auth_module',
      'user_credentials_module',
      'user_settings_module',
      'user_settings_security_module',
      'user_state_module',
      'users_module',
      'webauthn_auth_module',
      'webauthn_credentials_module',
      'webhook_module'
    ]);
  });

  test('public module types exclude internal modules', () => {
    expect(publicModuleTypes.every(({ internal }) => !internal)).toBe(true);
    expect(
      allModuleTypes.filter(({ internal }) => internal).map(({ name }) => name)
    ).toEqual([
      'api_surface_module',
      'app_module',
      'catalog_module',
      'cluster_module',
      'content_preset_module',
      'database_settings_module',
      'db_preset_module',
      'domain_module',
      'infra_config_module',
      'infra_module',
      'infra_secrets_module',
      'k8s_admission_module',
      'pages_module',
      'resource_module',
      'route_module',
      'scope_types_module',
      'site_surface_module'
    ]);
  });

  test('public presets contain no internal modules', () => {
    for (const preset of publicModulePresets) {
      expect(
        preset.modules.every((entry) => {
          const name = typeof entry === 'string' ? entry : entry[0];
          return !isInternalModule(name);
        })
      ).toBe(true);
    }
  });

  test('resolvePresetModules filters internal entries', () => {
    const modules: ModuleEntry[] = [
      'users_module',
      ['catalog_module', { scope: 'app' }]
    ];
    const preset: ModulePreset = {
      ...allModulePresets[0],
      modules
    };
    expect(resolvePresetModules(preset)).toEqual(['users_module']);
    expect(resolvePresetModules(preset, { includeInternal: true })).toEqual(
      preset.modules
    );
  });

  test('registers the complete public preset lineage', () => {
    expect(allModulePresets.map(({ name }) => name)).toEqual([
      'minimal',
      'auth:hardened',
      'b2b:storage',
      'full'
    ]);
  });

  test('every preset names a module in the registry', () => {
    const known = new Set(allModuleTypes.map(({ name }) => name));
    for (const preset of allModulePresets) {
      for (const entry of preset.modules) {
        const name = typeof entry === 'string' ? entry : entry[0];
        expect({ preset: preset.name, module: name }).toEqual({
          preset: preset.name,
          module: known.has(name) ? name : `<unknown module: ${name}>`
        });
      }
    }
  });

  test('every preset extends a preset that still ships', () => {
    const names = new Set(allModulePresets.map(({ name }) => name));
    for (const preset of allModulePresets) {
      for (const parent of preset.extends ?? []) {
        expect(names.has(parent)).toBe(true);
      }
    }
  });

  test('a preset that installs events asks for a trust ladder', () => {
    for (const preset of allModulePresets) {
      for (const entry of preset.modules) {
        if (typeof entry === 'string' || entry[0] !== 'events_module') continue;
        expect({ preset: preset.name, ...entry[1] }).toEqual({
          preset: preset.name,
          scope: entry[1].scope,
          trust_ladder: 'humanity'
        });
      }
    }
  });

  test('keeps published preset scopes and feature options', () => {
    const b2bStorage = allModulePresets.find(
      ({ name }) => name === 'b2b:storage'
    );
    const full = allModulePresets.find(({ name }) => name === 'full');
    expect(b2bStorage?.modules).toContainEqual([
      'storage_module',
      { scope: 'app' }
    ]);
    expect(b2bStorage?.modules).toContainEqual([
      'identity_providers_module',
      { scope: 'app' }
    ]);
    expect(full?.modules).toContainEqual([
      'storage_module',
      {
        scope: 'app',
        has_versioning: true,
        has_content_hash: true,
        has_custom_keys: true,
        has_audit_log: true
      }
    ]);
    expect(full?.modules).toContainEqual([
      'namespace_module',
      { scope: 'app' }
    ]);
    expect(full?.modules).toContainEqual(['function_module', { scope: 'app' }]);
  });

  test('all presets satisfy the provisioning dependency checks', () => {
    for (const preset of allModulePresets) {
      const entries = moduleEntries(preset);
      expect(hasModule(entries, 'users_module')).toBe(true);
      expect(hasModule(entries, 'sessions_module')).toBe(true);
      expect(hasModule(entries, 'rls_module')).toBe(true);

      if (hasModule(entries, 'session_secrets_module')) {
        expect(hasModule(entries, 'sessions_module')).toBe(true);
      }
      if (hasModule(entries, 'user_auth_module')) {
        expect(hasModule(entries, 'sessions_module')).toBe(true);
      }
      if (hasModule(entries, 'identity_providers_module')) {
        expect(hasModule(entries, 'connected_accounts_module')).toBe(true);
        expect(hasModule(entries, 'internal_secrets_module', 'app')).toBe(true);
      }
      if (hasModule(entries, 'webauthn_auth_module')) {
        expect(hasModule(entries, 'user_auth_module')).toBe(true);
        expect(hasModule(entries, 'session_secrets_module')).toBe(true);
        expect(hasModule(entries, 'webauthn_credentials_module')).toBe(true);
      }
      if (hasModule(entries, 'hierarchy_module', 'org')) {
        expect(hasModule(entries, 'memberships_module', 'org')).toBe(true);
      }
      for (const scope of ['app', 'org']) {
        if (hasModule(entries, 'invites_module', scope)) {
          expect(hasModule(entries, 'memberships_module', scope)).toBe(true);
        }
      }
    }
  });
});
