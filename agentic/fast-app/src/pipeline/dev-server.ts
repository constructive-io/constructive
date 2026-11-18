// TEMPORARY partial copy for the headless host, until the pipeline port lands
// on feat/agentic-fast-app. It declares only the shape of the desktop's
// DevServerManager (src/main/fast-app/dev-server.ts) that host.ts names; the
// port's full file, with the class itself, replaces it.

export type DevServerInfo = { url: string; port: number; reused: boolean };

export type EnsureOptions = {
  preferredPort?: number;
  signal?: AbortSignal;
  fresh?: boolean;
};

export declare class DevServerManager {
  constructor(pidFile?: string);
  reapOrphans(): void;
  url(appDir: string): string | null;
  log(appDir: string): string;
  ensure(appDir: string, options?: EnsureOptions): Promise<DevServerInfo>;
  stop(appDir: string): void;
  killAll(): void;
}
