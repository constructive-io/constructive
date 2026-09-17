import fs from 'fs';
import path from 'path';
import {
  Document,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  Scalar,
  stringify,
  YAMLSeq
} from 'yaml';

const WORKFLOW_DIR = path.join('.github', 'workflows');
const MATRIX_KEY = 'package';

/** A matrix entry: its parsed value plus the source text that produced it. */
interface Entry {
  value: string;
  text: string;
}

/** Column the node starts at, i.e. the indent of its first line. */
const columnOf = (source: string, offset: number): number =>
  offset - (source.lastIndexOf('\n', offset - 1) + 1);

/** Every `jobs.<job>.strategy.matrix.package` sequence in a workflow. */
const findMatrixSeqs = (doc: Document): YAMLSeq[] => {
  const jobs = doc.get('jobs', true);
  if (!isMap(jobs)) return [];

  const seqs: YAMLSeq[] = [];
  for (const job of jobs.items) {
    if (!isScalar(job.key)) continue;
    const seq = doc.getIn(
      ['jobs', job.key.value as string, 'strategy', 'matrix', MATRIX_KEY],
      true
    );
    if (isSeq(seq)) seqs.push(seq);
  }
  return seqs;
};

/**
 * The sequence's entries with their original source text (so quoting survives),
 * or `null` if any item isn't a plain string scalar.
 */
const entriesOf = (seq: YAMLSeq, source: string): Entry[] | null => {
  const entries: Entry[] = [];
  for (const item of seq.items) {
    if (!isScalar(item) || typeof (item as Scalar).value !== 'string') {
      return null;
    }
    const [start, end] = (item as Scalar).range ?? [];
    entries.push({
      value: (item as Scalar).value as string,
      text: source.slice(start, end).trim()
    });
  }
  return entries;
};

/** Re-render a sequence in the style and at the indent it was written with. */
const renderSeq = (seq: YAMLSeq, entries: Entry[], source: string): string => {
  const texts = entries.map((entry) => entry.text);
  if (seq.flow) return `[${texts.join(', ')}]`;
  const indent = ' '.repeat(columnOf(source, seq.range[0]));
  return texts
    .map((text, index) => `${index === 0 ? '' : indent}- ${text}`)
    .join('\n');
};

/**
 * Insert `entry` into every test matrix of a workflow, keeping the list sorted.
 * Only the byte range of each matrix sequence is rewritten; the rest of the
 * source passes through untouched, so comments and formatting survive.
 */
export const addToMatrixYaml = (source: string, entry: string): string => {
  const doc = parseDocument(source);
  if (doc.errors.length) return source;

  const added: Entry = { value: entry, text: stringify(entry).trim() };
  const edits: { start: number; end: number; text: string }[] = [];

  for (const seq of findMatrixSeqs(doc)) {
    const entries = entriesOf(seq, source);
    if (!entries) continue;
    if (entries.some((existing) => existing.value === entry)) continue;

    const next = [...entries, added]
      .filter(
        (item, index, all) =>
          all.findIndex((other) => other.value === item.value) === index
      )
      .sort((left, right) => left.value.localeCompare(right.value));

    const [start, end] = seq.range;
    // a block sequence's range extends to the next token; keep that whitespace
    const [trailing] = /\s*$/.exec(source.slice(start, end)) as [string];
    edits.push({
      start,
      end,
      text: renderSeq(seq, next, source) + trailing
    });
  }

  // Last edit first, so earlier ranges keep their offsets.
  return edits
    .sort((left, right) => right.start - left.start)
    .reduce(
      (text, edit) =>
        text.slice(0, edit.start) + edit.text + text.slice(edit.end),
      source
    );
};

/**
 * Add a module to the test matrix of a workspace's CI workflows, keeping the
 * list sorted. The matrix stays a plain, hand-editable array: workflows without
 * a `jobs.<job>.strategy.matrix.package` sequence are left alone.
 *
 * Returns the workflow files that changed, relative to `workspacePath`.
 */
export const addToCiMatrix = (
  workspacePath: string,
  modulePackagePath: string
): string[] => {
  const dir = path.join(workspacePath, WORKFLOW_DIR);
  if (!fs.existsSync(dir)) return [];

  const entry = modulePackagePath.split(path.sep).join('/');
  const changed: string[] = [];

  for (const file of fs.readdirSync(dir).sort()) {
    if (!/\.ya?ml$/.test(file)) continue;
    const filePath = path.join(dir, file);
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = addToMatrixYaml(original, entry);
    if (updated === original) continue;
    fs.writeFileSync(filePath, updated);
    changed.push(path.join(WORKFLOW_DIR, file).split(path.sep).join('/'));
  }

  return changed;
};
