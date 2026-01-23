declare module '12factor-env' {
  export function str(): unknown;
  export function email(): unknown;
  export function host(): unknown;
  export function env<R extends Record<string, unknown>, O extends Record<string, unknown>>(
    processEnv: NodeJS.ProcessEnv,
    required: R,
    optional?: O
  ): { [K in keyof R]: string } & { [K in keyof O]?: string };
}
