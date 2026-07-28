/**
 * Host-neutral contracts for the Constructive harness.
 *
 * A harness host (Electron desktop, terminal CLI, MCP server) supplies a
 * `HarnessContext`; the harness core supplies skills, tools, and policies
 * built against these interfaces without knowing anything about the host.
 */

/** A single file belonging to a skill (SKILL.md plus optional references/scripts). */
export interface SkillFile {
  /** Path relative to the skill directory, e.g. `SKILL.md` or `references/topic.md`. */
  relPath: string;
  contents: string;
}

/** A resolved skill: parsed identity plus every file it ships. */
export interface HarnessSkill {
  name: string;
  description: string;
  /** Skill names this skill depends on (frontmatter `requires:`). */
  requires: string[];
  files: SkillFile[];
  /** Name of the manifest source layer this skill was resolved from. */
  sourceName: string;
}

/** Result of a data-plane token request for a provisioned database. */
export interface DataTokenResult {
  token: string | null;
  /** Where the token came from (host-specific, e.g. `env`, `broker`, `preview`). */
  origin?: string;
}

/** Credential access the host must provide; the core never reads secrets itself. */
export interface HarnessCredentials {
  /** Control-plane (account) bearer token, or null when signed out. */
  accountBearer(): Promise<string | null>;
  /** Data-plane token for a specific provisioned database. */
  dataToken(databaseId: string): Promise<DataTokenResult>;
}

/** Backend endpoint configuration pinned by the host / project binding. */
export interface HarnessEndpoints {
  /** Platform GraphQL endpoint, e.g. `http://api.localhost:3000/graphql`. */
  apiEndpoint: string;
  /** Modules control-plane endpoint used by provisioning. */
  modulesEndpoint: string;
}

/** A confirmation request for a mutating/gated tool call. */
export interface GateRequest {
  toolName: string;
  title: string;
  detail?: string;
  args?: Record<string, unknown>;
}

/**
 * Everything a harness host injects. Mirrors the injection points identified
 * in the desktop extraction (credentials, endpoints, confirm gate, project cwd).
 */
export interface HarnessContext {
  /** Project working directory (where `.constructive/` and `.env` live). */
  cwd: string;
  endpoints: HarnessEndpoints;
  credentials: HarnessCredentials;
  /** Ask the user to confirm a gated tool call. Resolve false to decline. */
  confirm(request: GateRequest): Promise<boolean>;
}
