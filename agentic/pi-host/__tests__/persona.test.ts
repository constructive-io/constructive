import type { GraphQLClient } from '@agentic-kit/agent-conversation';

import type { PersonaRow, SkillResource } from '../src/persona';
import {
  loadPersona,
  loadPersonaSkills,
  PersonaModelUnresolvedError,
  PersonaNotFoundError,
  selectPersona,
  UnknownPersonaToolError
} from '../src/persona';

const DATABASE_ID = '00000000-0000-0000-0000-0000000000db';

class FakePersonaApi implements GraphQLClient {
  constructor(
    readonly personas: PersonaRow[] = [],
    readonly resources: SkillResource[] = []
  ) {}

  async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const name = /query\s+(\w+)/.exec(query)?.[1];
    switch (name) {
    case 'CodeTaskPersonaById':
      return { agentPersona: this.personas.find((p) => p.id === variables.id) ?? null } as T;
    case 'CodeTaskPersonaBySlug':
      return {
        agentPersonas: {
          nodes: this.personas.filter((p) => p.slug === variables.slug)
        }
      } as T;
    case 'CodeTaskPersonaResources': {
      const slugs = variables.slugs as string[];
      return {
        agentResources: { nodes: this.resources.filter((r) => slugs.includes(r.slug)) }
      } as T;
    }
    default:
      throw new Error(`FakePersonaApi does not implement "${name}"`);
    }
  }
}

const coder: PersonaRow = {
  id: 'persona-1',
  slug: 'coder',
  name: 'Coder',
  systemPrompt: 'You change code.',
  resources: ['house-style'],
  config: { model: 'gpt-5-codex', tools: ['read_file', 'edit_file'], temperature: 0.2 }
};

const houseStyle: SkillResource = {
  slug: 'house-style',
  title: 'House style',
  kind: 'convention',
  body: 'Two spaces. No trailing commas.'
};

describe('loadPersona', () => {
  it('is null when the run names no persona', async () => {
    await expect(
      loadPersona({ client: new FakePersonaApi(), databaseId: DATABASE_ID })
    ).resolves.toBeNull();
  });

  it('loads by slug and by id', async () => {
    const api = new FakePersonaApi([coder]);
    await expect(
      loadPersona({ client: api, databaseId: DATABASE_ID, personaSlug: 'coder' })
    ).resolves.toMatchObject({ id: 'persona-1' });
    await expect(
      loadPersona({ client: api, databaseId: DATABASE_ID, personaId: 'persona-1' })
    ).resolves.toMatchObject({ slug: 'coder' });
  });

  it('throws when the persona the run was pointed at is absent', async () => {
    await expect(
      loadPersona({ client: new FakePersonaApi(), databaseId: DATABASE_ID, personaSlug: 'ghost' })
    ).rejects.toThrow(PersonaNotFoundError);
  });
});

describe('loadPersonaSkills', () => {
  it('returns the resources the persona names, in order', async () => {
    const api = new FakePersonaApi([coder], [houseStyle]);
    await expect(
      loadPersonaSkills({ client: api, databaseId: DATABASE_ID, persona: coder })
    ).resolves.toEqual([houseStyle]);
  });

  it('throws when a named resource is missing rather than running without it', async () => {
    const api = new FakePersonaApi([coder], []);
    await expect(
      loadPersonaSkills({ client: api, databaseId: DATABASE_ID, persona: coder })
    ).rejects.toThrow(/absent or inactive: house-style/);
  });
});

describe('selectPersona', () => {
  const available = ['read_file', 'edit_file', 'bash'];

  it('falls back to the lane defaults with no persona', () => {
    const selection = selectPersona({
      persona: null,
      availableToolNames: available,
      defaultModel: 'gpt-5',
      defaultSystemPrompt: 'You are a coding agent.'
    });
    expect(selection).toMatchObject({
      personaId: null,
      model: 'gpt-5',
      systemPrompt: 'You are a coding agent.',
      toolNames: available
    });
  });

  it('takes model, temperature, tools and prompt from the persona, and appends its skills', () => {
    const selection = selectPersona({
      persona: coder,
      skills: [houseStyle],
      availableToolNames: available,
      defaultModel: 'gpt-5',
      defaultSystemPrompt: 'unused'
    });
    expect(selection.model).toBe('gpt-5-codex');
    expect(selection.temperature).toBe(0.2);
    expect(selection.toolNames).toEqual(['read_file', 'edit_file']);
    expect(selection.systemPrompt).toBe(
      'You change code.\n\n## House style\n\nTwo spaces. No trailing commas.'
    );
  });

  it('applies excludeTools after tools', () => {
    const selection = selectPersona({
      persona: { ...coder, config: { excludeTools: ['bash'] } },
      availableToolNames: available,
      defaultModel: 'gpt-5',
      defaultSystemPrompt: 'x'
    });
    expect(selection.toolNames).toEqual(['read_file', 'edit_file']);
  });

  it('refuses a run whose persona and deployment both name no model', () => {
    expect(() =>
      selectPersona({
        persona: null,
        availableToolNames: available,
        defaultSystemPrompt: 'x'
      })
    ).toThrow(PersonaModelUnresolvedError);
  });

  it('takes the persona model when the deployment carries no default', () => {
    const selection = selectPersona({
      persona: coder,
      availableToolNames: available,
      defaultSystemPrompt: 'x'
    });
    expect(selection.model).toBe('gpt-5-codex');
  });

  it('refuses a persona that asks for a tool this lane does not carry', () => {
    expect(() =>
      selectPersona({
        persona: { ...coder, config: { tools: ['apply_migration'] } },
        availableToolNames: available,
        defaultModel: 'gpt-5',
        defaultSystemPrompt: 'x'
      })
    ).toThrow(UnknownPersonaToolError);
  });
});
