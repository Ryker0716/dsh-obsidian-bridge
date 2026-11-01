# Security Policy

## Supported versions

Security fixes are applied to the latest release line. This is a local-first plugin; use the latest `0.1.x` or newer.

## Reporting a vulnerability

Please **do not** open a public issue for a vulnerability that could expose vault contents, API keys, or allow unintended writes.

Use GitHub's **private vulnerability reporting** / Security Advisory flow for this repository. If that is unavailable, contact the maintainer through the repository profile and ask for a private channel.

Include:

- affected version and Harness version
- a minimal reproduction
- whether the issue is local-only or requires a malicious vault/endpoint
- impact on confidentiality, integrity, or write safety

## Security model

- The plugin runs Host code with access to the filesystem paths you configure.
- It reads Markdown from the configured vault and writes only through the proposal/apply path.
- The model cannot delete, rename, move, or overwrite notes through the exposed tool set.
- `obsidian_apply_write` and `obsidian_undo_write` request approval unless `autoApproveWrites` is explicitly enabled.
- Indexes, vectors, settings, and backups are stored under `~/.dsh/vault-studio/` by default; `settings.json` is written with mode `0600`.
- Embedding requests send note chunks to the configured embedding endpoint. A remote endpoint is a privacy decision; use a local Ollama/LM Studio endpoint if the vault must stay on-device.
- The plugin does not include telemetry.
- The home-page conversation switch gates every `obsidian_*` Agent tool. It does not override DSH's generic file/bash tool permissions; apply workspace sandbox rules separately if the vault path is reachable to those tools.

## Hardening recommendations

- Keep the vault path scoped to a dedicated vault directory.
- Leave `autoApproveWrites` off.
- Prefer a local embedding endpoint.
- Treat `settings.json` and `backups/` as sensitive local data.
- Review the diff before applying an agent-proposed write.
