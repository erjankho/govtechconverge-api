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

const MIGRATION_FILENAME_REGEX = /^(\d+)_.*\.mjs$/;

export default async function dbMigrateAction() {
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

  const migrations = readdirSync(migrationDir)
    .filter((filename) => MIGRATION_FILENAME_REGEX.test(filename))
    .sort()
    .map((filename) => {
      const matches = filename.match(MIGRATION_FILENAME_REGEX);
      return {
        filepath: join(migrationDir, filename),
        version: matches![1],
      };
    });

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
      .orderBy('version asc')
      .execute();
    const appliedVersions = result.map((row) => row.version);

    // Ensure that the applied migration versions are in order
    // with the migrations found in the migration directory.
    for (let i = 0; i < appliedVersions.length; i++) {
      const migration = migrations[i];
      if (!migration) {
        throw new Error(
          `Applied migration version is out-of-order! Please drop all migrations with 'db:drop' and re-run 'db:migrate'.`,
        );
      }

      const av = appliedVersions[i];
      const mv = migration.version;

      if (av !== mv) {
        throw new Error(`Mismatch migration version! '${av}' !== '${mv}'`);
      }
    }

    const pendingMigrations = migrations.filter((m) => !appliedVersions.includes(m.version));

    if (pendingMigrations.length === 0) {
      consola.success('No new migration to apply.');
      return;
    }

    consola.info(`Found ${pendingMigrations.length} pending migration(s).`);

    for (const { filepath, version } of pendingMigrations) {
      const spinner = ora(`Applying migration, '${version}'`).start();

      let module;
      try {
        // Convert to a file:// URL so that absolute Windows paths (e.g. 'C:\...')
        // are accepted by the ESM loader.
        module = await import(pathToFileURL(filepath).href);
      } catch (err) {
        spinner.fail(`Failed to import migration file: ${relative(process.cwd(), filepath)}`);
        throw err;
      }

      // Ensure that the 'up' function is exported.
      if (!module.up || typeof module.up !== 'function') {
        spinner.fail(`Migration file does not export 'up' function, '${version}'`);
        return;
      }

      try {
        await db.transaction().execute(async (txn) => {
          // Apply the migration.
          await module.up(txn);

          // Record the migration.
          await txn.insertInto('schema_migrations').values({ version }).execute();
        });
      } catch (err) {
        spinner.fail(`Failed to apply migration, '${version}'`);
        throw err;
      }

      spinner.succeed(`Migration '${version}' applied successfully.`);
    }
  } finally {
    await db.destroy();
  }
}
