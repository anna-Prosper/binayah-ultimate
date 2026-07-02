import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "help" || command === "--help" || hasFlag("--help")) {
    console.log([
      "Usage:",
      "  npm run dr:list",
      "  npm run dr:backup",
      "",
      "This command stores and lists disaster-recovery backups only.",
      "Restore is intentionally manual: ask Codex to restore a specific backup if needed.",
    ].join("\n"));
    return;
  }

  const {
    createDisasterRecoveryBackup,
    listDisasterRecoveryBackups,
  } = await import("../src/lib/disasterRecovery");

  if (command === "list") {
    print(await listDisasterRecoveryBackups());
    return;
  }

  if (command === "backup") {
    print(await createDisasterRecoveryBackup());
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
