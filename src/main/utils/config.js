import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, assertInside, resolveProjectPath } from './paths.js';

export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function readVaultPathFromYaml(configPath = resolveProjectPath('config', 'vault.yaml')) {
  const text = readText(configPath);
  const match = text.match(/^\s*path:\s*(.+?)\s*$/m);
  if (!match) {
    throw new Error(`Could not find vault.path in ${configPath}`);
  }
  return match[1].replace(/^['"]|['"]$/g, '');
}

export function getVaultRoot({ projectRoot = PROJECT_ROOT, vaultPath } = {}) {
  const configuredPath = vaultPath ?? readVaultPathFromYaml();
  const resolved = path.resolve(projectRoot, configuredPath);
  return assertInside(projectRoot, resolved);
}
