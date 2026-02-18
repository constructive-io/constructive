import type { GraphileConfig } from 'graphile-config';
import sql from 'pg-sql2';

/**
 * PostgisCodecPlugin
 *
 * Teaches PostGraphile v5 how to handle PostgreSQL's geometry and geography types.
 * Without this, geometry/geography columns may not be properly recognized by
 * the schema builder.
 *
 * This plugin:
 * 1. Creates codecs for geometry/geography via gather.hooks.pgCodecs_findPgCodec
 * 2. The registered codecs use the PostGIS json_build_object wrapper (via fromPg)
 *    so that downstream resolvers receive { __gisType, __srid, __geojson }
 */
export const PostgisCodecPlugin: GraphileConfig.Plugin = {
  name: 'PostgisCodecPlugin',
  version: '2.0.0',
  description: 'Registers codecs for PostGIS geometry and geography types',

  gather: {
    hooks: {
      async pgCodecs_findPgCodec(info: any, event: any) {
        if (event.pgCodec) {
          return;
        }

        const { pgType: type, serviceName } = event;

        // Find the namespace for this type
        const namespaces = await info.helpers.pgIntrospection.getNamespaces(serviceName);
        const typeNamespace = namespaces?.find((ns: any) => ns._id === type.typnamespace);

        if (!typeNamespace) {
          return;
        }

        // We look for geometry/geography types in any schema (PostGIS can be
        // installed in different schemas, commonly 'public' or 'postgis')
        if (type.typname === 'geometry') {
          event.pgCodec = {
            name: 'geometry',
            sqlType: sql.identifier(typeNamespace.nspname, 'geometry'),
            fromPg: (value: string) => {
              // Raw geometry values come as hex WKB; the SQL tweak wraps them
              // in json_build_object, so by the time we get here the value is
              // already a JSON object with __gisType/__srid/__geojson
              if (typeof value === 'string') {
                try {
                  return JSON.parse(value);
                } catch {
                  return value;
                }
              }
              return value;
            },
            toPg: (value: unknown) => {
              if (typeof value === 'object' && value !== null) {
                return JSON.stringify(value);
              }
              return String(value);
            },
            attributes: undefined,
            executor: null,
            extensions: {
              oid: type._id,
              pg: {
                serviceName,
                schemaName: typeNamespace.nspname,
                name: 'geometry'
              }
            }
          };
          return;
        }

        if (type.typname === 'geography') {
          event.pgCodec = {
            name: 'geography',
            sqlType: sql.identifier(typeNamespace.nspname, 'geography'),
            fromPg: (value: string) => {
              if (typeof value === 'string') {
                try {
                  return JSON.parse(value);
                } catch {
                  return value;
                }
              }
              return value;
            },
            toPg: (value: unknown) => {
              if (typeof value === 'object' && value !== null) {
                return JSON.stringify(value);
              }
              return String(value);
            },
            attributes: undefined,
            executor: null,
            extensions: {
              oid: type._id,
              pg: {
                serviceName,
                schemaName: typeNamespace.nspname,
                name: 'geography'
              }
            }
          };
          return;
        }
      }
    }
  }
};
