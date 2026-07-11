# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.9.1](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.9.0...graphile-realtime-subscriptions@0.9.1) (2026-07-11)

**Note:** Version bump only for package graphile-realtime-subscriptions

# [0.9.0](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.8.1...graphile-realtime-subscriptions@0.9.0) (2026-06-28)

**Note:** Version bump only for package graphile-realtime-subscriptions

## [0.8.1](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.8.0...graphile-realtime-subscriptions@0.8.1) (2026-06-14)

**Note:** Version bump only for package graphile-realtime-subscriptions

# [0.8.0](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.7.2...graphile-realtime-subscriptions@0.8.0) (2026-05-30)

**Note:** Version bump only for package graphile-realtime-subscriptions

## [0.7.2](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.7.1...graphile-realtime-subscriptions@0.7.2) (2026-05-29)

**Note:** Version bump only for package graphile-realtime-subscriptions

## [0.7.1](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.7.0...graphile-realtime-subscriptions@0.7.1) (2026-05-21)

**Note:** Version bump only for package graphile-realtime-subscriptions

# [0.7.0](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.6.0...graphile-realtime-subscriptions@0.7.0) (2026-05-14)

### Features

- add real WebSocket E2E integration test for realtime subscriptions ([50eb5d6](https://github.com/constructive-io/constructive/commit/50eb5d6cb2fd18b24af05e8b0605c98a1a9879dc))

# [0.6.0](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.5.2...graphile-realtime-subscriptions@0.6.0) (2026-05-14)

**Note:** Version bump only for package graphile-realtime-subscriptions

## [0.5.2](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.5.1...graphile-realtime-subscriptions@0.5.2) (2026-05-11)

**Note:** Version bump only for package graphile-realtime-subscriptions

## [0.5.1](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.5.0...graphile-realtime-subscriptions@0.5.1) (2026-05-11)

**Note:** Version bump only for package graphile-realtime-subscriptions

# [0.5.0](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.4.0...graphile-realtime-subscriptions@0.5.0) (2026-05-11)

**Note:** Version bump only for package graphile-realtime-subscriptions

# [0.4.0](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.3.0...graphile-realtime-subscriptions@0.4.0) (2026-05-11)

### Features

- add CursorTracker for at-least-once delivery via drain_changes() polling ([a088b20](https://github.com/constructive-io/constructive/commit/a088b20ecf21d0cbbec9191687e155e39b08d176))
- add RealtimeManager to bridge CursorTracker events into PgSubscriber ([13a0e63](https://github.com/constructive-io/constructive/commit/13a0e63116703255b79c0fa6d0b74f85697e25fd))
- add sparse set subscriptions (ids: [UUID!]) and RLS-aware rowId masking ([61ac186](https://github.com/constructive-io/constructive/commit/61ac18686616e25cf53f849b9c7e3af470b55226))

# [0.3.0](https://github.com/constructive-io/constructive/compare/graphile-realtime-subscriptions@0.2.0...graphile-realtime-subscriptions@0.3.0) (2026-05-10)

### Features

- add NOTIFY payload parsing, overflow detection, and per-subscriber throttling ([dbfa97e](https://github.com/constructive-io/constructive/commit/dbfa97e3310a519e9216979acfa54cdb20ed4eed))

# 0.2.0 (2026-05-10)

### Bug Fixes

- add missing tsconfig.esm.json and README.md for makage build ([11d3aa1](https://github.com/constructive-io/constructive/commit/11d3aa1d83dfbfdc3dcf99526fe52c30442abeee))

### Features

- add graphile-realtime-subscriptions plugin (Phase 3a) ([0b9e806](https://github.com/constructive-io/constructive/commit/0b9e806fe54b84fa813c6cd44d8533c7aa721891))
