import { GraphilePostgisPreset } from '../src/preset';
import { PostgisCodecPlugin } from '../src/plugins/codec';
import { PostgisInflectionPlugin } from '../src/plugins/inflection';
import { PostgisExtensionDetectionPlugin } from '../src/plugins/detect-extension';
import { PostgisRegisterTypesPlugin } from '../src/plugins/register-types';
import { PostgisGeometryFieldsPlugin } from '../src/plugins/geometry-fields';
import { PostgisMeasurementFieldsPlugin } from '../src/plugins/measurement-fields';
import { PostgisTransformationFieldsPlugin } from '../src/plugins/transformation-functions';
import { PostgisAggregatePlugin } from '../src/plugins/aggregate-functions';
import { PostgisSpatialRelationsPlugin } from '../src/plugins/spatial-relations';

describe('GraphilePostgisPreset', () => {
  it('should include all 9 plugins', () => {
    expect(GraphilePostgisPreset.plugins).toHaveLength(9);
  });

  it('should include PostgisSpatialRelationsPlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisSpatialRelationsPlugin);
  });

  it('should include PostgisCodecPlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisCodecPlugin);
  });

  it('should include PostgisInflectionPlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisInflectionPlugin);
  });

  it('should include PostgisExtensionDetectionPlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisExtensionDetectionPlugin);
  });

  it('should include PostgisRegisterTypesPlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisRegisterTypesPlugin);
  });

  it('should include PostgisGeometryFieldsPlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisGeometryFieldsPlugin);
  });

  it('should include PostgisMeasurementFieldsPlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisMeasurementFieldsPlugin);
  });

  it('should include PostgisTransformationFieldsPlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisTransformationFieldsPlugin);
  });

  it('should include PostgisAggregatePlugin', () => {
    expect(GraphilePostgisPreset.plugins).toContain(PostgisAggregatePlugin);
  });

  it('should have plugins in correct order (codec before detection, detection before registration)', () => {
    const plugins = GraphilePostgisPreset.plugins!;
    const codecIdx = plugins.indexOf(PostgisCodecPlugin);
    const detectionIdx = plugins.indexOf(PostgisExtensionDetectionPlugin);
    const registrationIdx = plugins.indexOf(PostgisRegisterTypesPlugin);
    const fieldsIdx = plugins.indexOf(PostgisGeometryFieldsPlugin);
    const measurementIdx = plugins.indexOf(PostgisMeasurementFieldsPlugin);
    const transformIdx = plugins.indexOf(PostgisTransformationFieldsPlugin);

    expect(codecIdx).toBeLessThan(detectionIdx);
    expect(detectionIdx).toBeLessThan(registrationIdx);
    expect(registrationIdx).toBeLessThan(fieldsIdx);
    expect(fieldsIdx).toBeLessThan(measurementIdx);
    expect(measurementIdx).toBeLessThan(transformIdx);
  });

  it('should declare 2 connection filter operator factories', () => {
    const schema = GraphilePostgisPreset.schema as Record<string, unknown> | undefined;
    const factories = schema?.connectionFilterOperatorFactories as unknown[] | undefined;
    expect(factories).toBeDefined();
    expect(factories).toHaveLength(2);
  });
});
