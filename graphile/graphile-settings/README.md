# graphile-settings

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/graphile-settings">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-settings%2Fpackage.json"/>
  </a>
</p>

**`graphile-settings`** is a batteries-included configuration builder for [PostGraphile](https://www.graphile.org/postgraphile/), purpose-built for the Constructive ecosystem. It centralizes plugin setup, schema wiring, and feature flags into a single, composable interface — enabling consistent, high-performance GraphQL APIs across projects.

## 🚀 Installation

```bash
npm install graphile-settings
```

## ✨ Features

* Built-in support for:

  * ✅ Connection filters
  * 🔍 Full-text search
  * 🌍 PostGIS support (with filters)
  * 🧩 Many-to-many helpers
  * 🆎 Simplified inflectors
  * 🗂 Upload field support (S3/MinIO)
  * 🌐 i18n support via `graphile-i18n`
  * 🧠 Meta schema plugin
  * 🔎 Graphile search plugin
* Smart schema and plugin configuration via environment or options
* Express-compatible with support for request-aware context

## 📦 Usage

### PostGraphile v5 with ConstructivePreset

```ts
import { ConstructivePreset, makePgService } from 'graphile-settings';
import { postgraphile } from 'postgraphile';
import { grafserv } from 'grafserv/express/v4';
import express from 'express';

const app = express();

// Create a v5 preset with ConstructivePreset
const preset = {
  extends: [ConstructivePreset],
  pgServices: [
    makePgService({
      connectionString: 'postgres://user:pass@localhost/mydb',
      schemas: ['app_public'],
    }),
  ],
  grafast: {
    explain: process.env.NODE_ENV === 'development',
  },
};

// Create PostGraphile instance
const pgl = postgraphile(preset);
const serv = pgl.createServ(grafserv);

// Add to Express
const httpServer = require('http').createServer(app);
serv.addTo(app, httpServer);

httpServer.listen(5000);
```

### Building Schema Directly (for codegen, testing, etc.)

```ts
import { ConstructivePreset, makePgService } from 'graphile-settings';
import { makeSchema } from 'graphile-build';
import { printSchema } from 'graphql';

const preset = {
  extends: [ConstructivePreset],
  pgServices: [
    makePgService({
      connectionString: 'postgres://user:pass@localhost/mydb',
      schemas: ['app_public'],
    }),
  ],
};

const { schema } = await makeSchema(preset);
const sdl = printSchema(schema);
```

## 🧰 Configuration Options

### `ConstructiveOptions`

#### `server`

* `port` — (number) Port to use
* `host` — (string) Hostname
* `trustProxy` — (boolean) Whether to trust proxy headers (e.g. for real IPs)
* `origin` — (string) Origin for CORS/auth logic
* `strictAuth` — (boolean) Whether to enforce strict auth

#### `graphile`

* `schema` — (string or string\[]) Required list of main GraphQL schemas
* `metaSchemas` — (string\[]) Optional list of meta/introspection schemas
* `isPublic` — (boolean) Flag for public GraphQL instance
* `appendPlugins` — (Plugin\[]) Additional Graphile plugins
* `graphileBuildOptions` — (PostGraphileOptions.graphileBuildOptions) Extra build options
* `overrideSettings` — (Partial<PostGraphileOptions>) Manual overrides of generated config

#### `features`

* `simpleInflection` — Use simplified inflection (e.g. `fooByBarId`)
* `oppositeBaseNames` — Enable smart reverse relation names
* `postgis` — Enable PostGIS and filter plugin

#### `cdn`

* `bucketName` — Required for upload plugin (S3 or MinIO)
* `awsRegion` — AWS region
* `awsAccessKey` — Access key for upload
* `awsSecretKey` — Secret key
* `minioEndpoint` — Optional override for MinIO compatibility

## 🔌 Included Plugins

* `graphile-plugin-connection-filter`
* `graphile-plugin-fulltext-filter`
* `graphile-postgis`
* `graphile-plugin-connection-filter-postgis`
* `graphile-simple-inflector`
* `graphile-i18n`
* `graphile-meta-schema`
* `@graphile-contrib/pg-many-to-many`
* `graphile-search-plugin`
* `graphile-pg-type-mappings`
