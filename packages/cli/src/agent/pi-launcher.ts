import { runCommand } from './process-utils';

export interface LaunchPiOptions {
  piBinaryPath: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  provider?: string;
  model?: string;
  apiKey?: string;
  printPrompt?: string;
  extensionEntryPath?: string;
  passthroughArgs?: string[];
}

const normalizeString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export function buildPiArgs(options: LaunchPiOptions): string[] {
  const args: string[] = [];

  const extensionEntryPath = normalizeString(options.extensionEntryPath);
  if (extensionEntryPath) {
    args.push('-e', extensionEntryPath);
  }

  const provider = normalizeString(options.provider);
  if (provider) {
    args.push('--provider', provider);
  }

  const model = normalizeString(options.model);
  if (model) {
    args.push('--model', model);
  }

  const apiKey = normalizeString(options.apiKey);
  if (apiKey) {
    args.push('--api-key', apiKey);
  }

  const printPrompt = normalizeString(options.printPrompt);
  if (printPrompt) {
    args.push('--print', printPrompt);
  }

  if (options.passthroughArgs?.length) {
    args.push(...options.passthroughArgs);
  }

  return args;
}

export async function launchPi(options: LaunchPiOptions): Promise<number> {
  const args = buildPiArgs(options);
  const result = await runCommand(options.piBinaryPath, args, {
    cwd: options.cwd,
    env: options.env,
    inheritStdio: true,
  });
  return result.exitCode;
}
