/**
 * Init command - creates a new graphql-codegen configuration file
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createJiti } from 'jiti';

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

const CONFIG_FILENAME = 'graphql-codegen.config.ts';

const CONFIG_TEMPLATE = `import { defineConfig } from '@constructive-io/graphql-codegen';

export default defineConfig({
  // GraphQL endpoint URL (PostGraphile with _meta plugin)
  endpoint: '{{ENDPOINT}}',

  // Output directory for generated files
  output: '{{OUTPUT}}',

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
export async function initCommand(options: InitOptions = {}): Promise<InitResult> {
  const { directory = process.cwd(), force = false, endpoint = '', output = './generated' } = options;

  const configPath = path.join(directory, CONFIG_FILENAME);

  // Check if config already exists
  if (fs.existsSync(configPath) && !force) {
    return {
      success: false,
      message: `Configuration file already exists: ${configPath}\nUse --force to overwrite.`,
    };
  }

  // Generate config content
  const content = CONFIG_TEMPLATE
    .replace('{{ENDPOINT}}', endpoint || 'http://localhost:5000/graphql')
    .replace('{{OUTPUT}}', output);

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

/**
 * Find the nearest config file by walking up directories
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;

  while (true) {
    const configPath = path.join(currentDir, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) {
      return configPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Load and validate a config file
 * 
 * Uses jiti to support TypeScript config files (.ts) in addition to
 * JavaScript (.js, .mjs, .cjs) without requiring the user to have
 * tsx or ts-node installed.
 */
export async function loadConfigFile(configPath: string): Promise<{
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
  error?: string;
}> {
  if (!fs.existsSync(configPath)) {
    return {
      success: false,
      error: `Config file not found: ${configPath}`,
    };
  }

  try {
    // Use jiti to load TypeScript/ESM config files seamlessly
    // jiti handles .ts, .js, .mjs, .cjs and ESM/CJS interop
    const jiti = createJiti(__filename, {
      interopDefault: true,
      debug: process.env.JITI_DEBUG === '1',
    });

    // jiti.import() with { default: true } returns mod?.default ?? mod
    const config = await jiti.import(configPath, { default: true });

    if (!config || typeof config !== 'object') {
      return {
        success: false,
        error: 'Config file must export a configuration object',
      };
    }

    if (!('endpoint' in config)) {
      return {
        success: false,
        error: 'Config file missing required "endpoint" property',
      };
    }

    return {
      success: true,
      config,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to load config file: ${message}`,
    };
  }
}
