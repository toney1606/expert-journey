import { buildUsersDb, explain, INDEX_SQL, Q, type MeasuredLookup } from './sqlite-demo';

export type TerminalLine = { command: string; output?: string };
export type TerminalScenes = Record<
  'stakes-scan' | 'explain-proof' | 'pitfall-lower',
  TerminalLine[]
>;

const ms = (value: number): string => (value >= 1 ? value.toFixed(1) : value.toFixed(3));
const explainCmd = (sql: string): string => `EXPLAIN QUERY PLAN ${sql};`;

/** Terminal scene `lines`, built from real EXPLAIN QUERY PLAN output and measured timings. */
export const buildTerminalScenes = (m: MeasuredLookup): TerminalScenes => {
  const db = buildUsersDb(1000);
  const noIndex = explain(db, Q.byDemoEmail);
  db.exec(INDEX_SQL.email);
  const withIndex = explain(db, Q.byDemoEmail);
  const lowerScan = explain(db, Q.byLowerDemoEmail);
  db.exec(INDEX_SQL.lowerEmail);
  const lowerSearch = explain(db, Q.byLowerDemoEmail);
  db.close();
  return {
    'stakes-scan': [
      { command: explainCmd(Q.byDemoEmail), output: noIndex },
      { command: `${Q.byDemoEmail};`, output: `1 row, ${ms(m.scanMs)} ms (${m.rows} rows)` },
    ],
    'explain-proof': [
      { command: `${INDEX_SQL.email};`, output: `done in ${Math.round(m.createIndexMs)} ms` },
      { command: explainCmd(Q.byDemoEmail), output: withIndex },
      { command: `${Q.byDemoEmail};`, output: `1 row, ${ms(m.indexedMs)} ms` },
    ],
    'pitfall-lower': [
      { command: explainCmd(Q.byLowerDemoEmail), output: lowerScan },
      { command: `${INDEX_SQL.lowerEmail};` },
      { command: explainCmd(Q.byLowerDemoEmail), output: lowerSearch },
    ],
  };
};
