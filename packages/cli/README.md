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
cnc init workspace
cd my-project

# Create your first module
cnc init

# Deploy to your database
cnc deploy --createdb

# Start the development server
cnc server
```

Visit `http://localhost:5555` to explore your GraphQL API!

## 📖 Core Concepts

### Workspaces and Modules

- **Workspace**: A collection of related database modules
- **Module**: A self-contained database package with migrations, functions, and types
- **Dependencies**: Modules can depend on other modules, creating reusable building blocks

### Database-First Workflow

1. **Design** your database schema using SQL migrations
2. **Deploy** changes with `cnc deploy`
3. **Develop** against the auto-generated GraphQL API
4. **Version** and **package** your modules for distribution

## 🛠️ Commands

### Getting Started

#### `cnc init`

Initialize a new Constructive workspace or module.

```bash
# Create a new workspace
cnc init workspace

# Create a new module (run inside workspace)
cnc init

# Use templates from GitHub repository (defaults to constructive-io/pgpm-boilerplates.git)
cnc init workspace --repo owner/repo
cnc init --repo owner/repo --from-branch develop

# Use templates from custom paths
cnc init workspace --template-path ./custom-templates
cnc init --template-path ./custom-templates/module
```

**Options:**

- `--repo <repo>` - Template repo (default: `https://github.com/constructive-io/pgpm-boilerplates.git`)
- `--template-path <path>` - Template sub-path (defaults to `workspace`/`module`) or local path override
- `--from-branch <branch>` - Branch/tag when cloning the template repo

Templates are cached for one week under the `pgpm` tool namespace. Run `cnc cache clean` if you need to refresh the boilerplates.

### Development

#### `cnc server`

Start the GraphQL development server with hot-reload.

```bash
# Start with defaults (port 5555)
cnc server

# Custom port and options
cnc server --port 8080 --no-postgis

# With custom CORS origin
cnc server --origin http://localhost:3000
```

#### `cnc explorer`

Launch GraphiQL explorer for your API.

```bash
# Launch explorer
cnc explorer

# With custom CORS origin
cnc explorer --origin http://localhost:3000
```

#### `cnc docker`

Manage PostgreSQL Docker containers for local development.

```bash
# Start PostgreSQL container
cnc docker start

# Stop PostgreSQL container
cnc docker stop
```

#### `cnc env`

Display environment configuration for PostgreSQL connection.

```bash
# Print environment variables for shell export
cnc env

# Use with eval to set environment
eval "$(cnc env)"

# Print Supabase local development environment
cnc env --supabase
```

## 🔄 Updates

The CLI performs a lightweight npm version check at most once per week (skipped in CI or when `PGPM_SKIP_UPDATE_CHECK` is set). Use `cnc update` to install the latest release (installs `pgpm` by default; pass `--package @constructive-io/cli` to target the CLI package).

### Database Operations

#### `cnc deploy`

Deploy your database changes and migrations.

```bash
# Deploy to selected database
cnc deploy

# Create database if it doesn't exist
cnc deploy --createdb

# Deploy specific package to a tag
cnc deploy --package mypackage --to @v1.0.0

# Fast deployment without transactions
cnc deploy --fast --no-tx
```

#### `cnc verify`

Verify your database state matches expected migrations.

```bash
# Verify current state
cnc verify

# Verify specific package
cnc verify --package mypackage
```

#### `cnc revert`

Safely revert database changes.

```bash
# Revert latest changes
cnc revert

# Revert to specific tag
cnc revert --to @v1.0.0
```

### Migration Management

#### `cnc migrate`

Comprehensive migration management.

```bash
# Initialize migration tracking
cnc migrate init

# Check migration status
cnc migrate status

# List all changes
cnc migrate list

# Show change dependencies
cnc migrate deps
```

### Module Management

#### `cnc install`

Install PGPM modules as dependencies.

```bash
# Install single package
cnc install @constructive-io/auth

# Install multiple packages
cnc install @constructive-io/auth @constructive-io/utils
```

#### `cnc extension`

Interactively manage module dependencies.

```bash
cnc extension
```

#### `cnc upgrade-modules`

Upgrade installed pgpm modules to their latest versions from npm.

```bash
# Interactive selection of modules to upgrade
cnc upgrade-modules

# Upgrade all installed modules without prompting
cnc upgrade-modules --all

# Preview available upgrades without making changes
cnc upgrade-modules --dry-run

# Upgrade specific modules
cnc upgrade-modules --modules @pgpm/base32,@pgpm/faker

# Upgrade modules across all packages in the workspace
cnc upgrade-modules --workspace --all
```

**Options:**

- `--all` - Upgrade all modules without prompting
- `--dry-run` - Show what would be upgraded without making changes
- `--modules <names>` - Comma-separated list of specific modules to upgrade
- `--workspace` - Upgrade modules across all packages in the workspace
- `--cwd <directory>` - Working directory (default: current directory)

#### `cnc tag`

