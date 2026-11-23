/**
 * Where a curl option's value names a file, read as curl's own parsers read
 * it: `@file` at the start of a data, header or write-out value, `name@file`
 * in `--data-urlencode`, `--url-query` and `--variable`, `%output{file}` in a
 * write-out, and the files and header files of a `-F` form part
 * (`tool_formparse.c`). `-` is stdin. Each form gets the value's text, or for
 * a value from a variable its literal start (`whole` false).
 */

import type { FileForm, NamedFiles } from './options';

const NONE: NamedFiles = { paths: [], open: false };
/** A value from a variable whose rest may name a file. */
const OPEN: NamedFiles = { paths: [], open: true };

function file(path: string): NamedFiles {
  return path === '-' ? NONE : { paths: [path], open: false };
}

/** `-d @file`, `-H @file`, `-w @file`. */
export const AT_FILE: FileForm = (text, whole) => {
  if (!whole) return text === '' || text.startsWith('@') ? OPEN : NONE;
  return text.startsWith('@') ? file(text.slice(1)) : NONE;
};

/** `--data-urlencode name@file` or `@file`: a value with any `=` is content, and one without names a file after its first `@`. */
export const NAME_AT_FILE: FileForm = (text, whole) => {
  if (text.includes('=')) return NONE;
  if (!whole) return OPEN;
  const at = text.indexOf('@');
  return at < 0 ? NONE : file(text.slice(at + 1));
};

/** `--variable [%]name[@file|=content]`, with a byte range before the `@` since curl 8.12: whichever of `=` and `@` comes first decides. */
export const VARIABLE_FILE: FileForm = (text, whole) => {
  const at = text.search(/[@=]/);
  if (at < 0) return whole ? NONE : OPEN;
  if (text[at] === '=') return NONE;
  return whole ? file(text.slice(at + 1)) : OPEN;
};

/** `-w '%output{file}…'` and `%output{>>file}` (curl 8.3): the rest of the write-out goes to the file. */
export const WRITE_OUT_FILES: FileForm = (text, whole) => {
  const paths = [...text.matchAll(/%output\{(?:>>)?([^}]*)\}/g)].map((m) => m[1]).filter((p) => p !== '-');
  return { paths, open: !whole };
};

const SPACE = /[ \t\n\v\f\r]/;
/** The characters that end a `type=` value. */
const TYPE_END = '()<>@,;:\\"[]?=\r\n ';

/** A cursor over one `-F` value, and the files found so far. */
interface Form {
  readonly text: string;
  readonly whole: boolean;
  at: number;
  readonly paths: string[];
}

function skipSpaces(form: Form): void {
  while (form.at < form.text.length && SPACE.test(form.text[form.at])) form.at++;
}

/**
 * One word of a form part (`get_param_word`): a `"…"` word, where `\\` and
 * `\"` are escapes, or the text up to `;` or `end` with its trailing blanks
 * dropped. The cursor stops at the `;` or `end` after it. `null` when the
 * literal start of a value from a variable ends inside the word.
 */
function paramWord(form: Form, end: string): string | null {
  const { text } = form;
  const begin = form.at;
  if (text[begin] === '"') {
    let word = '';
    for (let i = begin + 1; i < text.length; i++) {
      if (text[i] === '\\' && (text[i + 1] === '\\' || text[i + 1] === '"')) {
        word += text[++i];
      } else if (text[i] === '"') {
        form.at = i + 1;
        while (form.at < text.length && text[form.at] !== ';' && text[form.at] !== end) form.at++;
        return word;
      } else {
        word += text[i];
      }
    }
    // curl reads a word with no closing quote as unquoted.
  }
  let stop = begin;
  while (stop < text.length && text[stop] !== ';' && text[stop] !== end) stop++;
  form.at = stop;
  if (stop === text.length && !form.whole) return null;
  return text.slice(begin, stop).replace(/[ \t\n\v\f\r]+$/, '');
}

function addFile(form: Form, path: string | null): void {
  if (path !== null && path !== '' && path !== '-') form.paths.push(path);
}

const startsWithParam = (form: Form, name: string): boolean => form.text.slice(form.at, form.at + name.length).toLowerCase() === name;

/**
 * One part of a form value (`get_param_part`): its word, which is a file when
 * `isFile`, then each `;` param. `headers=@file` and `headers=<file` read
 * headers from a file; `type=`, `filename=` and `encoder=` name none.
 */
function paramPart(form: Form, end: string, isFile: boolean): void {
  skipSpaces(form);
  const word = paramWord(form, end);
  if (isFile) addFile(form, word);
  let inType = false;
  while (form.text[form.at] === ';') {
    form.at++;
    skipSpaces(form);
    if (!inType && startsWithParam(form, 'type=')) {
      form.at += 5;
      skipSpaces(form);
      while (form.at < form.text.length && !TYPE_END.includes(form.text[form.at])) form.at++;
      inType = true;
    } else if (startsWithParam(form, 'headers=')) {
      inType = false;
      form.at += 8;
      if (form.text[form.at] === '@' || form.text[form.at] === '<') {
        form.at++;
        skipSpaces(form);
        addFile(form, paramWord(form, end));
      } else {
        skipSpaces(form);
        paramWord(form, end);
      }
    } else if (startsWithParam(form, 'filename=')) {
      inType = false;
      form.at += 9;
      skipSpaces(form);
      paramWord(form, end);
    } else if (startsWithParam(form, 'encoder=')) {
      inType = false;
      form.at += 8;
      skipSpaces(form);
      paramWord(form, end);
    } else if (inType) {
      // More of the content type (`type=text/plain; charset=utf-8`).
      while (form.at < form.text.length && form.text[form.at] !== ';' && form.text[form.at] !== end) form.at++;
    } else {
      paramWord(form, end);
    }
  }
}

/**
 * `-F name=…` as curl's formparse reads it: the name runs to the first `=`;
 * then `@` and files split at `,` (each after a separator, with its own
 * params), `<` and the one file whose text is the value, or text, a `(` that
 * opens a multipart, each with params. A value from a variable may add a
 * `;headers=@file` in its rest, so it is always open.
 */
export const FORM_FILES: FileForm = (text, whole) => {
  const eq = text.indexOf('=');
  if (eq < 0) return whole ? NONE : OPEN;
  const form: Form = { text, whole, at: eq + 1, paths: [] };
  if (text[form.at] === '@') {
    while (form.at < text.length) {
      form.at++;
      paramPart(form, ',', true);
    }
  } else if (text[form.at] === '<') {
    form.at++;
    paramPart(form, '', true);
  } else {
    paramPart(form, '', false);
  }
  return { paths: form.paths, open: !whole };
};
