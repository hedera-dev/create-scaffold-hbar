import fs from "fs";
import path from "path";

/** Environment variable entry from template manifest (scaffold-hbar.envVars). */
export type EnvVarEntry = {
  key: string;
  description: string;
};

/**
 * Writes .env.example in projectDir with commented descriptions and empty
 * values for each env var.
 */
export function generateEnvExample(projectDir: string, envVars: EnvVarEntry[]): void {
  const lines = envVars.flatMap(({ key, description }) => [`# ${description}`, `${key}=`, ""]);
  const content = lines.join("\n").trimEnd() + "\n";
  const filePath = path.join(projectDir, ".env.example");
  fs.writeFileSync(filePath, content, "utf8");
}
