# 🚀 Quickstart: Constructive CLI Basics

Constructive is different from PGPM in that it ships with a GraphQL server and explorer. All PGPM commands are available under `constructive`, but `pgpm` does not include `server` or `explorer`.

### 1. Install the CLI

Make sure you have the Constructive CLI available:

```bash
npm install -g @constructive-io/cli
```

### 2. Initialize a workspace

Generate a workspace along with its default services configuration:

```bash
cnc init workspace # then enter workspace name
cd myworkspace
```

### 3. Run Postgres locally

The workspace includes a docker-compose.yml you can use to start Postgres and supporting services:

```bash
docker-compose up -d
```

If you already have Postgres installed locally, just ensure it is running and accessible.

### 4. Create a module & add changes

```bash
cnc init
cd packages/mymodule

# Add schema
cnc add --change schemas/myschema

# Add table (depends on schema)
cnc add --change schemas/myschema/tables/mytable --requires schemas/myschema
```

### 5. Example generated SQL

`deploy/schemas/myschema.sql`

```sql
-- Deploy: schemas/myschema to pg
-- made with <3 @ constructive.io
CREATE SCHEMA myschema;
```

`deploy/schemas/myschema/tables/mytable.sql`

```sql
-- Deploy: schemas/myschema/tables/mytable to pg
-- made with <3 @ constructive.io
-- requires: schemas/myschema

CREATE TABLE myschema.mytable (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);
```

### 6. Deploy to Postgres

```bash
cnc deploy --database testdb --createdb --yes
```

**Sample output highlights:**

* Creates database `testdb`
* Installs declared extensions (`citext`, `pgcrypto`)
* Initializes migration schema
* Deploys schema + table successfully

```
[deploy] SUCCESS: 🚀 Starting deployment to database testdb...
[migrate] SUCCESS: Successfully deployed: schemas/myschema
[migrate] SUCCESS: Successfully deployed: schemas/myschema/tables/mytable
[deploy] SUCCESS: ✅ Deployment complete for mymodule.
```

### 7. Explore

```bash
cnc explorer
```

http://localhost:5555/graphiql (default)
http://myschema.testdb.localhost:5555/graphiql (specific to a schema)


### 8. Server

```bash
cnc server
```
