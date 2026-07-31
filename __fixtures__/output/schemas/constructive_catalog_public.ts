import { Timestamp,UUID } from './_common';
export interface Apis {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  name: string;
  dbname: string | null;
  role_name: string | null;
  anon_role: string | null;
  config: any | null;
}
export class Apis implements Apis {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  name: string;
  dbname: string | null;
  role_name: string | null;
  anon_role: string | null;
  config: any | null;
  constructor(data: Apis) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.name = data.name;
    this.dbname = data.dbname;
    this.role_name = data.role_name;
    this.anon_role = data.anon_role;
    this.config = data.config;
  }
}
export interface Apps {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  name: string;
  config: any | null;
}
export class Apps implements Apps {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  name: string;
  config: any | null;
  constructor(data: Apps) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.name = data.name;
    this.config = data.config;
  }
}
export interface Domains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  hostname: string;
  is_wildcard: boolean;
  parent_hostname: string | null;
  managed: boolean;
  verification_status: string | null;
  tls_status: string | null;
  tls_secret_name: string | null;
}
export class Domains implements Domains {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  hostname: string;
  is_wildcard: boolean;
  parent_hostname: string | null;
  managed: boolean;
  verification_status: string | null;
  tls_status: string | null;
  tls_secret_name: string | null;
  constructor(data: Domains) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.hostname = data.hostname;
    this.is_wildcard = data.is_wildcard;
    this.parent_hostname = data.parent_hostname;
    this.managed = data.managed;
    this.verification_status = data.verification_status;
    this.tls_status = data.tls_status;
    this.tls_secret_name = data.tls_secret_name;
  }
}
export interface Functions {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  task_identifier: string;
}
export class Functions implements Functions {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  task_identifier: string;
  constructor(data: Functions) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.task_identifier = data.task_identifier;
  }
}
export interface Namespaces {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  namespace_name: string;
}
export class Namespaces implements Namespaces {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  namespace_name: string;
  constructor(data: Namespaces) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.namespace_name = data.namespace_name;
  }
}
export interface ResourceDefinitions {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  namespace_id: UUID;
  kind: string;
  slug: string;
}
export class ResourceDefinitions implements ResourceDefinitions {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  namespace_id: UUID;
  kind: string;
  slug: string;
  constructor(data: ResourceDefinitions) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.namespace_id = data.namespace_id;
    this.kind = data.kind;
    this.slug = data.slug;
  }
}
export interface ResourceInstallations {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  namespace_id: UUID;
  slug: string;
}
export class ResourceInstallations implements ResourceInstallations {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  namespace_id: UUID;
  slug: string;
  constructor(data: ResourceInstallations) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.namespace_id = data.namespace_id;
    this.slug = data.slug;
  }
}
export interface Resources {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  namespace_id: UUID;
  kind: string;
  slug: string;
}
export class Resources implements Resources {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  namespace_id: UUID;
  kind: string;
  slug: string;
  constructor(data: Resources) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.namespace_id = data.namespace_id;
    this.kind = data.kind;
    this.slug = data.slug;
  }
}
export interface Sites {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  name: string;
  title: string | null;
  description: string | null;
  config: any | null;
}
export class Sites implements Sites {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  owner_scope: string;
  owner_key: UUID;
  is_visible: boolean;
  database_id: UUID;
  name: string;
  title: string | null;
  description: string | null;
  config: any | null;
  constructor(data: Sites) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.owner_scope = data.owner_scope;
    this.owner_key = data.owner_key;
    this.is_visible = data.is_visible;
    this.database_id = data.database_id;
    this.name = data.name;
    this.title = data.title;
    this.description = data.description;
    this.config = data.config;
  }
}