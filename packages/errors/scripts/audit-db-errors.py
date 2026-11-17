#!/usr/bin/env python3
"""Fresh audit of every EXCEPTION/THROW in constructive-db.

Scans source deploy SQL, TS/JS generators, and generated output. Extracts the
leading ALL_CAPS code token from each raised message; records dynamic-arg flag,
sample message, and source-vs-generated provenance.

Provenance is recorded as counts only. This package is published, so the
inventory must not carry constructive-db file paths — they would map out the
private schema layout, and only `n_source > 0` is ever consumed (to mark a
code generator-only).

Writes the inventory to `scripts/db-error-inventory.json` (the committed snapshot
consumed by generate-registry.py). Regenerate the registry afterwards:

    CONSTRUCTIVE_DB_DIR=~/repos/constructive-db python3 scripts/audit-db-errors.py
    python3 scripts/generate-registry.py

Environment:
    CONSTRUCTIVE_DB_DIR   Path to the constructive-io/constructive-db checkout.
                          Defaults to ~/repos/constructive-db.
"""
import json, os, re, glob

BASE = os.path.abspath(
    os.environ.get('CONSTRUCTIVE_DB_DIR')
    or os.path.expanduser('~/repos/constructive-db')
)
HERE = os.path.dirname(os.path.abspath(__file__))

# Corpora ---------------------------------------------------------------------
SOURCE_GLOBS = [
    f'{BASE}/packages/*/deploy/**/*.sql',
    f'{BASE}/packages/*/src/**/*.ts',
    f'{BASE}/application/app/deploy/**/*.sql',
    f'{BASE}/services/**/deploy/**/*.sql',
]
GENERATED_GLOBS = [
    f'{BASE}/packages/*/sql/*.sql',
    f'{BASE}/application/**/*.sql',
    f'{BASE}/sdk/**/*.ts',
    f'{BASE}/testing/**/*.sql',
    f'{BASE}/dump.sql',
]

# Raise call patterns: capture the FIRST string-literal argument. -------------
# raise_exception('...'), if_not_found_raise('...'), throw('...'),
# plpgsql_stmt_raise(..., v_message := '...'), RAISE EXCEPTION '...'
CALL_RES = [
    re.compile(r"raise_error\s*\(\s*'((?:''|[^'])*)'", re.I),
    re.compile(r"raise_exception\s*\(\s*'((?:''|[^'])*)'", re.I),
    re.compile(r"if_not_found_raise\s*\(\s*'((?:''|[^'])*)'", re.I),
    re.compile(r"\bthrow\s*\(\s*'((?:''|[^'])*)'", re.I),
    re.compile(r"v_message\s*:=\s*'((?:''|[^'])*)'", re.I),
    re.compile(r"RAISE\s+EXCEPTION\s+'((?:''|[^'])*)'", re.I),
    # TS generators: raiseException('CODE'), .throw('CODE'), "message: 'CODE'"
    re.compile(r"raiseException\s*\(\s*'((?:\\.|[^'])*)'"),
    re.compile(r"raiseException\s*\(\s*\"((?:\\.|[^\"])*)\""),
]

CODE_RE = re.compile(r'^([A-Z][A-Z0-9_]{2,})')

# Canonical transport: errors.raise_error('CODE', <context>, 'class'). The class
# is authoritative (the DB is the source of truth for public/internal), so we
# capture it directly rather than re-deriving it from a prefix heuristic.
RAISE_ERROR_CODE_RE = re.compile(r"raise_error\s*\(\s*'([A-Z][A-Z0-9_]{2,})'", re.I)
CLASS_LITERAL_RE = re.compile(r"'(public|internal)'")


def scan_classes(text, classes):
    """Capture the authoritative class from each errors.raise_error(...) call.

    Walks from each call's opening paren to its matching close (tracking depth so
    nested jsonb_build_object(...) is handled), then reads the trailing
    'public'/'internal' literal. Only an EXPLICIT class literal is recorded — a
    single-arg call like errors.raise_error('CODE') relies on the helper's
    DEFAULT ('internal'), which is an unspecified default rather than a
    deliberate classification, so it is left unknown and later resolved by the
    heuristic. When a code is raised with mixed explicit classes, 'public' wins
    (the more exposed contract).
    """
    for m in RAISE_ERROR_CODE_RE.finditer(text):
        code = m.group(1)
        # Advance to the call's opening paren, then find its matching close.
        open_idx = text.find('(', m.start())
        if open_idx == -1:
            continue
        depth = 0
        end_idx = -1
        for i in range(open_idx, min(len(text), open_idx + 4000)):
            c = text[i]
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    end_idx = i
                    break
        if end_idx == -1:
            continue
        call = text[open_idx:end_idx + 1]
        found = CLASS_LITERAL_RE.findall(call)
        if not found:
            continue  # defaulted class — leave unknown for the heuristic
        klass = found[-1]
        prev = classes.get(code)
        classes[code] = 'public' if (prev == 'public' or klass == 'public') else klass


