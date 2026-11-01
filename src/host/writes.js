import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, realpath, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { sha1 } from "./markdown.js";

const MAX_CONTENT = 200_000;

function normalizeVaultPath(value) {
  const text = String(value ?? "").replace(/\\/g, "/").trim().replace(/^\.\/+/, "");
  if (!text) return "";
  if (text.startsWith("/") || /^[A-Za-z]:\//.test(text)) throw new Error("Target path must be relative to the vault.");
  const parts = text.split("/");
  if (parts.some((part) => part === ".." || part === "")) throw new Error("Target path must not contain empty segments or '..'.");
  const withExtension = /\.md$/i.test(text) ? text : `${text}.md`;
  if (!/\.md$/i.test(withExtension)) throw new Error("Only Markdown (.md) notes can be written.");
  return withExtension;
}

function resolveInside(root, relativePath) {
  const full = resolve(root, relativePath);
  const relation = relative(root, full);
  if (relation.startsWith("..") || isAbsolute(relation)) throw new Error("Target path escapes the configured vault.");
  return full;
}

function buildDiff(before, content, operation) {
  if (operation === "create") {
    const lines = content.split(/\r?\n/).slice(0, 80).map((line) => `+ ${line}`);
    return `--- /dev/null\n+++ ${"new note"}\n@@\n${lines.join("\n")}${content.split(/\r?\n/).length > 80 ? "\n+ …" : ""}`;
  }
  const added = content.split(/\r?\n/).slice(0, 80).map((line) => `+ ${line}`);
  const tail = before.trimEnd().split(/\r?\n/).slice(-4).map((line) => `  ${line}`);
  return `--- ${"existing note"}\n+++ ${"existing note"}\n@@ append @@\n${tail.join("\n")}\n${added.join("\n")}${content.split(/\r?\n/).length > 80 ? "\n+ …" : ""}`;
}

function isInside(root, candidate) {
  const relation = relative(root, candidate);
  return relation === "" || (!relation.startsWith("..") && !isAbsolute(relation));
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export class WriteManager {
  constructor({ vaultPath, realVaultPath, dataDir, persist }) {
    this.vaultPath = vaultPath ? resolve(vaultPath) : "";
    this.realVaultPath = realVaultPath ? resolve(realVaultPath) : this.vaultPath;
    this.dataDir = dataDir;
    this.persist = persist ?? (async () => {});
    this.proposals = new Map();
    this.undoRecords = new Map();
    this.backupsDir = join(dataDir, "backups");
  }

  setVaultPath(vaultPath, realVaultPath) {
    this.vaultPath = vaultPath ? resolve(vaultPath) : "";
    this.realVaultPath = realVaultPath ? resolve(realVaultPath) : this.vaultPath;
  }

  /**
   * Resolve the nearest existing ancestor and make sure a symlink cannot move
   * a write outside the configured vault.
   */
  async assertSafeTarget(fullPath, exists) {
    const root = this.realVaultPath || this.vaultPath;
    let cursor = exists ? fullPath : dirname(fullPath);
    while (true) {
      try {
        const canonical = await realpath(cursor);
        if (!isInside(root, canonical)) throw new Error("Target path resolves outside the configured vault.");
        return;
      } catch (error) {
        if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
        const parent = dirname(cursor);
        if (parent === cursor) throw new Error("Target path could not be resolved inside the vault.");
        cursor = parent;
      }
    }
  }

  async propose({ operation, targetPath, content, reason = "", citations = [] }) {
    if (!this.vaultPath) throw new Error("Configure a vault path before writing notes.");
    if (operation !== "create" && operation !== "append") throw new Error("Only create and append operations are supported.");
    if (typeof content !== "string" || !content.trim()) throw new Error("Write content must not be empty.");
    if (content.length > MAX_CONTENT) throw new Error(`Write content exceeds ${MAX_CONTENT} characters.`);

    const now = new Date();
    let safePath;
    if (targetPath) {
      safePath = normalizeVaultPath(targetPath);
    } else {
      const stamp = now.toISOString().slice(0, 10);
      safePath = `AI Inbox/${stamp} ${now.getTime().toString(36)}.md`;
    }
    const fullPath = resolveInside(this.vaultPath, safePath);
    const hasFile = await exists(fullPath);
    if (operation === "create" && hasFile) throw new Error(`A note already exists at ${safePath}.`);
    if (operation === "append" && !hasFile) throw new Error(`No note exists at ${safePath}.`);
    await this.assertSafeTarget(fullPath, hasFile);

    const beforeContent = hasFile ? await readFile(fullPath, "utf8") : "";
    const afterContent = operation === "create"
      ? content.replace(/\s*$/, "\n")
      : `${beforeContent.replace(/\s*$/, "")}\n\n${content.trim()}\n`;
    const proposal = {
      id: randomUUID(),
      operation,
      path: safePath,
      fullPath,
      content,
      beforeContent,
      afterContent,
      beforeHash: hasFile ? sha1(beforeContent) : "",
      afterHash: sha1(afterContent),
      diff: buildDiff(beforeContent, content, operation),
      reason: String(reason ?? "").slice(0, 1000),
      citations: Array.isArray(citations) ? citations.map(String).slice(0, 20) : [],
      createdAt: new Date().toISOString(),
      status: "proposed"
    };
    this.proposals.set(proposal.id, proposal);
    return this.publicProposal(proposal);
  }

  publicProposal(proposal) {
    return {
      id: proposal.id,
      operation: proposal.operation,
      path: proposal.path,
      diff: proposal.diff,
      reason: proposal.reason,
      citations: proposal.citations,
      createdAt: proposal.createdAt,
      status: proposal.status
    };
  }

  listProposals() {
    return [...this.proposals.values()]
      .filter((proposal) => proposal.status === "proposed")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((proposal) => this.publicProposal(proposal));
  }

  proposalFor(id) {
    const proposal = this.proposals.get(String(id));
    return proposal ? this.publicProposal(proposal) : null;
  }

  undoFor(id) {
    const record = this.undoRecords.get(String(id));
    return record ? { undoId: record.undoId, path: record.path, operation: record.operation } : null;
  }

  async apply(proposalId) {
    const proposal = this.proposals.get(String(proposalId));
    if (!proposal) throw new Error("Write proposal was not found.");
    if (proposal.status !== "proposed") throw new Error("This write proposal has already been applied.");

    const currentExists = await exists(proposal.fullPath);
    await this.assertSafeTarget(proposal.fullPath, currentExists);
    const current = currentExists ? await readFile(proposal.fullPath, "utf8") : "";
    const currentHash = currentExists ? sha1(current) : "";
    if (proposal.operation === "append" && currentHash !== proposal.beforeHash) {
      throw new Error("The note changed after this proposal was created. Create a new proposal.");
    }
    if (proposal.operation === "create" && currentExists) {
      throw new Error("The note was created after this proposal was made.");
    }

    await mkdir(dirname(proposal.fullPath), { recursive: true });
    await this.assertSafeTarget(proposal.fullPath, currentExists);
    await mkdir(this.backupsDir, { recursive: true, mode: 0o700 });
    const undoId = randomUUID();
    const backupPath = join(this.backupsDir, `${undoId}.json`);
    await writeFile(backupPath, JSON.stringify({
      undoId,
      proposalId: proposal.id,
      operation: proposal.operation,
      path: proposal.path,
      beforeContent: proposal.beforeContent,
      beforeExisted: currentExists,
      afterHash: proposal.afterHash,
      createdAt: new Date().toISOString()
    }, null, 2), { mode: 0o600 });

    if (proposal.operation === "create") {
      await writeFile(proposal.fullPath, proposal.afterContent, { flag: "wx", mode: 0o644 });
    } else {
      await writeFile(proposal.fullPath, proposal.afterContent, { mode: 0o644 });
    }

    proposal.status = "applied";
    this.undoRecords.set(undoId, {
      undoId,
      proposalId: proposal.id,
      operation: proposal.operation,
      path: proposal.path,
      beforeContent: proposal.beforeContent,
      beforeExisted: currentExists,
      afterHash: proposal.afterHash
    });
    await this.persist().catch(() => {});
    return {
      undoId,
      path: proposal.path,
      operation: proposal.operation,
      bytesAdded: Buffer.byteLength(proposal.afterContent) - Buffer.byteLength(proposal.beforeContent)
    };
  }

  async undo(undoId) {
    const record = this.undoRecords.get(String(undoId));
    if (!record) throw new Error("Undo record was not found in this session.");
    const fullPath = resolveInside(this.vaultPath, record.path);
    if (!(await exists(fullPath))) throw new Error("The written note no longer exists.");
    await this.assertSafeTarget(fullPath, true);
    const current = await readFile(fullPath, "utf8");
    if (sha1(current) !== record.afterHash) throw new Error("The note changed after the write; refusing to undo.");
    if (record.operation === "create") {
      await unlink(fullPath);
    } else {
      await writeFile(fullPath, record.beforeContent, { mode: 0o644 });
    }
    this.undoRecords.delete(record.undoId);
    return { path: record.path, undone: true };
  }
}
