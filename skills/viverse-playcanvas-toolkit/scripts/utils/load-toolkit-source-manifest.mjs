import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function normalizePackageRecords(profile, repoRoot) {
  const packages = Object.entries(profile.packages ?? {}).map(([packageName, packageValue]) => {
    if (profile.type === 'local-repo') {
      const repoPath = path.resolve(profile.repoPath);
      const outputDir = profile.packageOutputDir ?? '.local-packages';

      return {
        packageName,
        source: 'local-tarball',
        specifier: `file:${path.join(repoPath, outputDir, packageValue)}`,
      };
    }

    if (profile.type === 'vendored-artifacts') {
      const artifactBaseDir = path.resolve(repoRoot, profile.artifactBaseDir);

      return {
        packageName,
        source: 'vendored-tarball',
        specifier: `file:${path.join(artifactBaseDir, packageValue)}`,
      };
    }

    return {
      packageName,
      source: profile.type,
      specifier: packageValue,
    };
  });

  return packages;
}

export function loadToolkitSourceManifest(repoRoot, options = {}) {
  const manifestPath = path.resolve(
    options.manifestPath ?? path.join(repoRoot, 'toolkit-source-manifest.json'),
  );

  if (!existsSync(manifestPath)) {
    throw new Error(`Toolkit source manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const profileName = options.profileName ?? manifest.defaultProfile;
  const profile = manifest.profiles?.[profileName];

  if (!profile) {
    const knownProfiles = Object.keys(manifest.profiles ?? {});
    throw new Error(
      `Unknown toolkit source profile: ${profileName}. Available profiles: ${knownProfiles.join(', ')}`,
    );
  }

  if (profile.type === 'local-repo' && !existsSync(path.resolve(profile.repoPath))) {
    throw new Error(
      `Toolkit source profile \"${profileName}\" points to a missing local repo: ${profile.repoPath}`,
    );
  }

  return {
    manifestPath,
    manifestVersion: manifest.manifestVersion ?? 1,
    profileName,
    profile,
    packages: normalizePackageRecords(profile, repoRoot),
  };
}