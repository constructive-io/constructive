const SHELL_CHARACTERS = new Set([';', '&', '|', '<', '>', '(', ')', '$', '`', '*', '?', '~', '#', '"', '{', '}', '[', ']', '!']);

/**
 * The words of a command line as a POSIX shell reads single quotes and
 * backslashes, read without a shell. Any other shell character, unquoted,
 * throws: a test sees a value that would reach the shell, and never runs it.
 */
export function shellWords(line: string): string[] {
  const words: string[] = [];
  let word = '';
  let inWord = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === "'") {
      const end = line.indexOf("'", index + 1);
      if (end === -1) throw new Error(`An unterminated single quote in: ${line}`);
      word += line.slice(index + 1, end);
      index = end;
      inWord = true;
    } else if (character === '\\') {
      word += line[++index];
      inWord = true;
    } else if (/\s/.test(character)) {
      if (inWord) words.push(word);
      word = '';
      inWord = false;
    } else {
      if (SHELL_CHARACTERS.has(character)) throw new Error(`The shell character ${character} is not quoted in: ${line}`);
      word += character;
      inWord = true;
    }
  }
  if (inWord) words.push(word);
  return words;
}
