# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.15] - 2026-11-01

### Fixed

- Updated the client module registration id to match the new npm package name. This prevents a stale factory from the previous package name from colliding with the new bundle during upgrade.

### Tests

- Added a regression check that the client module id matches `package.json`'s package name.

## [0.1.16] - 2026-11-01

### Fixed

- The propose-write tool now includes the proposal id in its rendered output so an agent can pass it to `obsidian_apply_write`.

### Tests

- Added a regression check that the propose-write output exposes the proposal id.

## [0.1.11] - 2026-11-01

### Fixed

- Saving settings no longer waits for a full embedding pass. A mode switch during embedding returns immediately and rebuilds in the background; progress is reported through `indexStatus`.
- The Settings mode selector, dashboard mode labels, search-result provenance, kickers, usage short labels, and remaining Chinese prose now follow the active locale instead of showing English strings.

### Tests

- Added a regression test proving a settings save returns before background embedding completes.

## [0.1.9] - 2026-11-01

### Fixed

- The UI now follows DeepSeek Harness' active locale (`ctx.locale` / `<html lang>`) instead of `navigator.language`, so a Chinese Harness with an English browser opens in Chinese.

## [0.1.8] - 2026-11-01

### Added

- New Chinese `README.md` and English `README.en.md`, focused on what the plugin does, installation, setup, and usage.
- Real product screenshots under `docs/images/`.

### Fixed

- Translation interpolation now prefers the plugin's own templates, so counters render as `93` rather than `{93}`.
- Copy/search/refresh/reindex/save/test/write actions now show loading or success states.


## [0.1.7] - 2026-11-01

### Fixed

- `recordUsage` now exists on the Host `VaultService`; a successful `obsidian_*` call no longer fails in the post-execute analytics hook.
- Usage recording is best-effort: an analytics/write failure cannot turn a successful vault read into a tool error.
- The system prompt now forbids bypassing a failed Obsidian tool through generic `read`/`grep`/`bash`/editor tools or the vault access switch.

## [0.1.6] - 2026-11-01

### Added

- Local Agent-usage counters for successful Obsidian tool calls: total, today, this month, last 30 days, 14-day bars, 6-month bars, and per-tool breakdown.
- Persistent `usage.json` under the plugin data directory; counts survive restarts and are never sent to the model.

### Changed

- Replaced the “Vault composition” dashboard card with “Agent usage”.
- Removed the visible link-count metric from the home dashboard.
- Removed the search-page retrieval-mode segment; mode now follows the home quick controls or Settings. Search page keeps folder/tag filters and the result count.
- “Copy context” now switches to a green “Copied” state for 1.8 seconds; all buttons get a pressed-state transform.
- Added loading/success button states for search, refresh, reindex, save, embedding test, setup, and write/undo actions.

## [0.1.5] - 2026-11-01

### Changed

- Replaced the Core notes/backlink card with **Vault composition**: tag coverage, untagged notes, long-form notes, and 30-day freshness.
- Removed the visible “links” statistic from the home dashboard; the weekly-updated count now occupies that slot.
- Added `composition.updatedLast7` for the weekly update metric.

## [0.1.4] - 2026-11-01

### Changed

- Replaced the low-signal knowledge-health card with a **Vault composition** card: tag coverage, untagged notes, long-form notes, and 30-day freshness.
- Kept health metrics in the underlying stats payload for tools, but removed them from the dashboard.
- Added composition data to the Host stats schema.

## [0.1.3] - 2026-11-01

### Added

- GitHub-style 365-day daily heatmap on the dashboard, backed by per-day note edit counts, with active-day and streak summaries.
- Smooth cubic activity curve instead of a polyline.
- Right-side quick controls for Agent access, retrieval mode, and file watching.

### Changed

- Removed the duplicated note-count orbit and the full-width keyword hint bar.
- Dashboard uses a compact top bar so metrics and activity stay above the fold.

## [0.1.2] - 2026-11-01

### Added

- Conversation access switch on the Vault Studio home page. Model access is off by default; when off, every `obsidian_*` tool is denied before execution while the UI keeps full local access.
- Type-ahead search with Latin prefix matching (`ret` → retrieval), debounced result refresh, stale-response protection, and note paths included in retrieval text.
- Index version 2 forces a one-time rebuild for path-aware chunks and prefixes.

### Fixed

- Dynamic `remote.obsidianVault` lookup via `ctx.get()` instead of activation-time injection.
- Page-level wheel scrolling, DSH typography tokens, and the richer dashboard layout.

## [0.1.1] - 2026-11-01

### Fixed

- Use `ctx.get()` for the dynamically mounted `remote.obsidianVault` namespace; removing the activation-time inject error.
- Supply complete Typert strict codecs (`typeSymbol`, `create`) for hand-authored Client descriptors.
- Make the main Vault Studio page the wheel-scroll container; note content no longer traps wheel chaining.
- Match DeepSeek Harness typography tokens and base 16px scale; removed the unrelated serif stack.

### Changed

- Fresh installs default to the local `keyword` index. Embeddings remain opt-in.
- The dashboard hint points users to Settings for semantic/hybrid retrieval.
- Richer dashboard: hero search, vault orbit, SVG activity chart, tag constellation, folders, and health.
- Debounced live search while typing, with Latin prefix matching in the keyword index.
- Migrate untouched v1 `hybrid` settings to `keyword`; explicit non-keyword saves mark embeddings configured.

## [0.1.0] - 2026-11-01

### Added

- DeepSeek Harness Host bundle with a Typert Remote service and eight `obsidian_*` tools.
- Local Obsidian Markdown parser: frontmatter, tags, aliases, headings, wiki links, heading-aware chunks.
- Keyword, semantic, and hybrid retrieval with reciprocal-rank fusion.
- Optional OpenAI-compatible/Ollama embedding client and persisted `Float32` vectors.
- Vault dashboard: counts, 14-day activity, health, folders, tags, recent notes.
- Vault Studio Client page: dashboard, search/context tray, notes, settings.
- Proposal-first create/append writes, SHA-1 conflict checks, backups, and session undo.
- Approval prompt for agent-driven apply/undo.
- Bilingual README, tests, CI, MIT license, and community files.

### Known limitations

- No binary attachment/OCR indexing.
- Brute-force vector search for personal-scale vaults.
- Lite YAML parser.
- Session-only undo records.
