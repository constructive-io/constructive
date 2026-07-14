import type { PgResource } from '@dataplan/pg';
import type { GraphileBuild } from 'graphile-build';
import type {} from 'graphile-build-pg';
import { isComputedScalarAttributeResource } from 'graphile-plugin-utils';

export function getComputedAttributeResources(
  build: GraphileBuild.Build,
  resource: PgResource<any, any, any, any>
) {
  const computedAttributeResources = Object.values(
    build.input.pgRegistry.pgResources
  ).filter(
    (s) =>
      isComputedScalarAttributeResource(s) &&
      !s.codec.arrayOfCodec &&
      s.parameters[0].codec === resource.codec
  );
  return computedAttributeResources;
}
