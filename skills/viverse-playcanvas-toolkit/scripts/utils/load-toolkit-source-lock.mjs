import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function loadToolkitSourceLock(projectDir) {
  const lockPath = path.join(projectDir, 'toolkit-source.lock.json');
  const packageJsonPath = path.join(projectDir, 'package.json');

  const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : null;
  const packageJson = existsSync(packageJsonPath) ? JSON.parse(readFileSync(packageJsonPath, 'utf8')) : null;
  const dependencies = packageJson?.dependencies ?? {};

  return {
    lockPath,
    packageJsonPath,
    lock,
    packageJson,
    dependencies,
    profileName: lock?.profileName ?? null,
    profileType: lock?.profileType ?? null,
    lockedPackages: new Map((lock?.packages ?? []).map((entry) => [entry.packageName, entry.specifier])),
    hasDependency(packageName) {
      return Boolean(dependencies[packageName]);
    },
    hasLockedPackage(packageName) {
      return this.lockedPackages.has(packageName);
    },
  };
}