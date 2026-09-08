import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createConsola } from 'consola';
import ora from 'ora';
import { packageDirectorySync } from 'pkg-dir';

import { loadDBConfig } from '../config/db-config.js';
import { createDatabase } from '../db/index.js';
import { isSystemError } from '../internal/system-error.js';

const consola = createConsola({
  formatOptions: {
    date: false,
  },
});

export default async function dbRollbackAction() {
  try {
    await runAction();
  } catch (err) {
    consola.error(err);
  }
}

async function runAction() {
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

  const config = loadDBConfig();
  const db = await createDatabase({ connectionString: config.POSTGRES_DSN });

  try {
    // Create the migration table if not exists.
    await db.schema
      .createTable('schema_migrations')
      .ifNotExists()
      .addColumn('version', 'varchar', (col) => col.notNull().primaryKey())
      .execute();

    const result = await db
      .selectFrom('schema_migrations')
      .select('version')
      .orderBy('version desc')
      .limit(1)
      .execute();

    if (result.length === 0) {
      consola.info('Nothing to rollback as no migration have been applied.');
      return;
    }

    const appliedVersion = result[0].version;
    const spinner = ora(`Rolling back migration, '${appliedVersion}'`).start();

    const filename = readdirSync(migrationDir).find(
      (filename) => filename.startsWith(`${appliedVersion}_`) && filename.endsWith('.mjs'),
    );
    if (!filename) {
      spinner.fail(`Failed to find migration file with prefix, '${appliedVersion}'`);
      return;
    }

    const filepath = join(migrationDir, filename);

    let module;
    try {
      // Convert to a file:// URL so that absolute Windows paths (e.g. 'C:\...')
      // are accepted by the ESM loader.
      module = await import(pathToFileURL(filepath).href);
    } catch (err) {
      spinner.fail(`Failed to import migration file: ${relative(process.cwd(), filepath)}`);
      throw err;
    }

    let canDowngrade = true;
    if (!module.down || typeof module.down !== 'function') {
      spinner.info(
        `Skipping rollback as there is no 'down' function defined in migration, '${appliedVersion}'`,
      );

      canDowngrade = false;
    }

    try {
      await db.transaction().execute(async (txn) => {
        if (canDowngrade) {
          // Rollback the migration.
          await module.down(txn);
        }

        // Delete the migration.
        await txn.deleteFrom('schema_migrations').where('version', '=', appliedVersion).execute();
      });
    } catch (err) {
      spinner.fail(`Failed to rollback migration, '${appliedVersion}'`);
      throw err;
    }

    spinner.stopAndPersist({ symbol: '🎉', text: 'Database rollback completed successfully.' });
  } finally {
    await db.destroy();
  }
}
