import type { CommandDefinition } from '../types';

export function createUsageText(commands: CommandDefinition[]): string {
  const maxNameLength = Math.max(...commands.map((command) => command.name.length));
  const commandRows = commands
    .map((command) => `  ${command.name.padEnd(maxNameLength)}  ${command.summary}`)
    .join('\n');

  return `Constructive GraphQL Server Perf CLI

Usage:
  pnpm --dir graphql/server perf <command> [options]

Commands:
${commandRows}

Global Options:
  --dry-run   Print delegated commands without executing them
  --help, -h  Show this help

Individual Command Help:
  pnpm --dir graphql/server perf <command> --help

Examples:
  pnpm --dir graphql/server perf private-benchmark --mode new --k 2 --duration-seconds 5 --workers 1
  pnpm --dir graphql/server perf public-preflight --run-dir /tmp/constructive-perf/dbpm-smoke
  pnpm --dir graphql/server perf e2e-matrix --routing-modes private,public --cache-modes old,new --k 10 --duration-seconds 300 --workers 4 --manage-server`;
}

export function createCommandUsageText(command: CommandDefinition): string {
  if (command.usage) return command.usage;

  return `Constructive GraphQL Server Perf CLI

Command:
  perf ${command.name}

Summary:
  ${command.summary}

Usage:
  pnpm --dir graphql/server perf ${command.name} [options]

Global Options:
  --dry-run   Print delegated commands without executing them
  --help, -h  Show this help`;
}
