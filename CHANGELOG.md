# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.50] - 2026-02-06

### Fixed

- **Programmatic Store Sync**: Programmatic calls like `addEdge()`, `updateEdges()`, and `updateNode()` now immediately re-render in SvelteFlow
  - Previously, these calls updated the workflow store but SvelteFlow did not re-render because the sync effect only triggered on workflow ID changes
  - Now tracks editor-originated writes via reference equality so external store mutations are detected and propagated to SvelteFlow's local state

---

- [Changelog 0.0.1 -- 0.0.49](CHANGELOG-0.0.1--0.0.49.md)
