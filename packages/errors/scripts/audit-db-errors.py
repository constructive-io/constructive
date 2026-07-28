#!/usr/bin/env python3
"""Fresh audit of every EXCEPTION/THROW in constructive-db.

Scans source deploy SQL, TS/JS generators, and generated output. Extracts the
leading ALL_CAPS code token from each raised message; records dynamic-arg flag,
sample message, and source-vs-generated provenance.

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


def iter_files(globs):
    seen = set()
    for g in globs:
        for path in glob.glob(g, recursive=True):
            if os.path.isfile(path) and path not in seen:
                seen.add(path)
                yield path


def scan(globs):
    """Return { code: {count, dynamic, sample, files:set} } and phrase list."""
    codes = {}
    phrases = []
    for path in iter_files(globs):
        try:
            text = open(path, errors='replace').read()
        except OSError:
            continue
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
    return codes, phrases


src_codes, src_phrases = scan(SOURCE_GLOBS)
gen_codes, gen_phrases = scan(GENERATED_GLOBS)

all_codes = sorted(set(src_codes) | set(gen_codes))
inv = {}
for code in all_codes:
    s = src_codes.get(code)
    g = gen_codes.get(code)
    dynamic = (s and s['dynamic']) or (g and g['dynamic']) or False
    sample = (s or g)['sample']
    n_source = len(s['files']) if s else 0
    n_generated = len(g['files']) if g else 0
    inv[code] = {
        'count': (s['count'] if s else 0) + (g['count'] if g else 0),
        'dynamic': bool(dynamic),
        'sample': sample,
        'n_source': n_source,
        'n_generated': n_generated,
        'source_files': sorted(s['files'])[:5] if s else [],
    }

OUT = os.path.join(HERE, 'db-error-inventory.json')
json.dump(inv, open(OUT, 'w'), indent=2)
print(f'Wrote {OUT}')

generated_only = [c for c in all_codes if inv[c]['n_source'] == 0]
dynamic_codes = [c for c in all_codes if inv[c]['dynamic']]
print(f'TOTAL distinct codes: {len(all_codes)}')
print(f'  with source def:    {sum(1 for c in all_codes if inv[c]["n_source"] > 0)}')
print(f'  generated-only:     {len(generated_only)}')
print(f'  dynamic (%-args):   {len(dynamic_codes)}')
print(f'  phrase-only throws: {len(set(p for p,_ in src_phrases))} distinct (source)')
