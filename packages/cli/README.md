# Constructive CLI

> API Server and Development Tools for PostgreSQL

Constructive CLI provides GraphQL server capabilities and code generation tools for PostgreSQL databases. For database migrations, packages, and deployment operations, use [pgpm](https://pgpm.io).

## Installation

```bash
npm install -g @constructive-io/cli
```

## Commands

### `cnc server`

Start the GraphQL development server.

```bash
# Start with defaults (port 5555)
cnc server

# Custom port and options
cnc server --port 8080 --no-postgis

# With custom CORS origin
cnc server --origin http://localhost:3000
```

**Options:**

- `--port <number>` - Server port (default: 5555)
- `--origin <url>` - CORS origin URL
- `--simpleInflection` - Use simple inflection (default: true)
- `--oppositeBaseNames` - Use opposite base names (default: false)
- `--postgis` - Enable PostGIS extension (default: true)
- `--metaApi` - Enable Meta API (default: true)

### `cnc explorer`

Launch GraphiQL explorer for your API.

```bash
# Launch explorer
cnc explorer

# With custom CORS origin
cnc explorer --origin http://localhost:3000
```

**Options:**

- `--port <number>` - Server port (default: 5555)
- `--origin <url>` - CORS origin URL (default: http://localhost:3000)
- `--simpleInflection` - Use simple inflection (default: true)
- `--oppositeBaseNames` - Use opposite base names (default: false)
- `--postgis` - Enable PostGIS extension (default: true)

### `cnc codegen`

Generate TypeScript types, operations, and SDK from a GraphQL schema or endpoint.

```bash
# Generate React Query hooks from endpoint
cnc codegen --endpoint http://localhost:5555/graphql --output ./codegen --react-query

# Generate ORM client from endpoint
cnc codegen --endpoint http://localhost:5555/graphql --output ./codegen --orm

# Generate both React Query hooks and ORM client
cnc codegen --endpoint http://localhost:5555/graphql --output ./codegen --react-query --orm

# From schema file
cnc codegen --schema-file ./schema.graphql --output ./codegen --react-query

# From database with schemas
cnc codegen --schemas public,app_public --output ./codegen --react-query

# From database with API names
cnc codegen --api-names my_api --output ./codegen --orm
```

**Options:**

- `--config <path>` - Path to config file
- `--endpoint <url>` - GraphQL endpoint URL
- `--schema-file <path>` - Path to GraphQL schema file
- `--schemas <list>` - Comma-separated PostgreSQL schemas
- `--api-names <list>` - Comma-separated API names
- `--react-query` - Generate React Query hooks
- `--orm` - Generate ORM client
- `--output <dir>` - Output directory (default: ./codegen)
- `--authorization <token>` - Authorization header value
- `--dry-run` - Preview without writing files
- `--verbose` - Verbose output

### `cnc get-graphql-schema`

Fetch or build GraphQL schema SDL.

```bash
# From database schemas
cnc get-graphql-schema --database mydb --schemas myapp,public --out ./schema.graphql

# From running server
cnc get-graphql-schema --endpoint http://localhost:3000/graphql --out ./schema.graphql
```

**Options:**

- `--database <name>` - Database name (for programmatic builder)
- `--schemas <list>` - Comma-separated schemas to include (required unless using --endpoint)
- `--endpoint <url>` - GraphQL endpoint to fetch schema via introspection
- `--headerHost <host>` - Optional Host header for endpoint requests
- `--auth <token>` - Optional Authorization header value
- `--header "Name: Value"` - Optional HTTP header (repeatable)
- `--out <path>` - Output file path (prints to stdout if omitted)

## Configuration

### Environment Variables

Constructive respects standard PostgreSQL environment variables:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=myapp
export PGUSER=postgres
export PGPASSWORD=password
```

## Database Operations

For database migrations, packages, and deployment, use **pgpm**:

```bash
npm install -g pgpm
```

Common pgpm commands:

- `pgpm init workspace` - Initialize a new workspace
- `pgpm init` - Create a new module
- `pgpm add <change>` - Add a database change
- `pgpm deploy` - Deploy database changes
- `pgpm verify` - Verify database state
- `pgpm revert` - Revert database changes

See the [pgpm documentation](https://pgpm.io) for more details.

## Getting Help

```bash
# Global help
cnc --help

# Command-specific help
cnc server --help
cnc codegen -h
```

## Global Options

- `--help, -h` - Show help information
- `--version, -v` - Show version information
- `--cwd <dir>` - Set working directory
