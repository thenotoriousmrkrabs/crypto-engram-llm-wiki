import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);

export const PROJECT_ROOT = path.resolve(path.dirname(currentFile), '../../..');

export function resolveProjectPath(...segments) {
  return path.resolve(PROJECT_ROOT, ...segments);
}

export function assertInside(parentPath, targetPath) {
  const parent = path.resolve(parentPath);
  const target = path.resolve(targetPath);
  const relative = path.relative(parent, target);

  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return target;
  }

  throw new Error(`Path escapes allowed root: ${target}`);
}

export function toVaultRelative(vaultRoot, targetPath) {
  const resolved = assertInside(vaultRoot, targetPath);
  return path.relative(path.resolve(vaultRoot), resolved).split(path.sep).join('/');
}

export function toProjectRelative(targetPath) {
  const resolved = assertInside(PROJECT_ROOT, targetPath);
  return path.relative(PROJECT_ROOT, resolved).split(path.sep).join('/');
}
