import { FlagDef, FlagKind, flagKind, FlagTable, isSecret, kebabCase, LAYER_FLAGS, orList } from './input';
import type { CliConfig, CliManifest, CommandDefinition, CommandExample, CommandManifest, Effect, HelpTopic, JSONSchema, ReferenceSection } from './types';

/** What help and the manifest show of a command: its input and output as JSON Schema, made once from zod. */
export interface Shown {
  input?: JSONSchema;
  output?: JSONSchema;
  table: FlagTable;
}

export type ShownOf = (command: CommandDefinition) => Shown;

/** What help shows of a flag: a FlagDef has it, and so does each property of an input schema in the manifest. */
type ShownFlag = Pick<FlagDef, 'property' | 'flag' | 'schema' | 'kind' | 'required' | 'secret'>;

/** What tells the kinds of command apart, the same on a definition and on its manifest entry. */
interface KindFacts {
  effect: Effect;
  passthrough?: unknown;
  immediate?: unknown;
  stdout?: unknown;
}

const visible = (config: CliConfig): CommandDefinition[] => config.commands.filter((command) => !command.hidden);

const positionalsOf = (command: CommandDefinition): string[] => ('passthrough' in command ? [] : command.positionals ?? []);

const inputFlags = (table: FlagTable): FlagDef[] => table.flags.filter((def) => def.scope === 'input');

/** The flags of a JSON Schema object in the manifest, as the flag table of the command would read them. */
function flagsOfSchema(schema: JSONSchema | undefined): ShownFlag[] {
  const required = new Set(schema?.required ?? []);
  return Object.entries(schema?.properties ?? {}).map(([property, json]) => ({
    property,
    flag: kebabCase(property),
    schema: json,
    kind: flagKind(json),
    required: required.has(property),
    secret: isSecret(json)
  }));
}

/** The layer's short forms, from the flags that declare one: "`-y` is `--yes`". */
const shortForms = (): string[] =>
  Object.entries(LAYER_FLAGS.properties ?? {}).flatMap(([property, schema]) =>
    schema['x-short'] ? [`\`-${schema['x-short']}\` is \`--${kebabCase(property)}\``] : []);

/** What every CLI of this layer tells its agents, after the CLI's own notes. */
const layerNotes = (name: string): string[] => [
  'A change (write or destructive) shows its plan with --dry-run, asks on a terminal, and without a terminal stops with exit 3 and the plan until it is run with --yes. ' +
    'A command marked "at once" changes as soon as it runs, and refuses --dry-run; one that takes its own flags, or serves on stdio, has no plan either.',
  `Run "${name} --llms" for a command index, and "${name} <command> --schema" for the JSON Schema of a command.`
];

function columns(rows: Array<[string, string]>): string[] {
  const width = Math.min(Math.max(0, ...rows.map(([left]) => left.length)), 32);
  return rows.map(([left, right]) => (right ? `  ${left.padEnd(width)}  ${right}` : `  ${left}`));
}

function placeholder(kind: FlagKind): string {
  switch (kind.kind) {
  case 'boolean':
    return '';
  case 'scalar':
    return ` <${kind.type}>`;
  case 'enum':
    return ` <${kind.values.map(String).join('|')}>`;
  case 'list':
    return `${placeholder(kind.item)}...`;
  case 'json':
    return ' <json|@file>';
  }
}

/** A list in the last positional takes every argument left. */
const takesRest = (def: ShownFlag, positionals: readonly string[]): boolean =>
  def.kind.kind === 'list' && positionals[positionals.length - 1] === def.property;

function flagRow(def: ShownFlag, positionals: readonly string[]): [string, string] {
  const facts: string[] = [];
  const argument = positionals.indexOf(def.property);
  if (def.required) facts.push('required');
  if (argument >= 0 && takesRest(def, positionals)) facts.push(argument === 0 ? 'or the arguments' : `or arguments ${argument + 1} and on`);
  else if (argument >= 0) facts.push(`or argument ${argument + 1}`);
  if (def.kind.kind === 'list') facts.push('repeatable');
  if (def.schema.default !== undefined && !def.secret) facts.push(`default: ${JSON.stringify(def.schema.default)}`);
  const description = [def.schema.description, facts.length ? `(${facts.join(', ')})` : ''].filter(Boolean).join(' ');
  const short = def.schema['x-short'];
  return [`${short ? `-${short}, ` : ''}--${def.flag}${placeholder(def.kind)}`, description];
}

