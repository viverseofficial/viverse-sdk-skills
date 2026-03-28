import fs from 'fs/promises';
import path from 'path';

const repoRoot = new URL('..', import.meta.url).pathname;
const skillsRoot = path.join(repoRoot, 'skills');
const catalogPath = path.join(repoRoot, 'catalog', 'skills.json');

const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
const skills = [];
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const id = entry.name;
  const skillJsonPath = path.join(skillsRoot, id, 'skill.json');
  try {
    await fs.access(skillJsonPath);
    skills.push({ id, path: `skills/${id}/skill.json` });
  } catch {
    // skip folders without skill.json for now
  }
}

const out = {
  version: '0.1.0',
  generated_at: new Date().toISOString(),
  skills: skills.sort((a, b) => a.id.localeCompare(b.id))
};

await fs.writeFile(catalogPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`Updated ${catalogPath} with ${out.skills.length} skills`);
