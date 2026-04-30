# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.5.0](https://github.com/constructive-io/constructive/compare/@constructive-io/bucket-provisioner@0.4.1...@constructive-io/bucket-provisioner@0.5.0) (2026-04-30)

### Bug Fixes

- handle MissingContentMD5 error from MinIO edge-cicd in setLifecycleRules ([d8c66fb](https://github.com/constructive-io/constructive/commit/d8c66fb552ac7fa6b76b2ff7b96a6dc90428bcf9))

### Features

- graceful degradation for setBucketPolicy, enableVersioning, setLifecycleRules + MinIO integration tests ([975e1a1](https://github.com/constructive-io/constructive/commit/975e1a11c403bf73e4da76e68166a50f26d03ed8))

## [0.4.1](https://github.com/constructive-io/constructive/compare/@constructive-io/bucket-provisioner@0.4.0...@constructive-io/bucket-provisioner@0.4.1) (2026-04-28)

**Note:** Version bump only for package @constructive-io/bucket-provisioner

# [0.4.0](https://github.com/constructive-io/constructive/compare/@constructive-io/bucket-provisioner@0.3.0...@constructive-io/bucket-provisioner@0.4.0) (2026-04-27)

### Features

- consolidate S3 client factory + presigned URL helpers into s3-utils ([cf436df](https://github.com/constructive-io/constructive/commit/cf436df711fb239c640a99655e0e1a572480feb7))

# [0.3.0](https://github.com/constructive-io/constructive/compare/@constructive-io/bucket-provisioner@0.2.1...@constructive-io/bucket-provisioner@0.3.0) (2026-04-18)

**Note:** Version bump only for package @constructive-io/bucket-provisioner

## [0.2.1](https://github.com/constructive-io/constructive/compare/@constructive-io/bucket-provisioner@0.2.0...@constructive-io/bucket-provisioner@0.2.1) (2026-04-11)

### Bug Fixes

- gracefully skip PutBucketCors and DeleteBucketPolicy for S3-compatible backends ([c49d8f5](https://github.com/constructive-io/constructive/commit/c49d8f59c1f7de15ae67c8cc1bb7e3ac02d77fb9))
- gracefully skip PutPublicAccessBlock for S3-compatible backends that don't support it ([b9c2525](https://github.com/constructive-io/constructive/commit/b9c25253ae6867977c851de8c1af2b8e57ca95f6))

# 0.2.0 (2026-04-04)

### Features

- add @constructive-io/bucket-provisioner package — S3-compatible bucket provisioning library ([b68ad19](https://github.com/constructive-io/constructive/commit/b68ad19a87e745b8fd098a4fdffcf78e041a7943))
- add CORS management to bucket provisioner plugin ([e310889](https://github.com/constructive-io/constructive/commit/e3108898c0d78ad100401d3f064161cc840dbcba))
