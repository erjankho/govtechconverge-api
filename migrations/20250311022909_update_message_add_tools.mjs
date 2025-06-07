import { sql } from 'kysely';

/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.
  await db.schema
    .alterTable('messages')
    .addColumn('metadata', sql`jsonb`)
    .execute();
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.
  await db.schema.alterTable('messages').dropColumn('metadata').execute();
}
