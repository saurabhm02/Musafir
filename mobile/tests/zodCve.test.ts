import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Input: committed Bun lockfile for the mobile app
// Output: the resolved zod version pinned in it
// Guards the CVE fix (GHSA-mrhx-c7xc-m3w5): zod must resolve to 4.6.6
function resolvedZodVersion(): string {
  const lockfilePath = join(import.meta.dir, "..", "bun.lock");
  const lockfile = readFileSync(lockfilePath, "utf8");
  const match = lockfile.match(/"zod": \["zod@(\d+\.\d+\.\d+)"/);
  if (!match) {
    throw new Error("zod is not resolved in mobile/bun.lock");
  }
  return match[1]!;
}

describe("zod dependency security pin", () => {
  test("zod resolves to the CVE-fixed version 4.6.6", () => {
    expect(resolvedZodVersion()).toBe("4.6.6");
  });
});
