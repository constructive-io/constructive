import type { ModuleTypeDefinition } from './types';

export type { ModuleTypeDefinition } from './types';

export const allModuleTypes: ModuleTypeDefinition[] = [
  {
    name: 'agent_module',
    display_name: 'Agent',
    description: 'Provisions agent, plan, and resource surfaces.'
  },
  {
    name: 'api_surface_module',
    display_name: 'API Surface',
    description: 'Provisions catalog-backed API surfaces.',
    internal: true
  },
  {
    name: 'app_module',
    display_name: 'Application',
    description: 'Provisions catalog-backed application surfaces.',
    internal: true
  },
  {
    name: 'billing_module',
    display_name: 'Billing',
    description: 'Provisions subscription billing and meter data.'
  },
  {
    name: 'billing_provider_module',
    display_name: 'Billing Provider',
    description: 'Provisions billing provider configuration.'
  },
  {
    name: 'catalog_module',
    display_name: 'Catalog',
    description: 'Provisions typed cross-scope catalog tables.',
    internal: true
  },
  {
    name: 'cluster_module',
    display_name: 'Clusters',
    description:
      'Provisions the fleet catalog: clusters, their database servers, the physical databases on those servers, and where each logical database is placed.',
    internal: true
  },
  {
    name: 'compute_log_module',
    display_name: 'Compute Log',
    description: 'Provisions compute usage logging.'
  },
  {
    name: 'connected_accounts_module',
    display_name: 'Connected Accounts',
    description: 'Provisions external account connections.'
  },
  {
    name: 'content_preset_module',
    display_name: 'Content Preset',
    description: 'Provisions the seed-content preset catalog.',
    internal: true
  },
  {
    name: 'crypto_addresses_module',
    display_name: 'Crypto Addresses',
    description: 'Provisions cryptocurrency address identity.'
  },
  {
    name: 'database_settings_module',
    display_name: 'Database Settings',
    description: 'Provisions scope-wide database settings.',
    internal: true
  },
  {
    name: 'db_preset_module',
    display_name: 'Database Preset',
    description: 'Provisions database preset catalog state.',
    internal: true
  },
  {
    name: 'db_usage_module',
    display_name: 'Database Usage',
    description: 'Provisions database usage logging.'
  },
  {
    name: 'devices_module',
    display_name: 'Devices',
    description: 'Provisions remembered user devices.'
  },
  {
    name: 'domain_module',
    display_name: 'Domain',
    description: 'Provisions catalog-backed domain surfaces.',
    internal: true
  },
  {
    name: 'email_sender_module',
    display_name: 'Email Sender',
    description:
      'Provisions outbound sender identities, provider accounts, and site bindings.'
  },
  {
    name: 'emails_module',
    display_name: 'Emails',
    description: 'Provisions user email addresses and flows.'
  },
  {
    name: 'events_module',
    display_name: 'Events',
    description: 'Provisions application event tables.'
  },
  {
    name: 'function_deployment_module',
    display_name: 'Function Deployment',
    description: 'Provisions deployable function metadata.'
  },
  {
    name: 'function_invocation_module',
    display_name: 'Function Invocation',
    description: 'Provisions function invocation state.'
  },
  {
    name: 'function_module',
    display_name: 'Functions',
    description: 'Provisions function definitions and execution metadata.'
  },
  {
    name: 'graph_execution_module',
    display_name: 'Graph Execution',
    description: 'Provisions graph execution state.'
  },
  {
    name: 'graph_module',
    display_name: 'Graphs',
    description: 'Provisions function graph definitions.'
  },
  {
    name: 'hierarchy_module',
    display_name: 'Hierarchy',
    description: 'Provisions organization hierarchy data.'
  },
  {
    name: 'i18n_module',
    display_name: 'Internationalization',
    description: 'Provisions translation and locale data.'
  },
  {
    name: 'identity_providers_module',
    display_name: 'Identity Providers',
    description: 'Provisions external identity provider configuration.'
  },
  {
    name: 'inference_log_module',
    display_name: 'Inference Log',
    description: 'Provisions inference usage logging.'
  },
  {
    name: 'infra_config_module',
    display_name: 'Infrastructure Config',
    description: 'Provisions platform infrastructure configuration.',
    internal: true
  },
  {
    name: 'image_module',
    display_name: 'Images',
    description:
      'Provisions the container image catalog and its cross-scope usage grants.'
  },
  {
    name: 'infra_module',
    display_name: 'Infrastructure',
    description:
      'Provisions one scope\'s whole compute plane: functions, deployments and invocations, resources, the image and repository registry, graphs and their executions, the four usage logs, and the infrastructure secrets they read.',
    internal: true
  },
  {
    name: 'infra_secrets_module',
    display_name: 'Infrastructure Secrets',
    description: 'Provisions platform infrastructure secrets.',
    internal: true
  },
  {
    name: 'integration_providers_module',
    display_name: 'Integration Providers',
    description: 'Provisions integration provider configuration.'
  },
  {
    name: 'internal_secrets_module',
    display_name: 'Internal Secrets',
    description: 'Provisions application internal secrets.'
  },
  {
    name: 'internal_config_module',
    display_name: 'Internal Config',
    description: 'Provisions plaintext internal configuration.'
  },
  {
    name: 'invites_module',
    display_name: 'Invites',
    description: 'Provisions membership invitation data.'
  },
  {
    name: 'k8s_admission_module',
    display_name: 'K8s Admission',
    description:
      'Provisions merkle-versioned Kubernetes admission policy catalogs (allowed kinds + spec rules).',
    internal: true
  },
  {
    name: 'limits_module',
    display_name: 'Limits',
    description: 'Provisions rate and capacity limit data.'
  },
  {
    name: 'membership_types_module',
    display_name: 'Membership Types',
    description: 'Provisions membership type definitions.'
  },
  {
    name: 'memberships_module',
    display_name: 'Memberships',
    description: 'Provisions scoped membership data.'
  },
  {
    name: 'merkle_store_module',
    display_name: 'Merkle Store',
    description: 'Provisions versioned Merkle-backed storage.'
  },
  {
    name: 'namespace_module',
    display_name: 'Namespaces',
    description: 'Provisions function and infrastructure namespaces.'
  },
  {
    name: 'notifications_module',
    display_name: 'Notifications',
    description: 'Provisions user notification data.'
  },
  {
    name: 'oauth_requests_module',
    display_name: 'OAuth Requests',
    description:
      'Provisions in-flight OAuth authorization requests and pending identity links.'
  },
  {
    name: 'pages_module',
    display_name: 'Pages',
    description:
      'Provisions merkle-versioned site pages (content only, no routing surface).',
    internal: true
  },
  {
    name: 'capabilities_module',
    display_name: 'Capabilities',
    description: 'Provisions scoped capability data.'
  },
  {
    name: 'phone_numbers_module',
    display_name: 'Phone Numbers',
    description: 'Provisions user phone numbers.'
  },
  {
    name: 'plans_module',
    display_name: 'Plans',
    description: 'Provisions billing plans and limits.'
  },
  {
    name: 'principal_auth_module',
    display_name: 'Principal Auth',
    description: 'Provisions principal authentication state.'
  },
  {
    name: 'profiles_module',
    display_name: 'Profiles',
    description: 'Provisions scoped user and organization profiles.'
  },
  {
    name: 'rate_limit_meters_module',
    display_name: 'Rate Limit Meters',
    description: 'Provisions rate-limit meter definitions.'
  },
  {
    name: 'rate_limits_module',
    display_name: 'Rate Limits',
    description: 'Provisions rate-limit counters and policy data.'
  },
  {
    name: 'repository_module',
    display_name: 'Repositories',
    description:
      'Provisions source repositories, their events, workflows, builds and local proposals.'
  },
  {
    name: 'machine_module',
    display_name: 'Machines',
    description:
      'Provisions enrolled machines, their command and terminal sessions, and the durable message ledger.'
  },
  {
    name: 'resource_module',
    display_name: 'Resources',
    description: 'Provisions catalog-backed resource installations.',
    internal: true
  },
  {
    name: 'rls_module',
    display_name: 'RLS',
    description: 'Provisions row-level security support.'
  },
  {
    name: 'route_module',
    display_name: 'Routes',
    description: 'Provisions catalog-backed routes.',
    internal: true
  },
  {
    name: 'scope_types_module',
    display_name: 'Scope Types',
    description: 'Provisions the scope-type registry a database resolves scopes against.',
    internal: true
  },
  {
    name: 'session_secrets_module',
    display_name: 'Session Secrets',
    description: 'Provisions session and magic-link secrets.'
  },
  {
    name: 'sessions_module',
    display_name: 'Sessions',
    description: 'Provisions user sessions.'
  },
  {
    name: 'site_surface_module',
    display_name: 'Site Surface',
    description: 'Provisions catalog-backed site surfaces.',
    internal: true
  },
  {
    name: 'storage_log_module',
    display_name: 'Storage Log',
    description: 'Provisions storage usage logging.'
  },
  {
    name: 'storage_module',
    display_name: 'Storage',
    description: 'Provisions file buckets and objects.'
  },
  {
    name: 'transfer_log_module',
    display_name: 'Transfer Log',
    description: 'Provisions transfer usage logging.'
  },
  {
    name: 'user_auth_module',
    display_name: 'User Auth',
    description: 'Provisions user authentication configuration.'
  },
  {
    name: 'user_credentials_module',
    display_name: 'User Credentials',
    description: 'Provisions password and credential data.'
  },
  {
    name: 'user_settings_module',
    display_name: 'User Settings',
    description: 'Provisions user settings.'
  },
  {
    name: 'user_settings_security_module',
    display_name: 'User Security Settings',
    description: 'Provisions per-user MFA enrollment state and the MFA procedures.'
  },
  {
    name: 'user_state_module',
    display_name: 'User State',
    description: 'Provisions user lifecycle state.'
  },
  {
    name: 'users_module',
    display_name: 'Users',
    description: 'Provisions the users table and identity records.'
  },
  {
    name: 'webauthn_auth_module',
    display_name: 'WebAuthn Auth',
    description: 'Provisions passkey authentication flows.'
  },
  {
    name: 'webauthn_credentials_module',
    display_name: 'WebAuthn Credentials',
    description: 'Provisions passkey credentials.'
  },
  {
    name: 'webhook_module',
    display_name: 'Webhooks',
    description: 'Provisions catalog-backed webhook routes.'
  }
];

export function getModuleType(name: string): ModuleTypeDefinition | undefined {
  return allModuleTypes.find((moduleType) => moduleType.name === name);
}

export function isInternalModule(name: string): boolean {
  return getModuleType(name)?.internal === true;
}

export const publicModuleTypes = allModuleTypes.filter(
  (moduleType) => !moduleType.internal
);
