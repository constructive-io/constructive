import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';

import { loadConfig, safegresConfigLoader } from '../config/loader';
import { resolveRules } from '../config/resolve';
import { RULES } from '../rules/registry';
import { configParamsFromArgv } from './shared';

const usage = `
safegres print-config — show the resolved effective configuration

  safegres print-config [OPTIONS]

Options:
  --config <path>          Explicit config file
  --preset <name>          Apply a built-in preset
  --rule <CODE=SETTING>    Retune a rule (repeatable)
  --explain                Show per-key provenance (which layer set each value)
  --help, -h               Show this help message
`;

export default async (
  argv: ParsedArgs,
  _prompter: Inquirerer,
  _options: CLIOptions
): Promise<void> => {
  if (argv.help || argv.h) {
    process.stdout.write(usage);
    return;
  }

  const params = configParamsFromArgv(argv);

  if (argv.explain === true) {
    const loader = safegresConfigLoader();
    const explained = loader.explainSync({
      configFile: params.configFile,
      overrides: params.overrides
    });
    for (const e of explained) {
      process.stdout.write(`${e.path} = ${JSON.stringify(e.value)}  (${e.source}: ${e.origin})\n`);
    }
    return;
  }

  const { config, filepath, isEmpty } = loadConfig(params);
  const resolved = resolveRules(config);

  const effectiveRules: Record<string, string> = {};
  for (const rule of RULES) {
    const r = resolved.rules.get(rule.code)!;
    effectiveRules[rule.code] = r.enabled ? r.severity : 'off';
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        source: filepath ?? (isEmpty ? '(no config file — defaults)' : undefined),
        config,
        effectiveRules
      },
      null,
      2
    )}\n`
  );
};
