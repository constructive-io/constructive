import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import { renderHelp } from './discovery';
import { CommandRegistry } from './registry';

const MANIFEST_NAME = '.constructive-cli-docs.json';
const MANIFEST_FORMAT = 1;

export interface GenerateDocumentationOptions {
  toolName?: string;
  toolVersion: string;
  skillName?: string;
}

export interface GeneratedDocumentation {
  files: Readonly<Record<string, string>>;
  generator: {
    package: '@constructive-io/cli-runtime';
    tool: string;
    toolVersion: string;
    protocolVersion: 'constructive.dev/cli/v1';
  };
}

interface OwnershipManifest {
  format: number;
  generator: GeneratedDocumentation['generator'];
  files: Record<string, string>;
}

export type DocumentationPlanAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'unchanged'
  | 'conflict';

export interface DocumentationPlanEntry {
  path: string;
  action: DocumentationPlanAction;
  previousHash?: string;
  desiredHash?: string;
}

export interface DocumentationExportPlan {
  target: string;
  fingerprint: string;
  entries: DocumentationPlanEntry[];
  conflicts: string[];
  documentation: GeneratedDocumentation;
}

export interface DocumentationExportResult {
  plan: DocumentationExportPlan;
  applied: boolean;
}

function hash(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeRelativePath(value: string): string {
  if (
    value.length === 0 ||
    value === MANIFEST_NAME ||
    isAbsolute(value) ||
    value.split(/[\\/]/).includes('..')
  ) {
    throw new Error(`Unsafe generated path "${value}".`);
  }
  return value.replace(/\\/g, '/');
}

function commandPage(
  registry: CommandRegistry,
  commandId: string,
  toolName: string
): string {
  const command = registry.requireById(commandId);
  const schemaPath = `../schemas/${command.id}.json`;
  const lines = [
    `# ${toolName} ${command.path.join(' ')}`,
    '',
    command.summary,
    ...(command.description === undefined ? [] : ['', command.description]),
    '',
    '```text',
    renderHelp(registry, command.path, toolName).trimEnd(),
    '```',
    '',
    `Machine contract: [${command.id}](${schemaPath})`,
  ];
  return `${lines.join('\n')}\n`;
}

export function generateDocumentation(
  registry: CommandRegistry,
  options: GenerateDocumentationOptions
): GeneratedDocumentation {
  const toolName = options.toolName ?? 'cnc';
  const skillName = options.skillName ?? 'constructive-cli';
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(toolName))
    throw new Error(`Invalid documentation tool name "${toolName}".`);
  if (!/^[a-z][a-z0-9-]*$/.test(skillName))
    throw new Error(`Invalid skill name "${skillName}".`);
  if (!/^[0-9A-Za-z.+_-]+$/.test(options.toolVersion))
    throw new Error('Tool version contains unsupported characters.');
  const files: Record<string, string> = {};
  const catalog = registry.catalog();
  files['catalog.json'] = json({
    protocolVersion: 'constructive.dev/cli/v1',
    tool: toolName,
    commands: catalog,
  });
  files['README.md'] =
    `# ${toolName} ${options.toolVersion}\n\n${renderHelp(registry, [], toolName)}`;

  for (const command of registry.list()) {
    files[safeRelativePath(`schemas/${command.id}.json`)] = json(
      registry.schema(command.id)
    );
    files[safeRelativePath(`commands/${command.id}.md`)] = commandPage(
      registry,
      command.id,
      toolName
    );
  }

  const skillCommands = catalog
    .map(
      (command) =>
        `- \`${toolName} ${command.path.join(' ')}\` — ${command.summary}`
    )
    .join('\n');
  files[safeRelativePath(`${skillName}/SKILL.md`)] =
    `---\nname: ${skillName}\ndescription: "Version-matched ${toolName} command reference."\nmetadata:\n  version: "${options.toolVersion}"\n---\n\n# ${toolName}\n\nUse \`${toolName} commands --format json\` for compact discovery and \`${toolName} schema <command> --format json\` for exact contracts. In agent mode, pass explicit inputs and consume JSONL events.\n\n## Commands\n\n${skillCommands}\n`;

  return {
    files,
    generator: {
      package: '@constructive-io/cli-runtime',
      tool: toolName,
      toolVersion: options.toolVersion,
      protocolVersion: 'constructive.dev/cli/v1',
    },
  };
}

