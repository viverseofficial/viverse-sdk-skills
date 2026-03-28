import fs from 'fs/promises';
import path from 'path';

const repoRoot = new URL('..', import.meta.url).pathname;
const skillsRoot = path.join(repoRoot, 'skills');

const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
let failed = 0;
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const base = path.join(skillsRoot, entry.name);
  const skillMd = path.join(base, 'SKILL.md');
  try {
    await fs.access(skillMd);
  } catch {
    // shared docs in skills root are allowed; only directory skills require SKILL.md
    console.error(`[missing] ${entry.name}/SKILL.md`);
    failed += 1;
  }
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`Validation failed: ${failed} missing SKILL.md file(s)`);
} else {
  console.log('Validation passed');
}
