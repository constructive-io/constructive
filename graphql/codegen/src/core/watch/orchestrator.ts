/**
 * Watch mode orchestrator
 *
 * Coordinates schema polling, change detection, and code regeneration
 */

import type { GraphQLSDKConfigTarget } from '../../types/config';
import { debounce } from './debounce';
import { SchemaPoller } from './poller';
import type { GeneratorType, PollEvent, WatchOptions } from './types';

// These will be injected by the CLI layer to avoid circular dependencies
// The watch orchestrator doesn't need to know about the full generate commands
export interface GenerateFunction {
  (options: {
    config?: string;
    target?: string;
    endpoint?: string;
    output?: string;
    authorization?: string;
    verbose?: boolean;
    skipCustomOperations?: boolean;
  }): Promise<GenerateResult>;
}

export interface GenerateResult {
  success: boolean;
  message: string;
  tables?: string[];
  filesWritten?: string[];
  errors?: string[];
}

export interface WatchOrchestratorOptions {
  config: GraphQLSDKConfigTarget;
  generatorType: GeneratorType;
  verbose: boolean;
  authorization?: string;
  /** Config file path for regeneration */
  configPath?: string;
  /** Target name for multi-target configs */
  target?: string;
  /** Override output directory */
  outputDir?: string;
  /** Skip custom operations flag */
  skipCustomOperations?: boolean;
  /** Generator function for React Query SDK */
  generateReactQuery: GenerateFunction;
  /** Generator function for ORM client */
  generateOrm: GenerateFunction;
}

export interface WatchStatus {
  isRunning: boolean;
  pollCount: number;
  regenerateCount: number;
  lastPollTime: number | null;
  lastRegenTime: number | null;
  lastError: string | null;
  currentHash: string | null;
}

/**
 * Main watch orchestrator class
 */
export class WatchOrchestrator {
  private options: WatchOrchestratorOptions;
  private watchOptions: WatchOptions;
  private poller: SchemaPoller;
  private status: WatchStatus;
  private debouncedRegenerate: ReturnType<typeof debounce>;
  private isShuttingDown = false;

  constructor(options: WatchOrchestratorOptions) {
    this.options = options;
    this.watchOptions = this.buildWatchOptions();
    this.poller = new SchemaPoller(this.watchOptions);
    this.status = {
      isRunning: false,
      pollCount: 0,
      regenerateCount: 0,
      lastPollTime: null,
      lastRegenTime: null,
      lastError: null,
      currentHash: null,
    };

    // Create debounced regenerate function
    this.debouncedRegenerate = debounce(
      () => this.regenerate(),
      options.config.watch.debounce,
    );

    // Set up event handlers
    this.setupEventHandlers();
  }

  private buildWatchOptions(): WatchOptions {
    const { config, verbose, authorization } = this.options;
    return {
      endpoint: config.endpoint,
      authorization,
      headers: config.headers,
      pollInterval: config.watch.pollInterval,
      debounce: config.watch.debounce,
      touchFile: config.watch.touchFile,
      clearScreen: config.watch.clearScreen,
      verbose,
    };
  }

  private setupEventHandlers(): void {
    this.poller.on('poll-start', () => {
      this.status.pollCount++;
      if (this.watchOptions.verbose) {
        this.log('Polling endpoint...');
      }
    });

    this.poller.on('poll-success', (event: PollEvent) => {
      this.status.lastPollTime = event.timestamp;
      this.status.lastError = null;
      if (this.watchOptions.verbose) {
        this.log(`Poll complete (${event.duration}ms)`);
      }
    });

    this.poller.on('poll-error', (event: PollEvent) => {
      this.status.lastError = event.error ?? 'Unknown error';
      this.logError(`Poll failed: ${event.error}`);
    });

    this.poller.on('schema-changed', (event: PollEvent) => {
      this.status.currentHash = event.hash ?? null;
      this.log(`Schema changed! (${event.duration}ms)`);
      this.debouncedRegenerate();
    });

    this.poller.on('schema-unchanged', () => {
      if (this.watchOptions.verbose) {
        this.log('Schema unchanged');
      }
    });
  }

