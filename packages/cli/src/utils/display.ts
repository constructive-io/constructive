export const usageText = `
  Usage: cnc <command> [options]
         constructive <command> [options]

  Constructive CLI - API Server and Development Tools

  GraphQL Server:
    server             Start a GraphQL server
    explorer           Launch GraphiQL explorer interface

  Code Generation:
    codegen            Generate TypeScript types and SDK from GraphQL schema
    get-graphql-schema Fetch or build GraphQL schema SDL

  Jobs:
    jobs up            Start combined server (jobs runtime)

  Global Options:
    -h, --help         Display this help information
    -v, --version      Display version information
    --cwd <directory>  Working directory (default: current directory)

  Individual Command Help:
    cnc <command> --help    Display detailed help for specific command
    cnc <command> -h        Display detailed help for specific command

  Examples:
    cnc server                        Start GraphQL server
    cnc server --port 8080            Start server on custom port
    cnc explorer                      Launch GraphiQL explorer
    cnc codegen --schema schema.graphql  Generate types from schema
    cnc get-graphql-schema --out schema.graphql  Export schema SDL
    cnc jobs up                       Start combined server (jobs runtime)

  Database Operations:
    For database migrations, packages, and deployment, use pgpm:
    https://pgpm.io
  `;
