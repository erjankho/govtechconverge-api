import { sql } from 'kysely';

/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.
  await db.schema.alterTable('files').addColumn('metadata', 'jsonb').execute();

  await sql`
    CREATE UNIQUE INDEX metadata_drive_item_id_unique 
    ON files ((metadata->>'drive_item_id'));
  `.execute(db);
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.
  await db.schema.dropIndex('metadata_drive_item_id_unique').execute();
  await db.schema.alterTable('files').dropColumn('metadata').execute();
}
