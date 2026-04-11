# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.1](https://github.com/constructive-io/constructive/compare/@constructive-io/bucket-provisioner@0.2.0...@constructive-io/bucket-provisioner@0.2.1) (2026-04-11)

### Bug Fixes

- gracefully skip PutBucketCors and DeleteBucketPolicy for S3-compatible backends ([c49d8f5](https://github.com/constructive-io/constructive/commit/c49d8f59c1f7de15ae67c8cc1bb7e3ac02d77fb9))
- gracefully skip PutPublicAccessBlock for S3-compatible backends that don't support it ([b9c2525](https://github.com/constructive-io/constructive/commit/b9c25253ae6867977c851de8c1af2b8e57ca95f6))

# 0.2.0 (2026-04-04)

### Features

- add @constructive-io/bucket-provisioner package — S3-compatible bucket provisioning library ([b68ad19](https://github.com/constructive-io/constructive/commit/b68ad19a87e745b8fd098a4fdffcf78e041a7943))
- add CORS management to bucket provisioner plugin ([e310889](https://github.com/constructive-io/constructive/commit/e3108898c0d78ad100401d3f064161cc840dbcba))
