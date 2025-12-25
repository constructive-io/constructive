#!/usr/bin/env node
import { CLI, type CommandHandler } from 'inquirerer';
import { readConfig } from './parse';
import { Parser } from './parser';
import { normalizePath } from './utils';
import { dirname } from 'path';
import { writeFileSync } from 'fs';

interface ConfigFile {
  input?: string;
  output?: string;
  debug?: boolean;
  [key: string]: unknown;
}

interface PromptResult {
  config?: string;
  input?: string;
  output?: string;
}

const handler: CommandHandler = async (argv, prompter) => {
  // Get config from positional argument or --config flag
  let configPath = argv._[0] as string | undefined;
  if (!configPath && argv.config) {
    configPath = argv.config as string;
  }

  // If no config provided, prompt for it
  if (!configPath) {
    const result = await prompter.prompt<PromptResult>({}, [
      {
        name: 'config',
        type: 'text',
        message: 'Config file path',
        required: true
      }
    ]);
    configPath = result.config;
  }

  const normalizedConfigPath = normalizePath(configPath!);
  const dir = dirname(normalizedConfigPath);
  const config = readConfig(normalizedConfigPath) as ConfigFile;

  // Build initial values from parsed args and config
  const initialValues: PromptResult = {};
  
  if (argv.input) {
    initialValues.input = argv.input as string;
  } else if (config.input) {
    initialValues.input = normalizePath(config.input, dir);
  }
  
  if (argv.output) {
    initialValues.output = argv.output as string;
  } else if (config.output) {
    initialValues.output = normalizePath(config.output, dir);
  }

  const results = await prompter.prompt<PromptResult>(initialValues, [
    {
      name: 'input',
      type: 'text',
      message: 'Input CSV file path',
      required: true
    },
    {
      name: 'output',
      type: 'text',
      message: 'Output SQL file path',
      required: true
    }
  ]);

  config.input = results.input;
  config.output = results.output;

  let outFile = results.output!;
  if (!outFile.endsWith('.sql')) outFile = outFile + '.sql';
  config.output = outFile;

  if (argv.debug) {
    config.debug = true;
  }

  // Cast config to the expected Parser config type
  const parserConfig = config as ConfigFile & { input: string; table: string; fields: Record<string, unknown> };
  const parser = new Parser(parserConfig);
  const sql = await parser.parse();

  if (sql) {
    writeFileSync(config.output, sql);
  }

  prompter.close();
};

const cli = new CLI(handler, {});
cli.run();
