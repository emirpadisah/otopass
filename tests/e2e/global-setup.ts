import { rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

export default async function globalSetup() {
  const testResultsRoot = resolve(process.cwd(), "test-results");
  const localDataDirectory = resolve(testResultsRoot, "e2e-local-data");
  if (!localDataDirectory.startsWith(`${testResultsRoot}${sep}`)) {
    throw new Error("Unsafe E2E local data directory");
  }
  await rm(localDataDirectory, { recursive: true, force: true });
}
