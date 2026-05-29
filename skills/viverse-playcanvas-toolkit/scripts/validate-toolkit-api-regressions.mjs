import { readFileSync } from 'node:fs';
import path from 'node:path';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const DEFAULT_INDEX_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-index.json');
const DEFAULT_CASES_PATH = path.join(REPO_ROOT, 'toolkit-api-discovery-regression-cases.json');

function printHelp() {
  console.log(`Usage:
  node scripts/validate-toolkit-api-regressions.mjs \
    [--index <path>] \
    [--cases <path>] \
    [--help]

Options:
  --index  Path to the API discovery index JSON. Defaults to toolkit-api-discovery-index.json
  --cases  Path to the regression case JSON. Defaults to toolkit-api-discovery-regression-cases.json
  --help   Show this help message
`);
}

function parseArgs(argv) {
  const result = {
    help: false,
    index: DEFAULT_INDEX_PATH,
    cases: DEFAULT_CASES_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    result[arg.slice(2)] = path.resolve(REPO_ROOT, value);
    index += 1;
  }

  return result;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function findPackage(indexData, packageName) {
  return indexData.packages.find((entry) => entry.packageName === packageName) ?? null;
}

function findApi(packageEntry, apiName) {
  return packageEntry.apis.find((entry) => entry.name === apiName) ?? null;
}

function collectHintNames(hints) {
  return new Set((hints ?? []).map((entry) => entry.name));
}

function validateCase(indexData, regressionCase) {
  const packageEntry = findPackage(indexData, regressionCase.packageName);
  if (!packageEntry) {
    return `missing package ${regressionCase.packageName}`;
  }

  const apiEntry = findApi(packageEntry, regressionCase.apiName);
  if (!apiEntry) {
    return `missing API ${regressionCase.apiName}`;
  }

  const configFields = collectHintNames(apiEntry.configFields);
  const constructionHints = collectHintNames(apiEntry.constructionHints);
  const capabilityHints = collectHintNames(apiEntry.capabilityHints);

  for (const fieldName of regressionCase.requiredConfigFields ?? []) {
    if (!configFields.has(fieldName)) {
      return `missing config field ${fieldName} on ${regressionCase.apiName}`;
    }
  }

  for (const hintName of regressionCase.requiredConstructionHints ?? []) {
    if (!constructionHints.has(hintName)) {
      return `missing construction hint ${hintName} on ${regressionCase.apiName}`;
    }
  }

  for (const hintName of regressionCase.requiredCapabilityHints ?? []) {
    if (!capabilityHints.has(hintName)) {
      return `missing capability hint ${hintName} on ${regressionCase.apiName}`;
    }
  }

  const serializedApi = JSON.stringify(apiEntry);
  for (const forbiddenName of regressionCase.forbiddenFieldNames ?? []) {
    if (serializedApi.includes(`"${forbiddenName}"`)) {
      return `found forbidden field name ${forbiddenName} on ${regressionCase.apiName}`;
    }
  }

  return null;
}

function fail(reason, nextAction) {
  console.log('status: fail');
  console.log(`reason: ${reason}`);
  console.log(`next action: ${nextAction}`);
  process.exitCode = 1;
}

function pass(caseCount) {
  console.log('status: pass');
  console.log(`cases checked: ${caseCount}`);
  console.log('next action: The API discovery index still preserves the expected high-value hint surfaces for the current regression set.');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const indexData = readJson(options.index);
  const regressionData = readJson(options.cases);

  if (!Array.isArray(indexData.packages)) {
    throw new Error('The API discovery index is missing a packages array.');
  }

  if (!Array.isArray(regressionData.cases) || regressionData.cases.length === 0) {
    throw new Error('The regression case file is missing cases.');
  }

  for (const regressionCase of regressionData.cases) {
    const failure = validateCase(indexData, regressionCase);
    if (failure) {
      fail(`${regressionCase.id}: ${failure}`, `Restore the expected API hint surface in ${path.relative(REPO_ROOT, options.index)}.`);
      return;
    }
  }

  pass(regressionData.cases.length);
}

main();
