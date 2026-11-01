# Contributing

Thanks for helping improve Obsidian Vault Studio.

## Before you start

- Read [README.md](README.md) and [SECURITY.md](SECURITY.md).
- For retrieval changes, include a small fixture and a test that shows the ranking behavior you expect.
- For write changes, preserve the proposal-first model. Do not add a tool that deletes, renames, moves, or silently overwrites a note.
- Keep the plugin local-first: no telemetry, no background upload of note contents, no hidden network calls.

## Development

```bash
npm test
npm run check
```

You need Node.js 22+ for the test suite. DeepSeek Harness and React are supplied by the harness, not bundled here.

## Style

- Use plain ESM JavaScript; the Host and Client entries must stay loadable without a build step.
- Keep the Client scoped CSS prefixed with `vs-` and theme it with `--dsw-alias-*` variables.
- Prefer small Host helpers in `src/host/` over adding runtime dependencies.
- User-visible Client text belongs in the `client.js` dictionaries (English and Chinese).
- Model-facing tool descriptions are English, concise, and explicit about side effects.

## Pull requests

1. Open an issue for user-visible behavior changes or new tools.
2. Keep the change focused.
3. Run `npm run check`.
4. Describe the user impact, privacy impact, and write-safety impact.
5. Add or update tests and documentation.

Please use conventional commit subjects such as `feat: add folder filters to search`, `fix: reject stale append proposals`, or `docs: clarify local embedding setup`.

## Reporting bugs

Use the issue templates and include:

- Harness version (for example `0.2.1-rc.5`)
- OS and Node version
- Vault size (note count is enough; do not paste private notes)
- Index mode and embedding provider (redact URLs/keys)
- The failing tool/UI action and relevant redacted logs

Never include API keys, private note contents, or full vault paths in a public issue.
