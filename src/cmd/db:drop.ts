import { createConsola } from 'consola';

import { loadDBConfig } from '../config/db-config.js';
import { createDatabase, sql } from '../db/index.js';

const consola = createConsola({
  formatOptions: {
    date: false,
  },
});

export default async function dbDropAction() {
  try {
    await runAction();
  } catch (err) {
    consola.error(err);
  }
}

async function runAction() {
  const config = loadDBConfig();

  const db = await createDatabase({ connectionString: config.POSTGRES_DSN });

  try {
    interface Result {
      tablename: string;
    }

    const result =
      await sql<Result>`select tablename from pg_tables where schemaname = 'public'`.execute(db);
    if (result.rows.length === 0) {
      consola.info('No tables found!');
      return;
    }

    consola.info(`Found ${result.rows.length} tables:`);
    for (const row of result.rows) {
      consola.log(`• ${row.tablename}`);
    }

    const confirmed = await consola.prompt('Are you sure you want to drop all tables?', {
      type: 'confirm',
      initial: false,
    });
    if (!confirmed) {
      consola.error('Aborted!');
      return;
    }

    await db.transaction().execute(async (txn) => {
      for (const row of result.rows) {
        await txn.schema.dropTable(row.tablename).cascade().execute();
      }
    });

    console.log();
    consola.success('Successfully dropped all tables.');
  } finally {
    await db.destroy();
  }
}