function argumentsOf(positionals: readonly string[], flags: ShownFlag[]): string {
  return positionals
    .map((name) => {
      const def = flags.find((flag) => flag.property === name);
      const word = takesRest(def, positionals) ? `${def.flag}...` : def.flag;
      return def.required ? ` <${word}>` : ` [${word}]`;
    })
    .join('');
}

/** For example `read`, `destructive`, or `write, takes its own flags`. */
function effectLabel(command: KindFacts): string {
  if (command.passthrough) return `${command.effect}, takes its own flags`;
  if (command.stdout === 'reserved') return `${command.effect}, serves on stdio`;
  if (command.immediate) return `${command.effect}, at once`;
  return command.effect;
}

function commandRows(commands: CommandDefinition[]): string[] {
  return columns(commands.map((command) => [command.name, `${command.summary} (${effectLabel(command)})`]));
}

function redactExample(example: CommandExample, table: FlagTable): CommandExample {
  let command = example.command;
  for (const [spelling, def] of table.lookup) {
    if (!def.secret) continue;
    const escaped = spelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    command = command.replace(new RegExp(`(--${escaped})(=|\\s+)('[^']*'|"[^"]*"|\\S+)`, 'g'), '$1$2<secret>');
  }
  return { ...example, command };
}

/** A copy of the schema without the default or examples of any secret node. */
function publicSchema(schema: JSONSchema | undefined): JSONSchema | undefined {
  if (!schema) return undefined;
  const copy: JSONSchema = { ...schema };
  if (isSecret(schema)) {
    delete copy.default;
    delete copy.examples;
  }
  if (schema.properties) {
    copy.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, publicSchema(value)]));
  }
  if (schema.items) copy.items = publicSchema(schema.items);
  for (const keyword of ['anyOf', 'oneOf', 'allOf'] as const) {
    if (schema[keyword]) copy[keyword] = schema[keyword].map(publicSchema);
  }
  return copy;
}

export function rootHelp(config: CliConfig, table: FlagTable): string {
  const lines = [`${config.name} ${config.version}`];
  if (config.description) lines.push(config.description);
  const notes = [...(config.notes ?? []), ...layerNotes(config.name)];
  lines.push(
    '',
    'Usage:',
    `  ${config.name} <command> [flags]`,
    '',
    'Commands:',
    ...commandRows(visible(config)),
    '',
    'Global flags:',
    ...columns(table.flags.map((def) => flagRow(def, [])))
  );
  if (config.topics?.length) {
    lines.push('', 'Help topics:', ...columns(config.topics.map((topic) => [topic.name, topic.summary])), '', `Run "${config.name} help <topic>" to read one.`);
  }
  lines.push('', 'Agents:', ...notes.map((note) => `  - ${note}`));
  return `${lines.join('\n')}\n`;
}

export function groupHelp(config: CliConfig, group: string): string {
  const commands = visible(config).filter((command) => command.name.startsWith(`${group} `));
  const lines = [
    'Usage:',
    `  ${config.name} ${group} <command> [flags]`,
    '',
    'Commands:',
    ...commandRows(commands),
    '',
    `Run "${config.name} ${group} <command> --help" for the flags of a command.`
  ];
  return `${lines.join('\n')}\n`;
}

