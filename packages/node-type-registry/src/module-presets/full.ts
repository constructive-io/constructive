import type { ModulePreset } from './types';

/**
 * `full` — install everything. Equivalent to the default
 * `provision_database_modules(v_modules => ARRAY['all'])` behavior.
 *
 * This is the maximalist preset: every module Constructive ships, including
 * `storage_module` for file uploads and `crypto_addresses_module` for
 * wallet-based sign-in. Use it for greenfield apps where you'd rather
 * disable features via `app_settings_auth` toggles than uninstall modules,
 * or for the "kitchen sink" example / demo databases.
 *
 * Prefer a more targeted preset for anything production-bound — installing
 * a module you'll never use still costs tables, triggers, and grants.
 */
export const PresetFull: ModulePreset = {
  name: 'full',
  display_name: 'Full (every module)',
  summary: "Install every Constructive module. Equivalent to v_modules => ARRAY['all'].",
  description:
    'Installs every module in the catalog: everything in `b2b` plus `storage_module` ' +
    'for file uploads and `crypto_addresses_module` / `crypto_auth_module` for ' +
    'wallet-based sign-in. This matches the current default when `provision_database_modules` ' +
    'is called without an explicit `v_modules` argument. Use it for fully-featured ' +
    'demo/example databases, kitchen-sink reference deployments, or greenfield apps that ' +
    'would rather feature-flag at the app_settings level than uninstall modules.',
  good_for: [
    'Reference / demo databases that showcase every Constructive feature',
    'Greenfield apps where the product scope is still open-ended',
    'Keeping the provisioning call identical to the pre-preset default'
  ],
  not_for: [
    'Production apps with a defined feature set — pick the narrowest preset that fits',
    'Resource-constrained environments — every module costs schema bloat, RLS policies, and grants'
  ],
  modules: ['all'],
  includes_notes: {
    all: "Sentinel — the provisioner installs every known module when `modules = ['all']`."
  },
  extends: ['b2b']
};
