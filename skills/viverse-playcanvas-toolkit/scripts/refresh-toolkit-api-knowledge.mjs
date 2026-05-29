import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const DEFAULT_INDEX_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-index.json');
const DEFAULT_CANDIDATE_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-candidates.json');
const DEFAULT_CI_PROPOSAL_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-index.ci-proposed.json');
const DEFAULT_EXTERNAL_CANDIDATE_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-candidates.external.json');
const DEFAULT_PROPOSAL_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-index.proposed.json');

function toWorkspacePath(filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath || path.basename(filePath);
  }

  return filePath;
}

function parseArgs(argv) {
  const options = {
    apply: false,
    applyIfClean: false,
    candidatePath: null,
    checkDrift: false,
    includeKinds: [],
    includeNodeModules: false,
    includePackages: [],
    indexPath: DEFAULT_INDEX_PATH,
    maxApplyChanges: 25,
    minEvidence: null,
    proposalPath: DEFAULT_PROPOSAL_PATH,
    scanRoots: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--apply-if-clean') {
      options.apply = true;
      options.applyIfClean = true;
      continue;
    }

    if (arg === '--check-drift') {
      options.checkDrift = true;
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

    if (arg === '--include-node-modules') {
      options.includeNodeModules = true;
      continue;
    }

    if (arg === '--candidate-output') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--candidate-output requires a path');
      }

      options.candidatePath = path.resolve(REPO_ROOT, nextValue);
      index += 1;
      continue;
    }

    if (arg === '--proposal-output') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--proposal-output requires a path');
      }

      options.proposalPath = path.resolve(REPO_ROOT, nextValue);
      index += 1;
      continue;
    }

    if (arg === '--index') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--index requires a path');
      }

      options.indexPath = path.resolve(REPO_ROOT, nextValue);
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

    if (arg === '--max-apply-changes') {
      const nextValue = argv[index + 1];
      if (!nextValue || Number.isNaN(Number(nextValue))) {
        throw new Error('--max-apply-changes requires a numeric value');
      }

      options.maxApplyChanges = Number(nextValue);
      index += 1;
      continue;
    }

    if (arg === '--include-package') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--include-package requires a package name');
      }

      options.includePackages.push(nextValue);
      index += 1;
      continue;
    }

    if (arg === '--include-kind') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--include-kind requires a kind name');
      }

      options.includeKinds.push(nextValue);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.candidatePath) {
    options.candidatePath = options.scanRoots.length > 0 || options.includeNodeModules
      ? DEFAULT_EXTERNAL_CANDIDATE_PATH
      : DEFAULT_CANDIDATE_PATH;
  }

  if (options.checkDrift && options.proposalPath === DEFAULT_PROPOSAL_PATH) {
    options.proposalPath = DEFAULT_CI_PROPOSAL_PATH;
  }

  return options;
}

async function readJson(filePath) {
  const source = await readFile(filePath, 'utf8');
  return JSON.parse(source);
}

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

