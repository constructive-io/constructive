import fs from 'fs';

/**
 * Move a file or directory, falling back to copy + remove across devices.
 * Replaces shelling out to `mv`, which does not exist on Windows.
 */
export const movePath = (src: string, dst: string): void => {
  try {
    fs.renameSync(src, dst);
  } catch (e: any) {
    if (e?.code !== 'EXDEV' && e?.code !== 'EPERM') throw e;
    fs.cpSync(src, dst, { recursive: true });
    fs.rmSync(src, { recursive: true, force: true });
  }
};
