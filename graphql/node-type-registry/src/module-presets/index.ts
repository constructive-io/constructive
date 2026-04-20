export type { ModulePreset } from './types';

import type { ModulePreset } from './types';

import { PresetMinimal } from './minimal';
import { PresetAuthEmail } from './auth-email';
import { PresetAuthEmailMagic } from './auth-email-magic';
import { PresetAuthSso } from './auth-sso';
import { PresetAuthPasskey } from './auth-passkey';
import { PresetAuthHardened } from './auth-hardened';
import { PresetB2b } from './b2b';
import { PresetFull } from './full';

export {
  PresetMinimal,
  PresetAuthEmail,
  PresetAuthEmailMagic,
  PresetAuthSso,
  PresetAuthPasskey,
  PresetAuthHardened,
  PresetB2b,
  PresetFull
};

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
