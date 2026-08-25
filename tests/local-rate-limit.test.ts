import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const originalEnvironment = {
  dataMode: process.env.OTOPASS_DATA_MODE,
  localDataDirectory: process.env.OTOPASS_LOCAL_DATA_DIR,
};

let dataDirectory = "";

beforeEach(async () => {
  dataDirectory = join(tmpdir(), `otokopru-rate-limit-${crypto.randomUUID()}`);
  process.env.OTOPASS_DATA_MODE = "local";
  process.env.OTOPASS_LOCAL_DATA_DIR = dataDirectory;
  vi.resetModules();
});

afterEach(async () => {
  await rm(dataDirectory, { force: true, recursive: true });
  if (originalEnvironment.dataMode === undefined) delete process.env.OTOPASS_DATA_MODE;
  else process.env.OTOPASS_DATA_MODE = originalEnvironment.dataMode;
  if (originalEnvironment.localDataDirectory === undefined) delete process.env.OTOPASS_LOCAL_DATA_DIR;
  else process.env.OTOPASS_LOCAL_DATA_DIR = originalEnvironment.localDataDirectory;
  vi.resetModules();
});

describe.sequential("local rate limiting", () => {
  it("allows exactly the configured number of requests inside the time window", async () => {
    const { consumeLocalRateLimit } = await import("../src/lib/local/repository");

    await expect(consumeLocalRateLimit("requester", "login", 3, 60)).resolves.toBe(true);
    await expect(consumeLocalRateLimit("requester", "login", 3, 60)).resolves.toBe(true);
    await expect(consumeLocalRateLimit("requester", "login", 3, 60)).resolves.toBe(true);
    await expect(consumeLocalRateLimit("requester", "login", 3, 60)).resolves.toBe(false);
  });

  it("keeps concurrent requests within the configured limit", async () => {
    const { consumeLocalRateLimit } = await import("../src/lib/local/repository");

    const results = await Promise.all(
      Array.from({ length: 6 }, () => consumeLocalRateLimit("requester", "public-form:demo", 3, 60)),
    );

    expect(results.filter(Boolean)).toHaveLength(3);
  });
});
