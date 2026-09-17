// parse-package-name ships types only for its `require` entry; its `import`
// entry (dist/index.mjs) is untyped, so declare the API for both builds.
declare module 'parse-package-name' {
  export function parse(input: string): {
    name: string;
    version: string;
    path: string;
  };
}
