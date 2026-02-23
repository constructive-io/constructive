import * as postgisExports from '../src/index';

describe('graphile-postgis exports', () => {
  it('should export GraphilePostgisPreset', () => {
    expect(postgisExports.GraphilePostgisPreset).toBeDefined();
  });

  it('should export all individual plugins', () => {
    expect(postgisExports.PostgisCodecPlugin).toBeDefined();
    expect(postgisExports.PostgisInflectionPlugin).toBeDefined();
    expect(postgisExports.PostgisExtensionDetectionPlugin).toBeDefined();
    expect(postgisExports.PostgisRegisterTypesPlugin).toBeDefined();
    expect(postgisExports.PostgisGeometryFieldsPlugin).toBeDefined();
  });

  it('should export constants', () => {
    expect(postgisExports.GisSubtype).toBeDefined();
    expect(postgisExports.SUBTYPE_STRING_BY_SUBTYPE).toBeDefined();
    expect(postgisExports.GIS_SUBTYPE_NAME).toBeDefined();
    expect(postgisExports.CONCRETE_SUBTYPES).toBeDefined();
  });

  it('should export utility functions', () => {
    expect(postgisExports.getGISTypeDetails).toBeDefined();
    expect(postgisExports.getGISTypeModifier).toBeDefined();
    expect(postgisExports.getGISTypeName).toBeDefined();
  });

  it('should export exactly the expected set of named exports', () => {
    const expectedExports = [
      // Preset
      'GraphilePostgisPreset',
      // Plugins
      'PostgisCodecPlugin',
      'PostgisInflectionPlugin',
      'PostgisExtensionDetectionPlugin',
      'PostgisRegisterTypesPlugin',
      'PostgisGeometryFieldsPlugin',
      // Constants
      'GisSubtype',
      'SUBTYPE_STRING_BY_SUBTYPE',
      'GIS_SUBTYPE_NAME',
      'CONCRETE_SUBTYPES',
      // Utils
      'getGISTypeDetails',
      'getGISTypeModifier',
      'getGISTypeName'
    ];

    const actualExports = Object.keys(postgisExports);
    expect(actualExports.sort()).toEqual(expectedExports.sort());
  });
});
