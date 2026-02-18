import { GisSubtype } from '../src/constants';
import { getGISTypeDetails, getGISTypeModifier, getGISTypeName } from '../src/utils';

describe('getGISTypeModifier', () => {
  it('should encode Point with SRID 4326', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, false, false, 4326);
    expect(modifier).toBe((4326 << 8) + (1 << 2));
  });

  it('should encode Point with Z flag', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, true, false, 0);
    expect(modifier).toBe((1 << 2) + 0x02);
  });

  it('should encode Point with M flag', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, false, true, 0);
    expect(modifier).toBe((1 << 2) + 0x01);
  });

  it('should encode Point with ZM flags', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, true, true, 0);
    expect(modifier).toBe((1 << 2) + 0x03);
  });

  it('should encode Geometry (subtype 0) with no flags', () => {
    const modifier = getGISTypeModifier(GisSubtype.Geometry, false, false, 0);
    expect(modifier).toBe(0);
  });

  it('should encode all subtypes correctly', () => {
    for (let subtype = 0; subtype <= 7; subtype++) {
      const modifier = getGISTypeModifier(subtype as GisSubtype, false, false, 0);
      expect(modifier).toBe(subtype << 2);
    }
  });

  it('should encode SRID in bits 8-28', () => {
    const modifier = getGISTypeModifier(GisSubtype.Geometry, false, false, 1);
    expect(modifier).toBe(1 << 8);
  });

  it('should handle common SRIDs', () => {
    // WGS 84
    const modifier4326 = getGISTypeModifier(GisSubtype.Point, false, false, 4326);
    const details4326 = getGISTypeDetails(modifier4326);
    expect(details4326.srid).toBe(4326);
    expect(details4326.subtype).toBe(GisSubtype.Point);

    // Web Mercator
    const modifier3857 = getGISTypeModifier(GisSubtype.Point, false, false, 3857);
    const details3857 = getGISTypeDetails(modifier3857);
    expect(details3857.srid).toBe(3857);

    // UTM Zone 32N
    const modifier32632 = getGISTypeModifier(GisSubtype.Polygon, true, false, 32632);
    const details32632 = getGISTypeDetails(modifier32632);
    expect(details32632.srid).toBe(32632);
    expect(details32632.subtype).toBe(GisSubtype.Polygon);
    expect(details32632.hasZ).toBe(true);
  });
});

