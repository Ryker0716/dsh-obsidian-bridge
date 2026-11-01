import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_SETTINGS, SettingsStore } from "../src/host/settings.js";

test("fresh settings default to the local keyword index", async () => {
  const root = await mkdtemp(join(tmpdir(), "vault-studio-settings-"));
  try {
    const store = new SettingsStore({ dataDir: root });
    const settings = await store.ready;
    assert.equal(settings.indexMode, "keyword");
    assert.equal(settings.embeddingConfigured, false);
    assert.equal(settings.conversationEnabled, false);
    assert.equal(DEFAULT_SETTINGS.indexMode, "keyword");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("v1 hybrid defaults migrate to keyword until embeddings are explicitly enabled", async () => {
  const root = await mkdtemp(join(tmpdir(), "vault-studio-settings-"));
  try {
    await writeFile(join(root, "settings.json"), JSON.stringify({
      version: 1,
      vaultPath: "/tmp/vault",
      indexMode: "hybrid",
      embeddingUrl: "http://127.0.0.1:11434/api/embed"
    }));
    const store = new SettingsStore({ dataDir: root });
    const migrated = await store.ready;
    assert.equal(migrated.indexMode, "keyword");
    assert.equal(migrated.version, 2);

    await store.update({ indexMode: "hybrid" });
    const saved = JSON.parse(await readFile(join(root, "settings.json"), "utf8"));
    assert.equal(saved.indexMode, "hybrid");
    assert.equal(saved.embeddingConfigured, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
