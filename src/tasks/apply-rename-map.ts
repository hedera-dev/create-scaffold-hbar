import fs from "fs";
import path from "path";
import { findFilesRecursiveSync } from "../utils/find-files-recursively";

/** Rename entry shape from template manifest (scaffold-hbar.rename). */
export type RenameEntry = {
  to: string;
  paths: string[];
};

/**
 * Resolves the replacement string by substituting {{projectName}} with the
 * actual project name.
 */
function resolveToValue(to: string, projectName: string): string {
  return to.replace(/\{\{projectName\}\}/g, projectName);
}

/**
 * Recursively replaces all occurrences of each placeholder in file contents
 * across the specified relative paths under projectDir.
 */
export function applyRenameMap(projectDir: string, renameMap: Record<string, RenameEntry>, projectName: string): void {
  for (const [placeholder, entry] of Object.entries(renameMap)) {
    const replacement = resolveToValue(entry.to, projectName);

    for (const relativePath of entry.paths) {
      const dirPath = path.join(projectDir, relativePath);
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        continue;
      }

      const files = findFilesRecursiveSync(dirPath, () => true);
      for (const filePath of files) {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;

        const content = fs.readFileSync(filePath, "utf8");
        if (!content.includes(placeholder)) continue;

        const newContent = content.split(placeholder).join(replacement);
        fs.writeFileSync(filePath, newContent, "utf8");
      }
    }
  }
}