  /**
   * Start watch mode
   */
  async start(): Promise<void> {
    if (this.status.isRunning) {
      return;
    }

    this.status.isRunning = true;
    this.setupSignalHandlers();

    // Clear screen on start if configured
    if (this.watchOptions.clearScreen) {
      this.clearScreen();
    }

    this.logHeader();

    // Do initial generation (always generate on start, regardless of cache)
    this.log('Running initial generation...');
    await this.regenerate();

    // Seed the in-memory cache with current schema hash (silent, no events)
    // This prevents the first poll from triggering another regeneration
    await this.poller.seedCache();

    // Start polling loop
    this.poller.start();
    this.log(
      `Watching for schema changes (poll interval: ${this.watchOptions.pollInterval}ms)`,
    );
  }

  /**
   * Stop watch mode
   */
  async stop(): Promise<void> {
    if (!this.status.isRunning) {
      return;
    }

    this.isShuttingDown = true;
    this.debouncedRegenerate.cancel();
    this.poller.stop();
    this.status.isRunning = false;
    this.log('Watch mode stopped');
  }

  /**
   * Get current watch status
   */
  getStatus(): WatchStatus {
    return { ...this.status };
  }

  private async regenerate(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const startTime = Date.now();

    if (this.watchOptions.clearScreen) {
      this.clearScreen();
      this.logHeader();
    }

    this.log('Regenerating...');

    try {
      let generateFn: GenerateFunction;
      let outputDir: string | undefined;

      switch (this.options.generatorType) {
        case 'react-query':
          generateFn = this.options.generateReactQuery;
          // React Query hooks go to {output}/hooks
          outputDir =
            this.options.outputDir ?? `${this.options.config.output}/hooks`;
          break;
        case 'orm':
          generateFn = this.options.generateOrm;
          // ORM client goes to {output}/orm
          outputDir =
            this.options.outputDir ?? `${this.options.config.output}/orm`;
          break;
        default:
          throw new Error(
            `Unknown generator type: ${this.options.generatorType}`,
          );
      }

      const result = await generateFn({
        config: this.options.configPath,
        target: this.options.target,
        endpoint: this.options.config.endpoint,
        output: outputDir,
        authorization: this.options.authorization,
        verbose: this.watchOptions.verbose,
        skipCustomOperations: this.options.skipCustomOperations,
      });

      const duration = Date.now() - startTime;

      if (result.success) {
        this.status.regenerateCount++;
        this.status.lastRegenTime = Date.now();
        this.logSuccess(`Generated in ${duration}ms`);

        if (result.tables && result.tables.length > 0) {
          this.log(`  Tables: ${result.tables.length}`);
        }
        if (result.filesWritten && result.filesWritten.length > 0) {
          this.log(`  Files: ${result.filesWritten.length}`);
        }
      } else {
        this.logError(`Generation failed: ${result.message}`);
        if (result.errors) {
          result.errors.forEach((e) => this.logError(`  ${e}`));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logError(`Generation error: ${message}`);
    }

    this.log(`\nWatching for changes...`);
  }

  private setupSignalHandlers(): void {
    const shutdown = async (signal: string) => {
      this.log(`\nReceived ${signal}, shutting down...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  private clearScreen(): void {
    // ANSI escape codes for clearing screen
    process.stdout.write('\x1B[2J\x1B[0f');
  }

  private logHeader(): void {
    let generatorName: string;
    switch (this.options.generatorType) {
      case 'react-query':
        generatorName = 'React Query hooks';
        break;
      case 'orm':
        generatorName = 'ORM client';
        break;
      default:
        throw new Error(
          `Unknown generator type: ${this.options.generatorType}`,
        );
    }
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`graphql-codegen watch mode (${generatorName})`);
    console.log(`Endpoint: ${this.options.config.endpoint}`);
    console.log(`${'─'.repeat(50)}\n`);
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }

  private logSuccess(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ✓ ${message}`);
  }

  private logError(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    console.error(`[${timestamp}] ✗ ${message}`);
  }
}

/**
 * Start watch mode for a generator
 */
export async function startWatch(
  options: WatchOrchestratorOptions,
): Promise<void> {
  const orchestrator = new WatchOrchestrator(options);
  await orchestrator.start();

  // Keep the process alive
  await new Promise(() => {
    // This promise never resolves - the process will exit via signal handlers
  });
}
