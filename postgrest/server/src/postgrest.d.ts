declare module 'postgrest' {
  export interface PostgRESTServerConfig {
    dbUri: string;
    dbSchema: string;
    serverPort: number;
    dbAnonRole: string;
    jwtSecret?: string;
    maxRows?: number;
    preRequest?: string;
    [key: string]: any;
  }

  export interface PostgRESTServer {
    stop(): void;
    handle(req: any, context?: Record<string, string>): Promise<{
      status?: number;
      headers?: Record<string, string>;
      body?: any;
    }>;
  }

  export function startServer(config: PostgRESTServerConfig | string): PostgRESTServer;

  const postgrest: {
    startServer: typeof startServer;
  };

  export default postgrest;
}
