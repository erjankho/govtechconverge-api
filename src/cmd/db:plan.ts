import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { snakeCase } from 'change-case';
import { createConsola } from 'consola';
import { packageDirectorySync } from 'pkg-dir';

import { isSystemError } from '../internal/system-error.js';

const consola = createConsola({
  formatOptions: {
    date: false,
  },
});

export default async function dbPlanAction(name: string) {
  try {
    await runAction(name);
  } catch (err) {
    consola.error(err);
  }
}

async function runAction(name: string) {
  const pkgDir = packageDirectorySync();
  if (!pkgDir) {
    throw new Error('Failed to locate package directory.');
  }

  const migrationDir = join(pkgDir, 'migrations');

  try {
    const stats = statSync(migrationDir);
    if (!stats.isDirectory()) {
      throw new Error(
        `Migration directory is not a directory: ./${relative(process.cwd(), migrationDir)}`,
      );
    }
  } catch (err) {
    if (!isSystemError(err) || err.code !== 'ENOENT') {
      throw err;
    }

    mkdirSync(migrationDir, { recursive: true });
  }

  name = snakeCase(name);
  const timestamp = getCurrentTimestamp();
  const fileName = `${timestamp}_${name}.mjs`;

  const filepath = join(migrationDir, fileName);
  writeFileSync(filepath, MIGRATION_TEMPLATE);

  consola.log(`✨ Migration plan created: ./${relative(process.cwd(), filepath)}`);
}

const MIGRATION_TEMPLATE = `
/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.
}
`;

/**
 * Returns the current timestamp in 'YYYYMMDDHHMMSS' format.
 */
function getCurrentTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    now.getUTCFullYear().toString() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds())
  );
}
