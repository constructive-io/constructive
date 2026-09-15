// Persona → model, prompt, tools, skills.
//
// The agent module already models all four: `agent_persona.system_prompt` is the
// prompt, `agent_persona.config` is the model/tool preferences, and
// `agent_persona.resources` names `agent_resource` rows (kind `skill` /
// `knowledge` / `convention`) by slug. The run reads them; it invents none of
// them, and a persona that names a tool the lane does not carry is an error
// rather than a silent narrowing — an operator who wrote `apply_migration` into
// a persona should hear that the coding lane does not offer it.

import type { GraphQLClient } from '@agentic-kit/agent-conversation';

export interface PersonaRow {
  id: string;
  slug: string;
  name: string;
  systemPrompt: string | null;
  resources: (string | null)[] | null;
  config: PersonaConfig | null;
}

/** `agent_persona.config`, as this runner reads it. Unknown keys are ignored. */
export interface PersonaConfig {
  model?: string;
  temperature?: number;
  /** Tool names the persona is allowed to use. Absent means "every tool the lane offers". */
  tools?: string[];
  /** Tool names withheld from the persona, applied after `tools`. */
  excludeTools?: string[];
  maxSteps?: number;
}

export interface SkillResource {
  slug: string;
  title: string;
  kind: string | null;
  body: string;
}

const PERSONA_FIELDS = 'id slug name systemPrompt resources config';

const PERSONA_BY_SLUG = `query CodeTaskPersonaBySlug($databaseId: UUID!, $slug: String!) {
  agentPersonas(
    where: { databaseId: { equalTo: $databaseId }, slug: { equalTo: $slug } }
    first: 1
  ) { nodes { ${PERSONA_FIELDS} } }
}`;

const PERSONA_BY_ID = `query CodeTaskPersonaById($id: UUID!) {
  agentPersona(id: $id) { ${PERSONA_FIELDS} }
}`;

const RESOURCES_BY_SLUG = `query CodeTaskPersonaResources($databaseId: UUID!, $slugs: [String!]) {
  agentResources(
    where: { databaseId: { equalTo: $databaseId }, slug: { in: $slugs }, isActive: { equalTo: true } }
  ) { nodes { slug title kind body } }
}`;

export class PersonaNotFoundError extends Error {
  constructor(readonly ref: string) {
    super(`no active agent persona for ${ref}`);
    this.name = 'PersonaNotFoundError';
  }
}

export class UnknownPersonaToolError extends Error {
  constructor(
    readonly persona: string,
    readonly missing: string[],
    readonly available: string[]
  ) {
    super(
      `persona ${persona} asks for tool(s) this lane does not offer: ${missing.join(', ')} — available: ${
        available.join(', ') || '(none)'
      }`
    );
    this.name = 'UnknownPersonaToolError';
  }
}

export class PersonaModelUnresolvedError extends Error {
  constructor(readonly persona: string) {
    super(
      `no model for this run: persona ${persona} names none and the deployment ` +
      'carries no default (CODE_TASK_MODEL) — a model this host invented would ' +
      'be billed and refused by a gateway that never routes it'
    );
    this.name = 'PersonaModelUnresolvedError';
  }
}

export interface LoadPersonaInput {
  client: GraphQLClient;
  databaseId: string;
  /** One of the two; the id wins when both are given. */
  personaId?: string | null;
  personaSlug?: string | null;
}

/** The persona row, or null when the run was given neither an id nor a slug. */
export async function loadPersona(input: LoadPersonaInput): Promise<PersonaRow | null> {
  const { client, databaseId, personaId, personaSlug } = input;

  if (personaId) {
    const data = await client.request<{ agentPersona: PersonaRow | null }>(PERSONA_BY_ID, {
      id: personaId
    });
    if (!data.agentPersona) throw new PersonaNotFoundError(`id ${personaId}`);
    return data.agentPersona;
  }

  if (personaSlug) {
    const data = await client.request<{ agentPersonas: { nodes: PersonaRow[] } }>(
      PERSONA_BY_SLUG,
      { databaseId, slug: personaSlug }
    );
    const persona = data.agentPersonas?.nodes?.[0];
    if (!persona) throw new PersonaNotFoundError(`slug ${personaSlug}`);
    return persona;
  }

  return null;
}

/** The `agent_resource` rows a persona names, in the order it named them. */
export async function loadPersonaSkills(input: {
  client: GraphQLClient;
  databaseId: string;
  persona: PersonaRow;
}): Promise<SkillResource[]> {
  const slugs = (input.persona.resources ?? []).filter((slug): slug is string => Boolean(slug));
  if (slugs.length === 0) return [];

  const data = await input.client.request<{ agentResources: { nodes: SkillResource[] } }>(
    RESOURCES_BY_SLUG,
    { databaseId: input.databaseId, slugs }
  );
  const found = new Map((data.agentResources?.nodes ?? []).map((row) => [row.slug, row]));
  const missing = slugs.filter((slug) => !found.has(slug));
  if (missing.length > 0) {
    throw new Error(
      `persona ${input.persona.slug} names agent_resource slug(s) that are absent or inactive: ${missing.join(', ')}`
    );
  }
  return slugs.map((slug) => found.get(slug)!);
}

export interface PersonaSelection {
  personaId: string | null;
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxSteps?: number;
  /** Tool names, filtered by the persona's `tools`/`excludeTools`. */
  toolNames: string[];
  skills: SkillResource[];
}

export interface SelectPersonaInput {
  persona: PersonaRow | null;
  skills?: SkillResource[];
  /** Every tool the lane offers, by name. */
  availableToolNames: string[];
  /**
   * The deployment's own configured default, used when the persona names no
   * model. Absent is legal and means "someone must choose": a run billed
   * against a model nobody picked is worse than a run that refuses to start, so
   * a selection with neither raises `PersonaModelUnresolvedError`.
   */
  defaultModel?: string | undefined;
  /** Used when the persona carries no system prompt. */
  defaultSystemPrompt: string;
}

/**
 * Resolve what the run should be configured with. Skill bodies are appended to
 * the prompt — the harness's skill overlay materializes files for hosts that
 * have a filesystem contract with the model; here the prompt is the contract.
 */
export function selectPersona(input: SelectPersonaInput): PersonaSelection {
  const { persona, availableToolNames, defaultModel, defaultSystemPrompt } = input;
  const config = persona?.config ?? {};
  const skills = input.skills ?? [];

  const requested = config.tools;
  if (requested) {
    const missing = requested.filter((name) => !availableToolNames.includes(name));
    if (missing.length > 0) {
      throw new UnknownPersonaToolError(persona?.slug ?? '(none)', missing, availableToolNames);
    }
  }
  const excluded = new Set(config.excludeTools ?? []);
  const toolNames = (requested ?? availableToolNames).filter((name) => !excluded.has(name));

  const model = config.model ?? defaultModel;
  if (!model) throw new PersonaModelUnresolvedError(persona?.slug ?? '(none)');

  const base = persona?.systemPrompt?.trim() || defaultSystemPrompt;
  const systemPrompt = [base, ...skills.map((skill) => `## ${skill.title}\n\n${skill.body.trim()}`)]
    .filter(Boolean)
    .join('\n\n');

  return {
    personaId: persona?.id ?? null,
    model,
    systemPrompt,
    ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
    ...(config.maxSteps === undefined ? {} : { maxSteps: config.maxSteps }),
    toolNames,
    skills
  };
}