function normalizeGeneratedJsonForComparison(filePath, data) {
  if (!filePath.endsWith('.json') || !data || typeof data !== 'object') {
    return data;
  }

  const normalized = JSON.parse(JSON.stringify(data));
  delete normalized.generatedAt;
  return normalized;
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function runNodeScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${path.basename(scriptPath)} exited with code ${code ?? 'unknown'}`));
    });
  });
}

function buildDiscoverArgs(options) {
  const args = ['--output', options.candidatePath];
  if (options.includeNodeModules) {
    args.push('--include-node-modules');
  }

  for (const scanRoot of options.scanRoots) {
    args.push('--scan-root', scanRoot);
  }

  return args;
}

function buildCurateArgs(options) {
  const args = [
    '--index', options.indexPath,
    '--candidates', options.candidatePath,
    '--output', options.proposalPath,
  ];

  if (options.minEvidence !== null) {
    args.push('--min-evidence', String(options.minEvidence));
  }

  for (const packageName of options.includePackages) {
    args.push('--include-package', packageName);
  }

  for (const kindName of options.includeKinds) {
    args.push('--include-kind', kindName);
  }

  return args;
}

function collectApiKeys(indexData) {
  return new Set(
    (indexData.packages ?? []).flatMap((pkg) =>
      (pkg.apis ?? []).map((api) => `${pkg.packageName}::${api.name}`),
    ),
  );
}

function formatCountMap(entries) {
  return entries
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}

async function createTempOutputs(options) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'toolkit-api-refresh-'));
  return {
    tempDir,
    candidatePath: path.join(tempDir, 'toolkit-api-discovery-candidates.json'),
    proposalPath: path.join(tempDir, 'toolkit-api-discovery-index.proposed.json'),
  };
}

async function filesMatch(leftPath, rightPath) {
  try {
    if (leftPath.endsWith('.json') && rightPath.endsWith('.json')) {
      const [leftJson, rightJson] = await Promise.all([readJson(leftPath), readJson(rightPath)]);
      const normalizedLeft = normalizeGeneratedJsonForComparison(leftPath, leftJson);
      const normalizedRight = normalizeGeneratedJsonForComparison(rightPath, rightJson);
      return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
    }

    const [left, right] = await Promise.all([readText(leftPath), readText(rightPath)]);
    return left === right;
  } catch {
    return false;
  }
}

function summarizeProposal(baseIndexBeforeApply, proposalIndex, candidateIndex) {
  const baseApiKeys = collectApiKeys(baseIndexBeforeApply);
  const proposalApiKeys = collectApiKeys(proposalIndex);
  const addedByPackage = new Map();
  const removedByPackage = new Map();
  let addedApiCount = 0;
  let removedApiCount = 0;

  for (const pkg of proposalIndex.packages ?? []) {
    for (const api of pkg.apis ?? []) {
      const apiKey = `${pkg.packageName}::${api.name}`;
      if (!baseApiKeys.has(apiKey)) {
        addedApiCount += 1;
        addedByPackage.set(pkg.packageName, (addedByPackage.get(pkg.packageName) ?? 0) + 1);
      }
    }
  }

  for (const pkg of baseIndexBeforeApply.packages ?? []) {
    for (const api of pkg.apis ?? []) {
      const apiKey = `${pkg.packageName}::${api.name}`;
      if (!proposalApiKeys.has(apiKey)) {
        removedApiCount += 1;
        removedByPackage.set(pkg.packageName, (removedByPackage.get(pkg.packageName) ?? 0) + 1);
      }
    }
  }

  const candidatePackageCount = candidateIndex.packages?.length ?? 0;
  const candidateApiCount = (candidateIndex.packages ?? []).reduce((total, pkg) => total + (pkg.apiCount ?? 0), 0);

  return {
    addedApiCount,
    addedByPackage,
    candidateApiCount,
    candidatePackageCount,
    removedApiCount,
    removedByPackage,
  };
}

function assertCleanApply(summary, options) {
  if (summary.addedApiCount === 0) {
    throw new Error('apply-if-clean refused to overwrite the index because the proposal adds no APIs');
  }

  if (summary.removedApiCount > 0) {
    throw new Error(
      `apply-if-clean refused to overwrite the index because the proposal removes ${summary.removedApiCount} existing APIs`,
    );
  }

  if (summary.addedApiCount > options.maxApplyChanges) {
    throw new Error(
      `apply-if-clean refused to overwrite the index because ${summary.addedApiCount} APIs exceed the max apply change limit of ${options.maxApplyChanges}`,
    );
  }
}

async function printSummary(options, baseIndexBeforeApply) {
  const [candidateIndex, proposalIndex] = await Promise.all([
    readJson(options.candidatePath),
    readJson(options.proposalPath),
  ]);
  const summary = summarizeProposal(baseIndexBeforeApply, proposalIndex, candidateIndex);

  console.log('refresh-summary:');
  console.log(`  base-index: ${toWorkspacePath(options.indexPath)}`);
  console.log(`  candidates: ${toWorkspacePath(options.candidatePath)}`);
  console.log(`  proposal: ${toWorkspacePath(options.proposalPath)}`);
  console.log(`  apply-mode: ${options.apply ? 'enabled' : 'disabled'}`);
  console.log(`  apply-if-clean: ${options.applyIfClean ? 'enabled' : 'disabled'}`);
  console.log(`  check-drift: ${options.checkDrift ? 'enabled' : 'disabled'}`);
  console.log(`  candidate-packages: ${summary.candidatePackageCount}`);
  console.log(`  candidate-apis: ${summary.candidateApiCount}`);
  console.log(`  added-apis: ${summary.addedApiCount}`);
  console.log(`  removed-apis: ${summary.removedApiCount}`);
  console.log(`  added-package-breakdown: ${formatCountMap([...summary.addedByPackage.entries()]) || 'none'}`);
  if (summary.removedApiCount > 0) {
    console.log(`  removed-package-breakdown: ${formatCountMap([...summary.removedByPackage.entries()])}`);
  }
}

async function main() {
  const cliOptions = parseArgs(process.argv.slice(2));
  const options = { ...cliOptions };
  const discoverScriptPath = path.join(REPO_ROOT, 'scripts', 'discover-toolkit-api-candidates.mjs');
  const curateScriptPath = path.join(REPO_ROOT, 'scripts', 'curate-toolkit-api-index.mjs');
  const baseIndexBeforeApply = await readJson(cliOptions.indexPath);
  let tempOutputs = null;

  if (cliOptions.checkDrift) {
    tempOutputs = await createTempOutputs(cliOptions);
    options.candidatePath = tempOutputs.candidatePath;
    options.proposalPath = tempOutputs.proposalPath;
  }

  try {
    await runNodeScript(discoverScriptPath, buildDiscoverArgs(options));
    await runNodeScript(curateScriptPath, buildCurateArgs(options));

    const [candidateIndex, proposalIndex] = await Promise.all([
      readJson(options.candidatePath),
      readJson(options.proposalPath),
    ]);
    const summary = summarizeProposal(baseIndexBeforeApply, proposalIndex, candidateIndex);

    if (cliOptions.apply) {
      if (cliOptions.applyIfClean) {
        assertCleanApply(summary, cliOptions);
      }

      await writeJson(cliOptions.indexPath, proposalIndex);
      console.log(`applied: ${toWorkspacePath(cliOptions.indexPath)}`);
    }

    if (cliOptions.checkDrift) {
      const candidateMatches = await filesMatch(cliOptions.candidatePath, options.candidatePath);
      const proposalMatches = await filesMatch(cliOptions.proposalPath, options.proposalPath);

      console.log(`  candidate-drift: ${candidateMatches ? 'clean' : 'stale'}`);
      console.log(`  proposal-drift: ${proposalMatches ? 'clean' : 'stale'}`);

      if (!candidateMatches || !proposalMatches) {
        throw new Error('toolkit API knowledge drift detected; rerun the refresh flow and commit the updated generated files');
      }
    }

    await printSummary(cliOptions.checkDrift ? { ...cliOptions, candidatePath: cliOptions.candidatePath, proposalPath: cliOptions.proposalPath } : cliOptions, baseIndexBeforeApply);
  } finally {
    if (tempOutputs) {
      await rm(tempOutputs.tempDir, { recursive: true, force: true });
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}