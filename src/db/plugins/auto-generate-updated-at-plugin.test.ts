import type { ColumnType, GeneratedAlways } from 'kysely';
import { beforeAll, expect, test } from 'vitest';

import { describeMatrix } from '../../../test/db/_setup.js';
import { AutoGenerateUpdatedAtPlugin } from './auto-generate-updated-at-plugin.js';

interface Database {
  t1: T1Table;
  t2: T2Table;
}

interface T1Table {
  id: GeneratedAlways<string>;
  name: string;
  updated_at: ColumnType<Date, Date | undefined, never>;
}

interface T2Table {
  id: GeneratedAlways<string>;
  name: string;
}

describeMatrix<Database>('auto generate updated at plugin', (ctx) => {
  beforeAll(() => {
    ctx.addPlugin(
      new AutoGenerateUpdatedAtPlugin({
        t1: {
          id: {
            name: 'id',
            dataType: 'uuid',
            isAutoIncrementing: false,
            isNullable: false,
            hasDefaultValue: false,
          },
          name: {
            name: 'name',
            dataType: 'varchar',
            isAutoIncrementing: false,
            isNullable: false,
            hasDefaultValue: false,
          },
          updated_at: {
            name: 'updated_at',
            dataType: 'timestamptz',
            isAutoIncrementing: false,
            isNullable: false,
            hasDefaultValue: true,
          },
        },
        t2: {
          id: {
            name: 'id',
            dataType: 'uuid',
            isAutoIncrementing: false,
            isNullable: false,
            hasDefaultValue: false,
          },
          name: {
            name: 'name',
            dataType: 'varchar',
            isAutoIncrementing: false,
            isNullable: false,
            hasDefaultValue: false,
          },
        },
      }),
    );
  });

  test('table with `updated_at` column', () => {
    const query = ctx.db.updateTable('t1').set({ name: 'hello' }).compile();

    expect(query.sql).toBe('update "t1" set "name" = $1, "updated_at" = NOW()');
    expect(query.parameters).toStrictEqual(['hello']);
  });

  test('table without `updated_at` column', () => {
    const query = ctx.db.updateTable('t2').set({ name: 'hello' }).compile();

    expect(query.sql).toBe('update "t2" set "name" = $1');
    expect(query.parameters).toStrictEqual(['hello']);
  });
});
