import { GraphilePostgisPreset } from '../src/preset';
import { PostgisCodecPlugin } from '../src/plugins/codec';
import { PostgisInflectionPlugin } from '../src/plugins/inflection';
import { PostgisExtensionDetectionPlugin } from '../src/plugins/detect-extension';
import { PostgisRegisterTypesPlugin } from '../src/plugins/register-types';
import { PostgisGeometryFieldsPlugin } from '../src/plugins/geometry-fields';

describe('GraphilePostgisPreset', () => {
  it('should include all 5 plugins', () => {
    expect(GraphilePostgisPreset.plugins).toHaveLength(5);
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

  it('should have plugins in correct order (codec before detection, detection before registration)', () => {
    const plugins = GraphilePostgisPreset.plugins!;
    const codecIdx = plugins.indexOf(PostgisCodecPlugin);
    const detectionIdx = plugins.indexOf(PostgisExtensionDetectionPlugin);
    const registrationIdx = plugins.indexOf(PostgisRegisterTypesPlugin);
    const fieldsIdx = plugins.indexOf(PostgisGeometryFieldsPlugin);

    expect(codecIdx).toBeLessThan(detectionIdx);
    expect(detectionIdx).toBeLessThan(registrationIdx);
    expect(registrationIdx).toBeLessThan(fieldsIdx);
  });
});
