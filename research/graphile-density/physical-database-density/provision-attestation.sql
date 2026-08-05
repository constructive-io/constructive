\set ON_ERROR_STOP on

BEGIN;

CREATE SCHEMA ctf_provision_private;
REVOKE ALL ON SCHEMA ctf_provision_private FROM PUBLIC;

CREATE TABLE ctf_provision_private.clone_attestation (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  clone_id text NOT NULL CHECK (clone_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'),
  run_purpose text NOT NULL CHECK (run_purpose IN ('hostile-preflight', 'measurement')),
  customer_id text NOT NULL CHECK (customer_id ~ '^[a-z0-9-]+$'),
  attestation_nonce text NOT NULL CHECK (attestation_nonce ~ '^[a-f0-9]{64}$'),
  attestation_sha256 text NOT NULL CHECK (attestation_sha256 ~ '^sha256:[a-f0-9]{64}$')
);

REVOKE ALL ON TABLE ctf_provision_private.clone_attestation FROM PUBLIC;

INSERT INTO ctf_provision_private.clone_attestation (
  singleton,
  clone_id,
  run_purpose,
  customer_id,
  attestation_nonce,
  attestation_sha256
) VALUES (
  true,
  :'clone_id',
  :'run_purpose',
  :'customer_id',
  :'attestation_nonce',
  :'attestation_sha256'
);

COMMIT;
