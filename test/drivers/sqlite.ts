import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { D1Like, TestDriver } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
const schemaSql = readFileSync(resolve(here, "../../db/schema.sql"), "utf-8");
const seedSql = readFileSync(resolve(here, "../../db/seed.sql"), "utf-8");

// --- Adaptador mínimo compatível com a superfície do D1 usada pelas Functions:
//     prepare().bind().all()/first()/run() e exec().
class D1PreparedAdapter {
  constructor(
    private db: Database.Database,
    private sql: string,
    private params: unknown[] = [],
  ) {}

  bind(...params: unknown[]): D1PreparedAdapter {
    return new D1PreparedAdapter(this.db, this.sql, params);
  }

  async first<T = unknown>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...(this.params as never[])) as T) ?? null;
  }

  async all<T = unknown>(): Promise<{ results: T[]; success: true }> {
    const results = this.db.prepare(this.sql).all(...(this.params as never[])) as T[];
    return { results, success: true };
  }

  async run(): Promise<{ success: true }> {
    this.db.prepare(this.sql).run(...(this.params as never[]));
    return { success: true };
  }

  // Execução síncrona usada dentro de transações (better-sqlite3 exige sync).
  _exec(): void {
    this.db.prepare(this.sql).run(...(this.params as never[]));
  }
}

class D1Adapter {
  constructor(private db: Database.Database) {}
  prepare(sql: string): D1PreparedAdapter {
    return new D1PreparedAdapter(this.db, sql);
  }
  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
  // Executa os statements numa transação (equivale ao batch do D1).
  async batch(statements: D1PreparedAdapter[]): Promise<{ success: true }[]> {
    const run = this.db.transaction(() => {
      for (const s of statements) {
        (s as unknown as { _exec(): void })._exec();
      }
    });
    run();
    return statements.map(() => ({ success: true as const }));
  }
}

/**
 * Driver de testes baseado em SQLite em memória (better-sqlite3).
 * Roda em Node, sem workerd. Valida a mesma lógica de SQL das Functions.
 */
export function createSqliteDriver(): TestDriver {
  let db: Database.Database | null = null;

  return {
    name: "sqlite",
    async reset() {
      db = new Database(":memory:");
      db.exec(schemaSql);
      db.exec(seedSql);
    },
    getDb(): D1Like {
      if (!db) throw new Error("Driver não inicializado. Chame reset() antes.");
      return new D1Adapter(db) as unknown as D1Like;
    },
  };
}
