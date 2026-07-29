import type { ModulePreset } from './types';

export const PresetMinimal: ModulePreset = {
  name: 'minimal',
  display_name: 'Minimal (RLS only)',
  summary: 'users + sessions + RLS + API keys. No auth procedures installed.',
  description:
    'The smallest coherent Constructive install. You get a users table, a sessions table, ' +
    'RLS enforcement, and API-key infrastructure — but no server-side sign_up/sign_in flow. ' +
    'Pick this when authentication lives outside the database (an upstream IdP, a header from ' +
    'a proxy, an internal service-to-service JWT) and Constructive is just the RLS-aware data ' +
    'layer underneath.',
  good_for: [
    'Internal tools where an upstream proxy supplies the user identity',
    'Backend-of-backend services that only need RLS, not an auth surface',
    'Prototypes that will bolt on a richer auth preset later'
  ],
  not_for: [
    'Any app that needs `sign_up` / `sign_in` / `reset_password` out of the box — use `auth:email` instead',
    'Multi-tenant / org-scoped apps — use `b2b`'
  ],
  modules: [
    'users_module',
    'sessions_module',
    'rls_module',
    'user_state_module'
  ]
};