async function readOptional(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function readManifest(
  target: string
): Promise<{ manifest?: OwnershipManifest; exists: boolean }> {
  const content = await readOptional(join(target, MANIFEST_NAME));
  if (content === undefined) return { exists: false };
  try {
    const parsed = JSON.parse(content.toString('utf8')) as OwnershipManifest;
    if (
      parsed.format !== MANIFEST_FORMAT ||
      parsed.generator?.package !== '@constructive-io/cli-runtime' ||
      parsed.generator?.protocolVersion !== 'constructive.dev/cli/v1' ||
      parsed.files === null ||
      typeof parsed.files !== 'object' ||
      Object.entries(parsed.files).some(
        ([path, digest]) =>
          typeof digest !== 'string' || safeRelativePath(path) !== path
      )
    ) {
      return { exists: true };
    }
    return { exists: true, manifest: parsed };
  } catch {
    return { exists: true };
  }
}

async function pathContainsSymlink(
  target: string,
  relativePath: string
): Promise<boolean> {
  const parts = [target, ...relativePath.split('/')];
  let current = parts[0];
  for (let index = 0; index < parts.length; index += 1) {
    if (index > 0) current = join(current, parts[index]);
    try {
      if ((await lstat(current)).isSymbolicLink()) return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }
  return false;
}

export async function planDocumentationExport(
  targetPath: string,
  documentation: GeneratedDocumentation
): Promise<DocumentationExportPlan> {
  const target = resolve(targetPath);
  const manifestRead = await readManifest(target);
  const previous = manifestRead.manifest;
  const manifestOwnedByThisTool =
    previous === undefined ||
    previous.generator.tool === documentation.generator.tool;
  const desiredHashes = Object.fromEntries(
    Object.entries(documentation.files).map(([path, content]) => [
      safeRelativePath(path),
      hash(content),
    ])
  );
  const allPaths = new Set([
    ...Object.keys(previous?.files ?? {}),
    ...Object.keys(desiredHashes),
  ]);
  const entries: DocumentationPlanEntry[] = [];

  if (
    (manifestRead.exists && previous === undefined) ||
    !manifestOwnedByThisTool ||
    (await pathContainsSymlink(target, MANIFEST_NAME))
  ) {
    entries.push({ path: MANIFEST_NAME, action: 'conflict' });
  }

  for (const relativePath of [...allPaths].sort()) {
    safeRelativePath(relativePath);
    if (await pathContainsSymlink(target, relativePath)) {
      entries.push({ path: relativePath, action: 'conflict' });
      continue;
    }
    const actual = await readOptional(join(target, relativePath));
    const actualHash = actual === undefined ? undefined : hash(actual);
    const previousHash = previous?.files[relativePath];
    const desiredHash = desiredHashes[relativePath];
    let action: DocumentationPlanAction;

    if (desiredHash === undefined) {
      action =
        actualHash === undefined
          ? 'unchanged'
          : previousHash === actualHash
            ? 'delete'
            : 'conflict';
    } else if (actualHash === undefined) {
      action = 'create';
    } else if (previous === undefined) {
      action = 'conflict';
    } else if (actualHash === desiredHash) {
      action = 'unchanged';
    } else if (previousHash !== undefined && actualHash === previousHash) {
      action = 'update';
    } else {
      action = 'conflict';
    }
    entries.push({
      path: relativePath,
      action,
      ...(actualHash === undefined ? {} : { previousHash: actualHash }),
      ...(desiredHash === undefined ? {} : { desiredHash }),
    });
  }

  const fingerprint = hash(
    JSON.stringify({
      generator: documentation.generator,
      files: Object.entries(desiredHashes).sort(([a], [b]) =>
        a.localeCompare(b)
      ),
    })
  );
  return {
    target,
    fingerprint,
    entries,
    conflicts: entries
      .filter((entry) => entry.action === 'conflict')
      .map((entry) => entry.path),
    documentation,
  };
}

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { encoding: 'utf8', mode: 0o644 });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function applyDocumentationExport(
  plan: DocumentationExportPlan
): Promise<void> {
  if (plan.conflicts.length > 0)
    throw new Error(
      `Documentation export has conflicts: ${plan.conflicts.join(', ')}`
    );
  const fresh = await planDocumentationExport(plan.target, plan.documentation);
  if (
    fresh.fingerprint !== plan.fingerprint ||
    JSON.stringify(fresh.entries) !== JSON.stringify(plan.entries) ||
    fresh.entries.some((entry) => entry.action === 'conflict')
  ) {
    throw new Error(
      'Documentation changed after the export was planned; create a new plan.'
    );
  }

  if (fresh.entries.every((entry) => entry.action === 'unchanged')) return;

  for (const entry of fresh.entries) {
    const destination = join(fresh.target, entry.path);
    if (entry.action === 'create' || entry.action === 'update') {
      await atomicWrite(destination, fresh.documentation.files[entry.path]);
    } else if (entry.action === 'delete') {
      await rm(destination);
    }
  }

  const manifest: OwnershipManifest = {
    format: MANIFEST_FORMAT,
    generator: fresh.documentation.generator,
    files: Object.fromEntries(
      Object.entries(fresh.documentation.files).map(([path, content]) => [
        path,
        hash(content),
      ])
    ),
  };
  await atomicWrite(join(fresh.target, MANIFEST_NAME), json(manifest));
}

export async function exportDocumentation(
  target: string,
  documentation: GeneratedDocumentation,
  options: { dryRun?: boolean } = {}
): Promise<DocumentationExportResult> {
  const plan = await planDocumentationExport(target, documentation);
  if (options.dryRun || plan.conflicts.length > 0)
    return { plan, applied: false };
  await applyDocumentationExport(plan);
  return { plan, applied: true };
}
