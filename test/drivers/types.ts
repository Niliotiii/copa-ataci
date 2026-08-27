// Contrato que qualquer driver de testes deve implementar. Isso mantém os
// arquivos de teste agnósticos ao runtime: eles só falam com helpers.ts,
// que por sua vez delega para um driver (SQLite hoje; workerd/pool-workers
// quando o pacote voltar a ser compatível com o Vitest 4).

// Superfície mínima do D1 usada pelas Pages Functions.
export type D1Like = {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[]; success: true }>;
      run(): Promise<{ success: true }>;
    };
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<{ results: T[]; success: true }>;
    run(): Promise<{ success: true }>;
  };
  exec(sql: string): Promise<void>;
  batch(statements: unknown[]): Promise<unknown[]>;
};

export interface TestDriver {
  /** Nome do driver (para diagnóstico). */
  name: string;
  /** Recria schema + seed num banco limpo. */
  reset(): Promise<void>;
  /** Retorna o binding D1 atual. */
  getDb(): D1Like;
}
