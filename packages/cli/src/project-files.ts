import { CliError, ExitCode } from '@agentic-kit/command';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { CliCode } from './errors';
import { CLI_NAME } from './session';

/**
 * Why a write under a directory is refused: a symbolic link on the way whose real path leaves the directory, a link
 * that points nowhere, or a part of the path that is a file.
 */
type WriteProblem =
  | { kind: 'link-leaves' | 'link-dangles'; link: string; to: string }
  | { kind: 'not-a-directory'; path: string };

/** Whether `target` is `root` or inside it, by the words of the two paths. */
const within = (root: string, target: string): boolean => {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

function realOr(file: string): string {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
}

/**
 * What stops a write of `target` under `root`, from each part of the path that exists, in order: a link may stay inside
 * `root`, and the parts the write creates are real directories inside the last one that exists.
 */
function writeProblem(root: string, target: string): WriteProblem | undefined {
  const realRoot = realOr(root);
  const parts = path.relative(root, target).split(path.sep).filter(Boolean);
  let at = root;
  for (const [index, part] of parts.entries()) {
    at = path.join(at, part);
    const last = index === parts.length - 1;
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(at);
    } catch {
      return undefined;
    }
    if (stat.isSymbolicLink()) {
      let to: string;
      try {
        to = path.resolve(path.dirname(at), fs.readlinkSync(at));
      } catch {
        // It stopped being a link between the two looks: another program changes the directory now.
        return { kind: 'link-dangles', link: at, to: at };
      }
      let real: string;
      try {
        real = fs.realpathSync(at);
      } catch {
        return { kind: 'link-dangles', link: at, to };
      }
      if (!within(realRoot, real)) return { kind: 'link-leaves', link: at, to: real };
      stat = fs.statSync(at);
    }
    if (!last && !stat.isDirectory()) return { kind: 'not-a-directory', path: at };
  }
  return undefined;
}

/** The refusal of a write that `problem` stops, naming the link or the file. */
function writeRefusal(problem: WriteProblem, root: string): CliError {
  const name = (file: string) => path.relative(root, file) || file;
  if (problem.kind === 'not-a-directory') {
    return new CliError<CliCode>({
      code: 'invalid-input',
      message: `${name(problem.path)} is a file, not a directory, so nothing can be written inside it. Nothing was changed.`,
      hint: `Move or rename ${name(problem.path)}, then run the command again.`,
      exitCode: ExitCode.failure,
      details: { path: problem.path }
    });
  }
  const link = name(problem.link);
  const message = {
    'link-leaves': `${link} is a symbolic link to ${problem.to}, outside ${root}, and ${CLI_NAME} writes nothing through a link that leaves the directory.`,
    'link-dangles': `${link} is a symbolic link to ${problem.to}, which does not exist, so ${CLI_NAME} does not write through it.`
  }[problem.kind];
  return new CliError<CliCode>({
    code: 'unsafe-path',
    message: `${message} Nothing was changed.`,
    hint: `Replace ${link} with a real file or directory inside ${root}, or remove it, then run the command again.`,
    details: { link, to: problem.to }
  });
}

/** Throws the refusal of the first write that a link or a file on the way stops. */
export function checkWrites(root: string, files: string[]): void {
  for (const file of files) {
    const problem = writeProblem(root, file);
    if (problem) throw writeRefusal(problem, root);
  }
}

/** The file a write of `target` changes: the real file a link inside the directory points to, so the link stays a link. */
export const writtenFile = (target: string): string => realOr(target);

/**
 * Writes `text` to `target` under `root` through a new file in the same directory, renamed into place: a hard link at
 * `target` is replaced, never written through, and a reader never sees half a file. An existing file keeps its mode.
 * The directory is resolved to its real path just before, and must still be inside `root`, so a link made there after
 * the plan's check is refused; a write that a change of the directory breaks halfway says so.
 */
export function writeFileReplacing(root: string, target: string, text: string): void {
  const directory = realOr(path.dirname(target));
  if (!within(realOr(root), directory)) throw writeRefusal({ kind: 'link-leaves', link: path.dirname(target), to: directory }, root);
  const file = path.join(directory, path.basename(target));
  let mode = 0o644;
  try {
    mode = fs.lstatSync(file).mode & 0o777;
  } catch {
    // A new file.
  }
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`);
  try {
    fs.writeFileSync(temporary, text, { flag: 'wx', mode });
    fs.renameSync(temporary, file);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTDIR' && code !== 'EXDEV') throw error;
    throw new CliError<CliCode>({
      code: 'conflict',
      message: `${path.relative(root, target) || target} could not be written: its directory changed while it was written (${code}).`,
      hint: 'Check that no other program changes the directory, then run the command again.',
      details: { path: target, cause: code }
    });
  }
}
