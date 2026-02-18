import type { Geometry } from 'geojson';
import type { GisSubtype } from './constants';

export interface GisTypeDetails {
  subtype: GisSubtype;
  hasZ: boolean;
  hasM: boolean;
  srid: number;
}

export interface GisFieldValue {
  __gisType: string;
  __srid: number;
  __geojson: Geometry;
}

export interface PostgisCodecInfo {
  codecName: string;
  schemaName: string;
}
