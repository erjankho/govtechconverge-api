import { sql } from 'kysely';

/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.
  await db.schema
    .createTable('files')
    .addColumn('id', 'uuid', (col) => col.notNull().primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('size', 'bigint', (col) => col.notNull())
    .addColumn('mime_type', 'text', (col) => col.notNull())
    .addColumn('source', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('name_mime_type_source_unique', ['name', 'mime_type', 'source'])
    .execute();
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.
  await db.schema.dropTable('files').execute();
}
