#!/usr/bin/env python3
"""Generate `src/generated/registry.generated.ts` from the constructive-db error
audit.

This is the reproducible source of truth for the full error registry. It reads
the committed audit inventory (`scripts/db-error-inventory.json`) — a snapshot of
every code raised via EXCEPTION/THROW across constructive-db deploy sources and
generated output — and, when available, seeds user-facing copy from the dashboard
error catalogs.

Usage:
    python3 scripts/generate-registry.py

Environment:
    DASHBOARD_DIR   Optional path to the constructive-io/dashboard checkout used
                    to seed public copy. Defaults to ../../../dashboard, then
                    ~/repos/dashboard. If not found, humanized copy is used.

Regenerate whenever the inventory changes (re-run the constructive-db audit and
overwrite scripts/db-error-inventory.json first).
"""
import glob
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
INVENTORY = os.path.join(HERE, 'db-error-inventory.json')
OUT = os.path.join(PKG, 'src', 'generated', 'registry.generated.ts')


def find_dashboard():
    candidates = [
        os.environ.get('DASHBOARD_DIR'),
        os.path.join(PKG, '..', '..', '..', 'dashboard'),
        os.path.expanduser('~/repos/dashboard'),
    ]
    for c in candidates:
        if c and os.path.isdir(c):
            return os.path.abspath(c)
    return None


# ---------------------------------------------------------------------------
# 1. Load the authoritative inventory.
# ---------------------------------------------------------------------------
inv = json.load(open(INVENTORY))

# ---------------------------------------------------------------------------
# 2. Collect user-facing copy from the dashboard (auth-errors + block catalogs).
# ---------------------------------------------------------------------------
copy = {}  # CODE -> message


def add_copy(code, msg):
    if not msg:
        return
    if code not in copy or len(msg) > len(copy[code]):
        copy[code] = msg


pair_re = re.compile(r"\b([A-Z][A-Z0-9_]+)\s*:\s*(['\"])((?:\\.|(?!\2).)*)\2")

dashboard = find_dashboard()
if dashboard:
    globs = (
        glob.glob(f'{dashboard}/**/messages.ts', recursive=True)
        + glob.glob(f'{dashboard}/**/auth-errors.ts', recursive=True)
    )
    for path in globs:
        try:
            text = open(path).read()
        except OSError:
            continue
        for m in pair_re.finditer(text):
            code, _q, msg = m.group(1), m.group(2), m.group(3)
            if msg == code:
                continue
            msg = msg.replace("\\'", "'").replace('\\"', '"')
            add_copy(code, msg)

