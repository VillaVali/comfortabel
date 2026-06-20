// ─────────────────────────────────────────────────────────────────────────────
// In-memory fake of the small subset of the Drizzle mysql2 query API that the
// tRPC procedures use. It works with the REAL schema table/column objects:
//   - tables are identified via getTableName()
//   - columns expose a stable `.name`
// so no per-table mocking is required and there is no risk of a divergent shadow
// schema. Only the operators eq/and/desc are mocked (see integration.test.ts) to
// produce the small predicate/order shapes this fake understands.
//
// Implemented chain:
//   select(projection?).from(t).where(p).innerJoin(t,on).orderBy(o).limit(n)
//   insert(t).values(row|rows) → Promise<[{ insertId }]>
//   update(t).set(patch).where(p) → Promise
//   delete(t).where(p) → Promise
// ─────────────────────────────────────────────────────────────────────────────
import { getTableName } from "drizzle-orm";

export type Row = Record<string, any>;

type ColRef = { name: string };

export type Pred =
  | { kind: "eq"; col: ColRef; value: any }
  | { kind: "and"; parts: Pred[] }
  | { kind: "true" };

export type OrderSpec = { col: ColRef; dir: "asc" | "desc" };

function isColRef(v: any): v is ColRef {
  return v != null && typeof v === "object" && typeof v.name === "string";
}

function evalPred(pred: Pred | undefined, row: Row): boolean {
  if (!pred || pred.kind === "true") return true;
  if (pred.kind === "eq") return row[pred.col.name] === pred.value;
  if (pred.kind === "and") return pred.parts.every((p) => evalPred(p, row));
  return true;
}

// Join "on" is eq(leftCol, rightCol): both sides are column refs.
function evalJoin(on: Pred, left: Row, right: Row): boolean {
  if (on.kind === "eq" && isColRef(on.value)) {
    const a = left[on.col.name] ?? right[on.col.name];
    const b = right[(on.value as ColRef).name] ?? left[(on.value as ColRef).name];
    return a === b;
  }
  if (on.kind === "and") return on.parts.every((p) => evalJoin(p, left, right));
  return true;
}

function tname(t: any): string {
  return getTableName(t);
}

export class FakeDb {
  tables: Record<string, Row[]> = {};

  constructor(seed?: Record<string, Row[]>) {
    if (seed) for (const [k, v] of Object.entries(seed)) this.tables[k] = v.map((r) => ({ ...r }));
  }

  private nextId(table: string): number {
    const rows = this.tables[table] ?? [];
    const max = rows.reduce((m, r) => (typeof r.id === "number" && r.id > m ? r.id : m), 0);
    return max + 1;
  }

  rowsOf(table: string): Row[] {
    if (!this.tables[table]) this.tables[table] = [];
    return this.tables[table];
  }

  select(projection?: Record<string, ColRef>) {
    const self = this;
    return {
      from(table: any) {
        const builder = {
          _table: tname(table),
          _pred: undefined as Pred | undefined,
          _order: undefined as OrderSpec | undefined,
          _limit: undefined as number | undefined,
          _joins: [] as { table: string; on: Pred }[],
          where(p: Pred) { this._pred = p; return this; },
          innerJoin(t: any, on: Pred) { this._joins.push({ table: tname(t), on }); return this; },
          orderBy(o: OrderSpec) { this._order = o; return this; },
          limit(n: number) { this._limit = n; return Promise.resolve(this.run()); },
          then(resolve: (v: Row[]) => void, reject?: (e: any) => void) {
            try { resolve(this.run()); } catch (e) { reject?.(e); }
          },
          run(): Row[] {
            let rows = self.rowsOf(this._table).map((r) => ({ ...r }));
            for (const j of this._joins) {
              const jrows = self.rowsOf(j.table);
              rows = rows
                .map((r) => {
                  const match = jrows.find((jr) => evalJoin(j.on, r, jr));
                  // left row wins on key collisions (mirrors the procedures' projections)
                  return match ? { ...match, ...r } : null;
                })
                .filter((r): r is Row => r !== null);
            }
            rows = rows.filter((r) => evalPred(this._pred, r));
            if (this._order) {
              const { col, dir } = this._order;
              rows.sort((a, b) => {
                const av = a[col.name]; const bv = b[col.name];
                if (av === bv) return 0;
                const cmp = av > bv ? 1 : -1;
                return dir === "desc" ? -cmp : cmp;
              });
            }
            if (this._limit != null) rows = rows.slice(0, this._limit);
            if (projection) {
              return rows.map((r) => {
                const out: Row = {};
                for (const [alias, ref] of Object.entries(projection)) out[alias] = r[ref.name];
                return out;
              });
            }
            return rows;
          },
        };
        return builder;
      },
    };
  }

  insert(table: any) {
    const self = this;
    const name = tname(table);
    return {
      values(v: Row | Row[]) {
        const rows = Array.isArray(v) ? v : [v];
        let lastId = 0;
        for (const row of rows) {
          const id = row.id ?? self.nextId(name);
          lastId = id;
          self.rowsOf(name).push({ ...row, id, createdAt: row.createdAt ?? new Date(), updatedAt: new Date() });
        }
        return Promise.resolve([{ insertId: lastId }]);
      },
    };
  }

  update(table: any) {
    const self = this;
    const name = tname(table);
    return {
      set(patch: Row) {
        return {
          where(p: Pred) {
            for (const r of self.rowsOf(name)) if (evalPred(p, r)) Object.assign(r, patch, { updatedAt: new Date() });
            return Promise.resolve([{ affectedRows: 1 }]);
          },
        };
      },
    };
  }

  delete(table: any) {
    const self = this;
    const name = tname(table);
    return {
      where(p: Pred) {
        const rows = self.rowsOf(name);
        const kept = rows.filter((r) => !evalPred(p, r));
        self.tables[name] = kept;
        return Promise.resolve([{ affectedRows: rows.length - kept.length }]);
      },
    };
  }
}
