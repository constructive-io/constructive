import { GisSubtype, GIS_SUBTYPE_NAME } from './constants';
import type { GisTypeDetails } from './types';

/**
 * Decodes a PostGIS type modifier into its component parts.
 *
 * Implements the C macro bit layout from liblwgeom.h:
 * - SRID: bits 8-28
 * - Subtype: bits 2-7
 * - hasZ: bit 1
 * - hasM: bit 0
 */
export const getGISTypeDetails = (modifier: number): GisTypeDetails => {
  const allZeroesHopefully = modifier >> 24;
  if (allZeroesHopefully !== 0) {
    throw new Error('Unsupported PostGIS modifier');
  }

  // Ref: https://github.com/postgis/postgis/blob/2.5.2/liblwgeom/liblwgeom.h.in#L156-L173
  // #define TYPMOD_GET_SRID(typmod) ((((typmod) & 0x0FFFFF00) - ((typmod) & 0x10000000)) >> 8)
  // #define TYPMOD_GET_TYPE(typmod) ((typmod & 0x000000FC)>>2)
  // #define TYPMOD_GET_Z(typmod) ((typmod & 0x00000002)>>1)
  // #define TYPMOD_GET_M(typmod) (typmod & 0x00000001)
  const srid = ((modifier & 0x0fffff00) - (modifier & 0x10000000)) >> 8;
  const subtypeNumeric = (modifier & 0x000000fc) >> 2;
  const hasZ = (modifier & 0x00000002) >> 1 === 1;
  const hasM = (modifier & 0x00000001) === 1;

  if (
    subtypeNumeric !== GisSubtype.Geometry &&
    subtypeNumeric !== GisSubtype.Point &&
    subtypeNumeric !== GisSubtype.LineString &&
    subtypeNumeric !== GisSubtype.Polygon &&
    subtypeNumeric !== GisSubtype.MultiPoint &&
    subtypeNumeric !== GisSubtype.MultiLineString &&
    subtypeNumeric !== GisSubtype.MultiPolygon &&
    subtypeNumeric !== GisSubtype.GeometryCollection
  ) {
    throw new Error(
      `Unsupported PostGIS modifier, expected 0-7, received ${subtypeNumeric} (${modifier})`
    );
  }

  const subtype: GisSubtype = subtypeNumeric;
  return { subtype, hasZ, hasM, srid };
};

/**
 * Encodes PostGIS type details into a type modifier integer.
 */
export const getGISTypeModifier = (
  subtype: GisSubtype,
  hasZ: boolean,
  hasM: boolean,
  srid: number
): number => {
  // Ref: https://github.com/postgis/postgis/blob/2.5.2/liblwgeom/liblwgeom.h.in#L156-L173
  // #define TYPMOD_SET_SRID(typmod, srid) ((typmod) = (((typmod) & 0xE00000FF) | ((srid & 0x001FFFFF)<<8)))
  // #define TYPMOD_SET_TYPE(typmod, type) ((typmod) = (typmod & 0xFFFFFF03) | ((type & 0x0000003F)<<2))
  // #define TYPMOD_SET_Z(typmod) ((typmod) = typmod | 0x00000002)
  // #define TYPMOD_SET_M(typmod) ((typmod) = typmod | 0x00000001)
  return (
    ((srid & 0x001fffff) << 8) +
    ((subtype & 0x0000003f) << 2) +
    (hasZ ? 0x00000002 : 0) +
    (hasM ? 0x00000001 : 0)
  );
};

/**
 * Returns the GIS type name string for a given subtype and Z/M flags.
 * E.g. "PointZ", "MultiPolygonZM", "LineString"
 */
export const getGISTypeName = (
  subtype: GisSubtype,
  hasZ: boolean,
  hasM: boolean
): string => {
  return `${GIS_SUBTYPE_NAME[subtype]}${hasZ ? 'Z' : ''}${hasM ? 'M' : ''}`;
};
