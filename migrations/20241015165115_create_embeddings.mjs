import { sql } from 'kysely';

/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.
  await db.schema
    .createTable('embeddings')
    .addColumn('id', 'uuid', (col) => col.notNull().primaryKey())
    .addColumn('file_id', 'uuid', (col) => col.references('files.id').notNull())
    .addColumn('embedding', sql`vector(1536)`, (col) => col.notNull())
    .addColumn('text', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.
  await db.schema.dropTable('embeddings').execute();
}
