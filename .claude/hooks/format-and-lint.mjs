#!/usr/bin/env node
// PostToolUse hook (Write|Edit) — formats the touched file with Prettier and
// lints it with ESLint --fix. Runs stdlib-only (no jq dependency: this
// machine doesn't have jq installed).
//
// Contract:
//   - Nothing to do / not our concern -> exit 0, silent.
//   - Formatted and/or auto-fixed cleanly -> exit 0, silent.
//   - ESLint leaves errors it can't auto-fix -> print them and exit 2, so
//     Claude Code feeds the report back to the model in this same turn.

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const PRETTIER_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".mdx",
  ".yml",
  ".yaml",
]);

const ESLINT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const IGNORED_DIR_SEGMENTS = ["node_modules", ".next", ".git", "out", "build"];

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function getFilePath(payload) {
  return payload?.tool_response?.filePath ?? payload?.tool_input?.file_path;
}

function isInsideProject(filePath) {
  const relative = path.relative(PROJECT_ROOT, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  const segments = relative.split(path.sep);
  return !segments.some((seg) => IGNORED_DIR_SEGMENTS.includes(seg));
}

function runBin(binRelativePath, args, cwd) {
  const binPath = path.join(PROJECT_ROOT, "node_modules", ...binRelativePath);
  if (!existsSync(binPath)) return null;
  return spawnSync(process.execPath, [binPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function main() {
  const raw = readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 0; // No parseable payload — nothing we can act on.
  }

  const filePath = getFilePath(payload);
  if (!filePath) return 0;

  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(PROJECT_ROOT, filePath);

  if (!isInsideProject(absPath) || !existsSync(absPath)) return 0;

  const ext = path.extname(absPath).toLowerCase();

  if (PRETTIER_EXTENSIONS.has(ext)) {
    // Formatting failures are never fatal — a file Prettier can't parse
    // (or doesn't cover) just gets skipped.
    runBin(["prettier", "bin", "prettier.cjs"], ["--write", absPath], PROJECT_ROOT);
  }

  if (ESLINT_EXTENSIONS.has(ext)) {
    const result = runBin(
      ["eslint", "bin", "eslint.js"],
      ["--fix", absPath],
      PROJECT_ROOT
    );
    if (result && result.status !== 0) {
      const report = [result.stdout, result.stderr].filter(Boolean).join("\n");
      process.stderr.write(
        `ESLint found issues in ${path.relative(PROJECT_ROOT, absPath)} that need manual fixes:\n\n${report}\n`
      );
      return 2;
    }
  }

  return 0;
}

process.exit(main());