# Indirect raises -------------------------------------------------------------
# A generator often hands the code to a raise helper instead of spelling it at
# the raise: `raise_error(wrong_status_code, ctx, 'internal')` in the helper,
# `wrong_status_code := 'FILE_STATUS_INVALID'` at the caller. The literal-first-
# argument patterns above never see those codes, so they are resolved here.
IDENT = r'[a-z_][a-z0-9_]*'
# raise_error(<param>, ...) / raise_exception(<param>, ...): the code is a parameter.
PARAM_RAISE_RE = re.compile(rf"raise_(?:error|exception)\s*\(\s*({IDENT})\s*[,)]")
# raise_error(<param> || '_SUFFIX', ...): the code is a parameter plus a suffix.
PREFIX_RAISE_RE = re.compile(rf"raise_error\s*\(\s*({IDENT})\s*\|\|\s*'([A-Z0-9_]+)'")
NAMED_ARG_RE = re.compile(rf"\b({IDENT})\s*:=\s*'([A-Z][A-Z0-9_]{{2,}})'")
PARAM_DEFAULT_RE = re.compile(rf"\b({IDENT})\s+text\s+DEFAULT\s+'([A-Z][A-Z0-9_]{{2,}})'")
# A code carried in a jsonb payload that a generator later raises verbatim.
JSON_CODE_RE = re.compile(r"'error_code'\s*,\s*'([A-Z][A-Z0-9_]{2,})'")
CREATE_FUNCTION_RE = re.compile(rf"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+((?:{IDENT}\.)?{IDENT})\s*\(", re.I)
LITERAL_CODE_RE = re.compile(r"^'([A-Z][A-Z0-9_]{2,})'$")
SQL_COMMENT_RE = re.compile(r'^\s*--.*$', re.M)
SQL_KEYWORDS = {'null', 'true', 'false', 'format', 'coalesce', 'concat'}


def call_span(text, open_idx, limit=20000):
    """Index of the paren matching the one at open_idx, or -1."""
    depth = 0
    in_str = False
    for i in range(open_idx, min(len(text), open_idx + limit)):
        c = text[i]
        if c == "'":
            in_str = not in_str
        elif in_str:
            continue
        elif c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                return i
    return -1


def split_args(body):
    """Split a call's argument text on its top-level commas."""
    args, depth, in_str, start = [], 0, False, 0
    for i, c in enumerate(body):
        if c == "'":
            in_str = not in_str
        elif in_str:
            continue
        elif c in '([':
            depth += 1
        elif c in ')]':
            depth -= 1
        elif c == ',' and depth == 0:
            args.append(body[start:i].strip())
            start = i + 1
    args.append(body[start:].strip())
    return args


def merge_class(prev, klass):
    """'public' wins over 'internal'; an unknown class never overwrites a known one."""
    if prev == 'public' or klass == 'public':
        return 'public'
    return klass or prev


def scan_raise_params(texts):
    """Find the parameters that carry a code into a raise.

    Returns ({param: class}, [(function, arg_index, suffix, class)]) — the second
    for `raise_error(param || '_SUFFIX', ...)`, resolved against the positional
    arguments of the calls to the function that declares the parameter.
    """
    params = {}
    prefixed = []
    for text in texts:
        # Comments describe the SQL a helper emits, not the helper's own call.
        text = SQL_COMMENT_RE.sub('', text)
        for m in PARAM_RAISE_RE.finditer(text):
            name = m.group(1)
            if name in SQL_KEYWORDS:
                continue
            end = call_span(text, text.find('(', m.start()))
            if end == -1:
                continue
            found = CLASS_LITERAL_RE.findall(text[m.start():end + 1])
            params[name] = merge_class(params.get(name), found[-1] if found else None)
        for m in PREFIX_RAISE_RE.finditer(text):
            name, suffix = m.group(1), m.group(2)
            end = call_span(text, text.find('(', m.start()))
            found = CLASS_LITERAL_RE.findall(text[m.start():end + 1]) if end != -1 else []
            klass = found[-1] if found else None
            # The function whose signature declares the parameter.
            owner = None
            for f in CREATE_FUNCTION_RE.finditer(text[:m.start()]):
                owner = f
            if not owner:
                continue
            open_idx = owner.end() - 1
            sig_end = call_span(text, open_idx)
            if sig_end == -1:
                continue
            sig = split_args(text[open_idx + 1:sig_end])
            for idx, decl in enumerate(sig):
                if decl.split() and decl.split()[0] == name:
                    prefixed.append((owner.group(1), idx, suffix, klass))
    return params, prefixed


def scan_indirect(text, params, prefixed):
    """Yield (code, class) for each code this text hands to a raise parameter."""
    for rex in (NAMED_ARG_RE, PARAM_DEFAULT_RE):
        for m in rex.finditer(text):
            if m.group(1) in params:
                yield m.group(2), params[m.group(1)]
    for m in JSON_CODE_RE.finditer(text):
        yield m.group(1), None
    for fn, idx, suffix, klass in prefixed:
        for m in re.finditer(re.escape(fn) + r'\s*\(', text):
            if re.search(r'FUNCTION\s+$', text[max(0, m.start() - 40):m.start()], re.I):
                continue
            end = call_span(text, m.end() - 1)
            if end == -1:
                continue
            args = split_args(text[m.end():end])
            lit = LITERAL_CODE_RE.match(args[idx]) if idx < len(args) else None
            if lit:
                yield lit.group(1) + suffix, klass


