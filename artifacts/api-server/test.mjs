import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { build } from "esbuild";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(artifactDir, ".test-dist", "meetingInviteIcs.test.mjs");

try {
  await build({
    entryPoints: [path.join(artifactDir, "test", "meetingInviteIcs.test.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: outFile,
    logLevel: "info",
  });
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", outFile], {
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) process.exitCode = exitCode;
} finally {
  await rm(path.dirname(outFile), { recursive: true, force: true });
}