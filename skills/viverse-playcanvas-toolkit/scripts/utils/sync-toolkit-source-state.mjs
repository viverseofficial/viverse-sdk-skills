import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadToolkitSourceManifest } from './load-toolkit-source-manifest.mjs';
import { buildPackageJsonWithToolkitSource, buildToolkitSourceLock } from './write-toolkit-source-state.mjs';

export async function syncToolkitSourceState(projectDir, repoRoot, options = {}) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const toolkitLockPath = path.join(projectDir, 'toolkit-source.lock.json');

  if (!existsSync(packageJsonPath)) {
    return {
      available: false,
      changed: false,
      profileName: null,
    };
  }

  const toolkitSource = loadToolkitSourceManifest(repoRoot, {
    manifestPath: options.toolkitSourceManifest,
    profileName: options.toolkitProfile,
  });
  const [currentPackageJson, currentToolkitLock] = await Promise.all([
    readFile(packageJsonPath, 'utf8'),
    existsSync(toolkitLockPath) ? readFile(toolkitLockPath, 'utf8') : Promise.resolve(null),
  ]);

  const nextPackageJson = buildPackageJsonWithToolkitSource(currentPackageJson, toolkitSource);
  const nextToolkitLock = buildToolkitSourceLock(toolkitSource);
  const packageJsonChanged = currentPackageJson !== nextPackageJson;
  const toolkitLockChanged = currentToolkitLock !== nextToolkitLock;

  if (packageJsonChanged || toolkitLockChanged) {
    await Promise.all([
      writeFile(packageJsonPath, nextPackageJson, 'utf8'),
      writeFile(toolkitLockPath, nextToolkitLock, 'utf8'),
    ]);
  }

  return {
    available: true,
    changed: packageJsonChanged || toolkitLockChanged,
    profileName: toolkitSource.profileName,
  };
}