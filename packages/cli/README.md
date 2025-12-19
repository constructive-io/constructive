# Constructive CLI

> Build secure, role-aware GraphQL backends powered by PostgreSQL with database-first development

Constructive CLI is a comprehensive command-line tool that transforms your PostgreSQL database into a powerful GraphQL API. With automated schema generation, sophisticated migration management, and robust deployment capabilities, you can focus on building great applications instead of boilerplate code.

## ✨ Features

- 🚀 **Database-First Development** - Design your database, get your GraphQL API automatically
- 🔐 **Built-in Security** - Role-based access control and security policies
- 📦 **Module System** - Reusable database modules with dependency management
- 🛠️ **Developer Experience** - Hot-reload development server with GraphiQL explorer
- 🏗️ **Production Ready** - Deployment plans, versioning, and rollback support

## 🚀 Quick Start

### Installation

```bash
npm install -g @constructive-io/cli
```

### Create Your First Project

```bash
# Initialize a new workspace
constructive init workspace
cd my-project

# Create your first module
constructive init

# Deploy to your database
constructive deploy --createdb

# Start the development server
constructive server
```

Visit `http://localhost:5555` to explore your GraphQL API!

## 📖 Core Concepts

### Workspaces and Modules

- **Workspace**: A collection of related database modules
- **Module**: A self-contained database package with migrations, functions, and types
- **Dependencies**: Modules can depend on other modules, creating reusable building blocks

### Database-First Workflow

1. **Design** your database schema using SQL migrations
2. **Deploy** changes with `constructive deploy`
3. **Develop** against the auto-generated GraphQL API
4. **Version** and **package** your modules for distribution

## 🛠️ Commands

### Getting Started

#### `constructive init`

Initialize a new Constructive workspace or module.

```bash
# Create a new workspace
constructive init workspace

# Create a new module (run inside workspace)
constructive init

# Use templates from GitHub repository (defaults to constructive-io/pgpm-boilerplates.git)
constructive init workspace --repo owner/repo
constructive init --repo owner/repo --from-branch develop

# Use templates from custom paths
constructive init workspace --template-path ./custom-templates
constructive init --template-path ./custom-templates/module
```

**Options:**

- `--repo <repo>` - Template repo (default: `https://github.com/constructive-io/pgpm-boilerplates.git`)
- `--template-path <path>` - Template sub-path (defaults to `workspace`/`module`) or local path override
- `--from-branch <branch>` - Branch/tag when cloning the template repo

Templates are cached for one week under the `pgpm` tool namespace. Run `constructive cache clean` if you need to refresh the boilerplates.

### Development

#### `constructive server`

Start the GraphQL development server with hot-reload.

```bash
# Start with defaults (port 5555)
constructive server

# Custom port and options
constructive server --port 8080 --no-postgis
```

#### `constructive explorer`

Launch GraphiQL explorer for your API.

```bash
# Launch explorer
constructive explorer

# With custom CORS origin
constructive explorer --origin http://localhost:3000
```

## 🔄 Updates

The CLI performs a lightweight npm version check at most once per week (skipped in CI or when `PGPM_SKIP_UPDATE_CHECK` is set). Use `constructive update` to install the latest release (installs `pgpm` by default; pass `--package @constructive-io/cli` to target the CLI package).

### Database Operations

#### `constructive deploy`

Deploy your database changes and migrations.

```bash
# Deploy to selected database
constructive deploy

# Create database if it doesn't exist
constructive deploy --createdb

# Deploy specific package to a tag
constructive deploy --package mypackage --to @v1.0.0

# Fast deployment without transactions
constructive deploy --fast --no-tx
```

#### `constructive verify`

Verify your database state matches expected migrations.

```bash
# Verify current state
constructive verify

# Verify specific package
constructive verify --package mypackage
```

#### `constructive revert`

Safely revert database changes.

```bash
# Revert latest changes
constructive revert

# Revert to specific tag
constructive revert --to @v1.0.0
```

### Migration Management

#### `constructive migrate`

Comprehensive migration management.

```bash
# Initialize migration tracking
constructive migrate init

# Check migration status
constructive migrate status

# List all changes
constructive migrate list

# Show change dependencies
constructive migrate deps
```

### Module Management

#### `constructive install`

Install PGPM modules as dependencies.

```bash
# Install single package
constructive install @constructive-io/auth

# Install multiple packages
constructive install @constructive-io/auth @constructive-io/utils
```

#### `constructive extension`

Interactively manage module dependencies.

```bash
constructive extension
```

#### `constructive tag`

Version your changes with tags.

```bash
# Tag latest change
constructive tag v1.0.0

# Tag with comment
constructive tag v1.0.0 --comment "Initial release"

# Tag specific change
constructive tag v1.1.0 --package mypackage --changeName my-change
```

### Packaging and Distribution

#### `constructive plan`

Generate deployment plans for your modules.

```bash
constructive plan
```

#### `constructive package`

Package your module for distribution.

```bash
# Package with defaults
constructive package

# Package without deployment plan
constructive package --no-plan
```

### Utilities

#### `constructive export`

Export migrations from existing databases.

```bash
constructive export
```

#### `constructive kill`

Clean up database connections and optionally drop databases.

```bash
# Kill connections and drop databases
constructive kill

# Only kill connections
constructive kill --no-drop
```

## 💡 Common Workflows

