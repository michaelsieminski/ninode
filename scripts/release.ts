#!/usr/bin/env bun
// Bump the version, commit, tag, push.
// Usage:
//   bun run release            # patch  (default)
//   bun run release minor
//   bun run release major
//   bun run release 1.2.3      # explicit version

import { $ } from "bun";
import pkg from "../package.json";

type BumpType = "patch" | "minor" | "major";

function isBumpType(s: string): s is BumpType {
  return s === "patch" || s === "minor" || s === "major";
}

function isSemver(s: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(s);
}

function bump(current: string, type: BumpType): string {
  const parts = current.split(".").map(Number);
  const [maj = 0, min = 0, pat = 0] = parts;
  if (type === "major") return `${maj + 1}.0.0`;
  if (type === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const arg = Bun.argv[2] ?? "patch";

  let next: string;
  if (isBumpType(arg)) {
    next = bump(pkg.version, arg);
  } else if (isSemver(arg)) {
    next = arg;
  } else {
    fail(`unknown release type "${arg}". Use patch | minor | major | X.Y.Z`);
  }

  console.log(`Releasing ${pkg.version} → ${next}`);

  // Pre-flight: clean working tree
  const status = (await $`git status --porcelain`.text()).trim();
  if (status) {
    fail("working tree has uncommitted changes. Commit or stash first.");
  }

  // Pre-flight: on main
  const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();
  if (branch !== "main") {
    fail(`expected to be on "main", currently on "${branch}".`);
  }

  // Pre-flight: up to date with origin
  await $`git fetch origin main`.quiet();
  const local = (await $`git rev-parse HEAD`.text()).trim();
  const remote = (await $`git rev-parse origin/main`.text()).trim();
  if (local !== remote) {
    fail(
      `local main (${local.slice(0, 7)}) differs from origin/main ` +
        `(${remote.slice(0, 7)}). Pull or push first.`,
    );
  }

  // Pre-flight: tag doesn't already exist
  const existingTag = await $`git tag -l v${next}`.text();
  if (existingTag.trim()) {
    fail(`tag v${next} already exists.`);
  }

  // Bump package.json (preserve formatting by doing a targeted regex replace)
  const pkgPath = "package.json";
  const raw = await Bun.file(pkgPath).text();
  const updated = raw.replace(
    /"version":\s*"[^"]+"/,
    `"version": "${next}"`,
  );
  if (updated === raw) {
    fail(`could not locate "version" field in ${pkgPath}`);
  }
  await Bun.write(pkgPath, updated);

  // Commit, tag, push
  await $`git add package.json`;
  await $`git commit -m ${"chore: release v" + next}`;
  await $`git tag ${"v" + next}`;
  await $`git push origin main`;
  await $`git push origin ${"v" + next}`;

  console.log("");
  console.log(`✓ Released v${next}`);
  console.log("  Workflow will build binaries, publish the release, and bump");
  console.log("  the Homebrew formula in ~5-10 min.");
  console.log("");
  console.log("  Watch:  gh run watch -R michaelsieminski/ninode");
  console.log(
    `  Release: https://github.com/michaelsieminski/ninode/releases/tag/v${next}`,
  );
}

await main();
