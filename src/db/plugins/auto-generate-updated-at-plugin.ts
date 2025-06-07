import type {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  RootOperationNode,
  UnknownRow,
} from 'kysely';
import { ColumnNode, ColumnUpdateNode, RawNode, TableNode, UpdateQueryNode } from 'kysely';
import { OperationNodeTransformer } from 'kysely';

import type { Metadata } from '../types.js';

/**
 * A Kysely plugin that automatically updates the `updated_at` column
 * with the current timestamp during an `UPDATE` query.
 *
 * This plugin modifies every `UPDATE` query to include an additional
 * column update for `updated_at`, setting its value to the current
 * timestamp using `NOW()` function.
 *
 * Example usage:
 *
 * ```ts
 * const db = new Kysely<Database>({
 *   dialect: new PostgresDialect({
 *     host: 'localhost',
 *     database: 'my_db',
 *     user: 'user',
 *     password: 'password',
 *   }),
 *   plugins: [new AutoGenerateUpdatedAtPlugin()],
 * });
 *
 * await db
 *   .updateTable('my_table')
 *   .set({ column1: 'value' })
 *   .where('id', '=', 1)
 *   .execute();
 * ```
 *
 * The generated SQL statement will look like:
 * ```sql
 * UPDATE my_table SET column1 = 'value', updated_at = NOW() WHERE id = 1;
 * ```
 */
export class AutoGenerateUpdatedAtPlugin implements KyselyPlugin {
  #transformer: AutoGenerateUpdatedAtTransformer;

  constructor(metadata: Metadata) {
    this.#transformer = new AutoGenerateUpdatedAtTransformer(metadata);
  }

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    return this.#transformer.transformNode(args.node);
  }

  transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return Promise.resolve(args.result);
  }
}

class AutoGenerateUpdatedAtTransformer extends OperationNodeTransformer {
  #metadata: Metadata;

  constructor(metadata: Metadata) {
    super();

    this.#metadata = metadata;
  }

  protected override transformUpdateQuery(node: UpdateQueryNode): UpdateQueryNode {
    node = super.transformUpdateQuery(node);

    if (!node.table || !TableNode.is(node.table) || !this.#hasUpdatedAtColumn(node.table)) {
      return node;
    }

    return UpdateQueryNode.cloneWithUpdates(node, [
      ColumnUpdateNode.create(ColumnNode.create('updated_at'), RawNode.create(['NOW()'], [])),
    ]);
  }

  #hasUpdatedAtColumn(node: TableNode) {
    return !!this.#metadata[node.table.identifier.name]?.['updated_at'];
  }
}
