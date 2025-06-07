/**
 * Implement the logic for upgrading the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function up(db) {
  // Use db.schema or db.insert/update/delete methods.
  await db.schema.alterTable('embeddings').dropConstraint('embeddings_file_id_fkey').execute();
  await db.schema
    .alterTable('embeddings')
    .addForeignKeyConstraint('embeddings_file_id_fkey', ['file_id'], 'files', ['id'])
    .onDelete('cascade')
    .execute();
}

/**
 * Implement the logic to downgrade the database.
 * @param {import('kysely').Kysely} db - The Kysely database instance.
 */
export async function down(db) {
  // It should reverse the changes made in the 'up' function.
  // If downgrading is not required, you can safely remove this function.
  await db.schema.alterTable('embeddings').dropConstraint('embeddings_file_id_fkey').execute();
  await db.schema
    .alterTable('embeddings')
    .addForeignKeyConstraint('embeddings_file_id_fkey', ['file_id'], 'files', ['id'])
    .execute();
}
