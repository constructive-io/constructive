import { CliError } from '@constructive-io/cli-runtime';

const missingPackage = (error: unknown, packageName: string): boolean => {
  if (error === null || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  const message = (error as { message?: unknown }).message;
  return (
    (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') &&
    typeof message === 'string' &&
    message.includes(packageName)
  );
};

/** Load an optional feature package without turning omission into an internal error. */
export const importOptionalCapability = async <T>(
  capability: string,
  packageName: string,
  importer: () => Promise<T>
): Promise<T> => {
  try {
    return await importer();
  } catch (error) {
    if (!missingPackage(error, packageName)) throw error;
    throw new CliError({
      code: 'CAPABILITY_UNAVAILABLE',
      category: 'configuration',
      message: `The ${capability} capability is unavailable because optional package '${packageName}' is not installed.`,
      details: { capability, packageName },
      retryable: false,
      cause: error,
    });
  }
};
