export type { ModulePreset } from './types';

import { PresetAuthEmail } from './auth-email';
import { PresetAuthEmailMagic } from './auth-email-magic';
import { PresetAuthHardened } from './auth-hardened';
import { PresetAuthPasskey } from './auth-passkey';
import { PresetAuthSso } from './auth-sso';
import { PresetB2b } from './b2b';
import { PresetFull } from './full';
import { PresetMinimal } from './minimal';
import type { ModulePreset } from './types';

export {
  PresetAuthEmail,
  PresetAuthEmailMagic,
  PresetAuthHardened,
  PresetAuthPasskey,
  PresetAuthSso,
  PresetB2b,
  PresetFull,
  PresetMinimal};

/**
 * Ordered list of all shipped module presets, from smallest to largest
 * module footprint. Stable ordering — CLIs / UIs can present this directly.
 */
export const allModulePresets: ModulePreset[] = [
  PresetMinimal,
  PresetAuthEmail,
  PresetAuthEmailMagic,
  PresetAuthSso,
  PresetAuthPasskey,
  PresetAuthHardened,
  PresetB2b,
  PresetFull
];

/** Look up a preset by name. Returns undefined if the name isn't known. */
export function getModulePreset(name: string): ModulePreset | undefined {
  return allModulePresets.find((p) => p.name === name);
}
