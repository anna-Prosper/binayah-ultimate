import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function flagValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "help" || command === "--help" || hasFlag("--help")) {
    console.log([
      "Usage:",
      "  npm run dr:backup                       create a backup snapshot now",
      "  npm run dr:list                         list offsite (S3) backup artifacts",
      "  npm run dr:snapshots                    list restorable state snapshots (Mongo)",
      "  npm run dr:restore -- <snapshotId>      DRY-RUN full-state restore (shows the diff)",
      "  npm run dr:restore -- <snapshotId> --slice databases   DRY-RUN restore ONE slice",
      "  npm run dr:restore -- <snapshotId> --apply             actually write it",
      "  npm run dr:restore -- latest --slice databases --apply",
      "",
      "Restore is dry-run by default; --apply writes. On apply, the CURRENT state is",
      "snapshotted first (reversible) and the write is optimistic-locked.",
    ].join("\n"));
    return;
  }

  const {
    createDisasterRecoveryBackup,
    listDisasterRecoveryBackups,
    listStateSnapshots,
    restoreState,
  } = await import("../src/lib/disasterRecovery");

  if (command === "list") {
    print(await listDisasterRecoveryBackups());
    return;
  }

  if (command === "snapshots") {
    print(await listStateSnapshots());
    return;
  }

  if (command === "backup") {
    print(await createDisasterRecoveryBackup());
    return;
  }

  if (command === "restore") {
    const idArg = process.argv[3];
    const snapshotId = idArg && !idArg.startsWith("--") && idArg !== "latest" ? idArg : undefined;
    const slice = flagValue("--slice");
    const apply = hasFlag("--apply");
    const workspaceId = flagValue("--workspace");
    print(await restoreState({ snapshotId, slice, apply, workspaceId }));
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
