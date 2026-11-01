import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("bundle manifest points at the Host patch and Client entry", async () => {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.equal(pkg.type, "module");
  assert.equal(pkg.exports["."], "./index.js");
  assert.equal(pkg.exports["./client"], "./client.js");
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.dsh.client.platform, "web");
  assert.ok(pkg.dsh.client.inject.includes("@deepseek-ai/dsh-client-ui-layout"));
  assert.ok(pkg.dsh.client.inject.includes("@deepseek-ai/dsh-client-ui-sidebar"));
  assert.ok(pkg.dsh.client.inject.includes("@deepseek-ai/dsh-api-remotes"));
  assert.ok(pkg.files.includes("src/host/*.js"));
});

test("cordis patch inserts the package by its manifest name", async () => {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const patch = await readFile(join(root, "cordis.patch.yml"), "utf8");
  assert.match(patch, /- insert:/);
  assert.match(patch, /id: obsidian-vault-studio/);
  assert.ok(patch.includes(`name: ${pkg.name}`));
});

test("Client module id matches the package name", async () => {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const client = await readFile(join(root, "client.js"), "utf8");
  assert.ok(client.includes(`id: "${pkg.name}"`));
});

test("Client registers the main page and matching sidebar panel", async () => {
  const client = await readFile(join(root, "client.js"), "utf8");
  assert.match(client, /^window\.__ModuleLoader__\.load\(/);
  assert.match(client, /key: PANEL_ID/);
  assert.match(client, /name: "main"/);
  assert.match(client, /name: "sidebar\.panellist"/);
  assert.match(client, /id: PANEL_ID/);
  assert.match(client, /ctx\.remote\.\$mount\(remoteContribution\)/);
  assert.match(client, /ctx\.locale\.register\(NS, dictionaries\)/);
  assert.doesNotMatch(client, /^\s*import\s/m);
});

test("Host entry declares tools, a remote service, and approval policy", async () => {
  const host = await readFile(join(root, "index.js"), "utf8");
  assert.match(host, /export const Config/);
  assert.match(host, /class VaultService extends TypertRemoteService/);
  assert.match(host, /tools\/pre-execute/);
  assert.match(host, /obsidian_apply_write/);
  assert.match(host, /autoApproveWrites/);
  assert.match(host, /systemPrompt\.section/);
});

test("propose-write tool exposes the proposal id to agents", async () => {
  const tools = await readFile(join(root, "src/host/tools.js"), "utf8");
  assert.match(tools, /Proposal id: \$\{value\.id\}/);
});

test("tool catalog contains only additive write operations", async () => {
  const tools = await readFile(join(root, "src/host/tools.js"), "utf8");
  assert.match(tools, /name: "obsidian_search"/);
  assert.match(tools, /name: "obsidian_read_note"/);
  assert.match(tools, /name: "obsidian_propose_write"/);
  assert.match(tools, /name: "obsidian_apply_write"/);
  assert.match(tools, /name: "obsidian_undo_write"/);
  assert.doesNotMatch(tools, /name: "obsidian_delete/);
  assert.doesNotMatch(tools, /name: "obsidian_rename/);
  assert.doesNotMatch(tools, /name: "obsidian_overwrite/);
});
