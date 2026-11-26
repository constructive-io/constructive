import { getEnvOptions } from '@constructive-io/graphql-env';
import { GraphQLExplorer as explorer } from '@constructive-io/graphql-explorer';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { CLIOptions, Inquirerer, Question } from 'inquirerer';

const log = new Logger('explorer');

export const usage = `
Constructive GraphQL Explorer:

  constructive explorer [OPTIONS]

  Launch GraphiQL explorer interface.

Options:
  --help, -h              Show this help message
  --port <number>         Server port (default: 5555)
  --origin <url>          CORS origin URL (default: port 3000 of this machine, over http)
  --simpleInflection      Use simple inflection (default: true)
  --oppositeBaseNames     Use opposite base names (default: false)
  --postgis               Enable PostGIS extension (default: true)
  --cwd <directory>       Working directory (default: current directory)

Examples:
  constructive explorer                        Launch explorer with defaults
  constructive explorer --origin https://app.example.com  Launch explorer with custom origin
`;

const questions: Question[] = [
  {
    name: 'simpleInflection',
    message: 'Use simple inflection?',
    type: 'confirm',
    required: false,
    default: true,
    useDefault: true
  },
  {
    name: 'oppositeBaseNames',
    message: 'Use opposite base names?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true
  },
  {
    name: 'postgis',
    message: 'Enable PostGIS extension?',
    type: 'confirm',
    required: false,
    default: true,
    useDefault: true
  },
  {
    name: 'port',
    message: 'Development server port',
    type: 'number',
    required: false,
    default: 5555,
    useDefault: true
  },
  {
    name: 'origin',
    message: 'CORS origin URL',
    type: 'text',
    required: false,
    default: 'http://localhost:3000',
    useDefault: true
  }
];

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {

  log.info('🔧 Constructive GraphQL Explorer Configuration:\n');

  const {
    oppositeBaseNames,
    origin,
    port,
    postgis,
    simpleInflection
  } = await prompter.prompt(argv, questions);

  const options: ConstructiveOptions = getEnvOptions({
    features: {
      oppositeBaseNames,
      simpleInflection,
      postgis
    },
    server: {
      origin,
      port
    }
  });

  log.success('✅ Selected Configuration:');
  for (const [key, value] of Object.entries(options)) {
    log.debug(`${key}: ${JSON.stringify(value)}`);
  }

  log.success('🚀 Launching Explorer...\n');
  explorer(options);
};
