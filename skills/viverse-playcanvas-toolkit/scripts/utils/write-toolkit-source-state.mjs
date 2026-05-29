export function buildToolkitSourceLock(toolkitSource) {
  return `${JSON.stringify(
    {
      manifestVersion: toolkitSource.manifestVersion,
      manifestPath: toolkitSource.manifestPath,
      profileName: toolkitSource.profileName,
      profileType: toolkitSource.profile.type,
      packageMode: toolkitSource.profile.packageMode ?? null,
      assetBaseUrl: toolkitSource.profile.assetBaseUrl ?? null,
      packages: toolkitSource.packages,
    },
    null,
    2,
  )}\n`;
}

export function buildPackageJsonWithToolkitSource(packageJsonSource, toolkitSource) {
  const packageJson = typeof packageJsonSource === 'string' ? JSON.parse(packageJsonSource) : structuredClone(packageJsonSource);
  const existingDependencies = packageJson.dependencies ?? {};
  const toolkitDependencies = Object.fromEntries(
    toolkitSource.packages.map((toolkitPackage) => [toolkitPackage.packageName, toolkitPackage.specifier]),
  );

  packageJson.dependencies = {
    ...existingDependencies,
    ...toolkitDependencies,
  };

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}