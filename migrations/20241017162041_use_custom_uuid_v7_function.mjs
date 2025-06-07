import { sql } from 'kysely';

/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.

  await db.schema
    .alterTable('files')
    .alterColumn('id', (col) => col.setDefault(sql`uuid_generate_v7()`))
    .execute();
  await db.schema
    .alterTable('embeddings')
    .alterColumn('id', (col) => col.setDefault(sql`uuid_generate_v7()`))
    .execute();
  await db.schema
    .alterTable('new_users')
    .alterColumn('id', (col) => col.setDefault(sql`uuid_generate_v7()`))
    .execute();
  await db.schema
    .alterTable('conversations')
    .alterColumn('id', (col) => col.setDefault(sql`uuid_generate_v7()`))
    .execute();
  await db.schema
    .alterTable('messages')
    .alterColumn('id', (col) => col.setDefault(sql`uuid_generate_v7()`))
    .execute();
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.

  await db.schema
    .alterTable('files')
    .alterColumn('id', (col) => col.dropDefault())
    .execute();
  await db.schema
    .alterTable('embeddings')
    .alterColumn('id', (col) => col.dropDefault())
    .execute();
  await db.schema
    .alterTable('new_users')
    .alterColumn('id', (col) => col.dropDefault())
    .execute();
  await db.schema
    .alterTable('conversations')
    .alterColumn('id', (col) => col.dropDefault())
    .execute();
  await db.schema
    .alterTable('messages')
    .alterColumn('id', (col) => col.dropDefault())
    .execute();
}
