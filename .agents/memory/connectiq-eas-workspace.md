---
name: ConnectIQ EAS workspace packaging
description: Why the standalone production build directory must be registered in the root pnpm workspace for remote EAS builds.
---

Keep the production-build directory registered as a root pnpm workspace package with a package name distinct from the development mobile artifact.

**Why:** EAS uploads and installs from the repository root. A project directory outside the pnpm workspace can appear to work locally by resolving packages from parent `node_modules`, while the remote builder cannot resolve `expo` or config plugins such as `expo-router`.

**How to apply:** When moving or renaming the production mobile build directory, keep the root workspace package glob, unique package name, and root lockfile importer synchronized. Verify with a frozen root install followed by `expo config` from the production package.