// Minimal stub types for the implicit "rimraf" type library.
// This satisfies TypeScript when a config or tool references
// the "rimraf" types, without pulling in an external package.

declare module 'rimraf' {
  type RimrafCallback = (err: Error | null) => void;

  function rimraf(path: string, callback: RimrafCallback): void;
  function rimraf(path: string, options: any, callback: RimrafCallback): void;

  namespace rimraf {
    function sync(path: string, options?: any): void;
  }

  export = rimraf;
}

