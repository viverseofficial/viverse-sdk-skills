import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const DEFAULT_INDEX_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-index.json');
const DEFAULT_CANDIDATE_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-candidates.json');
const DEFAULT_EXTERNAL_CANDIDATE_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-candidates.external.json');
const DEFAULT_OUTPUT_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-index.proposed.json');

const DEFAULT_ALLOWED_KINDS = new Set([
  'action',
  'control',
  'interaction',
  'media',
  'media-zone',
  'module',
  'system',
  'trigger',
]);
const STRONG_SIGNAL_KINDS = new Set(['action', 'interaction', 'module', 'system', 'trigger']);

function toWorkspacePath(filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath || path.basename(filePath);
  }

  return filePath;
}

async function pickDefaultCandidatePath() {
  try {
    await access(DEFAULT_EXTERNAL_CANDIDATE_PATH);
    return DEFAULT_EXTERNAL_CANDIDATE_PATH;
  } catch {
    return DEFAULT_CANDIDATE_PATH;
  }
}

function parseArgs(argv) {
  const options = {
    allowedKinds: new Set(DEFAULT_ALLOWED_KINDS),
    includePackages: new Set(),
    indexPath: DEFAULT_INDEX_PATH,
    minEvidence: 2,
    outputPath: DEFAULT_OUTPUT_PATH,
    candidatePath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--index') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--index requires a path');
      }

      options.indexPath = path.resolve(REPO_ROOT, nextValue);
      index += 1;
      continue;
    }

    if (arg === '--candidates') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--candidates requires a path');
      }

      options.candidatePath = path.resolve(REPO_ROOT, nextValue);
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

    if (arg === '--min-evidence') {
      const nextValue = argv[index + 1];
      if (!nextValue || Number.isNaN(Number(nextValue))) {
        throw new Error('--min-evidence requires a numeric value');
      }

      options.minEvidence = Number(nextValue);
      index += 1;
      continue;
    }

    if (arg === '--include-package') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--include-package requires a package name');
      }

      options.includePackages.add(nextValue);
      index += 1;
      continue;
    }

    if (arg === '--include-kind') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--include-kind requires a kind name');
      }

      options.allowedKinds.add(nextValue);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function readJson(filePath) {
  const source = await readFile(filePath, 'utf8');
  return JSON.parse(source);
}

function cloneIndex(indexData) {
  return JSON.parse(JSON.stringify(indexData));
}

function normalizeIntentCues(intentCues) {
  return [...new Set((intentCues ?? []).map((cue) => cue.trim()).filter(Boolean))].sort();
}

function normalizeSourceEvidence(sourceEvidence) {
  return [...new Set((sourceEvidence ?? []).filter(Boolean))].sort();
}

function buildExistingApiSet(indexData) {
  const existing = new Set();
  for (const pkg of indexData.packages ?? []) {
    for (const api of pkg.apis ?? []) {
      existing.add(`${pkg.packageName}::${api.name}`);
    }
  }
  return existing;
}

function buildAllowedPackages(indexData, options) {
  const allowedPackages = new Set((indexData.packages ?? []).map((pkg) => pkg.packageName));
  for (const packageName of options.includePackages) {
    allowedPackages.add(packageName);
  }
  return allowedPackages;
}

function ensurePackage(mergedIndex, packageName) {
  let pkg = (mergedIndex.packages ?? []).find((entry) => entry.packageName === packageName);
  if (!pkg) {
    pkg = { packageName, apis: [] };
    mergedIndex.packages.push(pkg);
  }
  return pkg;
}

function createUseWhen(packageName, api) {
  switch (api.kind) {
    case 'system':
      return [`the request needs ${api.name} as a Toolkit-managed runtime system instead of custom orchestration`];
    case 'module':
      return [`a Toolkit system should be extended or initialized through ${api.name} instead of bespoke module wiring`];
    case 'action':
      return [`an event or interaction should execute ${api.name} through Toolkit action wiring`];
    case 'trigger':
      return [`a scene event flow should be gated by ${api.name} instead of manual polling or ad hoc checks`];
    case 'interaction':
      return [`the player interaction should use ${api.name} instead of custom interaction glue`];
    case 'media':
    case 'media-zone':
    case 'control':
      return [`the request directly matches ${api.name} and the repo shows repeated runtime evidence for it`];
    default:
      return [`the request directly matches ${api.name} in ${packageName}`];
  }
}

