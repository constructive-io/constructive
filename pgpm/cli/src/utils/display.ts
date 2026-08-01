export const usageText = `
  Usage: pgpm <command> [options]

  Core Database Operations:
    add                Add database changes to plans and create SQL files
    deploy             Deploy database changes and migrations
    verify             Verify database state and migrations
    revert             Revert database changes and migrations

  Project Management:
    init               Initialize workspace or module
    extension          Manage module dependencies
    plan               Generate module deployment plans
    regen              Generate revert/verify scripts from deploy scripts
    transform          Re-dial a module through the dials pipeline (granularity/naming/partition)
    import             pgpm-itize an arbitrary SQL dump into a deployable module
    diff               Identity-keyed semantic diff between two schema sources (+ migration generation)
    package            Package module for distribution
    materialize        Transpile an apply proxy into a plain, committed module
    sync-versions      Sync .control/Makefile/sql metadata to package.json versions
    export             Export database migrations from existing databases
    update             Update pgpm to the latest version
    cache              Manage cached templates (clean)
    upgrade            Upgrade installed pgpm modules to latest versions (alias: up)

  Database Administration:
    dump               Dump a database to a sql file
    kill               Terminate database connections and optionally drop databases
    install            Install database modules
    tag                Add tags to changes for versioning
    clear              Clear database state
    remove             Remove database changes
    analyze            Analyze database structure
    rename             Rename database changes
    admin-users        Manage admin users
    tune               Tune PostgreSQL for throwaway environments (CI/test)

  Testing:
    test-packages      Run integration tests on all workspace packages

  Migration Tools:
    migrate            Migration management subcommands
      init             Initialize migration tracking
      status           Show migration status
      list             List all changes
      deps             Show change dependencies
  
  Development Tools:
    docker             Manage Docker containers (start/stop/ls, --minio)
    doctor             Check local dependencies (node, docker, psql) with install guidance
    env                Manage environment variables (--supabase, --minio)
    test-packages      Run integration tests on workspace packages
  
  Global Options:
    -h, --help         Display this help information
    -v, --version      Display version information
    --cwd <directory>  Working directory (default: current directory)
    --engine <name>    Migration backend: pg (default, Postgres server) or
                       pglite (in-process WASM Postgres, no server). Also set by
                       the "engine" key of pgpm.json or PGPM_ENGINE.
    --driver <pkg>     Driver plugin package backing the engine (escape hatch)
    --pglite[=dataDir] Sugar for --engine pglite, persisted to <dataDir> if given

  Individual Command Help:
    pgpm <command> --help    Display detailed help for specific command
    pgpm <command> -h        Display detailed help for specific command

  Examples:
    pgpm deploy --help       Show deploy command options
    pgpm init workspace      Initialize new workspace
    pgpm install @pgpm/base32  Install a database module
  `;
