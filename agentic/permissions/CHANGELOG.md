# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.2](https://github.com/constructive-io/constructive/compare/@agentic-kit/permissions@0.2.1...@agentic-kit/permissions@0.2.2) (2026-11-26)

### Features

- **permissions:** add command-prefix grants and read bash the way bash does ([#2043](https://github.com/constructive-io/constructive/issues/2043)) ([d5ef4f0](https://github.com/constructive-io/constructive/commit/d5ef4f0baff6c6aba0d8aea8bb791fba875436ad)), closes [constructive-planning#2570](https://github.com/constructive-planning/issues/2570)

### BREAKING CHANGES

- **permissions:** `CommandMatch.command` is `CommandKey` and
  `CommandPrefixMatch.prefixes` is `ListedPrefix[]`, so code that builds a
  command match from a plain string no longer compiles: make matches
  through `grantFrom`, `parseCommandPattern` or `parseGrantMatch`, and read
  stored grants through `parseGrantMatch`. `PermissionRequest` is a union:
  narrow on `toolName === 'bash'` before reading `command` or `parts`.

- fix(permissions): keep the command around a substitution that does not parse

Bash parses a backtick body (and in 3.2 a $(…) body) only when it
expands it, so a body it cannot parse fails that one substitution and
the command around it still runs: cat ~/.ssh/id_rsa `'` reads the key.
The lexer threw on that body and dropped the whole command, so Full mode
saw only shell-dynamic and allowed it. A nested lexer error now adds a
shell-dynamic note and keeps the commands around it.

- fix(permissions): read $(( and (( with bash's own arithmetic rules

One scanner, arithmeticEnd(), now decides whether `((` is arithmetic the
way bash does, and every $((, (( and $[ goes through one arithmetic
reader that lexes the text's substitutions as in double quotes.

After $, bash decides as it expands the word (chk_arithsub in subst.c):
the text up to the ) that closes $( must end in ), and the parens between
must balance, skipping backslashes and quotes but not backticks. So
echo $(( cat ~/.ssh/id_rsa `;)`)) runs the cat. As a command, bash
decides as it parses (parse_arith_cmd in parse.y): the paren the second (
opens, skipping quotes and backticks, must close right before a ). So in
(( 1 << 2 )) the << is a shift, not a heredoc. Bash 3.2 and 5.3 use the
same two rules.

This replaces isArithmetic(), plainArithmeticCommand() and the regex that
lexed an arithmetic body from its first $ or backtick. Before, the kit
read every (( as subshells, and it skipped backticks when checking $((.

A differential test runs generated $(( and (( forms through /bin/bash
with a marker for each reading and compares them with the kit's reading.

- fix(permissions): ask in every mode when the analysis stops at its own limits

Past one of its own limits the analyzer has not read the whole command,
and the part it skipped can touch any path. The brace limits already
raised unresolvable-path for that reason, but the others raised only
shell-dynamic, which Full mode allows:

- command substitutions nested more than 6 deep (the lexer skipped the
  innermost body);
- shell strings (sh -c, eval, ...) nested more than 4 deep;
- a command longer than 64 KB.

So echo $(echo $(… $(cat ~/.ssh/id_rsa))) with 7 levels, or five nested
evals, ran the cat in Full mode.

Every limit is now a member of one Limit type. The analyzer reports
each one through incomplete(limit), which raises unresolvable-path with
the reason from a Record<Limit, string>, so a new limit needs a reason
and takes the same path. expandWord returns the brace limit it hit, and
the lexer lists the limits it stopped at in Lexed.limits.

- fix(permissions): expand words in bash's order within one budget per command

One module, src/bash/expand.ts, now owns bash's expansion order for a word:
brace expansion, then tilde, then parameters, then field splitting, then
globbing. Each character keeps the kind that decides which steps act on it:
an unquoted literal, the result of an unquoted expansion, or settled text.

Before, the kit never split an unquoted value into words and treated glob
characters in a value as literal text. So x="a $HOME/.ssh/id_rsa"; cat $x
was allowed in Workspace mode, and x="$HOME/.ss?/id_rsa"; cat $x in Full
mode, and bash 3.2 and 5.3 read the key in both. Assignments before the
command word and the NAME=value arguments of export, declare, local,
readonly and typeset are still not split or globbed, as bash does.

Tilde expansion moves out of the lexer and out of the analyzer's
brace-alternative fix into the module, after brace expansion. An empty
quoted part now stops it, as bash does (~""/x stays literal).

One ExpansionBudget per command pass counts characters and words, and is
charged before anything is built: in brace expansion, and in parameter
expansion. Before, echo with 60,000 a's and {1..4096} built 3.4 GB in
3.8 s and was allowed, and v1=$v0$v0 doubled 24 times built 388 MB from a
322-character command. Both now stop at the budget, and the analysis
reports incomplete(), which asks in every mode. A charge that does not fit
takes nothing, so later words are still read. The per-word brace caps
(256 results, and 4096 for plain names) are gone, so every word of an
expansion is checked up to the command's 8192 words.

- fix(permissions): offer only an exact rule for git commands that can lose work

The prefix table listed git subcommands that can discard uncommitted work
or rewrite or publish history, so one "Always allow" on `git push origin
main` let every later `git push` run without a card in Ask mode, whatever
its arguments.

The table now keeps only the git subcommands that read or add to the repo:
status, diff, log, show, add, commit, branch, tag, fetch, blame, grep,
ls-files, rev-parse, describe, shortlog and reflog. reset, rm, mv,
checkout, restore, switch, stash, push, pull, merge, rebase, cherry-pick
and revert get only an exact rule. mv is in that list because `git mv -f`
overwrites a file with uncommitted changes.

A stored prefix grant for one of them fails parseGrantMatch and covers
nothing, so the call asks again and its card offers the exact command.

- fix(permissions): ask in every mode when the lexer cannot parse a command

A lexer error raised shell-dynamic, which Full mode allows. Where the
kit's lexer fails but bash does not (a construct it does not model), Full
mode then ran a command the analysis never read. A top-level lexer error,
and a substitution body it cannot parse, now report through incomplete()
as the new Limit member 'unparsed', which raises unresolvable-path and
asks in every mode, like the analysis's own limits.

- feat(permissions)!: carry the rule kind beside the text of a command grant

The text form told an exact command from a prefix only by a trailing ` *`,
so an exact grant for `rm *` showed "Always allow rm *", which reads like a
prefix, and its text read back as a prefix rule that covers more. A host
could not save such a grant again from its text.

A command rule's text now travels with its kind. commandPattern(match)
returns { kind: 'prefix' | 'exact', text }, and
parseCommandPattern({ kind, text }) reads it back into a match of that
kind or a refusal. A prefix text is the leading words, several separated
by commas (`git status, npm run test`); an exact text is the command as
written, `*` and commas kept. The ` *` is no longer part of the syntax: a
typed trailing ` *` on a prefix is refused with a reason that says to
remove it, so each rule has one spelling and every text reads back to the
grant it came from.

A card option's pattern is now a GrantPattern ({ kind: 'prefix' | 'exact'
| 'path', text }), and its label says the kind: "Always allow commands
that start with git status", "Always allow exactly: rm *". describeGrant
gives the same words without "Always allow". Every label and refusal
reason now lives in src/grant-copy.ts.

Stored grants keep their JSON shape: parseGrantMatch reads the match, not
the text, so old grants load as before.

- **permissions:** commandPattern returns a CommandPattern ({ kind, text })
  in place of a string, and parseCommandPattern takes one in place of a
  string. GrantOption.pattern and PermissionPrompt.grantOptions[].pattern are
  a GrantPattern in place of a string; show `pattern.text` and read the kind
  from `pattern.kind`. Prefix text has no ` *`. Card labels and describeGrant
  say the kind and drop the `bash: ` lead.

- docs(permissions): escape the pipes in the signals table and move its long cells out

Two cells held a bare | inside a code span (`$((1) | cmd )` and `curl | sh`),
which ends a cell in GitHub tables and broke the rows. The shell-dynamic,
unresolvable-path and upload cells held up to 2,600 characters of prose;
their full text now follows the table, and the cells say what each signal
means in one line.

- feat(permissions): mark a prefix rule that runs an unchecked script

An interpreter and script prefix (`node scripts/build.js`, `python3
manage.py`, `bash deploy.sh`, `tsx watch src/x.ts`) covers every later run
of that script, but the kit never reads the script, and the agent may
have changed it. A host had no way to know which rules carry that risk
without reading the rule's text.

Each entry of the prefix table now has a class: reader, vcs, test,
package-query, package-script or script-runner. The caveat comes from the
class, never from the text: a rule with a script-runner prefix gets
`caveat: 'script-unchecked'`. The kit sets it on each card option that
saves such a rule (GrantOption.caveat, and the same field in the prompt's
grantOptions, which now carries every option field but the match), on
parseCommandPattern's result for a typed rule, and through the new
grantCaveat(match) export for a stored grant. Exact commands, path grants
and every other class get none. The kit gives only the value; the host
writes the sentence it shows.

- fix(permissions): read git's and the package managers' options through one registry

git clone --conf=core.sshCommand='touch m' ssh://h/x (and --conf as its own
word) was allowed in Workspace mode, and real git ran the command. The
clone check read -c/--config by exact name, while git accepts any
abbreviation. Two option readers (parse() with exact names and
optionMatches() with abbreviations) over separate lists had drifted.

Now one parser, readArgs()/optionsIn() in src/bash/options.ts, reads
options as a program does: exact names first, then git/getopt
abbreviations, clusters, = and next-word values (even --), and a real --.
One registry, src/bash/programs.ts, holds git's own options and each git
subcommand's, plus npm, pnpm, yarn and bun, with what each option does:
runs a program, writes a file, reads a file, sets config, changes dir or
sends data. git's rules and the prefix guard both read options through
it, so RISKY_OPTIONS, optionMatches and git's lists (RUNS_PROGRAM, OUTPUT,
the per-call value sets) are gone.

An argument from a variable that may be an option counts as every option
the subcommand takes, so git log $X asks in every mode ($X may be
--output=<file>), and git add -f $F does too: real git prints the lines
of a --pathspec-from-file file in its error. A subcommand the registry
does not list, or an alias, counts every risky git option. fetch -u is
--update-head-ok in git, so it is no longer risky.

- fix(permissions): build the exact grant key from the lexer's tokens

The key collapsed runs of spaces and tabs with a regex, except in any
command with a quote, a backslash, a $ or a heredoc, where it kept all
spacing as written. That exception came from earlier rounds (${x/ /-},
IFS=, heredoc delimiters), and it made such commands' grants miss a
respelling bash runs the same way: for f in a b; do echo "$f"; done.

The lexer now notes each run of unquoted spaces and tabs between tokens,
and the key makes each of those one space and keeps everything else as
written: the text inside a token, comments and heredoc bodies. A command
the lexer cannot read keeps all its spacing.

- test(permissions): commit the bash differential and card property oracles

Four oracles from the audit rounds now run with the suite, with fixed
seeds and a bounded run time, and the bash ones skip where /bin/bash is
missing:

- bash-coverage.differential: when grants let a call through in Ask
  mode, bash (with logging shims, a DEBUG trap and
  command_not_found_handle) runs only covered simple commands, passes none
  of their risky options and writes no file. Its risky list follows git's
  own options per subcommand.
- hard-deny.differential: every spelling of ~/.ssh/id_rsa that bash reads
  (home dir, braces, globs, quotes, ..) is denied in Full mode. On main
  0.2.0 the same seeds let 160 of 340 and 150 of 343 reads through.
- card-roundtrip.property: every grant an ask card offers covers the same
  call again, and its text form parses back to the same grant.
- exact-key.differential: a command and its exact-grant key run the same
  in bash. Its words hold blanks bash keeps as text (quotes, ${…},
  substitutions); with main 0.2.0's key, 344 of 494 pairs differ.

* fix(permissions): count a word that may split as a possible option

The registry's parser counted an argument from a variable as a possible
option only when its text did not start with a literal. But an unquoted
expansion splits a word, so git fetch . HEAD$IFS--upload-pack='touch m;'
passes --upload-pack as a word of its own, and so does git fetch origin$X
when $X holds a space. Both were allowed in Workspace mode after the
registry commit, and the earlier lists had asked.

An unknown argument now carries splits: true when an unquoted value the
analysis cannot know (or $@) is in it, and mayBeOption counts it. $IFS
expands to bash's default, space, tab and newline, until the command
changes it, since bash does not take IFS from the environment; so
HEAD$IFS--upload-pack=… splits into its real words. cherry-pick and
revert get their own option specs, so -x there is not rebase's -x.

- test(permissions): leave the card round-trip property test to the grant-kind change

The grant-kind change (the "Starts with" / "Exactly" picker) changes the
text API this test reads, and it brings its own version of the test.

- fix(permissions): keep history-rewriting git forms out of prefix grants

A prefix like `git commit *`, `git branch *`, `git tag *`, `git reflog *`
or `git fetch *` covered every later run, including the forms that rewrite
or delete history and refs: commit --amend, branch -d/-D/-f/-M/-C,
tag -d/-f, reflog expire/delete, and fetch with a + refspec, -f,
-P/--prune-tags or -u/--update-head-ok. They are now one effect in the
program registry, rewrites-history, which the prefix guard never covers,
so their cards offer only the exact command. Operand forms (an action
word in first place, or a + refspec) are read after quote removal, so
git reflog 'delete' counts too. branch's -m/-M/-c/-C were listed as
taking a value; they are flags.

- fix(permissions): read the shell commands programs run from their own text

psql -c '\! cat ~/.ssh/id_rsa', sqlite3 :memory: '.shell …', mysql -e
'system …', tar --to-command=…, zip -TT …, rsync -e …, gdb -ex 'shell …'
and vim -c '!…' ran a shell command the analysis never read, so they were
allowed in Workspace and Full mode and the credential-store denial did not
hold for them.

The program registry now holds these programs with what their options and
text do. Programs with a command language of their own (psql, sqlite3,
duckdb, mysql/mariadb, pwsh, gdb, vim, expect) say which of their commands
run a program and where the shell command sits; their text comes from
options, operands, and stdin (a heredoc, a here-string or a pipe from
echo/printf, now tracked as Stdin.text). A shell command the text shows is
analyzed as bash, so a credential read in it is denied in every mode;
other code that runs a program raises shell-dynamic, and so does input the
analysis cannot see (cat q.sql | psql). Plain SQL in -c, -f or a heredoc
stays quiet. Option forms are effects with a value condition and a shell
capture: tar --to-command/-I/--checkpoint-action=exec=, zip -TT, sort
--compress-program, ssh/scp -o ProxyCommand=, scp -S, rsync -e, man -P/-H.

sort, ssh, scp, rsync, and tar and zip's stdin file names moved from their
own option lists to the registry, so no program is read twice. The parser
learns one-dash option names (-cmd, -ex, -TT), PowerShell's case and
abbreviations, and old-style tar letters (tar cIf prog a.tar).

- fix(permissions): tell the model its next step when a call is denied or unread

A deny reason named the blocked path and stopped, and a limit reason said
the analysis did not read the command. The model then tended to try
another spelling, a script, or splitting the command. Deny reasons now end
with "don't reach it another way…; if the task needs it, ask the user to
do it", and a limit or parse reason with "don't split it or put it in a
script; rewrite it as simpler commands, or use the read tool". The
wording lives in src/guidance.ts only.

- fix(permissions): ask before writing package-manager config that runs code

Workspace mode wrote .npmrc, .yarnrc, .yarnrc.yml, .pnpmfile.cjs and
bunfig.toml with no card, and each makes a later install or script run
code it names: npm's script-shell and node-options, yarn's yarn-path and
yarnPath, pnpm's hooks file, bun's preload. Writing .yarn/releases or
.yarn/plugins replaces code yarn loads. They are now in
WORKSPACE_ASK_WRITE next to the git hooks, so a write to them asks outside
Full mode. package.json scripts run code too, but agents edit package.json
for every dependency, so it stays a plain workspace file.

- feat(permissions): give package-script and test prefixes the script caveat

A prefix rule for `npm run build` or `npm test` covers later runs of a
package script or the project's tests, and the kit reads neither the
script's command in package.json nor the tests, which the agent may have
changed, just as it never reads the script a `node scripts/build.js` rule
runs. The package-script and test classes now get 'script-unchecked' too;
reader, vcs and package-query still get none.

- fix(permissions): read an option as the option its spelling names

Options that share a registry spec share its value and effect, but the
analyzer also took them for each other. So `psql -U app` and `psql -v x=1`
counted as `-c` text, and psql skipped its stdin (`echo '\! cat
~/.ssh/id_rsa' | psql -v x=1` ran with no signal), and sqlite3's
`-separator` and mysql's `-u` did the same. A read option now carries the
full spellings it resolves to, and `isOption` matches those.

vim's `-i` names a viminfo file it reads and writes, and `-r` is a flag;
both were hidden as `-c` text before.

- fix(permissions): read command languages by allowlist, not by escape spellings

The psql, sqlite3, duckdb, mysql and gdb readers matched known escape
spellings, so other spellings ran with no signal in Workspace mode:
sqlite3's and duckdb's abbreviated dot-commands (`.sys`, `.shel`), psql's
`\gx |`, `\out |`, `\write |`, `\g (format=csv) |`, backquotes, `\o :p` and
`\i`, and gdb's `she`.

Text now counts as plain only when it uses none of the language's escape
mechanisms, with each allowlist taken from the tool's own help or manual:

- psql: SQL and the read-only meta-commands (`\d…`, `\l`, `\x`, `\echo`, …)
  with no pipe, `:variable` or backquote. Every backslash counts, also one
  in a SQL string, since the server's settings decide where a string ends.
- sqlite3 and duckdb: SQL and the full spelling of the read-only
  dot-commands; sqlite3's file functions and duckdb's INSTALL/LOAD ask.
- mysql: SQL and the client commands that only show or end a statement.
- gdb: command text is never plain; a `-x` script asks too.
  Where the text shows the shell command it runs, it is still read as bash,
  so Full mode keeps hard-deny.

Stdin is now read as the exact text `echo` and `printf` print, following
bash's own readers, in each way the shell may print it (with and without
xpg_echo, and as POSIX sh). An unquoted heredoc is read as bash expands it:
`\` quotes only `\`, `$` and a backquote, any other `$` or backquote makes
the text unknown, and `<<-` strips leading tabs. A text option that runs
before stdin (`sqlite3 -cmd`, gdb `-ex` without `-batch`, `psql -f -`)
leaves stdin read.

- fix(permissions): ask for sqlite3 SQL that touches files, and read a redirected stdin like -f

sqlite3 reads no string as a file, so SQL with string literals stays plain.
ATTACH and VACUUM ask, and so do the functions and modules the 3.54 CLI
adds to the library that read or write a file, run an editor, or run SQL
from a string: readfile, writefile, fsdir, zipfile, edit, sha1_query and
sha3_query, plus load_extension. Full mode still runs them.

Stdin from a file that a `<` redirect names is now read like a file the
program runs by name (`psql -f`): `mysql < dump.sql` stays quiet, and the
path is still checked as a read, so `psql < ~/.ssh/id_rsa` is denied.

duckdb's SQL file access stays a known gap until the sandbox: it reads and
writes files even with no quote in the text.

- fix(permissions): keep one variable model with bash's =, += and unset

Assignments went through the analyzer one value at a time, so `p+=x`
replaced p, `unset F` left F's old value for `${F:-…}`, and mapfile never
set its array. `p=~/.ne; p+=trc; cat $p` read ~/.netrc unseen in Workspace
mode.

expand.ts now owns a Variables model: assign(name, op, value) with `=` and
`+=` (`+=` on an unset name is `=`), unset, and a lookup that tells unset
from unknown. Every site uses it: the NAME=value words, export, declare,
local, readonly, typeset, read, printf -v, mapfile, readarray and unset;
the builtins read their options through registry specs. `${F-x}` and
`${F:-x}` take the fallback by bash's rules, with a leading `~` as the home
dir. `~user`, `~+` and `~-` are an unknown part, so the path asks in every
mode.

- fix(permissions): read every program's options through the registry

The file readers, tee, sed, grep, awk, rm, cp/mv/install/ln, chmod/chown,
touch/mkdir, tree, cd, curl, wget, defaults and env read their options with
the legacy parse() or their own loops. Those dropped a word from a variable
that started with `-`, so `echo " ~/.netrc" >/dev/null; cat --$_` read the
file unseen, and `env --chdir=$_` and `defaults -host h write` lost the
command after them.

Each of them now has a spec in programs.ts and reads it with readArgs, and
parse() is gone. A word from a variable is never dropped: it is a possible
operand (a path the analysis cannot place) and a possible option (every
effect the program's options have). The specs list a value option only
where the docs say it takes one, so no flag can hide the file after it;
chmod reads a dash word as a mode unless every letter is an option.

Also: gawk `-i file` and `-E file` are source files it reads and `-l` loads
native code; `git config --file` is a read for a lookup and a write for an
edit; env `-C` from a variable leaves the dir unknown; curl's --trace,
--stderr, --libcurl, --etag-save, --hsts and --alt-svc write files and
--netrc-file reads one.

- fix(permissions): apply option effects in one ordered switch, with dir changes

applyEffects handled only runs-program, reads-file and writes-file, so a
`-C dir` did not move the paths after it, and tar and zip read their
archive whatever the mode. `tar -xf p.tar -C .pi`, `tar cf .pi/x src` and
`zip -r .pi/x.zip src` wrote into the protected .pi dir unseen, and
`tar -C ~/.ssh -cf out.tar id_rsa` read the key in Full mode.

applyEffects now walks the options in order through one switch over Effect,
with a `never` check. changes-dir reads the dir from the one before it and
returns the dir changes. tar's mode sets the archive's access (create,
append, update and delete write it), each member it adds is read from the
dir the -C before it names, and an extraction writes into the last -C dir.
zip writes its first operand. gdb -cd and pwsh -WorkingDirectory move the
operands after them. git resolves each -C, --git-dir and --work-tree from
the -C before it.

- fix(permissions): read ssh's options as OpenSSH parses them

ssh's options stopped at the destination, and an -o key had to end at a
space or `=`. OpenSSH reads options again after the destination, up to the
first word of the remote command, and ends a key at any whitespace or one
`=`. So `ssh h -o ProxyCommand=…`, `ssh -o $'ProxyCommand\t…' h` and
`ssh h -R …` ran a local command or opened a forward unseen in Workspace
mode.

ssh now reads its options before and after the destination, unless `--`
ended them, and an -o key ends at whitespace or one `=`. `-E` writes its log
file. A differential test runs `ssh -G -F /dev/null`, which prints the
config without connecting, and checks that the kit sees a ProxyCommand,
LocalCommand or KnownHostsCommand exactly when ssh sets one; it is skipped
where ssh has no -G.

- fix(permissions): charge every text the analysis builds to one budget

The text echo, printf, heredocs and here-strings put on stdin was built
outside the per-command ExpansionBudget, and for every echo or printf, read
or not. `printf %500000000s x | psql` grew the heap by 500 MB, and
`%999999999s` threw "Invalid string length".

printed.ts now takes the command's text budget: a printf pad is charged
before it is built, each pass over the format is charged, and echo's
readings and heredoc bodies are charged too; past the budget the text is
unknown and the command asks in every mode. The stdin texts are built only
when a program reads them, so `printf %999999999s x | cat` builds nothing.

- fix(permissions)!: build exact keys from tokens, with a part's input redirections

The exact key trimmed the command's ends with trimBlanks, which also cut an
escaped trailing space, so the exact grant `echo a\` covered `echo a\ `. And
a part's exact identity was its words alone, so the exact grant `cat`
covered `cat < src/a.ts`.

normalizeCommand now drops only the unquoted blank runs the lexer finds
before the first token and after the last one, and trimBlanks is gone; rule
text is trimmed the same way. CommandPart gains `inputs`, its input
redirections as written, and an exact grant covers a part only when its
words and inputs together are the grant's command.

- **permissions:** CommandPart has a new required field, `inputs`.

- fix(permissions): expand brace sequences as bash does, and keep empty-quote marks out of band

A sequence expanded whatever its ends were: `{"1"..3}` and `{1..c}` expanded,
which bash leaves literal, and `{+1..3}` stayed literal, which bash expands.
`{01..03}` and `{a..e..2}` expanded one way, though bash 3.2 and bash 4+
differ there. And the mark for an empty quoted part was U+0001 in the text,
so a real U+0001 in a word was dropped with it.

A sequence now needs every character between its braces unquoted and two
ends of one kind, numbers (with a sign) or letters. A zero-padded or stepped
one is unknown, so the path asks in every mode, because bash 3.2 pads no
number and leaves a step literal. The empty-quote mark is a character kind
of its own, so no character of the word is taken for it.

- fix(permissions): read vim's -s by the options before it

vim reads `-s file` as a keystroke script, but after `-e` or `-E` (`-es`)
`-s` is the silent flag. The registry gave `-s` one arity, so in
`vim -es -c '!cat ~/.ssh/id_rsa' -c q` it took `-c` as its value, and the
shell command was not read, so Full mode ran it.

A text program may now have readings: specs chosen by the arguments, each
analyzed. vim's first `-s` is a flag when an `-e` or `-E` came before it,
and a word from a variable before it may be one, so both readings are
analyzed then.

- fix(permissions): keep a prefix off a word whose glob may expand to an option

A part's options came from its words as written, so `git diff *` under the
prefix `git diff` ran without a card in Ask mode, though `*` expands to a
file named `--output=o.txt` when one exists.

A word with an unquoted glob character that has nothing or a dash before it
now makes the part's options unknown, so a prefix does not cover it; a glob
after a path (`src/*.ts`) cannot expand to an option and stays covered. The
README no longer lists this as a known gap.

- fix(permissions): say plainly not to reach a blocked target another way

The blocked next step now reads "Don't reach it another way: not by splitting the command, and not with a script." before it asks the model to hand the task to the user.

- docs(permissions): list the new forms of a path the analyzer cannot place

A ~user home, a zero-padded or stepped brace sequence, and a word from a variable where a program takes a file or an option (cat --$_, env --chdir=$X) now ask in every mode.

- fix(permissions): expand braces as both bash 3.2 and bash 4+ do, and check every word

The analyzer modeled bash 4+ only, but pi runs /bin/bash, which is 3.2 on
macOS. bash 3.2 drops a group with `..` or a nested comma that bash 4+ keeps
(`{../x{a,b}}` is `../xa ../xb` in 3.2 and `{../xa} {../xb}` in 5.3), and
leaves a whole word as written after a group that is not a sequence. So
`cat {~/w/../.ssh/i{d,x}_rsa}` read the key in 3.2 with no signal in any
mode.

expand.ts now expands each word's braces under both rule sets, on the
groups both bashes find (bash's brace_gobbler), and the checks see every
word of both: a credential path in either reading is denied, and where the
readings differ the command asks in every mode. bash 4+'s reading keeps a
sequence's step and zero padding, as bash 5 does; bash 3.2's has neither.
The text before a group is no longer expanded again with what follows it.
bash 4+'s `${x@Q}` and case changes, which 3.2 refuses, are read through.

A differential test checks the kit against the words bash 3.2 and bash 5
make of 71 brace forms, recorded with printf as a fixture so Linux CI runs
it too, and checks the recording against each bash at hand.

- test(permissions): seed the differential tests with a sound PRNG, and check what they draw

The four differential tests drew their cases from one float LCG whose
product passes 2^53, so `state % n` read near-constant bits: hard-deny drew
3 of its 8 wraps and never `{${w}}`, bash-coverage drew `git status` 820
times in 854, and the arithmetic seeds converged. That is how the bash 3.2
brace forms stayed hidden.

They now share **tests**/differential.ts: mulberry32 with int(n) from the
high bits, and a check that every entry of every list was drawn in each
seed. runBash runs real bash in a fenced env (no-op launchers first on
PATH, editors and pagers set to true, HOME and TMPDIR under the test's
root) and fails on an error, a signal or a missing @END marker.
bash-coverage keeps one log per case, waits for the jobs a case leaves in
the background through its process group, and its shims write each record
in one write. The arithmetic test reads the kit three ways (arithmetic,
commands, or unread) and checks that every unread form asks in every mode.

- fix(permissions): word the next steps as short plain sentences

The blocked step reads "Don't reach it another way. Don't split the command, and don't put it in a script. If the task needs it, ask the user to do it." The unread step reads "Don't put it in a script. Rewrite it as simpler commands, or use the read tool to read a file."

- docs(permissions): say which calls get no grant at all, and what the arity table does not cover

A call that raises unresolvable-path, placeholder-in-command or secret-into-plain-file gets no grant options, and even an exact grant asks. The arity table's entries run no code from their own words, but the script-runner, package-script and test classes run a script the kit does not read.

- fix(permissions): read option ends and option values as each program does

* A `--` ends the options of a program whose options stop at its first
  operand (env, the builtins, git, ssh) at the word after it, so
  `env -- cat ~/.ssh/id_rsa` reads the command that follows.
* An optional value is glued only: diff's `--color`, cp's and install's
  `--context`, and tar's `--checkpoint` no longer take the next word, which
  hid the file after them.
* touch, mkdir, mkfifo and truncate each read their own options, so
  `touch -m .pi/ext.js` is a write to `.pi/ext.js`.
* psql's `-L` is always a file, and `-o` is a pipe only when its first
  character is `|`, as psql opens them.
* psql (and every program with a command language) reads stdin when any
  action option is `-`, so `psql -f - -c 'select 1'` reads its input.

- fix(permissions): read curl's and wget's file options through the registry

* curl's and wget's options that read or write a file are declared in the
  registry with their effect, and applyEffects applies them, as for every
  other program. So a word from a variable that may be one of them
  (`read -r O <<< -o; curl "$O" .pi/ext.js URL`) asks in every mode, like
  any path the analysis cannot place. curl's `--capath` is checked too.
* An option spec can mark `-` as stdin or stdout (`curl -o -`, `wget -O -`,
  `psql -f -`), so that value is not a file named `-`.
* A word from a variable may be an option only when what it certainly starts
  with, after quote removal, is not plain text. `"http://localhost:$PORT/x"`
  and `printf "Hello $NAME\n"` are no option; `"$X"` and `--$X` still are.

- fix(permissions): scope prefix assignments, and set REPLY, ${X:=…} and a for name

* An assignment before a command word, or after a wrapper (`env F=x cmd`),
  holds for that command only, and its name goes back to what it was after
  it. So `F=~/.ssh/id_rsa; F=README.md true; cat $F` is denied, and
  `OPENAI_API_KEY=x true; echo $OPENAI_API_KEY` still expands the secret.
* Before a POSIX special builtin (`:`, `eval`, `export`, …), where POSIX sh
  keeps the assignment and bash does not, the name is unknown after it, and
  a name the command never set before still counts as the environment's.
* Assignments alone take effect in order and before their redirections
  (`A=x B=$A`, `F=x >$F`), as POSIX says. Before a command, bash 3.2 expands
  them all first and bash 4+ one at a time, so one that refers to an
  earlier one is unknown.
* `read` with no name and no `-a` sets REPLY, `${X=…}` and `${X:=…}` set X to
  the fallback they take, and `for NAME in …` sets NAME.

- fix(permissions): split env -S and sudo -s words as those programs do

* `env -S` splits only its value, by env's own rules (blanks, quotes, `\_`,
  `#` at a word's start, `\c`), and the words after the option stay
  separate words of the command. So `env -S 'cat' '#' ~/.ssh/id_rsa` reads
  the key. A value the analysis cannot split asks, and the words after it
  are checked as the operands of an unknown command.
* `sudo -s` and `sudo -i` hand the shell each word with every character but
  a letter, digit, `_`, `-` or `$` escaped, as sudo does, so a `#` word is
  no comment there.
* A wrapper can give the analyzer new words to run, which env -S needs.

- fix(permissions): model stdin by fd 0 order, compound commands and printed text

* A command reads the redirection bash applies to fd 0 last, which wins over
  a pipe and every one before it: `mysql <<< '/*' <<< $'system …'` reads
  only the second here-string. `<&3` and other copies of fd 0 are a stdin
  the analysis cannot see.
* A pipe into a compound command (`( … )`, `{ …; }`, `if`, a loop, `case`)
  feeds every command in it until it closes, and so do the redirections
  after it closes (`(xargs cat) <<< key`, `done < list`).
* A shell string run by `sh -c`, `eval`, `sudo -s`, `su -c`, `npx -c` or
  `watch` reads the stdin of the command that runs it; one a program runs
  from an option (a pager, tar's `--to-command`) reads a stdin the
  analysis cannot see.
* xargs reads the text the program before it prints, the exact output of
  `echo` and `printf`, not their arguments, and splits it as xargs does:
  blanks and newlines, quotes and backslashes. Output the analysis cannot
  build gives unknown items.
* xargs's options come from the registry, clusters (`-tI{}`) included. With
  `-I` each line is one item and one run of its own, read the GNU way and
  the BSD way, BSD's `-J` puts the items at its word, and `-0`, `-d` or an
  option from a variable leave the items unseen.
* A command xargs runs prints the output of every run it makes, so its
  output is unknown to the next command.

- fix(permissions): build every exact key in one place, and none for a blank command

* `exactKey` normalizes a command and refuses a blank one (empty, or only
  blanks and newlines), a `«secret:…»` placeholder and a command over 64 KB.
  A card's options, `parseGrantMatch` and `parseCommandPattern` all use it,
  so the card, the stored grant and the rule editor agree on every key.
* A blank command, such as `\n`, gets no grant option, and a stored exact
  grant for one no longer loads. It runs nothing, so a rule for it covers
  nothing.

- test(permissions): make the coverage and ssh oracles fail where they should

* The coverage oracle counts only prefixes the kit honours: `git rebase`
  and `git push` stay held, and one list of exact-only git commands, which
  the prefix-guard tests read too, keeps them out of the covered set. So a
  table that listed them fails the oracle.
* Each DEBUG record's first word must start a covered command, so a prefix
  that let `X=1 git status` through fails it.
* The exact grants are commands no prefix covers (`git stash list`,
  `npm run lint`), compared as argument vectors, so the exact branch
  decides cases.
* `ssh -G` throws with its stderr on an error or a non-zero status, like
  `runBash`, so a case OpenSSH rejects cannot pass as one that runs nothing.
* The tar `--to-command` row extracts, the only mode that runs it.
* The workspace snapshot says what it measures.

- docs(permissions): say the analysis is defense in depth, and describe round-3 behavior

* The threat model says plainly that the bash analysis is defense in depth,

## [0.2.1](https://github.com/constructive-io/constructive/compare/@agentic-kit/permissions@0.2.0...@agentic-kit/permissions@0.2.1) (2026-11-23)

**Note:** Version bump only for package @agentic-kit/permissions

# 0.2.0 (2026-10-16)

### Bug Fixes

- **permissions:** label the project grant option "Always allow …" ([7a043d9](https://github.com/constructive-io/constructive/commit/7a043d97d8b6667d92f38bc9d761f02d50a45f34))
- **permissions:** read every option spelling and ask for any path the analyzer cannot place ([4e77a93](https://github.com/constructive-io/constructive/commit/4e77a9302bc08b0b1e2529cb8c92ae1b6318c498))
- **permissions:** restore by the real file, learn format-known secrets, and compile token scans once ([97bf9a3](https://github.com/constructive-io/constructive/commit/97bf9a3929028a752ac60408989017d37eb8383c))
- **permissions:** say "it" for the one target a path card already shows ([555e4c7](https://github.com/constructive-io/constructive/commit/555e4c7d37384c051a0665245883a7c263fe66eb))
- **permissions:** treat a wget body from a variable as an upload, as curl does ([692efc1](https://github.com/constructive-io/constructive/commit/692efc16eb9d49b56f1dcf11b9adb2cfca601ebd))

### Features

- **permissions:** add the bash risk analyzer ([f2333b6](https://github.com/constructive-io/constructive/commit/f2333b6661d9d7c948fdb5c9b2fc72af6ef3a098))
- **permissions:** add the permissions package and its shared model ([7662e7f](https://github.com/constructive-io/constructive/commit/7662e7f9fada3b579a6e046de4a48a58063e21bb))
- **permissions:** add the secret vault, result redaction and env scrub ([3667b74](https://github.com/constructive-io/constructive/commit/3667b741c8c10263d8ebd699b7c9ba3d8694d193))
- **permissions:** classify tool calls, decide by policy, and expose the engine ([47eda7f](https://github.com/constructive-io/constructive/commit/47eda7fab949484e649e459010a33b59831793b9))
- **permissions:** list host hard-deny paths again at every decision ([337c707](https://github.com/constructive-io/constructive/commit/337c707fc0c6819654f4192293c38ceafe1fb751))