function shouldMergeCandidate(candidateApi, options) {
  if (!options.allowedKinds.has(candidateApi.kind)) {
    return { keep: false, reason: 'kind-filtered' };
  }

  if ((candidateApi.evidenceCount ?? 0) >= options.minEvidence) {
    return { keep: true, reason: 'evidence-threshold' };
  }

  const discoverySources = new Set(candidateApi.discoverySources ?? []);
  if (discoverySources.has('export-index') && STRONG_SIGNAL_KINDS.has(candidateApi.kind)) {
    return { keep: true, reason: 'export-signal' };
  }

  return { keep: false, reason: 'low-evidence' };
}

function sortMergedIndex(mergedIndex) {
  mergedIndex.packages.sort((left, right) => left.packageName.localeCompare(right.packageName));
  for (const pkg of mergedIndex.packages) {
    pkg.apis.sort((left, right) => left.name.localeCompare(right.name));
  }
}

async function curateIndex(options) {
  const candidatePath = options.candidatePath ?? (await pickDefaultCandidatePath());
  const [indexData, candidateData] = await Promise.all([readJson(options.indexPath), readJson(candidatePath)]);

  const mergedIndex = cloneIndex(indexData);
  const existingApis = buildExistingApiSet(indexData);
  const allowedPackages = buildAllowedPackages(indexData, options);

  const summary = {
    addedApis: 0,
    addedPackages: new Map(),
    keptByReason: new Map(),
    skippedByReason: new Map(),
    scannedPackages: candidateData.packages?.length ?? 0,
  };

  for (const candidatePackage of candidateData.packages ?? []) {
    if (!allowedPackages.has(candidatePackage.packageName)) {
      summary.skippedByReason.set(
        'package-not-allowed',
        (summary.skippedByReason.get('package-not-allowed') ?? 0) + (candidatePackage.apis?.length ?? 0),
      );
      continue;
    }

    for (const candidateApi of candidatePackage.apis ?? []) {
      const apiKey = `${candidatePackage.packageName}::${candidateApi.name}`;
      if (existingApis.has(apiKey)) {
        summary.skippedByReason.set('already-curated', (summary.skippedByReason.get('already-curated') ?? 0) + 1);
        continue;
      }

      const decision = shouldMergeCandidate(candidateApi, {
        allowedKinds: options.allowedKinds,
        minEvidence: options.minEvidence,
      });

      if (!decision.keep) {
        summary.skippedByReason.set(decision.reason, (summary.skippedByReason.get(decision.reason) ?? 0) + 1);
        continue;
      }

      const mergedPackage = ensurePackage(mergedIndex, candidatePackage.packageName);
      mergedPackage.apis.push({
        name: candidateApi.name,
        kind: candidateApi.kind,
        intentCues: normalizeIntentCues(candidateApi.suggestedIntentCues),
        useWhen: createUseWhen(candidatePackage.packageName, candidateApi),
        sourceEvidence: normalizeSourceEvidence(candidateApi.sourceEvidence),
      });

      summary.addedApis += 1;
      summary.addedPackages.set(
        candidatePackage.packageName,
        (summary.addedPackages.get(candidatePackage.packageName) ?? 0) + 1,
      );
      summary.keptByReason.set(decision.reason, (summary.keptByReason.get(decision.reason) ?? 0) + 1);
      existingApis.add(apiKey);
    }
  }

  sortMergedIndex(mergedIndex);
  return { candidatePath, mergedIndex, summary };
}

function formatCountMap(map) {
  return [...map.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { candidatePath, mergedIndex, summary } = await curateIndex(options);
  await writeFile(options.outputPath, `${JSON.stringify(mergedIndex, null, 2)}\n`, 'utf8');

  console.log(`base-index: ${toWorkspacePath(options.indexPath)}`);
  console.log(`candidates: ${toWorkspacePath(candidatePath)}`);
  console.log(`wrote: ${toWorkspacePath(options.outputPath)}`);
  console.log(`added-apis: ${summary.addedApis}`);
  console.log(`added-packages: ${summary.addedPackages.size}`);
  console.log(`kept-by-reason: ${formatCountMap(summary.keptByReason) || 'none'}`);
  console.log(`skipped-by-reason: ${formatCountMap(summary.skippedByReason) || 'none'}`);
  if (summary.addedPackages.size > 0) {
    console.log(`package-breakdown: ${formatCountMap(summary.addedPackages)}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}