def iter_files(globs):
    seen = set()
    for g in globs:
        for path in glob.glob(g, recursive=True):
            if os.path.isfile(path) and path not in seen:
                seen.add(path)
                yield path


def read_all(globs):
    out = []
    for path in iter_files(globs):
        try:
            out.append((path, open(path, errors='replace').read()))
        except OSError:
            continue
    return out


def scan(files, params, prefixed):
    """Return { code: {count, dynamic, sample, files:set} }, classes, phrases."""
    codes = {}
    classes = {}
    indirect_classes = {}
    phrases = []
    for path, text in files:
        scan_classes(text, classes)
        for code, klass in scan_indirect(text, params, prefixed):
            e = codes.setdefault(code, {
                'count': 0, 'dynamic': False, 'sample': '', 'files': set()
            })
            e['count'] += 1
            e['files'].add(os.path.relpath(path, BASE))
            if klass:
                indirect_classes[code] = merge_class(indirect_classes.get(code), klass)
        for rex in CALL_RES:
            for m in rex.finditer(text):
                msg = m.group(1).replace("''", "'")
                cm = CODE_RE.match(msg)
                if not cm:
                    if msg.strip():
                        phrases.append((msg.strip()[:80], path))
                    continue
                code = cm.group(1)
                e = codes.setdefault(code, {
                    'count': 0, 'dynamic': False, 'sample': msg, 'files': set()
                })
                e['count'] += 1
                if '%' in msg:
                    e['dynamic'] = True
                # prefer a longer, more descriptive sample
                if len(msg) > len(e['sample']):
                    e['sample'] = msg
                rel = os.path.relpath(path, BASE)
                e['files'].add(rel)
    # A class spelled at a literal raise is authoritative; the class of the
    # helper a code was handed to only fills in when there is none.
    for code, klass in indirect_classes.items():
        classes.setdefault(code, klass)
    return codes, classes, phrases


src_files = read_all(SOURCE_GLOBS)
gen_files = read_all(GENERATED_GLOBS)
raise_params, prefixed_raises = scan_raise_params(text for _, text in src_files)
src_codes, src_classes, src_phrases = scan(src_files, raise_params, prefixed_raises)
gen_codes, gen_classes, gen_phrases = scan(gen_files, raise_params, prefixed_raises)

all_codes = sorted(set(src_codes) | set(gen_codes))
inv = {}
for code in all_codes:
    s = src_codes.get(code)
    g = gen_codes.get(code)
    dynamic = (s and s['dynamic']) or (g and g['dynamic']) or False
    # A code only ever handed to a helper has no message of its own in source.
    sample = (s and s['sample']) or (g and g['sample']) or code
    n_source = len(s['files']) if s else 0
    n_generated = len(g['files']) if g else 0
    # Authoritative class from the DB's errors.raise_error(...) calls; source
    # wins over generated, public wins over internal when both appear.
    klass = None
    for m in (src_classes.get(code), gen_classes.get(code)):
        if m == 'public':
            klass = 'public'
            break
        if m and klass is None:
            klass = m
    entry = {
        'count': (s['count'] if s else 0) + (g['count'] if g else 0),
        'dynamic': bool(dynamic),
        'sample': sample,
        'n_source': n_source,
        'n_generated': n_generated,
    }
    if klass is not None:
        entry['class'] = klass
    inv[code] = entry

OUT = os.path.join(HERE, 'db-error-inventory.json')
json.dump(inv, open(OUT, 'w'), indent=2)
print(f'Wrote {OUT}')

n_class_public = sum(1 for c in all_codes if inv[c].get('class') == 'public')
n_class_internal = sum(1 for c in all_codes if inv[c].get('class') == 'internal')
n_class_unknown = sum(1 for c in all_codes if 'class' not in inv[c])
print(f'  class=public (DB):  {n_class_public}')
print(f'  class=internal(DB): {n_class_internal}')
print(f'  class unknown:      {n_class_unknown}')
generated_only = [c for c in all_codes if inv[c]['n_source'] == 0]
dynamic_codes = [c for c in all_codes if inv[c]['dynamic']]
print(f'TOTAL distinct codes: {len(all_codes)}')
print(f'  with source def:    {sum(1 for c in all_codes if inv[c]["n_source"] > 0)}')
print(f'  generated-only:     {len(generated_only)}')
print(f'  dynamic (%-args):   {len(dynamic_codes)}')
print(f'  raise parameters:   {", ".join(sorted(raise_params))}')
print(f'  phrase-only throws: {len(set(p for p,_ in src_phrases))} distinct (source)')