describe('getGISTypeDetails', () => {
  it('should decode a simple Point modifier', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, false, false, 4326);
    const details = getGISTypeDetails(modifier);
    expect(details.subtype).toBe(GisSubtype.Point);
    expect(details.hasZ).toBe(false);
    expect(details.hasM).toBe(false);
    expect(details.srid).toBe(4326);
  });

  it('should decode PointZ modifier', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, true, false, 4326);
    const details = getGISTypeDetails(modifier);
    expect(details.subtype).toBe(GisSubtype.Point);
    expect(details.hasZ).toBe(true);
    expect(details.hasM).toBe(false);
    expect(details.srid).toBe(4326);
  });

  it('should decode PointM modifier', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, false, true, 4326);
    const details = getGISTypeDetails(modifier);
    expect(details.subtype).toBe(GisSubtype.Point);
    expect(details.hasZ).toBe(false);
    expect(details.hasM).toBe(true);
    expect(details.srid).toBe(4326);
  });

  it('should decode PointZM modifier', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, true, true, 4326);
    const details = getGISTypeDetails(modifier);
    expect(details.subtype).toBe(GisSubtype.Point);
    expect(details.hasZ).toBe(true);
    expect(details.hasM).toBe(true);
    expect(details.srid).toBe(4326);
  });

  it('should decode all subtypes', () => {
    const subtypes = [
      GisSubtype.Geometry,
      GisSubtype.Point,
      GisSubtype.LineString,
      GisSubtype.Polygon,
      GisSubtype.MultiPoint,
      GisSubtype.MultiLineString,
      GisSubtype.MultiPolygon,
      GisSubtype.GeometryCollection
    ];

    for (const subtype of subtypes) {
      const modifier = getGISTypeModifier(subtype, false, false, 0);
      const details = getGISTypeDetails(modifier);
      expect(details.subtype).toBe(subtype);
    }
  });

  it('should roundtrip all combinations of subtype, Z, M, and SRID', () => {
    const subtypes = [0, 1, 2, 3, 4, 5, 6, 7] as GisSubtype[];
    const srids = [0, 4326, 3857, 32632];

    for (const subtype of subtypes) {
      for (const hasZ of [false, true]) {
        for (const hasM of [false, true]) {
          for (const srid of srids) {
            const modifier = getGISTypeModifier(subtype, hasZ, hasM, srid);
            const details = getGISTypeDetails(modifier);
            expect(details.subtype).toBe(subtype);
            expect(details.hasZ).toBe(hasZ);
            expect(details.hasM).toBe(hasM);
            expect(details.srid).toBe(srid);
          }
        }
      }
    }
  });

  it('should throw for unsupported modifier with bits above 24', () => {
    // bits 24+ should be zero
    const badModifier = 1 << 24;
    expect(() => getGISTypeDetails(badModifier)).toThrow('Unsupported PostGIS modifier');
  });

  it('should throw for unsupported subtype values (8+)', () => {
    // Subtype 8 would be bits: 100000 in positions 2-7
    const badModifier = 8 << 2;
    expect(() => getGISTypeDetails(badModifier)).toThrow(
      /Unsupported PostGIS modifier, expected 0-7, received 8/
    );
  });

  it('should decode SRID 0 correctly', () => {
    const modifier = getGISTypeModifier(GisSubtype.Point, false, false, 0);
    const details = getGISTypeDetails(modifier);
    expect(details.srid).toBe(0);
  });
});

describe('getGISTypeName', () => {
  it('should return base name without Z/M flags', () => {
    expect(getGISTypeName(GisSubtype.Point, false, false)).toBe('Point');
    expect(getGISTypeName(GisSubtype.LineString, false, false)).toBe('LineString');
    expect(getGISTypeName(GisSubtype.Polygon, false, false)).toBe('Polygon');
    expect(getGISTypeName(GisSubtype.MultiPoint, false, false)).toBe('MultiPoint');
    expect(getGISTypeName(GisSubtype.MultiLineString, false, false)).toBe('MultiLineString');
    expect(getGISTypeName(GisSubtype.MultiPolygon, false, false)).toBe('MultiPolygon');
    expect(getGISTypeName(GisSubtype.GeometryCollection, false, false)).toBe('GeometryCollection');
    expect(getGISTypeName(GisSubtype.Geometry, false, false)).toBe('Geometry');
  });

  it('should append Z when hasZ is true', () => {
    expect(getGISTypeName(GisSubtype.Point, true, false)).toBe('PointZ');
    expect(getGISTypeName(GisSubtype.Polygon, true, false)).toBe('PolygonZ');
  });

  it('should append M when hasM is true', () => {
    expect(getGISTypeName(GisSubtype.Point, false, true)).toBe('PointM');
    expect(getGISTypeName(GisSubtype.Polygon, false, true)).toBe('PolygonM');
  });

  it('should append ZM when both are true', () => {
    expect(getGISTypeName(GisSubtype.Point, true, true)).toBe('PointZM');
    expect(getGISTypeName(GisSubtype.MultiPolygon, true, true)).toBe('MultiPolygonZM');
  });

  it('should produce all 32 combinations (8 subtypes x 4 Z/M combos)', () => {
    const names = new Set<string>();
    for (let subtype = 0; subtype <= 7; subtype++) {
      for (const hasZ of [false, true]) {
        for (const hasM of [false, true]) {
          const name = getGISTypeName(subtype as GisSubtype, hasZ, hasM);
          names.add(name);
          // Verify format: PascalCase name optionally followed by Z, M, or ZM
          expect(name).toMatch(/^[A-Z][a-zA-Z]+(Z)?(M)?$/);
        }
      }
    }
    expect(names.size).toBe(32);
  });
});
