import {
  GisSubtype,
  SUBTYPE_STRING_BY_SUBTYPE,
  GIS_SUBTYPE_NAME,
  CONCRETE_SUBTYPES
} from '../src/constants';

describe('GisSubtype enum', () => {
  it('should have correct numeric values', () => {
    expect(GisSubtype.Geometry).toBe(0);
    expect(GisSubtype.Point).toBe(1);
    expect(GisSubtype.LineString).toBe(2);
    expect(GisSubtype.Polygon).toBe(3);
    expect(GisSubtype.MultiPoint).toBe(4);
    expect(GisSubtype.MultiLineString).toBe(5);
    expect(GisSubtype.MultiPolygon).toBe(6);
    expect(GisSubtype.GeometryCollection).toBe(7);
  });

  it('should have exactly 8 members (0-7)', () => {
    // TypeScript enums create reverse mappings, so filter numeric keys
    const numericKeys = Object.keys(GisSubtype).filter(k => !isNaN(Number(k)));
    expect(numericKeys.length).toBe(8);
  });
});

describe('SUBTYPE_STRING_BY_SUBTYPE', () => {
  it('should map all subtypes to kebab-case strings', () => {
    expect(SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.Geometry]).toBe('geometry');
    expect(SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.Point]).toBe('point');
    expect(SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.LineString]).toBe('line-string');
    expect(SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.Polygon]).toBe('polygon');
    expect(SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.MultiPoint]).toBe('multi-point');
    expect(SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.MultiLineString]).toBe('multi-line-string');
    expect(SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.MultiPolygon]).toBe('multi-polygon');
    expect(SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.GeometryCollection]).toBe('geometry-collection');
  });

  it('should have entries for all 8 subtypes', () => {
    expect(Object.keys(SUBTYPE_STRING_BY_SUBTYPE).length).toBe(8);
  });
});

describe('GIS_SUBTYPE_NAME', () => {
  it('should map all subtypes to PascalCase names', () => {
    expect(GIS_SUBTYPE_NAME[GisSubtype.Geometry]).toBe('Geometry');
    expect(GIS_SUBTYPE_NAME[GisSubtype.Point]).toBe('Point');
    expect(GIS_SUBTYPE_NAME[GisSubtype.LineString]).toBe('LineString');
    expect(GIS_SUBTYPE_NAME[GisSubtype.Polygon]).toBe('Polygon');
    expect(GIS_SUBTYPE_NAME[GisSubtype.MultiPoint]).toBe('MultiPoint');
    expect(GIS_SUBTYPE_NAME[GisSubtype.MultiLineString]).toBe('MultiLineString');
    expect(GIS_SUBTYPE_NAME[GisSubtype.MultiPolygon]).toBe('MultiPolygon');
    expect(GIS_SUBTYPE_NAME[GisSubtype.GeometryCollection]).toBe('GeometryCollection');
  });

  it('should have entries for all 8 subtypes', () => {
    expect(Object.keys(GIS_SUBTYPE_NAME).length).toBe(8);
  });
});

describe('CONCRETE_SUBTYPES', () => {
  it('should contain exactly 7 concrete subtypes (excludes Geometry)', () => {
    expect(CONCRETE_SUBTYPES.length).toBe(7);
  });

  it('should NOT include Geometry (subtype 0)', () => {
    expect(CONCRETE_SUBTYPES).not.toContain(GisSubtype.Geometry);
  });

  it('should include all concrete geometry types', () => {
    expect(CONCRETE_SUBTYPES).toContain(GisSubtype.Point);
    expect(CONCRETE_SUBTYPES).toContain(GisSubtype.LineString);
    expect(CONCRETE_SUBTYPES).toContain(GisSubtype.Polygon);
    expect(CONCRETE_SUBTYPES).toContain(GisSubtype.MultiPoint);
    expect(CONCRETE_SUBTYPES).toContain(GisSubtype.MultiLineString);
    expect(CONCRETE_SUBTYPES).toContain(GisSubtype.MultiPolygon);
    expect(CONCRETE_SUBTYPES).toContain(GisSubtype.GeometryCollection);
  });

  it('should be in ascending numeric order', () => {
    for (let i = 1; i < CONCRETE_SUBTYPES.length; i++) {
      expect(CONCRETE_SUBTYPES[i]).toBeGreaterThan(CONCRETE_SUBTYPES[i - 1]);
    }
  });
});
