import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { GeneratedFile } from "./types.js";

/**
 * Resolve `filePath` under `root`, rejecting absolute paths and `..` escapes.
 */
export function resolveContainedPath(root: string, filePath: string): string {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Generated file path is required");
  }
  if (path.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
    throw new Error(`Refusing absolute output path: ${filePath}`);
  }
  const rootAbs = path.resolve(root);
  const abs = path.resolve(rootAbs, filePath);
  const rel = path.relative(rootAbs, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside target directory: ${filePath}`);
  }
  return abs;
}

export function writeFiles(root: string, files: GeneratedFile[], dryRun = false): string[] {
  const written: string[] = [];
  for (const file of files) {
    const abs = resolveContainedPath(root, file.path);
    if (!dryRun) {
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, file.content, "utf8");
    }
    written.push(file.path);
  }
  return written;
}

export function assertTargetAvailable(targetDir: string, force = false): void {
  if (force) return;
  if (!existsSync(targetDir)) return;
  const entries = readdirSync(targetDir);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}
