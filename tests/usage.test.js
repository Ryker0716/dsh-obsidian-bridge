import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UsageStore } from "../src/host/usage.js";

test("records total, daily, monthly, and per-tool usage", async () => {
  const root = await mkdtemp(join(tmpdir(), "vault-studio-usage-"));
  try {
    const store = new UsageStore({ dataDir: root });
    await store.ready;
    const now = new Date();
    await store.record("obsidian_search", now);
    await store.record("obsidian_read_note", now);
    await store.record("obsidian_search", new Date(now.getTime() - 86_400_000));
    const summary = store.summary(now);
    assert.equal(summary.total, 3);
    assert.equal(summary.today, 2);
    assert.equal(summary.daily.at(-1).count, 2);
    assert.equal(summary.byTool[0].name, "obsidian_search");
    assert.equal(summary.byTool[0].count, 2);
    assert.ok(summary.monthly.reduce((sum, month) => sum + month.count, 0) >= 3);

    const reloaded = new UsageStore({ dataDir: root });
    await reloaded.ready;
    assert.equal(reloaded.summary(now).total, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
