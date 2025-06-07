import { sql } from 'kysely';

/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.
  await db.schema
    .createTable('email_embeddings')
    .addColumn('id', 'uuid', (col) =>
      col
        .notNull()
        .primaryKey()
        .defaultTo(sql`uuid_generate_v7()`),
    )
    .addColumn('conversation_id', 'uuid', (col) => col.references('conversations.id').notNull())
    .addColumn('embedding', sql`vector(1536)`, (col) => col.notNull())
    .addColumn('text', 'text', (col) => col.notNull())
    .addColumn('expires_on', 'timestamptz', (col) => col.notNull())
    .addColumn('metadata', 'jsonb', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  await sql`
    CREATE UNIQUE INDEX conversation_id_metadata_id_unique
    ON email_embeddings (conversation_id, (metadata->>'id'));
  `.execute(db);
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.
  await db.schema.dropTable('email_embeddings').execute();
}
