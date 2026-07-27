import { UUID, Timestamp } from "./_common";
export interface ApiModules {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  name: string;
  data: any;
  database_id: UUID;
}
export class ApiModules implements ApiModules {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  name: string;
  data: any;
  database_id: UUID;
  constructor(data: ApiModules) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.api_id = data.api_id;
    this.name = data.name;
    this.data = data.data;
    this.database_id = data.database_id;
  }
}
export interface ApiSchemas {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  schema_id: UUID;
  database_id: UUID;
}
export class ApiSchemas implements ApiSchemas {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  schema_id: UUID;
  database_id: UUID;
  constructor(data: ApiSchemas) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.api_id = data.api_id;
    this.schema_id = data.schema_id;
    this.database_id = data.database_id;
  }
}
export interface ApiSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  enable_aggregates: boolean | null;
  enable_postgis: boolean | null;
  enable_search: boolean | null;
  enable_direct_uploads: boolean | null;
  enable_presigned_uploads: boolean | null;
  enable_many_to_many: boolean | null;
  enable_connection_filter: boolean | null;
  enable_ltree: boolean | null;
  enable_llm: boolean | null;
  enable_realtime: boolean | null;
  enable_bulk: boolean | null;
  enable_i18n: boolean | null;
  options: any;
  database_id: UUID;
}
export class ApiSettings implements ApiSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  enable_aggregates: boolean | null;
  enable_postgis: boolean | null;
  enable_search: boolean | null;
  enable_direct_uploads: boolean | null;
  enable_presigned_uploads: boolean | null;
  enable_many_to_many: boolean | null;
  enable_connection_filter: boolean | null;
  enable_ltree: boolean | null;
  enable_llm: boolean | null;
  enable_realtime: boolean | null;
  enable_bulk: boolean | null;
  enable_i18n: boolean | null;
  options: any;
  database_id: UUID;
  constructor(data: ApiSettings) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.api_id = data.api_id;
    this.enable_aggregates = data.enable_aggregates;
    this.enable_postgis = data.enable_postgis;
    this.enable_search = data.enable_search;
    this.enable_direct_uploads = data.enable_direct_uploads;
    this.enable_presigned_uploads = data.enable_presigned_uploads;
    this.enable_many_to_many = data.enable_many_to_many;
    this.enable_connection_filter = data.enable_connection_filter;
    this.enable_ltree = data.enable_ltree;
    this.enable_llm = data.enable_llm;
    this.enable_realtime = data.enable_realtime;
    this.enable_bulk = data.enable_bulk;
    this.enable_i18n = data.enable_i18n;
    this.options = data.options;
    this.database_id = data.database_id;
  }
}
export interface Apis {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  dbname: string | null;
  role_name: string | null;
  anon_role: string | null;
  is_published: boolean;
  config: any | null;
  database_id: UUID;
}
export class Apis implements Apis {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  dbname: string | null;
  role_name: string | null;
  anon_role: string | null;
  is_published: boolean;
  config: any | null;
  database_id: UUID;
  constructor(data: Apis) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.name = data.name;
    this.dbname = data.dbname;
    this.role_name = data.role_name;
    this.anon_role = data.anon_role;
    this.is_published = data.is_published;
    this.config = data.config;
    this.database_id = data.database_id;
  }
}
export interface CorsSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID | null;
  allowed_origins: any;
  database_id: UUID;
}
export class CorsSettings implements CorsSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID | null;
  allowed_origins: any;
  database_id: UUID;
  constructor(data: CorsSettings) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.api_id = data.api_id;
    this.allowed_origins = data.allowed_origins;
    this.database_id = data.database_id;
  }
}
export interface DatabaseSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  enable_aggregates: boolean;
  enable_postgis: boolean;
  enable_search: boolean;
  enable_direct_uploads: boolean;
  enable_presigned_uploads: boolean;
  enable_many_to_many: boolean;
  enable_connection_filter: boolean;
  enable_ltree: boolean;
  enable_llm: boolean;
  enable_realtime: boolean;
  enable_bulk: boolean;
  enable_i18n: boolean;
  options: any;
  labels: any;
  annotations: any;
  database_id: UUID;
}
export class DatabaseSettings implements DatabaseSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  enable_aggregates: boolean;
  enable_postgis: boolean;
  enable_search: boolean;
  enable_direct_uploads: boolean;
  enable_presigned_uploads: boolean;
  enable_many_to_many: boolean;
  enable_connection_filter: boolean;
  enable_ltree: boolean;
  enable_llm: boolean;
  enable_realtime: boolean;
  enable_bulk: boolean;
  enable_i18n: boolean;
  options: any;
  labels: any;
  annotations: any;
  database_id: UUID;
  constructor(data: DatabaseSettings) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.enable_aggregates = data.enable_aggregates;
    this.enable_postgis = data.enable_postgis;
    this.enable_search = data.enable_search;
    this.enable_direct_uploads = data.enable_direct_uploads;
    this.enable_presigned_uploads = data.enable_presigned_uploads;
    this.enable_many_to_many = data.enable_many_to_many;
    this.enable_connection_filter = data.enable_connection_filter;
    this.enable_ltree = data.enable_ltree;
    this.enable_llm = data.enable_llm;
    this.enable_realtime = data.enable_realtime;
    this.enable_bulk = data.enable_bulk;
    this.enable_i18n = data.enable_i18n;
    this.options = data.options;
    this.labels = data.labels;
    this.annotations = data.annotations;
    this.database_id = data.database_id;
  }
}
export interface DomainEvents {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID | null;
  managed_domain_id: UUID | null;
  actor_id: UUID | null;
  domain_verification_id: UUID | null;
  event_type: string;
  message: string | null;
  metadata: any | null;
  database_id: UUID;
}
export class DomainEvents implements DomainEvents {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID | null;
  managed_domain_id: UUID | null;
  actor_id: UUID | null;
  domain_verification_id: UUID | null;
  event_type: string;
  message: string | null;
  metadata: any | null;
  database_id: UUID;
  constructor(data: DomainEvents) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.domain_id = data.domain_id;
    this.managed_domain_id = data.managed_domain_id;
    this.actor_id = data.actor_id;
    this.domain_verification_id = data.domain_verification_id;
    this.event_type = data.event_type;
    this.message = data.message;
    this.metadata = data.metadata;
    this.database_id = data.database_id;
  }
}
export interface DomainVerifications {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID | null;
  managed_domain_id: UUID | null;
  method: string;
  record_type: string | null;
  record_name: string | null;
  record_value: string | null;
  status: string;
  attempts: number;
  error: string | null;
  expires_at: Timestamp | null;
  verified_at: Timestamp | null;
  last_checked_at: Timestamp | null;
  database_id: UUID;
}
export class DomainVerifications implements DomainVerifications {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID | null;
  managed_domain_id: UUID | null;
  method: string;
  record_type: string | null;
  record_name: string | null;
  record_value: string | null;
  status: string;
  attempts: number;
  error: string | null;
  expires_at: Timestamp | null;
  verified_at: Timestamp | null;
  last_checked_at: Timestamp | null;
  database_id: UUID;
  constructor(data: DomainVerifications) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.domain_id = data.domain_id;
    this.managed_domain_id = data.managed_domain_id;
    this.method = data.method;
    this.record_type = data.record_type;
    this.record_name = data.record_name;
    this.record_value = data.record_value;
    this.status = data.status;
    this.attempts = data.attempts;
    this.error = data.error;
    this.expires_at = data.expires_at;
    this.verified_at = data.verified_at;
    this.last_checked_at = data.last_checked_at;
    this.database_id = data.database_id;
  }
}
export interface Domains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  hostname: string;
  managed: boolean;
  is_wildcard: boolean;
  parent_hostname: string | null;
  verification_status: string;
  verified_at: Timestamp | null;
  tls_status: string;
  tls_ready_at: Timestamp | null;
  tls_secret_name: string | null;
  is_published: boolean;
  config: any | null;
  database_id: UUID;
}
export class Domains implements Domains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  hostname: string;
  managed: boolean;
  is_wildcard: boolean;
  parent_hostname: string | null;
  verification_status: string;
  verified_at: Timestamp | null;
  tls_status: string;
  tls_ready_at: Timestamp | null;
  tls_secret_name: string | null;
  is_published: boolean;
  config: any | null;
  database_id: UUID;
  constructor(data: Domains) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.hostname = data.hostname;
    this.managed = data.managed;
    this.is_wildcard = data.is_wildcard;
    this.parent_hostname = data.parent_hostname;
    this.verification_status = data.verification_status;
    this.verified_at = data.verified_at;
    this.tls_status = data.tls_status;
    this.tls_ready_at = data.tls_ready_at;
    this.tls_secret_name = data.tls_secret_name;
    this.is_published = data.is_published;
    this.config = data.config;
    this.database_id = data.database_id;
  }
}
export interface HostnameBindings {
  id: UUID;
  hostname: string;
  domain_id: UUID;
  is_wildcard: boolean;
  parent_hostname: string | null;
  managed: boolean;
  verification_status: string | null;
  tls_status: string | null;
  tls_secret_name: string | null;
  updated_at: Timestamp;
}
export class HostnameBindings implements HostnameBindings {
  id: UUID;
  hostname: string;
  domain_id: UUID;
  is_wildcard: boolean;
  parent_hostname: string | null;
  managed: boolean;
  verification_status: string | null;
  tls_status: string | null;
  tls_secret_name: string | null;
  updated_at: Timestamp;
  constructor(data: HostnameBindings) {
    this.id = data.id;
    this.hostname = data.hostname;
    this.domain_id = data.domain_id;
    this.is_wildcard = data.is_wildcard;
    this.parent_hostname = data.parent_hostname;
    this.managed = data.managed;
    this.verification_status = data.verification_status;
    this.tls_status = data.tls_status;
    this.tls_secret_name = data.tls_secret_name;
    this.updated_at = data.updated_at;
  }
}
export interface HttpRoutes {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  created_by: UUID | null;
  updated_by: UUID | null;
  domain_id: UUID;
  path: string;
  method: string | null;
  priority: number;
  is_active: boolean;
  target_kind: string;
  target_id: UUID;
  database_id: UUID;
}
export class HttpRoutes implements HttpRoutes {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  created_by: UUID | null;
  updated_by: UUID | null;
  domain_id: UUID;
  path: string;
  method: string | null;
  priority: number;
  is_active: boolean;
  target_kind: string;
  target_id: UUID;
  database_id: UUID;
  constructor(data: HttpRoutes) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.created_by = data.created_by;
    this.updated_by = data.updated_by;
    this.domain_id = data.domain_id;
    this.path = data.path;
    this.method = data.method;
    this.priority = data.priority;
    this.is_active = data.is_active;
    this.target_kind = data.target_kind;
    this.target_id = data.target_id;
    this.database_id = data.database_id;
  }
}
export interface ManagedDomains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain: string;
  is_wildcard: boolean;
  allow_public_usage: boolean;
  verification_status: string;
  verified_at: Timestamp | null;
  tls_status: string;
  tls_ready_at: Timestamp | null;
  cert_status: string;
  annotations: any;
  database_id: UUID;
}
export class ManagedDomains implements ManagedDomains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain: string;
  is_wildcard: boolean;
  allow_public_usage: boolean;
  verification_status: string;
  verified_at: Timestamp | null;
  tls_status: string;
  tls_ready_at: Timestamp | null;
  cert_status: string;
  annotations: any;
  database_id: UUID;
  constructor(data: ManagedDomains) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.domain = data.domain;
    this.is_wildcard = data.is_wildcard;
    this.allow_public_usage = data.allow_public_usage;
    this.verification_status = data.verification_status;
    this.verified_at = data.verified_at;
    this.tls_status = data.tls_status;
    this.tls_ready_at = data.tls_ready_at;
    this.cert_status = data.cert_status;
    this.annotations = data.annotations;
    this.database_id = data.database_id;
  }
}
export interface PlatformApiModules {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  name: string;
  data: any;
}
export class PlatformApiModules implements PlatformApiModules {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  name: string;
  data: any;
  constructor(data: PlatformApiModules) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.api_id = data.api_id;
    this.name = data.name;
    this.data = data.data;
  }
}
export interface PlatformApiSchemas {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  schema_id: UUID;
}
export class PlatformApiSchemas implements PlatformApiSchemas {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  schema_id: UUID;
  constructor(data: PlatformApiSchemas) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.api_id = data.api_id;
    this.schema_id = data.schema_id;
  }
}
export interface PlatformApiSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  enable_aggregates: boolean | null;
  enable_postgis: boolean | null;
  enable_search: boolean | null;
  enable_direct_uploads: boolean | null;
  enable_presigned_uploads: boolean | null;
  enable_many_to_many: boolean | null;
  enable_connection_filter: boolean | null;
  enable_ltree: boolean | null;
  enable_llm: boolean | null;
  enable_realtime: boolean | null;
  enable_bulk: boolean | null;
  enable_i18n: boolean | null;
  options: any;
}
export class PlatformApiSettings implements PlatformApiSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID;
  enable_aggregates: boolean | null;
  enable_postgis: boolean | null;
  enable_search: boolean | null;
  enable_direct_uploads: boolean | null;
  enable_presigned_uploads: boolean | null;
  enable_many_to_many: boolean | null;
  enable_connection_filter: boolean | null;
  enable_ltree: boolean | null;
  enable_llm: boolean | null;
  enable_realtime: boolean | null;
  enable_bulk: boolean | null;
  enable_i18n: boolean | null;
  options: any;
  constructor(data: PlatformApiSettings) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.api_id = data.api_id;
    this.enable_aggregates = data.enable_aggregates;
    this.enable_postgis = data.enable_postgis;
    this.enable_search = data.enable_search;
    this.enable_direct_uploads = data.enable_direct_uploads;
    this.enable_presigned_uploads = data.enable_presigned_uploads;
    this.enable_many_to_many = data.enable_many_to_many;
    this.enable_connection_filter = data.enable_connection_filter;
    this.enable_ltree = data.enable_ltree;
    this.enable_llm = data.enable_llm;
    this.enable_realtime = data.enable_realtime;
    this.enable_bulk = data.enable_bulk;
    this.enable_i18n = data.enable_i18n;
    this.options = data.options;
  }
}
export interface PlatformApis {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  dbname: string | null;
  role_name: string | null;
  anon_role: string | null;
  is_published: boolean;
  config: any | null;
}
export class PlatformApis implements PlatformApis {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  dbname: string | null;
  role_name: string | null;
  anon_role: string | null;
  is_published: boolean;
  config: any | null;
  constructor(data: PlatformApis) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.name = data.name;
    this.dbname = data.dbname;
    this.role_name = data.role_name;
    this.anon_role = data.anon_role;
    this.is_published = data.is_published;
    this.config = data.config;
  }
}
export interface PlatformCorsSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID | null;
  allowed_origins: any;
}
export class PlatformCorsSettings implements PlatformCorsSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  api_id: UUID | null;
  allowed_origins: any;
  constructor(data: PlatformCorsSettings) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.api_id = data.api_id;
    this.allowed_origins = data.allowed_origins;
  }
}
export interface PlatformDomainEvents {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID | null;
  managed_domain_id: UUID | null;
  actor_id: UUID | null;
  domain_verification_id: UUID | null;
  event_type: string;
  message: string | null;
  metadata: any | null;
}
export class PlatformDomainEvents implements PlatformDomainEvents {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID | null;
  managed_domain_id: UUID | null;
  actor_id: UUID | null;
  domain_verification_id: UUID | null;
  event_type: string;
  message: string | null;
  metadata: any | null;
  constructor(data: PlatformDomainEvents) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.domain_id = data.domain_id;
    this.managed_domain_id = data.managed_domain_id;
    this.actor_id = data.actor_id;
    this.domain_verification_id = data.domain_verification_id;
    this.event_type = data.event_type;
    this.message = data.message;
    this.metadata = data.metadata;
  }
}
export interface PlatformDomainVerifications {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID | null;
  managed_domain_id: UUID | null;
  method: string;
  record_type: string | null;
  record_name: string | null;
  record_value: string | null;
  status: string;
  attempts: number;
  error: string | null;
  expires_at: Timestamp | null;
  verified_at: Timestamp | null;
  last_checked_at: Timestamp | null;
}
export class PlatformDomainVerifications implements PlatformDomainVerifications {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID | null;
  managed_domain_id: UUID | null;
  method: string;
  record_type: string | null;
  record_name: string | null;
  record_value: string | null;
  status: string;
  attempts: number;
  error: string | null;
  expires_at: Timestamp | null;
  verified_at: Timestamp | null;
  last_checked_at: Timestamp | null;
  constructor(data: PlatformDomainVerifications) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.domain_id = data.domain_id;
    this.managed_domain_id = data.managed_domain_id;
    this.method = data.method;
    this.record_type = data.record_type;
    this.record_name = data.record_name;
    this.record_value = data.record_value;
    this.status = data.status;
    this.attempts = data.attempts;
    this.error = data.error;
    this.expires_at = data.expires_at;
    this.verified_at = data.verified_at;
    this.last_checked_at = data.last_checked_at;
  }
}
export interface PlatformDomains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  hostname: string;
  managed: boolean;
  is_wildcard: boolean;
  parent_hostname: string | null;
  verification_status: string;
  verified_at: Timestamp | null;
  tls_status: string;
  tls_ready_at: Timestamp | null;
  tls_secret_name: string | null;
  is_published: boolean;
  config: any | null;
}
export class PlatformDomains implements PlatformDomains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  hostname: string;
  managed: boolean;
  is_wildcard: boolean;
  parent_hostname: string | null;
  verification_status: string;
  verified_at: Timestamp | null;
  tls_status: string;
  tls_ready_at: Timestamp | null;
  tls_secret_name: string | null;
  is_published: boolean;
  config: any | null;
  constructor(data: PlatformDomains) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.hostname = data.hostname;
    this.managed = data.managed;
    this.is_wildcard = data.is_wildcard;
    this.parent_hostname = data.parent_hostname;
    this.verification_status = data.verification_status;
    this.verified_at = data.verified_at;
    this.tls_status = data.tls_status;
    this.tls_ready_at = data.tls_ready_at;
    this.tls_secret_name = data.tls_secret_name;
    this.is_published = data.is_published;
    this.config = data.config;
  }
}
export interface PlatformManagedDomains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain: string;
  is_wildcard: boolean;
  allow_public_usage: boolean;
  verification_status: string;
  verified_at: Timestamp | null;
  tls_status: string;
  tls_ready_at: Timestamp | null;
  cert_status: string;
  annotations: any;
}
export class PlatformManagedDomains implements PlatformManagedDomains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain: string;
  is_wildcard: boolean;
  allow_public_usage: boolean;
  verification_status: string;
  verified_at: Timestamp | null;
  tls_status: string;
  tls_ready_at: Timestamp | null;
  cert_status: string;
  annotations: any;
  constructor(data: PlatformManagedDomains) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.domain = data.domain;
    this.is_wildcard = data.is_wildcard;
    this.allow_public_usage = data.allow_public_usage;
    this.verification_status = data.verification_status;
    this.verified_at = data.verified_at;
    this.tls_status = data.tls_status;
    this.tls_ready_at = data.tls_ready_at;
    this.cert_status = data.cert_status;
    this.annotations = data.annotations;
  }
}
export interface PlatformSiteMetadata {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  title: string | null;
  description: string | null;
  og_image: any | null;
}
export class PlatformSiteMetadata implements PlatformSiteMetadata {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  title: string | null;
  description: string | null;
  og_image: any | null;
  constructor(data: PlatformSiteMetadata) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.site_id = data.site_id;
    this.title = data.title;
    this.description = data.description;
    this.og_image = data.og_image;
  }
}
export interface PlatformSiteModules {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  name: string;
  data: any;
}
export class PlatformSiteModules implements PlatformSiteModules {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  name: string;
  data: any;
  constructor(data: PlatformSiteModules) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.site_id = data.site_id;
    this.name = data.name;
    this.data = data.data;
  }
}
export interface PlatformSiteThemes {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  theme: any;
}
export class PlatformSiteThemes implements PlatformSiteThemes {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  theme: any;
  constructor(data: PlatformSiteThemes) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.site_id = data.site_id;
    this.theme = data.theme;
  }
}
export interface PlatformSites {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  title: string | null;
  description: string | null;
  is_published: boolean;
  config: any | null;
}
export class PlatformSites implements PlatformSites {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  title: string | null;
  description: string | null;
  is_published: boolean;
  config: any | null;
  constructor(data: PlatformSites) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.name = data.name;
    this.title = data.title;
    this.description = data.description;
    this.is_published = data.is_published;
    this.config = data.config;
  }
}
export interface PubkeySettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  crypto_network: string;
  user_field: string;
  schema_id: UUID | null;
  sign_up_with_key_function_id: UUID | null;
  sign_in_request_challenge_function_id: UUID | null;
  sign_in_record_failure_function_id: UUID | null;
  sign_in_with_challenge_function_id: UUID | null;
  database_id: UUID;
}
export class PubkeySettings implements PubkeySettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  crypto_network: string;
  user_field: string;
  schema_id: UUID | null;
  sign_up_with_key_function_id: UUID | null;
  sign_in_request_challenge_function_id: UUID | null;
  sign_in_record_failure_function_id: UUID | null;
  sign_in_with_challenge_function_id: UUID | null;
  database_id: UUID;
  constructor(data: PubkeySettings) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.crypto_network = data.crypto_network;
    this.user_field = data.user_field;
    this.schema_id = data.schema_id;
    this.sign_up_with_key_function_id = data.sign_up_with_key_function_id;
    this.sign_in_request_challenge_function_id = data.sign_in_request_challenge_function_id;
    this.sign_in_record_failure_function_id = data.sign_in_record_failure_function_id;
    this.sign_in_with_challenge_function_id = data.sign_in_with_challenge_function_id;
    this.database_id = data.database_id;
  }
}
export interface RlsSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  authenticate_schema_id: UUID | null;
  role_schema_id: UUID | null;
  authenticate_function_id: UUID | null;
  authenticate_strict_function_id: UUID | null;
  current_role_function_id: UUID | null;
  current_role_id_function_id: UUID | null;
  current_user_agent_function_id: UUID | null;
  current_ip_address_function_id: UUID | null;
  database_id: UUID;
}
export class RlsSettings implements RlsSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  authenticate_schema_id: UUID | null;
  role_schema_id: UUID | null;
  authenticate_function_id: UUID | null;
  authenticate_strict_function_id: UUID | null;
  current_role_function_id: UUID | null;
  current_role_id_function_id: UUID | null;
  current_user_agent_function_id: UUID | null;
  current_ip_address_function_id: UUID | null;
  database_id: UUID;
  constructor(data: RlsSettings) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.authenticate_schema_id = data.authenticate_schema_id;
    this.role_schema_id = data.role_schema_id;
    this.authenticate_function_id = data.authenticate_function_id;
    this.authenticate_strict_function_id = data.authenticate_strict_function_id;
    this.current_role_function_id = data.current_role_function_id;
    this.current_role_id_function_id = data.current_role_id_function_id;
    this.current_user_agent_function_id = data.current_user_agent_function_id;
    this.current_ip_address_function_id = data.current_ip_address_function_id;
    this.database_id = data.database_id;
  }
}
export interface RouteBindings {
  id: UUID;
  domain_id: UUID;
  target_api_id: UUID | null;
  target_site_id: UUID | null;
  target_function_id: UUID | null;
  path: string;
  method: string | null;
  priority: number;
  is_active: boolean;
  updated_at: Timestamp;
}
export class RouteBindings implements RouteBindings {
  id: UUID;
  domain_id: UUID;
  target_api_id: UUID | null;
  target_site_id: UUID | null;
  target_function_id: UUID | null;
  path: string;
  method: string | null;
  priority: number;
  is_active: boolean;
  updated_at: Timestamp;
  constructor(data: RouteBindings) {
    this.id = data.id;
    this.domain_id = data.domain_id;
    this.target_api_id = data.target_api_id;
    this.target_site_id = data.target_site_id;
    this.target_function_id = data.target_function_id;
    this.path = data.path;
    this.method = data.method;
    this.priority = data.priority;
    this.is_active = data.is_active;
    this.updated_at = data.updated_at;
  }
}
export interface Routes {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID;
  target_api_id: UUID | null;
  target_site_id: UUID | null;
  target_function_id: UUID | null;
  path: string;
  method: string | null;
  priority: number;
  is_active: boolean;
  config: any | null;
  database_id: UUID;
}
export class Routes implements Routes {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  domain_id: UUID;
  target_api_id: UUID | null;
  target_site_id: UUID | null;
  target_function_id: UUID | null;
  path: string;
  method: string | null;
  priority: number;
  is_active: boolean;
  config: any | null;
  database_id: UUID;
  constructor(data: Routes) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.domain_id = data.domain_id;
    this.target_api_id = data.target_api_id;
    this.target_site_id = data.target_site_id;
    this.target_function_id = data.target_function_id;
    this.path = data.path;
    this.method = data.method;
    this.priority = data.priority;
    this.is_active = data.is_active;
    this.config = data.config;
    this.database_id = data.database_id;
  }
}
export interface SiteMetadata {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  title: string | null;
  description: string | null;
  og_image: any | null;
  database_id: UUID;
}
export class SiteMetadata implements SiteMetadata {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  title: string | null;
  description: string | null;
  og_image: any | null;
  database_id: UUID;
  constructor(data: SiteMetadata) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.site_id = data.site_id;
    this.title = data.title;
    this.description = data.description;
    this.og_image = data.og_image;
    this.database_id = data.database_id;
  }
}
export interface SiteModules {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  name: string;
  data: any;
  database_id: UUID;
}
export class SiteModules implements SiteModules {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  name: string;
  data: any;
  database_id: UUID;
  constructor(data: SiteModules) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.site_id = data.site_id;
    this.name = data.name;
    this.data = data.data;
    this.database_id = data.database_id;
  }
}
export interface SiteThemes {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  theme: any;
  database_id: UUID;
}
export class SiteThemes implements SiteThemes {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  site_id: UUID;
  theme: any;
  database_id: UUID;
  constructor(data: SiteThemes) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.site_id = data.site_id;
    this.theme = data.theme;
    this.database_id = data.database_id;
  }
}
export interface Sites {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  title: string | null;
  description: string | null;
  is_published: boolean;
  config: any | null;
  database_id: UUID;
}
export class Sites implements Sites {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  title: string | null;
  description: string | null;
  is_published: boolean;
  config: any | null;
  database_id: UUID;
  constructor(data: Sites) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.name = data.name;
    this.title = data.title;
    this.description = data.description;
    this.is_published = data.is_published;
    this.config = data.config;
    this.database_id = data.database_id;
  }
}
export interface WebauthnSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  schema_id: UUID | null;
  credentials_schema_id: UUID | null;
  sessions_schema_id: UUID | null;
  session_secrets_schema_id: UUID | null;
  credentials_table_id: UUID | null;
  sessions_table_id: UUID | null;
  session_credentials_table_id: UUID | null;
  session_secrets_table_id: UUID | null;
  user_field_id: UUID | null;
  rp_id: string;
  rp_name: string;
  origin_allowlist: any;
  attestation_type: string;
  require_user_verification: boolean;
  resident_key: string;
  challenge_expiry_seconds: number;
  database_id: UUID;
}
export class WebauthnSettings implements WebauthnSettings {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  schema_id: UUID | null;
  credentials_schema_id: UUID | null;
  sessions_schema_id: UUID | null;
  session_secrets_schema_id: UUID | null;
  credentials_table_id: UUID | null;
  sessions_table_id: UUID | null;
  session_credentials_table_id: UUID | null;
  session_secrets_table_id: UUID | null;
  user_field_id: UUID | null;
  rp_id: string;
  rp_name: string;
  origin_allowlist: any;
  attestation_type: string;
  require_user_verification: boolean;
  resident_key: string;
  challenge_expiry_seconds: number;
  database_id: UUID;
  constructor(data: WebauthnSettings) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.schema_id = data.schema_id;
    this.credentials_schema_id = data.credentials_schema_id;
    this.sessions_schema_id = data.sessions_schema_id;
    this.session_secrets_schema_id = data.session_secrets_schema_id;
    this.credentials_table_id = data.credentials_table_id;
    this.sessions_table_id = data.sessions_table_id;
    this.session_credentials_table_id = data.session_credentials_table_id;
    this.session_secrets_table_id = data.session_secrets_table_id;
    this.user_field_id = data.user_field_id;
    this.rp_id = data.rp_id;
    this.rp_name = data.rp_name;
    this.origin_allowlist = data.origin_allowlist;
    this.attestation_type = data.attestation_type;
    this.require_user_verification = data.require_user_verification;
    this.resident_key = data.resident_key;
    this.challenge_expiry_seconds = data.challenge_expiry_seconds;
    this.database_id = data.database_id;
  }
}