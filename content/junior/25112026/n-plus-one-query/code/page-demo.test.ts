import { describe, expect, it } from 'vitest';
import { countingDb } from './n-plus-one-demo';
import { PAGE, SQL, pageInThree, pageNPlusOne, seedPage } from './page-demo';

const withDb = <T>(fn: (db: ReturnType<typeof seedPage>) => T): T => {
  const db = seedPage();
  try {
    return fn(db);
  } finally {
    db.close();
  }
};

describe('scene 6 answer: one query per level, not one per row', () => {
  it('builds the page in 3 queries', () => {
    withDb((db) => {
      const cdb = countingDb(db);
      const page = pageInThree(cdb);
      expect(cdb.log).toHaveLength(3);
      expect(page).toHaveLength(PAGE.orders);
      for (const order of page) {
        expect(order.items).toHaveLength(PAGE.itemsPerOrder);
        for (const item of order.items) expect(item.tags).toHaveLength(PAGE.tagsPerItem);
      }
    });
  });

  it('the same page with a query in each loop costs 1 + 20 + 200 = 221 queries', () => {
    withDb((db) => {
      const cdb = countingDb(db);
      pageNPlusOne(cdb);
      expect(cdb.log).toHaveLength(1 + PAGE.orders + PAGE.orders * PAGE.itemsPerOrder);
      expect(cdb.log).toHaveLength(221);
    });
  });

  it('both ways return exactly the same page', () => {
    withDb((db) => {
      expect(pageInThree(countingDb(db))).toEqual(pageNPlusOne(countingDb(db)));
    });
  });

  it('the IN queries ask for all ids at once', () => {
    withDb((db) => {
      const cdb = countingDb(db);
      pageInThree(cdb);
      expect(cdb.log[1]).toContain('IN (1, 2, 3');
      expect(cdb.log[2]).toContain('IN (1, 2, 3');
    });
  });
});

describe('why JOIN is safe for the customer but not for items and tags', () => {
  it('many-to-one: joining the customer keeps one row per order', () => {
    withDb((db) => {
      const cdb = countingDb(db);
      expect(cdb.all(SQL.ordersWithCustomer)).toHaveLength(PAGE.orders);
    });
  });

  it('one-to-many: joining the items repeats every order once per item', () => {
    withDb((db) => {
      const rows = countingDb(db).all<{ order_id: number }>(SQL.joinItems);
      expect(rows).toHaveLength(PAGE.orders * PAGE.itemsPerOrder);
      expect(rows.filter((row) => row.order_id === 1)).toHaveLength(PAGE.itemsPerOrder);
    });
  });

  it('one JOIN for everything: 1000 rows, each order and customer repeated 50 times', () => {
    withDb((db) => {
      const rows = countingDb(db).all<{ order_id: number; customer: string }>(SQL.joinAll);
      expect(rows).toHaveLength(PAGE.orders * PAGE.itemsPerOrder * PAGE.tagsPerItem);
      expect(rows).toHaveLength(1000);
      const repeats = rows.filter((row) => row.order_id === 1 && row.customer === 'customer-1');
      expect(repeats).toHaveLength(PAGE.itemsPerOrder * PAGE.tagsPerItem);
      expect(repeats).toHaveLength(50);
    });
  });

  it('LIMIT 20 on the items JOIN counts rows: only 2 orders come back', () => {
    withDb((db) => {
      const rows = countingDb(db).all<{ order_id: number }>(`${SQL.joinItems} LIMIT 20`);
      expect(rows).toHaveLength(20);
      expect(new Set(rows.map((row) => row.order_id)).size).toBe(2);
    });
  });

  it('paging the orders first (then IN) gives the wanted number of orders', () => {
    withDb((db) => {
      const cdb = countingDb(db);
      const orders = cdb.all<{ id: number }>('SELECT id FROM orders ORDER BY id LIMIT 5');
      const items = cdb.all<{ order_id: number }>(
        `SELECT order_id FROM items WHERE order_id IN (${orders.map(() => '?').join(', ')})`,
        ...orders.map((order) => order.id),
      );
      expect(orders).toHaveLength(5);
      expect(new Set(items.map((item) => item.order_id)).size).toBe(5);
      expect(items).toHaveLength(5 * PAGE.itemsPerOrder);
    });
  });
});
