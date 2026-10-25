#!/usr/bin/env node
// npm run check:seo validates emitted HTML without calling production services.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const python = process.env.PYTHON || 'python3';
const result = spawnSync(python, [path.join(root, 'scripts/check_release.py'), '--static-only', '--report', path.join(root, 'docs/static-seo-checks.json')], { cwd: root, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