Version your changes with tags.

```bash
# Tag latest change
cnc tag v1.0.0

# Tag with comment
cnc tag v1.0.0 --comment "Initial release"

# Tag specific change
cnc tag v1.1.0 --package mypackage --changeName my-change
```

### Packaging and Distribution

#### `cnc plan`

Generate deployment plans for your modules.

```bash
cnc plan
```

#### `cnc package`

Package your module for distribution.

```bash
# Package with defaults
cnc package

# Package without deployment plan
cnc package --no-plan
```

### Utilities

#### `cnc add`

Add a new database change to your module.

```bash
# Add a new change
cnc add my_change

# Add with specific type
cnc add my_function --type function
```

#### `cnc export`

Export migrations from existing databases.

```bash
cnc export
```

#### `cnc kill`

Clean up database connections and optionally drop databases.

```bash
# Kill connections and drop databases
cnc kill

# Only kill connections
cnc kill --no-drop
```

#### `cnc clear`

Clear database state.

```bash
cnc clear
```

#### `cnc remove`

Remove database changes.

```bash
cnc remove my_change
```

#### `cnc analyze`

Analyze database structure.

```bash
cnc analyze
```

#### `cnc rename`

Rename database changes.

```bash
cnc rename old_name new_name
```

#### `cnc admin-users`

Manage admin users for your database.

```bash
# Bootstrap admin users
cnc admin-users bootstrap

# Add an admin user
cnc admin-users add

# Remove an admin user
cnc admin-users remove
```

### Testing

#### `cnc test-packages`

Run integration tests on all modules in a workspace. Creates a temporary database for each module, deploys, and optionally runs verify/revert/deploy cycles.

```bash
# Test all modules in workspace (deploy only)
cnc test-packages

# Run full deploy/verify/revert/deploy cycle
cnc test-packages --full-cycle

# Continue testing all packages even after failures
cnc test-packages --continue-on-fail

# Exclude specific modules
cnc test-packages --exclude my-module,another-module

# Combine options
cnc test-packages --full-cycle --continue-on-fail --exclude legacy-module
```

**Options:**

- `--full-cycle` - Run full deploy/verify/revert/deploy cycle (default: deploy only)
- `--continue-on-fail` - Continue testing all packages even after failures (default: stop on first failure)
- `--exclude <modules>` - Comma-separated module names to exclude
- `--cwd <directory>` - Working directory (default: current directory)

**Notes:**

- Discovers modules from workspace `pgpm.json` configuration
- Creates isolated test databases (`test_<module_name>`) for each module
- Automatically cleans up test databases after each test
- Uses internal APIs for deploy/verify/revert operations

## 💡 Common Workflows

### Starting a New Project

```bash
# 1. Create workspace
mkdir my-app && cd my-app
cnc init workspace

# 2. Create your first module
cnc init

# 3. Add some SQL migrations to sql/ directory
# 4. Deploy to database
cnc deploy --createdb

# 5. Start developing
cnc server
```

### Using Custom Templates

You can use custom templates from GitHub repositories or local paths:

```bash
# Initialize workspace with templates from GitHub
cnc init workspace --repo owner/repo

# Initialize workspace with templates from local path
cnc init workspace --template-path ./my-custom-templates

# Initialize module with custom templates
cnc init --template-path ./my-custom-templates

# Use specific branch from GitHub repository
cnc init workspace --repo owner/repo --from-branch develop
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
cnc install

# 3. Deploy to local database
cnc deploy --createdb

# 4. Start development server
cnc server
```

### Production Deployment

```bash
# 1. Create deployment plan
cnc plan

# 2. Package module
cnc package

# 3. Deploy to production
cnc deploy --package myapp --to @production

# 4. Verify deployment
cnc verify --package myapp
```

### Get Graphql Schema

Fetch and output your GraphQL schema in SDL.

  - Option 1 – Programmatic builder (from database schemas):
  - Write to file:
    - `cnc get-graphql-schema --database constructive --schemas myapp,public --out ./schema.graphql`
  - Print to stdout:
    - `cnc get-graphql-schema --database constructive --schemas myapp,public`

  - Option 2 – Fetch from running server (via endpoint introspection):
  - Write to file:
    - `cnc get-graphql-schema --endpoint http://localhost:3000/graphql --headerHost meta8.localhost --out ./schema.graphql`
  - Print to stdout:
    - `cnc get-graphql-schema --endpoint http://localhost:3000/graphql --headerHost meta8.localhost`

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
  - `cnc get-graphql-schema --endpoint http://localhost:3000/graphql --headerHost meta8.localhost`
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
cnc --help

# Command-specific help
cnc deploy --help
cnc server -h
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
cnc codegen --schema ./schema.graphql --out ./codegen

# From endpoint with Host override
cnc codegen --endpoint http://localhost:3000/graphql --headerHost meta8.localhost --out ./codegen
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
cnc codegen --config ./my-options.json
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
