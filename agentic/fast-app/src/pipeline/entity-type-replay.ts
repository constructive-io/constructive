// A rebuild's entity types. `manage_entity_types` made them in the gone
// database, outside any spec, so the rebuild makes each again in the new one,
// as the last look recorded it, before the schema adds the spec's columns,
// keys and screens on top.

import type { EntityTypeSnapshot } from '../app-spec/schema-drift';
import { recordActivity } from './activity';
import { PhaseError } from './progress';
import { projectContext } from './project-env';

export async function recreateEntityTypes(
  cwd: string,
  entityTypes: readonly EntityTypeSnapshot[],
): Promise<void> {
  if (!entityTypes.length) return;
  const { context, reason } = await projectContext(cwd);
  if (!context) throw new PhaseError('provision', reason, 'Report this error to the user.');
  // A rebuild picked up again may have made some already.
  const existing = await context.modules.entityTypeProvision
    .findMany({
      where: { databaseId: { equalTo: context.databaseId } },
      select: { prefix: true },
    })
    .unwrap();
  const have = new Set((existing.entityTypeProvisions?.nodes ?? []).map((row) => row.prefix));
  for (const type of entityTypes) {
    if (have.has(type.prefix)) continue;
    const data = {
      databaseId: context.databaseId,
      name: type.name,
      prefix: type.prefix,
      ...(type.description !== undefined && { description: type.description }),
      ...(type.parentEntity !== undefined && { parentEntity: type.parentEntity }),
      ...(type.isVisible !== undefined && { isVisible: type.isVisible }),
      ...(type.hasInvites !== undefined && { hasInvites: type.hasInvites }),
      ...(type.hasProfiles !== undefined && { hasProfiles: type.hasProfiles }),
      ...(type.hasLimits !== undefined && { hasLimits: type.hasLimits }),
      ...(type.hasLevels !== undefined && { hasLevels: type.hasLevels }),
      ...(type.storage != null && { storage: type.storage as Record<string, unknown> }),
    };
    let given: number | null | undefined;
    try {
      const made = await recordActivity(
        {
          kind: 'call',
          label: 'manage_entity_types',
          args: `create ${type.prefix}`,
          params: { action: 'create', ...data },
        },
        () =>
          context.modules.entityTypeProvision
            .create({ data, select: { id: true, outMembershipType: true } })
            .unwrap(),
        () => ({ detail: `made ${type.table} again` }),
      );
      given = made.createEntityTypeProvision?.entityTypeProvision?.outMembershipType;
    } catch (err) {
      throw new PhaseError(
        'provision',
        `Making the "${type.prefix}" entity type again failed: ${err instanceof Error ? err.message : String(err)}`,
        'Report this error to the user.',
      );
    }
    // The schema's policies name the type the plan read; another would let no one in.
    if (type.membershipType !== undefined && given !== type.membershipType) {
      throw new PhaseError(
        'provision',
        `The "${type.prefix}" entity type came back as membership type ${String(given)}, not ${type.membershipType}, so the planned policies don't fit it.`,
        'Call plan_app again: the new database has the entity type now, and the plan reads it from there.',
      );
    }
  }
}
