import { sql } from 'kysely';

/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.
  await db.schema
    .createTable('msgraph_delta_links')
    .addColumn('id', 'uuid', (col) =>
      col
        .notNull()
        .primaryKey()
        .defaultTo(sql`uuid_generate_v7()`),
    )
    .addColumn('entity_id', 'text', (col) => col.notNull())
    .addColumn('entity_type', 'varchar(255)', (col) => col.notNull())
    .addColumn('link', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('entity_id_entity_type_unique', ['entity_id', 'entity_type'])
    .execute();
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.
  await db.schema.dropTable('msgraph_delta_links').execute();
}