# ---------------------------------------------------------------------------
# 3. Classification: public (user-facing, localizable) vs internal (invariants).
# ---------------------------------------------------------------------------
PUBLIC_EXPLICIT = {
    'GRAPHQL_VALIDATION_FAILED', 'GRAPHQL_PARSE_FAILED', 'PERSISTED_QUERY_NOT_FOUND',
    'PERSISTED_QUERY_NOT_SUPPORTED', 'UNAUTHENTICATED', 'NOT_AUTHENTICATED',
    'USER_NOT_AUTHENTICATED', 'FORBIDDEN', 'BAD_USER_INPUT', 'INCORRECT_PASSWORD',
    'PASSWORD_INSECURE', 'ACCOUNT_LOCKED', 'ACCOUNT_LOCKED_EXCEED_ATTEMPTS',
    'ACCOUNT_DISABLED', 'ACCOUNT_EXISTS', 'ACCOUNT_NOT_FOUND', 'USER_NOT_FOUND',
    'INVALID_USER', 'INVALID_TOKEN', 'INVALID_CODE', 'NO_PRIMARY_EMAIL', 'NO_CREDENTIALS',
    'PASSWORD_LEN', 'INVITE_NOT_FOUND', 'INVITE_LIMIT', 'INVITE_EMAIL_NOT_FOUND',
    'EMAIL_NOT_VERIFIED', 'PROFILE_ASSIGNMENT_REQUIRES_EMAIL_INVITE',
    'ASSIGN_PROFILES_PERMISSION_REQUIRED', 'PROFILE_NOT_FOUND', 'PROFILE_EXCEEDS_PERMISSIONS',
    'MEMBERSHIP_NOT_FOUND', 'INVALID_CREDENTIALS', 'SIGN_UP_DISABLED',
    'PASSWORD_SIGN_IN_DISABLED', 'PASSWORD_SIGN_UP_DISABLED', 'SSO_SIGN_IN_DISABLED',
    'SSO_SIGN_UP_DISABLED', 'SSO_ACCOUNT_NOT_FOUND', 'CONNECTED_ACCOUNT_NOT_FOUND',
    'MAGIC_LINK_SIGN_IN_DISABLED', 'MAGIC_LINK_SIGN_UP_DISABLED', 'EMAIL_OTP_SIGN_IN_DISABLED',
    'SMS_SIGN_IN_DISABLED', 'SMS_SIGN_UP_DISABLED', 'CSRF_TOKEN_REQUIRED', 'INVALID_CSRF_TOKEN',
    'TOO_MANY_REQUESTS', 'PASSWORD_RESET_LOCKED_EXCEED_ATTEMPTS', 'TOTP_NOT_ENABLED',
    'TOTP_ALREADY_ENABLED', 'TOTP_SETUP_NOT_INITIATED', 'MFA_REQUIRED', 'MFA_CHALLENGE_EXPIRED',
    'INVALID_MFA_CHALLENGE', 'STEP_UP_REQUIRED', 'STEP_UP_REQUIRED_PASSWORD',
    'STEP_UP_REQUIRED_PASSWORD_OR_MFA', 'SESSION_NOT_FOUND', 'API_KEY_NOT_FOUND',
    'CANNOT_DISCONNECT_LAST_AUTH_METHOD', 'CANNOT_REVOKE_CURRENT_SESSION', 'NOT_FOUND',
    'NULL_VALUES_DISALLOWED', 'OBJECT_NOT_FOUND', 'OBJECT_NO_UPDATE', 'LIMIT_REACHED',
    'REQUIRES_ONE_OWNER', 'DELETE_FIRST', 'REF_NOT_FOUND', 'CROSS_DATABASE_REF',
    'GROUPS_REQ_ENTITIES', 'ALREADY_SCHEDULED', 'SINGLETON_TABLE', 'IMMUTABLE_FIELD',
    'IMMUTABLE_PROPS', 'IMMUTABLE_PEOPLESTAMPS', 'IMMUTABLE_TIMESTAMPS',
    'CONST_TYPE_FIELDS_IMMUTABLE', 'FEATURE_DISABLED', 'INVALID_PUBLIC_KEY', 'INVALID_MESSAGE',
    'INVALID_SIGNATURE', 'NO_ACCOUNT_EXISTS', 'BAD_SIGNIN', 'UPLOAD_MIMETYPE',
    'API_KEYS_DISABLED', 'API_KEY_LIMIT_REACHED', 'IDENTITY_PROVIDER_NOT_FOUND',
    'IDENTITY_SIGN_IN_DISABLED', 'IDENTITY_SIGN_UP_DISABLED', 'MANAGED_DOMAIN_PUBLISH_FORBIDDEN',
    'WEBAUTHN_SIGN_IN_DISABLED', 'WEBAUTHN_SIGN_UP_DISABLED', 'PRIMARY_AUTH_METHOD_MISMATCH',
    'AUTH_METHOD_NOT_ALLOWED', 'EXTERNAL_MEMBERS_NOT_ALLOWED', 'RATE_LIMIT_EXCEEDED',
    'TRANSFER_EXPIRED', 'EMAIL_OTP_SIGN_UP_DISABLED', 'SMS_OTP_SIGN_IN_DISABLED',
    'WEBAUTHN_NOT_ENABLED', 'INVITE_EXPIRED', 'INVITE_ALREADY_USED',
}

PUBLIC_PREFIXES = (
    'ACCOUNT_', 'PASSWORD_', 'INVITE_', 'MFA_', 'TOTP_', 'STEP_UP_', 'SSO_', 'SMS_',
    'EMAIL_OTP_', 'MAGIC_LINK_', 'WEBAUTHN_', 'IDENTITY_', 'SESSION_', 'API_KEY_',
    'RATE_', 'CSRF_', 'PROFILE_', 'MEMBERSHIP_', 'AUTH_METHOD_', 'SIGN_UP_', 'SIGN_IN_',
)
INTERNAL_PREFIXES = (
    'DATA_', 'APPLY_', 'BUILD_', 'CONSTRUCT_', 'CATALOG', 'ALTER_TABLE', 'DOMAIN_',
    'PROVISION', 'SEARCH_', 'AST_', 'DEPARSE', 'RLS_', 'AUTHZ_', 'SPRT', 'META_',
    'INTROSPECT', 'CODEGEN', 'GENERATOR', 'SCHEMA_', 'TRIGGER_', 'POLICY_', 'GRANT_',
    'SEED_', 'SNAPSHOT', 'NODE_', 'EXPR', 'STMT', 'RELATION_', 'FIELD_', 'TABLE_',
)
# Developer invariants a domain prefix would otherwise mark public — force internal.
INTERNAL_EXPLICIT = {
    'MEMBERSHIP_TYPE_MUST_BE_INT',
}


