import { DatabaseSync } from 'node:sqlite';
import type { CountingDb } from './n-plus-one-demo';

/** Sizes quoted in the pinned comment (scene 6): a page of 20 orders, 10 items each, 5 tags per item. */
export const PAGE = { orders: 20, itemsPerOrder: 10, tagsPerItem: 5 } as const;

export const SQL = {
  /** Many-to-one: every order has exactly one customer, so the row count stays the number of orders. */
  ordersWithCustomer:
    'SELECT o.id, u.name AS customer FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id',
  /** One-to-many: every order is repeated once per item. */
  joinItems:
    'SELECT o.id AS order_id, i.id AS item_id FROM orders o JOIN items i ON i.order_id = o.id ORDER BY o.id, i.id',
  /** Everything in one statement: one row per tag, carrying the order, customer and item again. */
  joinAll:
    'SELECT o.id AS order_id, u.name AS customer, i.id AS item_id, t.label FROM orders o JOIN users u ON u.id = o.user_id JOIN items i ON i.order_id = o.id JOIN tags t ON t.item_id = i.id ORDER BY o.id, i.id, t.id',
} as const;

/** orders -> users (many-to-one), items -> orders (one-to-many), tags -> items (one-to-many). */
export const seedPage = (): DatabaseSync => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
  db.exec(
    'CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id))',
  );
  db.exec(
    'CREATE TABLE items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), name TEXT NOT NULL)',
  );
  db.exec(
    'CREATE TABLE tags (id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES items(id), label TEXT NOT NULL)',
  );
  const addUser = db.prepare('INSERT INTO users (id, name) VALUES (?, ?)');
  const addOrder = db.prepare('INSERT INTO orders (id, user_id) VALUES (?, ?)');
  const addItem = db.prepare('INSERT INTO items (id, order_id, name) VALUES (?, ?, ?)');
  const addTag = db.prepare('INSERT INTO tags (id, item_id, label) VALUES (?, ?, ?)');
  let itemId = 0;
  let tagId = 0;
  for (let o = 1; o <= PAGE.orders; o += 1) {
    addUser.run(o, `customer-${o}`);
    addOrder.run(o, o);
    for (let i = 1; i <= PAGE.itemsPerOrder; i += 1) {
      itemId += 1;
      addItem.run(itemId, o, `item-${itemId}`);
      for (let t = 1; t <= PAGE.tagsPerItem; t += 1) {
        tagId += 1;
        addTag.run(tagId, itemId, `tag-${t}`);
      }
    }
  }
  return db;
};

export type PageOrder = {
  id: number;
  customer: string;
  items: { id: number; tags: string[] }[];
};

type OrderRow = { id: number; customer: string };
type ItemRow = { id: number; order_id: number };
type TagRow = { item_id: number; label: string };

const placeholders = (count: number): string => Array.from({ length: count }, () => '?').join(', ');

/** Query inside a loop is N+1; one query per level with `IN (...)` is not. */
export const pageInThree = (cdb: CountingDb): PageOrder[] => {
  // 1. orders with their customer (many-to-one: JOIN is safe)
  const orders = cdb.all<OrderRow>(SQL.ordersWithCustomer);
  // 2. the items of ALL these orders, asked once
  const items = cdb.all<ItemRow>(
    `SELECT id, order_id FROM items WHERE order_id IN (${placeholders(orders.length)}) ORDER BY id`,
    ...orders.map((order) => order.id),
  );
  // 3. the tags of ALL these items, asked once
  const tags = cdb.all<TagRow>(
    `SELECT item_id, label FROM tags WHERE item_id IN (${placeholders(items.length)}) ORDER BY id`,
    ...items.map((item) => item.id),
  );
  // Gluing them together is plain array work in memory: no database call inside these loops.
  const tagsByItem = new Map<number, string[]>();
  for (const tag of tags)
    tagsByItem.set(tag.item_id, [...(tagsByItem.get(tag.item_id) ?? []), tag.label]);
  const itemsByOrder = new Map<number, { id: number; tags: string[] }[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({ id: item.id, tags: tagsByItem.get(item.id) ?? [] });
    itemsByOrder.set(item.order_id, list);
  }
  return orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] }));
};

/** The same page with a query inside each loop: 1 + one per order + one per item. */
export const pageNPlusOne = (cdb: CountingDb): PageOrder[] => {
  const orders = cdb.all<OrderRow>(SQL.ordersWithCustomer);
  return orders.map((order) => ({
    ...order,
    items: cdb
      .all<ItemRow>('SELECT id, order_id FROM items WHERE order_id = ? ORDER BY id', order.id)
      .map((item) => ({
        id: item.id,
        tags: cdb
          .all<TagRow>('SELECT item_id, label FROM tags WHERE item_id = ? ORDER BY id', item.id)
          .map((tag) => tag.label),
      })),
  }));
};
