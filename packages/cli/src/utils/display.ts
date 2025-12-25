export const usageText = `
  Usage: cnc <command> [options]
         constructive <command> [options]

  Core Database Operations:
    add                Add database changes to plans and create SQL files
    deploy             Deploy database changes and migrations
    verify             Verify database state and migrations
    revert             Revert database changes and migrations

  Project Management:
    init               Initialize pgpm workspace or module
    extension          Manage module dependencies
    plan               Generate module deployment plans
    package            Package module for distribution
    update             Update CLI/pgpm (installs pgpm by default)
    cache              Manage cached templates (clean)
    upgrade-modules    Upgrade installed pgpm modules to latest versions

  Development Tools:
    server             Start a GraphQL server
    explorer           Launch GraphiQL explorer interface
    docker             Manage PostgreSQL Docker containers (start/stop)
    export             Export database migrations from existing databases
    env                Display environment configuration

  Code Generation:
    codegen            Generate TypeScript types and SDK from GraphQL schema
    get-graphql-schema Fetch or build GraphQL schema SDL

  Database Administration:
    kill               Terminate database connections and optionally drop databases
    install            Install pgpm modules
    tag                Add tags to changes for versioning
    clear              Clear database state
    remove             Remove database changes
    analyze            Analyze database structure
    rename             Rename database changes
    admin-users        Manage admin users

  Testing:
    test-packages      Run integration tests on all workspace packages

  Migration Tools:
    migrate            Migration management subcommands
      init             Initialize migration tracking
      status           Show migration status
      list             List all changes
      deps             Show change dependencies

  Global Options:
    -h, --help         Display this help information
    -v, --version      Display version information
    --cwd <directory>  Working directory (default: current directory)

  Individual Command Help:
    constructive <command> --help    Display detailed help for specific command
    constructive <command> -h        Display detailed help for specific command

  Examples:
    cnc deploy --help       Show deploy command options
    cnc server --port 8080  Start server on port 8080
    cnc init workspace      Initialize new workspace
  `;
