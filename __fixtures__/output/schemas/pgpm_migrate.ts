import { Timestamp } from "./_common";
export interface Changes {
  change_id: string;
  change_name: string;
  package: string;
  script_hash: string;
  deployed_at: Timestamp;
}
export class Changes implements Changes {
  change_id: string;
  change_name: string;
  package: string;
  script_hash: string;
  deployed_at: Timestamp;
  constructor(data: Changes) {
    this.change_id = data.change_id;
    this.change_name = data.change_name;
    this.package = data.package;
    this.script_hash = data.script_hash;
    this.deployed_at = data.deployed_at;
  }
}
export interface Dependencies {
  change_id: string;
  requires: string;
}
export class Dependencies implements Dependencies {
  change_id: string;
  requires: string;
  constructor(data: Dependencies) {
    this.change_id = data.change_id;
    this.requires = data.requires;
  }
}
export interface Events {
  event_id: number;
  event_type: string;
  change_name: string;
  package: string;
  occurred_at: Timestamp;
  error_message: string | null;
  error_code: string | null;
}
export class Events implements Events {
  event_id: number;
  event_type: string;
  change_name: string;
  package: string;
  occurred_at: Timestamp;
  error_message: string | null;
  error_code: string | null;
  constructor(data: Events) {
    this.event_id = data.event_id;
    this.event_type = data.event_type;
    this.change_name = data.change_name;
    this.package = data.package;
    this.occurred_at = data.occurred_at;
    this.error_message = data.error_message;
    this.error_code = data.error_code;
  }
}
export interface Packages {
  package: string;
  created_at: Timestamp;
}
export class Packages implements Packages {
  package: string;
  created_at: Timestamp;
  constructor(data: Packages) {
    this.package = data.package;
    this.created_at = data.created_at;
  }
}