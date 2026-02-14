import type { GraphileConfig } from "graphile-config";

/**
 * Plugin that detects naming conflicts between tables in different schemas.
 *
 * When two tables from different schemas would have the same GraphQL type name,
 * this plugin logs a warning so developers know they need to resolve the conflict
 * (e.g., by using @name smart tags or renaming tables).
 *
 * This is better than silently prefixing schema names because:
 * 1. It gives developers visibility into the issue
 * 2. It lets them decide how to resolve it (smart tags, rename, etc.)
 * 3. It keeps the GraphQL schema clean and predictable
 */

interface CodecInfo {
  name: string;
  schemaName: string;
  tableName: string;
}

export const ConflictDetectorPlugin: GraphileConfig.Plugin = {
  name: "ConflictDetectorPlugin",
  version: "1.0.0",

  schema: {
    hooks: {
      build(build) {
        // Track codecs by their GraphQL name to detect conflicts
        const codecsByName = new Map<string, CodecInfo[]>();

        // Get configured schemas from pgServices to only check relevant codecs
        const configuredSchemas = new Set<string>();
        const pgServices = (build as any).resolvedPreset?.pgServices ?? [];

        for (const service of pgServices) {
          for (const schema of service.schemas ?? ["public"]) {
            configuredSchemas.add(schema);
          }
        }

        // Iterate through all codecs to find tables
        for (const codec of Object.values(build.input.pgRegistry.pgCodecs)) {
          // Skip non-table codecs (those without attributes or anonymous ones)
          if (!codec.attributes || codec.isAnonymous) continue;

          // Get the schema name from the codec's extensions
          const pgExtensions = codec.extensions?.pg as { schemaName?: string } | undefined;
          const schemaName = pgExtensions?.schemaName || "unknown";
          const tableName = codec.name;

          // Skip codecs from schemas not in the configured list
          if (configuredSchemas.size > 0 && !configuredSchemas.has(schemaName)) {
            continue;
          }

          // Get the GraphQL name that would be generated
          const graphqlName = build.inflection.tableType(codec);

          const info: CodecInfo = {
            name: graphqlName,
            schemaName,
            tableName,
          };

          if (!codecsByName.has(graphqlName)) {
            codecsByName.set(graphqlName, []);
          }
          codecsByName.get(graphqlName)!.push(info);
        }

        // Check for conflicts and log warnings
        for (const [graphqlName, codecs] of codecsByName) {
          if (codecs.length > 1) {
            const locations = codecs.map((c) => `${c.schemaName}.${c.tableName}`).join(", ");

            console.warn(
              `\nNAMING CONFLICT DETECTED: GraphQL type "${graphqlName}" would be generated from multiple tables:\n` +
                `   Tables: ${locations}\n` +
                `   Resolution options:\n` +
                `   1. Add @name smart tag to one table: COMMENT ON TABLE schema.table IS E'@name UniqueTypeName';\n` +
                `   2. Rename one of the tables in the database\n` +
                `   3. Exclude one table from the schema using @omit smart tag\n`,
            );
          }
        }

        return build;
      },
    },
  },
};

/**
 * Preset that includes the conflict detector plugin.
 */
export const ConflictDetectorPreset: GraphileConfig.Preset = {
  plugins: [ConflictDetectorPlugin],
};

export default ConflictDetectorPlugin;