def classify(code):
    if code in INTERNAL_EXPLICIT:
        return 'internal'
    if code in PUBLIC_EXPLICIT or code in copy:
        return 'public'
    if code.startswith(INTERNAL_PREFIXES):
        return 'internal'
    if code.startswith(PUBLIC_PREFIXES):
        return 'public'
    return 'internal'


# ---------------------------------------------------------------------------
# 4. HTTP status heuristic.
# ---------------------------------------------------------------------------
def http_for(code, klass):
    if klass == 'internal':
        return 500
    if code.endswith('_NOT_FOUND') or code == 'NOT_FOUND':
        return 404
    if code.endswith('_EXISTS') or 'ALREADY' in code:
        return 409
    if 'LIMIT' in code or 'RATE' in code or 'TOO_MANY' in code:
        return 429
    if 'LOCKED' in code:
        return 423
    if any(k in code for k in ('FORBIDDEN', 'DISABLED', 'NOT_ALLOWED', 'PERMISSION',
                               'STEP_UP', 'MFA', 'REQUIRES', 'IMMUTABLE')):
        return 403
    if any(k in code for k in ('UNAUTHENTICATED', 'NOT_AUTHENTICATED', 'CREDENTIALS',
                               'INCORRECT_PASSWORD', 'INVALID_TOKEN', 'INVALID_CODE',
                               'INVALID_SIGNATURE', 'SIGNIN', 'CSRF')):
        return 401
    return 400


# ---------------------------------------------------------------------------
# 5. Message: dashboard copy > humanized (public) > developer sample (internal).
# ---------------------------------------------------------------------------
def humanize(code):
    words = code.replace('_', ' ').lower().strip()
    return words[:1].upper() + words[1:] + '.' if words else code


def message_for(code, klass, sample):
    if code in copy:
        return copy[code]
    if klass == 'public':
        return humanize(code)
    if sample and sample != code:
        n = [0]

        def repl(_m):
            i = n[0]
            n[0] += 1
            return f'{{{{arg{i}}}}}'

        return re.sub(r'%', repl, sample)
    return humanize(code)


def ts_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


# ---------------------------------------------------------------------------
# 6. Emit the generated module.
# ---------------------------------------------------------------------------
codes = sorted(inv.keys())
entries = []
meta = []
n_public = 0
for code in codes:
    info = inv[code]
    sample = info.get('sample', code)
    dynamic = bool(info.get('dynamic'))
    generated_only = info.get('n_source', 0) == 0
    klass = classify(code)
    if klass == 'public':
        n_public += 1
    http = http_for(code, klass)
    msg = message_for(code, klass, sample)
    nargs = sample.count('%') if (dynamic and sample) else 0
    pos = ''
    if nargs > 0:
        pos_list = ', '.join(ts_str(f'arg{i}') for i in range(nargs))
        pos = f', positional: [{pos_list}]'
    entries.append(
        f"  '{code}': defineError({{ code: '{code}', class: '{klass}', "
        f"http: {http}, message: {ts_str(msg)}{pos} }}),"
    )
    meta.append(
        f"  '{code}': {{ class: '{klass}', dynamic: {str(dynamic).lower()}, "
        f"generatedOnly: {str(generated_only).lower()} }},"
    )

header = f'''/* eslint-disable */
/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Source of truth: the constructive-db error audit ({len(codes)} distinct codes
 * raised via EXCEPTION/THROW across deploy sources + generated output).
 * Regenerate with `python3 scripts/generate-registry.py` (see README.md).
 *
 * Public copy is seeded from the dashboard error catalogs; developer/invariant
 * codes carry their raw message (with %-args rendered as {{{{argN}}}}). Curated
 * entries in `registry.ts` override anything here (typed context + refined copy).
 *
 * Counts: {len(codes)} total, {n_public} public, {len(codes) - n_public} internal.
 */
import {{ defineError, type DefinedError }} from '../define';
import type {{ ErrorContext }} from '../types';

export interface GeneratedCodeMeta {{
  class: 'public' | 'internal';
  dynamic: boolean;
  /** True when the code is only emitted by DB code generators (no hand source). */
  generatedOnly: boolean;
}}

/** Every constructive-db error code, keyed by code. */
export const generatedRegistry: Record<string, DefinedError<ErrorContext>> = {{
{chr(10).join(entries)}
}};

/** Audit metadata for each generated code. */
export const GENERATED_CODE_META: Record<string, GeneratedCodeMeta> = {{
{chr(10).join(meta)}
}};

/** Total number of codes collected from constructive-db. */
export const GENERATED_CODE_COUNT = {len(codes)};
'''

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write(header)
print(f'Wrote {OUT}')
print(f'dashboard={dashboard or "(not found — humanized copy)"}')
print(f'total={len(codes)} public={n_public} internal={len(codes) - n_public} '
      f'dashboard_copy_codes={len(copy)}')
