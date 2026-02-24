import { createConstructivePiOptionsFromEnv } from './env-config';
import { createConstructivePiExtension } from './extension-factory';

const extension = createConstructivePiExtension(
  createConstructivePiOptionsFromEnv(),
);

export default extension;
