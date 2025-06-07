import type { KyselyPlugin } from 'kysely';
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from 'kysely';
import { afterAll, beforeAll, describe } from 'vitest';

/**
 * A helpful wrapper that sets up everything you need to test `db`.
 * @param title - The title of the test suite.
 * @param fn - A test function.
 * @example
 * ```
 * describeMatrix('awesome title', (ctx) => {
 *    test('awesome test', async () => {
 *      // Use `ctx.db` to perform queries.
 *    });
 * });
 * ```
 */
export function describeMatrix<T>(
  title: string,
  fn: (ctx: { db: Kysely<T>; addPlugin: (plugin: KyselyPlugin) => void }) => Promise<void> | void,
) {
  describe(title, async () => {
    let db: Kysely<T> | null = null;

    beforeAll(async () => {
      db = new Kysely<T>({
        dialect: {
          createDriver: () => new DummyDriver(),
          createQueryCompiler: () => new PostgresQueryCompiler(),
          createAdapter: () => new PostgresAdapter(),
          createIntrospector: (db) => new PostgresIntrospector(db),
        },
      });
    });

    afterAll(async () => {
      if (!db) {
        return;
      }

      await db.destroy();
      db = null;
    });

    await fn({
      get db() {
        if (!db) {
          throw new Error('Database has not been initialised.');
        }
        return db;
      },
      addPlugin(plugin: KyselyPlugin) {
        if (!db) {
          throw new Error('Database has not been initialised.');
        }

        db = db.withPlugin(plugin);
      },
    });
  });
}
