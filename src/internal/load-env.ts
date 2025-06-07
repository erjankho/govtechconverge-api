import { readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { DotenvParseOutput } from 'dotenv';
import { parse } from 'dotenv';
import { packageDirectorySync } from 'pkg-dir';

import { isSystemError } from './system-error.js';

export function loadEnv() {
  const mode =
    process.env.NODE_ENV === 'production'
      ? 'production'
      : process.env.NODE_ENV === 'test'
        ? 'test'
        : 'development';

  const envs = [
    `.env.${mode}.local`,
    // Do not include `.env.local` for test environment.
    mode !== 'test' && `.env.local`,
    `.env.${mode}`,
    `.env`,
  ].filter(Boolean) as string[];

  const pkgDir = packageDirectorySync();
  if (!pkgDir) {
    throw new Error('Failed to locate package directory.');
  }

  const parsedEnv: DotenvParseOutput = {};

  for (const env of envs) {
    const filepath = join(pkgDir, env);

    try {
      // Ensure that we target file only.
      const stat = statSync(filepath);
      if (!stat.isFile) {
        continue;
      }

      const content = readFileSync(filepath, 'utf-8');
      const result = parse(content);

      for (const key of Object.keys(result)) {
        if (typeof parsedEnv[key] === 'undefined' && typeof process.env[key] === 'undefined') {
          parsedEnv[key] = result[key];
        }
      }
    } catch (err) {
      if (isSystemError(err) && err.code !== 'ENOENT') {
        throw new Error(`Failed to read environment file: ${relative(process.cwd(), filepath)}`);
      }
    }
  }

  return Object.assign(process.env, parsedEnv);
}
