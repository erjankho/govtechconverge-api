import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';

import { AutoGenerateUpdatedAtPlugin } from './plugins/auto-generate-updated-at-plugin.js';
import type { Database, Metadata } from './types.js';

export type {
  Conversation,
  ConversationNew,
  ConversationUpdate,
  EmailEmbedding,
  EmailEmbeddingNew,
  Embedding,
  EmbeddingNew,
  EmbeddingUpdate,
  File,
  FileNew,
  FileUpdate,
  Message,
  MessageNew,
  MessageUpdate,
  NewUser,
  NewUserNew,
  NewUserUpdate,
} from './types.js';
export { sql } from 'kysely';

// Exports in '@types/pg' does not match the actual exports in 'pg'.
// Therefore we have to import it the following way. ¯\_(ツ)_/¯
const {
  Pool,
  types: { builtins, setTypeParser },
} = pg;

export type DB = Kysely<Database>;

export interface CreateDatabaseOptions {
  connectionString: string;
}

export async function createDatabase({ connectionString }: CreateDatabaseOptions): Promise<DB> {
  let db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });

  const metadata = (await db.introspection.getTables()).reduce<Metadata>((acc, table) => {
    acc[table.name] = Object.fromEntries(table.columns.map((column) => [column.name, column]));
    return acc;
  }, {});

  db = db.withPlugin(new AutoGenerateUpdatedAtPlugin(metadata));

  await createUUIDv7Function(db);
  await setBigIntTypeParser(db);
  await setVectorTypeParser(db);

  return db;
}

/**
 * PostgreSQL does not natively support UUIDv7 generation yet.
 * Until PostgreSQL v17 introduces this feature, we will temporarily use the following solution:
 * https://gist.github.com/kjmph/5bd772b2c2df145aa645b837da7eca74
 */
async function createUUIDv7Function(db: Kysely<Database>) {
  await sql`
  create or replace function uuid_generate_v7()
  returns uuid
  as $$
  begin
    -- use random v4 uuid as starting point (which has the same variant we need)
    -- then overlay timestamp
    -- then set version 7 by flipping the 2 and 1 bit in the version 4 string
    return encode(
      set_bit(
        set_bit(
          overlay(uuid_send(gen_random_uuid())
                  placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
                  from 1 for 6
          ),
          52, 1
        ),
        53, 1
      ),
      'hex')::uuid;
  end
  $$
  language plpgsql
  volatile;
  `.execute(db);
}

/**
 * Sets the type parser for the PostgreSQL BIGINT type.
 *
 * JavaScript's `Number` type can safely represent integers only up to 2^53 - 1 (9,007,199,254,740,991).
 * If greater precision is required, consider switching to `BigInt`.
 * However, we are not using `BigInt` today because `JSON.stringify` and `JSON.parse` do not natively support it.
 */
async function setBigIntTypeParser(_: Kysely<Database>) {
  setTypeParser(builtins.INT8, Number);
}

/**
 * Sets the type parser for PostgreSQL VECTOR type.
 */
async function setVectorTypeParser(db: Kysely<Database>) {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`.execute(db);

  interface Result {
    oid: number;
  }

  const result = await sql<Result>`SELECT oid FROM pg_type WHERE typname = 'vector'`.execute(db);
  if (result.rows.length === 0) {
    throw new Error("Failed to retrieve 'oid' of 'vector' type.");
  }

  setTypeParser(result.rows[0].oid, (val) => {
    return val
      .substring(1, val.length - 1)
      .split(',')
      .map((v) => parseFloat(v));
  });
}
