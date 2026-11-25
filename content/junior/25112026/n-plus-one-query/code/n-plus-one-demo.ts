import { DatabaseSync } from 'node:sqlite';

/** Code shown verbatim in the video (laid out to fit the 830 px card without wrapping). */
export const SNIPPETS = {
  /** Scene 2: JS against the tiny lazy-loading ORM below (`Order.all()`, `o.user` loads on touch). */
  lazyLoop: 'const orders = Order.all()\nfor (const o of orders)\n  print(o.user.name)',
  /** Scene 3: what an eager-loading ORM runs underneath. */
  join: 'SELECT o.*, u.name\nFROM orders o\nJOIN users u\n  ON u.id = o.user_id',
} as const;

/** Log lines shown in scene 1 (first lazy queries of the loop). */
export const LOG_LINES = {
  orders: 'SELECT * FROM orders',
  user: (id: number): string => `SELECT * FROM users WHERE id = ${id}`,
} as const;

export type Order = { id: number; user_id: number; total: number };
export type User = { id: number; name: string };
export type LazyOrder = Order & { readonly user: User };

/** A SQLite handle that records every statement it runs. */
export type CountingDb = {
  /** Every statement executed through `all`/`get`, in order, with literal parameters. */
  readonly log: string[];
  all: <T>(sql: string, ...params: number[]) => T[];
  get: <T>(sql: string, ...params: number[]) => T | undefined;
};

const literal = (sql: string, params: number[]): string => {
  const rest = [...params];
  return sql.replace(/\?/g, () => String(rest.shift()));
};

export const countingDb = (db: DatabaseSync): CountingDb => {
  const log: string[] = [];
  return {
    log,
    all: <T>(sql: string, ...params: number[]): T[] => {
      log.push(literal(sql, params));
      return db.prepare(sql).all(...params) as T[];
    },
    get: <T>(sql: string, ...params: number[]): T | undefined => {
      log.push(literal(sql, params));
      return db.prepare(sql).get(...params) as T | undefined;
    },
  };
};

/** In-memory database: `orderCount` users and orders, order i belongs to user i. */
export const seed = (orderCount: number): DatabaseSync => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
  db.exec(
    'CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), total INTEGER NOT NULL)',
  );
  const addUser = db.prepare('INSERT INTO users (id, name) VALUES (?, ?)');
  const addOrder = db.prepare('INSERT INTO orders (id, user_id, total) VALUES (?, ?, ?)');
  for (let i = 1; i <= orderCount; i += 1) {
    addUser.run(i, `user-${i}`);
    addOrder.run(i, i, i * 1000);
  }
  return db;
};

/**
 * A minimal lazy-loading ORM: `Order.all()` is one query; each order's `user` is fetched the first time
 * it is touched, one query per order (no identity map, as in a plain lazy association).
 */
export const lazyOrm = (cdb: CountingDb) => ({
  Order: {
    all: (): LazyOrder[] =>
      cdb.all<Order>('SELECT * FROM orders').map((order) => {
        let cached: User | undefined;
        return Object.defineProperty({ ...order }, 'user', {
          enumerable: true,
          get: (): User => {
            cached ??= cdb.get<User>('SELECT * FROM users WHERE id = ?', order.user_id);
            if (cached === undefined) throw new Error(`user ${order.user_id} not found`);
            return cached;
          },
        }) as LazyOrder;
      }),
  },
});

/** Runs the scene 2 snippet verbatim against the lazy ORM and returns the printed names. */
export const runLazyLoop = async (cdb: CountingDb): Promise<string[]> => {
  const printed: string[] = [];
  const run = new Function('Order', 'print', `return (async () => { ${SNIPPETS.lazyLoop} })()`);
  await run(lazyOrm(cdb).Order, (name: string) => printed.push(name));
  return printed;
};

/** Fix 1 (eager loading as a JOIN): one query. */
export const namesWithJoin = (cdb: CountingDb): string[] =>
  cdb.all<{ name: string }>(SNIPPETS.join).map((row) => row.name);

/** Fix 2 (batch the ids, `IN (...)`): two queries, however many orders. */
export const namesWithIn = (cdb: CountingDb): string[] => {
  const orders = cdb.all<Order>('SELECT * FROM orders');
  const ids = [...new Set(orders.map((order) => order.user_id))];
  const users = cdb.all<User>(
    `SELECT * FROM users WHERE id IN (${ids.map(() => '?').join(', ')})`,
    ...ids,
  );
  const byId = new Map(users.map((user) => [user.id, user.name]));
  return orders.map((order) => byId.get(order.user_id) as string);
};

export type QueryCounts = { orders: number; lazy: number; join: number; inBatch: number };

/** Statements run by each strategy for the same page of `orderCount` orders. */
export const countQueries = async (orderCount: number): Promise<QueryCounts> => {
  const run = async (
    strategy: (cdb: CountingDb) => Promise<unknown> | unknown,
  ): Promise<number> => {
    const db = seed(orderCount);
    const cdb = countingDb(db);
    await strategy(cdb);
    db.close();
    return cdb.log.length;
  };
  return {
    orders: orderCount,
    lazy: await run(runLazyLoop),
    join: await run(namesWithJoin),
    inBatch: await run(namesWithIn),
  };
};
