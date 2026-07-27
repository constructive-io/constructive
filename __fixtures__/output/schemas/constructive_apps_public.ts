import { UUID, Timestamp } from "./_common";
export interface AppComponents {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  app_id: UUID;
  component_api_id: UUID | null;
  component_site_id: UUID | null;
  component_domain_id: UUID | null;
  component_installation_id: UUID | null;
  component_type: string | null;
  config: any | null;
  database_id: UUID;
}
export class AppComponents implements AppComponents {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  app_id: UUID;
  component_api_id: UUID | null;
  component_site_id: UUID | null;
  component_domain_id: UUID | null;
  component_installation_id: UUID | null;
  component_type: string | null;
  config: any | null;
  database_id: UUID;
  constructor(data: AppComponents) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.app_id = data.app_id;
    this.component_api_id = data.component_api_id;
    this.component_site_id = data.component_site_id;
    this.component_domain_id = data.component_domain_id;
    this.component_installation_id = data.component_installation_id;
    this.component_type = data.component_type;
    this.config = data.config;
    this.database_id = data.database_id;
  }
}
export interface Apps {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  title: string | null;
  description: string | null;
  status: string;
  is_published: boolean;
  config: any | null;
  database_id: UUID;
}
export class Apps implements Apps {
  id: UUID;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  name: string;
  title: string | null;
  description: string | null;
  status: string;
  is_published: boolean;
  config: any | null;
  database_id: UUID;
  constructor(data: Apps) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.name = data.name;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.is_published = data.is_published;
    this.config = data.config;
    this.database_id = data.database_id;
  }
}