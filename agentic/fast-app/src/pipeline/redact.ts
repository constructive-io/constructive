// The one door every command line and output excerpt goes through before it
// lands in a build's details, which the session keeps and the card shows:
// tokens, keys, passwords, Authorization values and the values of env
// assignments come out, and an excerpt is cut to its last lines.

const MARK = '[redacted]';

/** An excerpt keeps at most this many of its last lines, and this many characters of them. */
export const EXCERPT_LINES = 20;
export const EXCERPT_CHARS = 2048;

// The names of things that hold a secret, in an env name, a flag, a JSON key
// or a query parameter.
const SECRET_NAME = String.raw`[A-Za-z0-9_.-]*(?:password|passwd|passphrase|secret|token|api[_-]?key|access[_-]?key|authorization|bearer|credential|cookie|session[_-]?id|private[_-]?key|signature)[A-Za-z0-9_.-]*`;

const PATTERNS: Array<[RegExp, string | ((...groups: string[]) => string)]> = [
  // A PEM block, whole.
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, MARK],
  // Authorization headers and bearer values, in any quoting.
  [/\b(authorization\s*[:=]\s*["']?)(?:bearer|basic|token)?\s*[^\s"',}]+/gi, `$1${MARK}`],
  [/\b(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, `$1${MARK}`],
  // JWTs and well-known key shapes, wherever they stand.
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, MARK],
  [/\b(?:sk|pk|rk)-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{16,}/g, MARK],
  [/\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{16,}/g, MARK],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, MARK],
  [/\bAKIA[0-9A-Z]{16}\b/g, MARK],
  [/\bAIza[0-9A-Za-z_-]{30,}/g, MARK],
  // Credentials in a URL: scheme://user:password@host.
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^/\s@]+@/gi, `$1${MARK}@`],
  // A secret's name with its value: "password": "…", --token=…, --api-key …, ?token=….
  // A quoted value keeps its quotes, so JSON in an output still reads as JSON.
  [
    new RegExp(
      String.raw`(["']?${SECRET_NAME}["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,&;}"']+)`,
      'gi',
    ),
    (_m, name, value) => `${name}${/^["']/.test(value) ? `${value[0]}${MARK}${value[0]}` : MARK}`,
  ],
  [new RegExp(String.raw`(--${SECRET_NAME}\s+)(?!-)("[^"]*"|'[^']*'|\S+)`, 'gi'), `$1${MARK}`],
  // KEY=value env assignments, as a .env file or a shell prints them.
  [
    /(^|[\s;&|(])(?:export\s+)?([A-Z][A-Z0-9_]{1,})=("[^"]*"|'[^']*'|\S*)/gm,
    (_m, lead, name) => `${lead}${name}=${MARK}`,
  ],
];

/** Takes out every known secret value and anything shaped like one. */
export function redact(text: string, secrets: readonly string[] = []): string {
  let out = text;
  // Known values first, longest first, so one that contains another goes whole.
  for (const secret of [...secrets]
    .filter((s) => s.length >= 4)
    .sort((a, b) => b.length - a.length)) {
    out = out.split(secret).join(MARK);
  }
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement as string);
  }
  return out;
}

const SECRET_KEY = new RegExp(`^${SECRET_NAME}$`, 'i');

/**
 * A call's arguments with every secret taken out, walked as data so the
 * result is still JSON: a value under a secret's name goes whole, as
 * "[redacted]", and every other string is redacted as text.
 */
export function redactJson(value: unknown, secrets: readonly string[] = []): unknown {
  if (typeof value === 'string') return redact(value, secrets);
  if (Array.isArray(value)) return value.map((item) => redactJson(item, secrets));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SECRET_KEY.test(key) && item != null ? MARK : redactJson(item, secrets),
      ]),
    );
  }
  return value;
}

/**
 * A command line as the card shows it: the command and its arguments, with
 * any leading `NAME=value` assignments dropped and secrets taken out.
 */
export function redactCommand(line: string, secrets: readonly string[] = []): string {
  const withoutEnv = line.replace(
    /^(?:\s*(?:env\s+)?[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+)+/,
    '',
  );
  return redact(withoutEnv.trim(), secrets);
}

// Terminal colors and cursor moves: a dev server colors its banner, and the
// card shows the text.
// eslint-disable-next-line no-control-regex
const ANSI = /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-Z\\-_])/g;

/** The last lines of a command's output, without terminal codes, redacted, and capped in lines and characters. */
export function outputExcerpt(output: string, secrets: readonly string[] = []): string {
  const plain = output.replace(ANSI, '').replace(/\r(?!\n)/g, '\n');
  const lines = redact(plain, secrets).trimEnd().split('\n').slice(-EXCERPT_LINES);
  const text = lines.join('\n');
  return text.length > EXCERPT_CHARS ? `…${text.slice(-(EXCERPT_CHARS - 1))}` : text;
}
