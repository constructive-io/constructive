import type { GraphileConfig } from 'graphile-config';
import { GisSubtype, SUBTYPE_STRING_BY_SUBTYPE } from '../constants';

/**
 * PostgisInflectionPlugin
 *
 * Adds inflection methods for generating PostGIS-related GraphQL type names.
 */
export const PostgisInflectionPlugin: GraphileConfig.Plugin = {
  name: 'PostgisInflectionPlugin',
  version: '2.0.0',
  description: 'Adds PostGIS-related inflection methods',

  inflection: {
    add: {
      gisType(
        _options: any,
        typeName: string,
        subtype: GisSubtype,
        hasZ: boolean,
        hasM: boolean,
        _srid?: number
      ) {
        return this.upperCamelCase(
          [
            typeName,
            SUBTYPE_STRING_BY_SUBTYPE[subtype],
            hasZ ? 'z' : null,
            hasM ? 'm' : null
          ]
            .filter(Boolean)
            .join('-')
        );
      },

      gisInterfaceName(_options: any, typeName: string) {
        return this.upperCamelCase(`${typeName}-interface`);
      },

      gisDimensionInterfaceName(
        _options: any,
        typeName: string,
        hasZ: boolean,
        hasM: boolean
      ) {
        return this.upperCamelCase(
          [
            typeName,
            SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.Geometry],
            hasZ ? 'z' : null,
            hasM ? 'm' : null
          ]
            .filter(Boolean)
            .join('-')
        );
      },

      geojsonFieldName() {
        return 'geojson';
      },

      gisXFieldName(_options: any, typeName: string) {
        return typeName === 'geography' ? 'longitude' : 'x';
      },

      gisYFieldName(_options: any, typeName: string) {
        return typeName === 'geography' ? 'latitude' : 'y';
      },

      gisZFieldName(_options: any, typeName: string) {
        return typeName === 'geography' ? 'height' : 'z';
      }
    } as any
  }
};
