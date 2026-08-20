import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const createCliEnvironment = (home) => {
  const inheritedKeys = [
    'PATH',
    'Path',
    'PATHEXT',
    'SystemRoot',
    'SYSTEMROOT',
    'ComSpec',
    'TMPDIR',
    'TMP',
    'TEMP',
  ];
  const inherited = Object.fromEntries(
    inheritedKeys.flatMap((key) =>
      process.env[key] === undefined ? [] : [[key, process.env[key]]]
    )
  );
  return {
    ...inherited,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: home,
    APPDATA: home,
    CI: 'true',
    NO_COLOR: '1',
    NO_UPDATE_NOTIFIER: '1',
    GRAPHILE_ENV: 'production',
  };
};

export const parsePackedArguments = (argv) => {
  if (
    ![2, 4].includes(argv.length) ||
    argv[0] !== '--artifacts' ||
    (argv.length === 4 && argv[2] !== '--suite')
  ) {
    throw new Error(
      'Usage: node verify-packed-artifacts.mjs --artifacts <artifact-directory> [--suite core|full]'
    );
  }

  const suite = argv[3] ?? 'full';
  if (suite !== 'core' && suite !== 'full') {
    throw new Error(`Unknown packed acceptance suite: ${suite}`);
  }

  const artifactDirectory = resolve(argv[1]);
  if (!existsSync(artifactDirectory)) {
    throw new Error(`Artifact directory does not exist: ${artifactDirectory}`);
  }

  const archives = readdirSync(artifactDirectory).filter((name) =>
    name.endsWith('.tgz')
  );
  const requiredArchives = {
    runtime: archives.filter((name) =>
      /^constructive-io-cli-runtime-[0-9].*\.tgz$/.test(name)
    ),
    cli: archives.filter((name) =>
      /^constructive-io-cli-[0-9].*\.tgz$/.test(name)
    ),
    codegen: archives.filter((name) =>
      /^constructive-io-graphql-codegen-[0-9].*\.tgz$/.test(name)
    ),
    graphqlExplorer: archives.filter((name) =>
      /^constructive-io-graphql-explorer-[0-9].*\.tgz$/.test(name)
    ),
    logger: archives.filter((name) =>
      /^pgpmjs-logger-[0-9].*\.tgz$/.test(name)
    ),
    pgCache: archives.filter((name) => /^pg-cache-[0-9].*\.tgz$/.test(name)),
    graphileSettings: archives.filter((name) =>
      /^graphile-settings-[0-9].*\.tgz$/.test(name)
    ),
    graphileCache: archives.filter((name) =>
      /^graphile-cache-[0-9].*\.tgz$/.test(name)
    ),
    bucketProvisioner: archives.filter((name) =>
      /^graphile-bucket-provisioner-plugin-[0-9].*\.tgz$/.test(name)
    ),
    graphileSchema: archives.filter((name) =>
      /^graphile-schema-[0-9].*\.tgz$/.test(name)
    ),
    presignedUrl: archives.filter((name) =>
      /^graphile-presigned-url-plugin-[0-9].*\.tgz$/.test(name)
    ),
    graphqlQuery: archives.filter((name) =>
      /^constructive-io-graphql-query-[0-9].*\.tgz$/.test(name)
    ),
    expressContext: archives.filter((name) =>
      /^constructive-io-express-context-[0-9].*\.tgz$/.test(name)
    ),
    serverUtils: archives.filter((name) =>
      /^pgpmjs-server-utils-[0-9].*\.tgz$/.test(name)
    ),
    graphqlServer: archives.filter((name) =>
      /^constructive-io-graphql-server-[0-9].*\.tgz$/.test(name)
    ),
    pgpmEnv: archives.filter((name) => /^pgpmjs-env-[0-9].*\.tgz$/.test(name)),
    pgEnv: archives.filter((name) => /^pg-env-[0-9].*\.tgz$/.test(name)),
  };

  const invalidArchives = Object.entries(requiredArchives).filter(
    ([, matches]) => matches.length !== 1
  );
  if (invalidArchives.length > 0) {
    throw new Error(
      `Expected one archive for each CNC release-set package in ${artifactDirectory}; invalid counts: ${invalidArchives.map(([name, matches]) => `${name}=${matches.length}`).join(', ')}; found: ${archives.join(', ') || '(none)'}`
    );
  }

  const selectedArchives =
    suite === 'full'
      ? archives
      : [
          ...requiredArchives.runtime,
          ...requiredArchives.cli,
          ...requiredArchives.logger,
          ...requiredArchives.serverUtils,
          ...requiredArchives.pgCache,
          ...requiredArchives.pgEnv,
          ...requiredArchives.pgpmEnv,
        ];

  return {
    suite,
    installArchives: selectedArchives
      .sort()
      .map((archive) => join(artifactDirectory, archive)),
  };
};
