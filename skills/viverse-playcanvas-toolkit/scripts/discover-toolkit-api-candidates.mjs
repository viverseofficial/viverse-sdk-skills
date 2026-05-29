import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-candidates.json');

const DEFAULT_SCAN_ROOTS = ['apps', 'packages', 'scripts'];
const DEFAULT_EXCLUDED_PACKAGES = new Set(['@viverse/types']);
const IGNORE_DIRS = new Set(['.git', '.turbo', 'dist', 'build', 'coverage', 'node_modules']);
const SCANNABLE_SUFFIXES = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.template',
];
const PACKAGE_CUE_HINTS = {
  '@viverse/account': ['account', 'auth', 'credentials', 'login', 'profile'],
  '@viverse/extension': ['interaction', 'trigger', 'action', 'event'],
  '@viverse/local-player': ['avatar', 'camera', 'controller', 'locomotion', 'player', 'xr'],
  '@viverse/network': ['multiplayer', 'network', 'room', 'sync'],
  '@viverse/quest': ['objective', 'progress', 'quest', 'task'],
  '@viverse/ui': ['hud', 'interface', 'ui'],
};
const STOP_WORDS = new Set([
  'action',
  'audio',
  'billboard',
  'controls',
  'executing',
  'interaction',
  'module',
  'open',
  'quest',
  'sit',
  'system',
  'texture',
  'trigger',
  'ui',
  'video',
]);

function toWorkspacePath(filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath || path.basename(filePath);
  }

  return filePath;
}

function isScannableFile(filePath) {
  return SCANNABLE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
}

function parseArgs(argv) {
  const options = {
    excludedPackages: new Set(DEFAULT_EXCLUDED_PACKAGES),
    includeNodeModules: false,
    outputPath: OUTPUT_PATH,
    scanRoots: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--include-node-modules') {
      options.includeNodeModules = true;
      continue;
    }

    if (arg === '--scan-root') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--scan-root requires a path');
      }

      options.scanRoots.push(nextValue);
      index += 1;
      continue;
    }

    if (arg === '--output') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--output requires a path');
      }

      options.outputPath = path.resolve(REPO_ROOT, nextValue);
      index += 1;
      continue;
    }

    if (arg === '--exclude-package') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--exclude-package requires a package name');
      }

      options.excludedPackages.add(nextValue);
      index += 1;
      continue;
    }

    if (arg === '--include-package') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--include-package requires a package name');
      }

      options.excludedPackages.delete(nextValue);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeScanRoots(scanRoots) {
  const resolvedRoots = [...DEFAULT_SCAN_ROOTS.map((scanRoot) => path.join(REPO_ROOT, scanRoot))];
  for (const scanRoot of scanRoots) {
    resolvedRoots.push(path.resolve(REPO_ROOT, scanRoot));
  }

  return [...new Set(resolvedRoots)];
}