export function commandHelp(config: CliConfig, command: CommandDefinition, { table }: Shown): string {
  const positionals = positionalsOf(command);
  const flags = inputFlags(table);
  const otherFlags = table.flags.filter((def) => def.scope !== 'input').map((def) => `--${def.flag}`);
  const usage = `${config.name} ${command.name}`;
  const lines = [`${usage}: ${command.summary}`, `Effect: ${effectLabel(command)}`];
  if (command.description) lines.push('', command.description);
  if ('passthrough' in command) {
    lines.push('', 'Usage:', `  ${usage} [its own flags]`, '', `Run "${usage} --help" for its own flags.`);
  } else {
    lines.push('', 'Usage:', `  ${usage}${argumentsOf(positionals, flags)}${flags.length ? ' [flags]' : ''}`);
  }
  if (flags.length) lines.push('', 'Flags:', ...columns(flags.map((def) => flagRow(def, positionals))));
  lines.push('', `Global flags: ${otherFlags.join(', ')}. Run "${config.name} --help" for what they do.`);
  if (command.examples?.length) {
    lines.push('', 'Examples:');
    for (const example of command.examples.map((item) => redactExample(item, table))) {
      lines.push(`  ${example.command}`);
      if (example.description) lines.push(`      ${example.description}`);
    }
  }
  if (command.notes?.length) lines.push('', 'Notes:', ...command.notes.map((note) => `  - ${note}`));
  return `${lines.join('\n')}\n`;
}

export const topicPage = (topic: HelpTopic): string => `${topic.summary}\n\n${topic.body}\n`;

export function commandSchema(command: CommandDefinition, shown: Shown) {
  return {
    name: command.name,
    summary: command.summary,
    effect: command.effect,
    positionals: positionalsOf(command),
    input: publicSchema(shown.input),
    output: shown.output
  };
}

export function llmsIndex(config: CliConfig, shownOf: ShownOf): string {
  const lines = [`# ${config.name}`, ''];
  if (config.description) lines.push(config.description, '');
  const passthrough = visible(config).filter((command) => 'passthrough' in command).map((command) => `\`${config.name} ${command.name}\``);
  const own = passthrough.length ? ` (but ${orList(passthrough, 'and')}, which take their own flags and print their own output)` : '';
  lines.push(
    `Version ${config.version}. Run \`${config.name} <command> --schema\` for the input and output JSON Schema of a command, ` +
      `and \`${config.name} --llms --json\` for the full manifest. When stdout is not a terminal, a command${own} prints one JSON envelope: ` +
      '`{"ok":true,"data":...}` or `{"ok":false,"error":{"code":...,"message":...}}`. ' +
      'A change stops with exit 3 and its plan in `error.details.plan` until it is run with `--yes`. ' +
      `Short forms: ${orList(shortForms(), 'and')}.`,
    '',
    '## Commands',
    '',
    ...visible(config).map((command) =>
      `- \`${config.name} ${command.name}${argumentsOf(positionalsOf(command), inputFlags(shownOf(command).table))}\` (${effectLabel(command)}): ${command.summary}`)
  );
  if (config.topics?.length) lines.push('', '## Help topics', '', ...config.topics.map((topic) => `- \`${config.name} help ${topic.name}\`: ${topic.summary}`));
  if (config.notes?.length) lines.push('', '## Notes', '', ...config.notes.map((note) => `- ${note}`));
  return `${lines.join('\n')}\n`;
}

export function buildManifest(config: CliConfig, globals: JSONSchema | undefined, shownOf: ShownOf): CliManifest {
  return {
    name: config.name,
    version: config.version,
    description: config.description,
    notes: config.notes ?? [],
    globals: publicSchema({ type: 'object', properties: { ...globals?.properties, ...LAYER_FLAGS.properties } }),
    commands: visible(config).map((command) => {
      const shown = shownOf(command);
      return {
        name: command.name,
        summary: command.summary,
        description: command.description,
        effect: command.effect,
        positionals: positionalsOf(command),
        input: publicSchema(shown.input),
        output: shown.output,
        examples: (command.examples ?? []).map((example) => redactExample(example, shown.table)),
        notes: command.notes ?? [],
        ...('passthrough' in command ? { passthrough: true as const } : {}),
        ...('immediate' in command ? { immediate: true as const } : {}),
        ...('serve' in command ? { stdout: 'reserved' as const } : {})
      };
    }),
    topics: config.topics ?? []
  };
}

