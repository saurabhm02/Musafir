import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Input: committed Bun lockfile for the mobile app
// Output: the resolved versions of decode-uri-component and node-forge pinned in it
// Guards CVE fixes: GHSA-qr28-fpjm-wq7f (decode-uri-component) and
// GHSA-5x38-2vff-x55p, GHSA-7wch-p9px-956x, GHSA-8hrf-8g6f-7xwp,
// GHSA-hqq3-7jhf-c5jx, GHSA-jc66-7q78-782g (node-forge)
function resolvedVersion(packageName: string): string {
  const lockfilePath = join(import.meta.dir, "..", "bun.lock");
  const lockfile = readFileSync(lockfilePath, "utf8");
  const match = lockfile.match(new RegExp(`"${packageName}": \\["${packageName}@(\\d+\\.\\d+\\.\\d+)`));
  if (!match) {
    throw new Error(`${packageName} is not resolved in mobile/bun.lock`);
  }
  return match[1]!;
}

describe("dependency security pins", () => {
  test("decode-uri-component resolves to the CVE-fixed version 0.5.1", () => {
    expect(resolvedVersion("decode-uri-component")).toBe("0.5.1");
  });

  test("node-forge resolves to the CVE-fixed version 1.4.1", () => {
    expect(resolvedVersion("node-forge")).toBe("1.4.1");
  });
});