async function collectFiles(rootDir, options) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name) && !(options.includeNodeModules && entry.name === 'node_modules')) {
      continue;
    }

    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, options)));
      continue;
    }

    if (entry.isFile() && isScannableFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function splitCamelCase(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function inferKind(apiName) {
  if (apiName.endsWith('System')) {
    return 'system';
  }

  if (apiName.endsWith('Module')) {
    return 'module';
  }

  if (apiName.endsWith('Action')) {
    return 'action';
  }

  if (apiName.endsWith('Trigger')) {
    return 'trigger';
  }

  if (apiName.endsWith('Interaction')) {
    return 'interaction';
  }

  if (apiName.includes('AudioZone')) {
    return 'media-zone';
  }

  if (apiName.includes('Controls')) {
    return 'control';
  }

  if (apiName.includes('Texture')) {
    return 'media';
  }

  return 'candidate';
}

function inferIntentCues(packageName, apiName) {
  const packageCues = PACKAGE_CUE_HINTS[packageName] ?? [];
  const tokenCues = splitCamelCase(apiName).filter((token) => !STOP_WORDS.has(token));
  return [...new Set([...tokenCues, ...packageCues])].sort();
}

function normalizeSymbol(rawSymbol) {
  return rawSymbol.replace(/^type\s+/u, '').split(/\s+as\s+/u)[0].trim();
}

function isTypeOnlySymbol(rawSymbol) {
  return /^type\s+/u.test(rawSymbol.trim());
}

function isLikelyApiSymbol(apiName) {
  if (!apiName) {
    return false;
  }

  if (/['"`;\n\r/\\]/u.test(apiName)) {
    return false;
  }

  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(apiName);
}

function extractImportedSymbols(importClause) {
  const symbols = [];
  const namedMatch = importClause.match(/\{([\s\S]*?)\}/u);
  if (namedMatch) {
    const namedSymbols = namedMatch[1]
      .split(',')
      .filter((symbol) => !isTypeOnlySymbol(symbol))
      .map((symbol) => normalizeSymbol(symbol))
      .filter(Boolean);
    symbols.push(...namedSymbols);
  }

  const clauseWithoutNamed = importClause.replace(/\{[\s\S]*?\}/u, '').trim();
  const defaultPart = clauseWithoutNamed.split(',')[0]?.trim();
  if (defaultPart && !defaultPart.startsWith('*') && !isTypeOnlySymbol(defaultPart)) {
    symbols.push(normalizeSymbol(defaultPart));
  }

  return [...new Set(symbols.filter((symbol) => isLikelyApiSymbol(symbol)))];
}

function ensureApiRecord(packageRecords, packageName, apiName) {
  if (!packageRecords.has(packageName)) {
    packageRecords.set(packageName, new Map());
  }

  const apiRecords = packageRecords.get(packageName);
  if (!apiRecords.has(apiName)) {
    apiRecords.set(apiName, {
      name: apiName,
      kind: inferKind(apiName),
      sourceEvidence: new Set(),
      discoverySources: new Set(),
    });
  }

  return apiRecords.get(apiName);
}

function recordImportEvidence(source, workspacePath, packageRecords, options) {
  const importRegex = /import\s+([^;]+?)\s+from\s+['"](@viverse\/[^'"]+)['"];?/gu;

  for (const match of source.matchAll(importRegex)) {
    const importClause = match[1]?.trim();
    const packageName = match[2]?.trim();
    if (!importClause || !packageName) {
      continue;
    }

    if (!isIncludedPackage(packageName, options)) {
      continue;
    }

    for (const apiName of extractImportedSymbols(importClause)) {
      const apiRecord = ensureApiRecord(packageRecords, packageName, apiName);
      apiRecord.sourceEvidence.add(workspacePath);
      apiRecord.discoverySources.add('import');
    }
  }
}

function isIncludedPackage(packageName, options) {
  return !options.excludedPackages.has(packageName);
}

function recordExportEvidence(source, workspacePath, packageName, packageRecords) {
  const exportRegex = /export\s+\*\s+from\s+['"](.+?)['"]/gu;

  for (const match of source.matchAll(exportRegex)) {
    const exportPath = match[1]?.trim();
    if (!exportPath) {
      continue;
    }

    const apiName = path.basename(exportPath);
    if (!apiName || apiName.startsWith('.')) {
      continue;
    }

    const apiRecord = ensureApiRecord(packageRecords, packageName, apiName);
    apiRecord.sourceEvidence.add(workspacePath);
    apiRecord.discoverySources.add('export-index');
  }
}

function inferPackageNameFromIndex(filePath) {
  const normalizedPath = filePath.split(path.sep).join('/');
  const packageSourceMatch = normalizedPath.match(/\/packages\/([^/]+)\/src\/index\.(?:d\.)?ts$/u);
  if (packageSourceMatch) {
    return `@viverse/${packageSourceMatch[1]}`;
  }

  const packageNodeModulesMatch = normalizedPath.match(/\/node_modules\/@viverse\/([^/]+)\/(?:dist\/)?index\.(?:d\.)?ts$/u);
  if (packageNodeModulesMatch) {
    return `@viverse/${packageNodeModulesMatch[1]}`;
  }

  return null;
}

async function buildDiscoveryIndex(options) {
  const packageRecords = new Map();
  const scannedFiles = [];
  const scanRoots = normalizeScanRoots(options.scanRoots);

  for (const rootPath of scanRoots) {
    try {
      await access(rootPath);
      scannedFiles.push(...(await collectFiles(rootPath, options)));
    } catch {
      continue;
    }
  }

  for (const filePath of scannedFiles) {
    const workspacePath = toWorkspacePath(filePath);
    const source = await readFile(filePath, 'utf8');
    recordImportEvidence(source, workspacePath, packageRecords, options);

    const packageName = inferPackageNameFromIndex(filePath);
    if (packageName && isIncludedPackage(packageName, options)) {
      recordExportEvidence(source, workspacePath, packageName, packageRecords);
    }
  }

  const packages = [...packageRecords.entries()]
    .map(async ([packageName, apiRecords]) => {
      const packageGuidePath = path.join(REPO_ROOT, 'packages', packageName.replace('@viverse/', ''), 'guide.md');
      const apis = [...apiRecords.values()]
        .map((apiRecord) => ({
          name: apiRecord.name,
          kind: apiRecord.kind,
          discoverySources: [...apiRecord.discoverySources].sort(),
          suggestedIntentCues: inferIntentCues(packageName, apiRecord.name),
          sourceEvidence: [...apiRecord.sourceEvidence].sort(),
          evidenceCount: apiRecord.sourceEvidence.size,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      let packageGuide = null;
      try {
        await access(packageGuidePath);
        packageGuide = toWorkspacePath(packageGuidePath);
      } catch {
        packageGuide = null;
      }

      return {
        packageName,
        packageGuide,
        apiCount: apis.length,
        apis,
      };
    })
    ;

  const resolvedPackages = await Promise.all(packages);
  resolvedPackages.sort((left, right) => left.packageName.localeCompare(right.packageName));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    scannedRoots: scanRoots.map((rootPath) => toWorkspacePath(rootPath)),
    includeNodeModules: options.includeNodeModules,
    excludedPackages: [...options.excludedPackages].sort(),
    purpose:
      'Auto-discovered candidate Toolkit APIs from visible repo imports and package index exports. Review before merging into toolkit-api-discovery-index.json.',
    discoveryRules: [
      'Scan visible imports from @viverse/* across apps, packages, and scripts.',
      'Allow extra scan roots such as private Toolkit repos or installed package folders through repeated --scan-root arguments.',
      'Infer additional candidates from package index files in source repos or node_modules when available.',
      'Exclude noisy packages such as @viverse/types by default unless explicitly re-included.',
      'Drop malformed or type-only import symbols before they become candidate APIs.',
      'Treat suggestedIntentCues as heuristics that should be curated before becoming canonical routing data.',
    ],
    packages: resolvedPackages,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const discoveryIndex = await buildDiscoveryIndex(options);
  await writeFile(options.outputPath, `${JSON.stringify(discoveryIndex, null, 2)}\n`, 'utf8');

  const packageCount = discoveryIndex.packages.length;
  const apiCount = discoveryIndex.packages.reduce((total, entry) => total + entry.apiCount, 0);
  console.log(`wrote: ${toWorkspacePath(options.outputPath)}`);
  console.log(`packages: ${packageCount}`);
  console.log(`apis: ${apiCount}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}