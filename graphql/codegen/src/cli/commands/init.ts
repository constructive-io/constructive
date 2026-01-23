/**
 * Init command - creates a new graphql-codegen configuration file
 *
 * This is a thin CLI wrapper. Config loading utilities are in core/config.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  CONFIG_FILENAME,
  findConfigFile,
  loadConfigFile,
} from '../../core/config';

export { CONFIG_FILENAME, findConfigFile, loadConfigFile };

export interface InitOptions {
  /** Target directory for the config file */
  directory?: string;
  /** Force overwrite existing config */
  force?: boolean;
  /** GraphQL endpoint URL to pre-populate */
  endpoint?: string;
  /** Output directory to pre-populate */
  output?: string;
}

const CONFIG_TEMPLATE= `import { defineConfig } from '@constructive-io/graphql-codegen';

export default defineConfig({
  // GraphQL endpoint URL (PostGraphile with _meta plugin)
  endpoint: '{{ENDPOINT}}',

  // Output directory for generated files
  output: '{{OUTPUT}}',

  // Optional: Multi-target config (use instead of endpoint/output)
  // defaults: {
  //   headers: { Authorization: 'Bearer YOUR_TOKEN' },
  // },
  // targets: {
  //   public: { endpoint: 'https://api.example.com/graphql', output: './generated/public' },
  //   admin: { schema: './admin.schema.graphql', output: './generated/admin' },
  // },

  // Optional: Tables to include/exclude (supports glob patterns)
  // tables: {
  //   include: ['*'],
  //   exclude: ['_*', 'pg_*'],
  // },

  // Optional: Authorization header for authenticated endpoints
  // headers: {
  //   Authorization: 'Bearer YOUR_TOKEN',
  // },

  // Optional: Watch mode settings (in-memory caching, no file I/O)
  // watch: {
  //   pollInterval: 3000,  // ms
  //   debounce: 800,       // ms
  //   clearScreen: true,
  //   touchFile: '.trigger',  // Optional: file to touch on change
  // },
});
`;

export interface InitResult {
  success: boolean;
  message: string;
  configPath?: string;
}

/**
 * Execute the init command
 */
export async function initCommand(
  options: InitOptions = {}
): Promise<InitResult> {
  const {
    directory = process.cwd(),
    force = false,
    endpoint = '',
    output = './generated',
  } = options;

  const configPath = path.join(directory, CONFIG_FILENAME);

  // Check if config already exists
  if (fs.existsSync(configPath) && !force) {
    return {
      success: false,
      message: `Configuration file already exists: ${configPath}\nUse --force to overwrite.`,
    };
  }

  // Generate config content
  const content = CONFIG_TEMPLATE.replace(
    '{{ENDPOINT}}',
    endpoint || 'http://localhost:5000/graphql'
  ).replace('{{OUTPUT}}', output);

  try {
    // Ensure directory exists
    fs.mkdirSync(directory, { recursive: true });

    // Write config file
    fs.writeFileSync(configPath, content, 'utf-8');

    return {
      success: true,
      message: `Created configuration file: ${configPath}`,
      configPath,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to create configuration file: ${message}`,
    };
  }
}