/** The sections a reference ends with, in order, each filled by the topic that names it. */
const REFERENCE_SECTIONS: readonly ReferenceSection[] = ['EXIT STATUS', 'ENVIRONMENT', 'FILES'];

/** Plain text as Markdown that reads back as the same text: each character Markdown could read as syntax is escaped. */
const md = (text: string): string => text.replace(/[\\`*_[\]<>#|~&]/g, '\\$&');

const sentence = (text: string): string => (/[.!?:]$/.test(text) ? text : `${text}.`);

const bullets = (items: string[]): string => items.map((item) => `- ${item}`).join('\n');

const flagItems = (flags: ShownFlag[], positionals: readonly string[]): string =>
  bullets(flags.map((def) => flagRow(def, positionals)).map(([left, right]) => (right ? `\`${left}\`: ${md(right)}` : `\`${left}\``)));

function commandSection(cli: string, command: CommandManifest): string[] {
  const usage = `${cli} ${command.name}`;
  const flags = flagsOfSchema(command.input);
  const blocks = [`### ${command.name}`];
  if (command.passthrough) {
    blocks.push(`\`${usage} [its own flags]\``, `${md(sentence(command.summary))} Effect: ${effectLabel(command)}. Run \`${usage} --help\` for its own flags.`);
  } else {
    blocks.push(`\`${usage}${argumentsOf(command.positionals, flags)}${flags.length ? ' [flags]' : ''}\``, `${md(sentence(command.summary))} Effect: ${effectLabel(command)}.`);
  }
  if (command.description) blocks.push(md(command.description));
  if (flags.length) blocks.push('Flags:', flagItems(flags, command.positionals));
  if (command.examples.length) {
    const lines = command.examples.flatMap((example) => [...(example.description ? [`# ${example.description}`] : []), example.command]);
    blocks.push('Examples:', ['```', ...lines, '```'].join('\n'));
  }
  if (command.notes.length) blocks.push('Notes:', bullets(command.notes.map(md)));
  return blocks;
}

const topicSection = (heading: string, topic: HelpTopic): string[] => [`## ${heading}`, md(sentence(topic.summary)), topic.body];

/**
 * The manifest as one Markdown reference, in the shape of a manual page: the name, the synopsis, the description, the
 * global flags, every command, every topic as a section of its own, then exit status, environment and files (each
 * from the topic that fills it), and the commands that print the same facts. A man page is this text through a
 * Markdown-to-roff converter.
 */
export function renderReference(manifest: CliManifest): string {
  const { name } = manifest;
  const description = manifest.description ?? `The ${name} command line`;
  const ownSections = manifest.topics.filter((topic) => !topic.section);
  const blocks = [
    `# ${name}(1) -- ${md(description)}`,
    '## SYNOPSIS',
    `\`${name} <command> [flags]\``,
    `\`${name} help [<command> | <topic>]\``,
    '## DESCRIPTION',
    md(description),
    `This reference is for version ${md(manifest.version)}. Notes for agents:`,
    bullets([...manifest.notes, ...layerNotes(name)].map(md)),
    '## GLOBAL FLAGS',
    'Every command takes these flags, except one that takes its own flags.',
    flagItems(flagsOfSchema(manifest.globals), []),
    '## COMMANDS',
    ...manifest.commands.flatMap((command) => commandSection(name, command)),
    ...ownSections.flatMap((topic) => topicSection(topic.name.toUpperCase().replace(/-/g, ' '), topic)),
    ...REFERENCE_SECTIONS.flatMap((section) => manifest.topics.filter((topic) => topic.section === section).flatMap((topic) => topicSection(section, topic))),
    '## SEE ALSO',
    bullets([
      `\`${name} help <topic>\` prints a topic, and \`${name} help <command>\` the help of a command.`,
      `\`${name} <command> --schema\` prints the input and output JSON Schema of a command.`,
      `\`${name} --llms\` prints a command index for agents, and \`${name} --llms --json\` the manifest this reference is made from.`
    ])
  ];
  return `${blocks.join('\n\n')}\n`;
}