### Starting a New Project

```bash
# 1. Create workspace
mkdir my-app && cd my-app
constructive init workspace

# 2. Create your first module
constructive init

# 3. Add some SQL migrations to sql/ directory
# 4. Deploy to database
constructive deploy --createdb

# 5. Start developing
constructive server
```

### Using Custom Templates

You can use custom templates from GitHub repositories or local paths:

```bash
# Initialize workspace with templates from GitHub
constructive init workspace --repo owner/repo

# Initialize workspace with templates from local path
constructive init workspace --template-path ./my-custom-templates

# Initialize module with custom templates
constructive init --template-path ./my-custom-templates

# Use specific branch from GitHub repository
constructive init workspace --repo owner/repo --from-branch develop
```

**Template Structure:**
Custom templates should follow the same structure as the default templates:

- For workspace: `boilerplates/workspace/` directory
- For module: `boilerplates/module/` directory
- Or provide direct path to `workspace/` or `module/` directory

### Working with Existing Projects

```bash
# 1. Clone and enter project
git clone <repo> && cd <project>

# 2. Install dependencies
constructive install

# 3. Deploy to local database
constructive deploy --createdb

# 4. Start development server
constructive server
```

### Production Deployment

```bash
# 1. Create deployment plan
constructive plan

# 2. Package module
constructive package

# 3. Deploy to production
constructive deploy --package myapp --to @production

# 4. Verify deployment
constructive verify --package myapp
```

### Get Graphql Schema

Fetch and output your GraphQL schema in SDL.

  - Option 1 – Programmatic builder (from database schemas):
  - Write to file:
    - `constructive get-graphql-schema --database constructive --schemas myapp,public --out ./schema.graphql`
  - Print to stdout:
    - `constructive get-graphql-schema --database constructive --schemas myapp,public`

  - Option 2 – Fetch from running server (via endpoint introspection):
  - Write to file:
    - `constructive get-graphql-schema --endpoint http://localhost:3000/graphql --headerHost meta8.localhost --out ./schema.graphql`
  - Print to stdout:
    - `constructive get-graphql-schema --endpoint http://localhost:3000/graphql --headerHost meta8.localhost`

Options:
- `--database <name>` (Option 1)
- `--schemas <list>` (Option 1; comma-separated)
- `--endpoint <url>` (Option 2)
- `--headerHost <hostname>` (Option 2; optional custom HTTP Host header for vhost-based local setups)
- `--auth <token>` (Option 2; optional; sets Authorization header)
- `--header <name: value>` (Option 2; optional; repeatable; adds request headers, last value wins on duplicates)
- `--out <path>` (optional; if omitted, prints to stdout)

Notes:
- If your local dev server routes by hostname (e.g., `meta8.localhost`), but is reachable at `http://localhost:<port>`, use:
  - `constructive get-graphql-schema --endpoint http://localhost:3000/graphql --headerHost meta8.localhost`
- You can repeat `--header` to add multiple headers, e.g.: `--header 'X-Mode: fast' --header 'Authorization: Bearer abc123'`

Tip:
- For Option 1, include only the schemas you need (e.g., `myapp,public`) to avoid type naming conflicts when multiple schemas contain similarly named tables.


## ⚙️ Configuration

### Environment Variables

Constructive respects standard PostgreSQL environment variables:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=myapp
export PGUSER=postgres
export PGPASSWORD=password
```

## 🆘 Getting Help

### Command Help

```bash
# Global help
constructive --help

# Command-specific help
constructive deploy --help
constructive server -h
```

### Common Options

Most commands support these global options:

- `--help, -h` - Show help information
- `--version, -v` - Show version information
- `--cwd <dir>` - Set working directory
### Codegen

Generate types, operations, and SDK from a schema or endpoint.

```bash
# From SDL file
constructive codegen --schema ./schema.graphql --out ./codegen

# From endpoint with Host override
constructive codegen --endpoint http://localhost:3000/graphql --headerHost meta8.localhost --out ./codegen
```

Options:
- `--schema <path>` or `--endpoint <url>`
- `--out <dir>` output root (default: `graphql/codegen/dist`)
- `--format <gql|ts>` documents format
- `--convention <dashed|underscore|camelcase|camelUpper>` filenames
- `--headerHost <host>` optional HTTP Host header for endpoint requests
- `--auth <token>` Authorization header value (e.g., `Bearer 123`)
- `--header "Name: Value"` repeatable headers
- `--emitTypes <bool>` `--emitOperations <bool>` `--emitSdk <bool>` `--emitReactQuery <bool>`
- `--config ./config.json` Use customized config file 


Config file (JSON/YAML):

```bash
# Use a JSON config to override defaults
constructive codegen --config ./my-options.json
```

Example `my-options.json`:

```json
{
  "input": {
    "schema": "./schema.graphql",
    "headers": { "Host": "meta8.localhost" }
  },
  "output": {
    "root": "graphql/codegen/dist/codegen-config",
    "reactQueryFile": "react-query.ts"
  },
  "documents": {
    "format": "gql",
    "convention": "dashed",
    "excludePatterns": [".*Module$", ".*By.+And.+$"]
  },
  "features": {
    "emitTypes": true,
    "emitOperations": true,
    "emitSdk": true,
    "emitReactQuery": true
  },
  "reactQuery": {
    "fetcher": "graphql-request"
  }
}
```
