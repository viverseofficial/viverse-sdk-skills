import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const DEFAULT_CASES_PATH = path.join(REPO_ROOT, 'toolkit-api-fixture-cases.json');
const DEFAULT_MAX_APPLY_CHANGES = 25;

function printHelp() {
  console.log(`Usage:
  node scripts/validate-toolkit-api-fixtures.mjs [--case <id>] [--cases <path>] [--help]

Options:
  --case   Validate only one fixture case from the cases file
  --cases  Override the fixture cases JSON path
  --help  Show this help message
`);
}

function parseArgs(argv) {
  const options = {
    caseId: null,
    casesPath: DEFAULT_CASES_PATH,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--case') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--case requires a fixture id');
      }

      options.caseId = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--cases') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--cases requires a path');
      }

      options.casesPath = path.resolve(REPO_ROOT, nextValue);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
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

function collectApiKeys(indexData) {
  return new Set(
    (indexData.packages ?? []).flatMap((pkg) =>
      (pkg.apis ?? []).map((api) => `${pkg.packageName}::${api.name}`),
    ),
  );
}

function summarizeProposal(baseIndex, proposalIndex) {
  const baseKeys = collectApiKeys(baseIndex);
  const proposalKeys = collectApiKeys(proposalIndex);
  let addedApis = 0;
  let removedApis = 0;

  for (const key of proposalKeys) {
    if (!baseKeys.has(key)) {
      addedApis += 1;
    }
  }

  for (const key of baseKeys) {
    if (!proposalKeys.has(key)) {
      removedApis += 1;
    }
  }

  return { addedApis, removedApis };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function isApplyIfCleanEligible(summary, maxApplyChanges = DEFAULT_MAX_APPLY_CHANGES) {
  return summary.addedApis > 0 && summary.removedApis === 0 && summary.addedApis <= maxApplyChanges;
}

async function validateFixtureCase(fixtureCase) {
  const curateScriptPath = path.join(REPO_ROOT, 'scripts', 'curate-toolkit-api-index.mjs');
  const tempDir = await mkdtemp(path.join(os.tmpdir(), `toolkit-api-fixture-${fixtureCase.id}-`));
  const generatedProposalPath = path.join(tempDir, 'toolkit-api-discovery-index.proposed.json');

  try {
    await runNodeScript(curateScriptPath, [
      '--index', fixtureCase.indexPath,
      '--candidates', fixtureCase.candidatePath,
      '--output', generatedProposalPath,
    ]);

    const [baseIndex, expectedProposal, generatedProposal] = await Promise.all([
      readJson(path.join(REPO_ROOT, fixtureCase.indexPath)),
      readJson(path.join(REPO_ROOT, fixtureCase.expectedProposalPath)),
      readJson(generatedProposalPath),
    ]);

    if (JSON.stringify(expectedProposal) !== JSON.stringify(generatedProposal)) {
      throw new Error(`fixture output mismatch for ${fixtureCase.id}`);
    }

    const summary = summarizeProposal(baseIndex, expectedProposal);

    if (summary.addedApis !== fixtureCase.expectedAddedApis) {
      throw new Error(
        `fixture summary mismatch for ${fixtureCase.id}: expected added-apis ${fixtureCase.expectedAddedApis}, got ${summary.addedApis}`,
      );
    }

    if (summary.removedApis !== fixtureCase.expectedRemovedApis) {
      throw new Error(
        `fixture summary mismatch for ${fixtureCase.id}: expected removed-apis ${fixtureCase.expectedRemovedApis}, got ${summary.removedApis}`,
      );
    }

    const applyIfCleanEligible = isApplyIfCleanEligible(summary);
    if (applyIfCleanEligible !== fixtureCase.expectedApplyIfCleanEligible) {
      throw new Error(
        `fixture apply-if-clean mismatch for ${fixtureCase.id}: expected ${fixtureCase.expectedApplyIfCleanEligible}, got ${applyIfCleanEligible}`,
      );
    }

    return {
      ...summary,
      applyIfCleanEligible,
      id: fixtureCase.id,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const caseData = await readJson(options.casesPath);
  if (!Array.isArray(caseData.cases) || caseData.cases.length === 0) {
    throw new Error(`Fixture cases file is missing cases: ${options.casesPath}`);
  }

  const fixtureCases = options.caseId
    ? caseData.cases.filter((entry) => entry.id === options.caseId)
    : caseData.cases;

  if (fixtureCases.length === 0) {
    throw new Error(`Unknown fixture case: ${options.caseId}`);
  }

  const results = [];
  for (const fixtureCase of fixtureCases) {
    results.push(await validateFixtureCase(fixtureCase));
  }

  console.log('status: pass');
  for (const result of results) {
    console.log(
      `case: ${result.id} added-apis: ${result.addedApis} removed-apis: ${result.removedApis} apply-if-clean-eligible: ${result.applyIfCleanEligible}`,
    );
  }
  console.log('next action: The API fixture snapshots still match the current curate script behavior for the checked cases.');
}

try {
  await main();
} catch (error) {
  console.log('status: fail');
  console.log(`reason: ${error instanceof Error ? error.message : String(error)}`);
  console.log('next action: Regenerate or repair the affected fixture snapshot so it matches the current curate script behavior.');
  process.exitCode = 1;
}