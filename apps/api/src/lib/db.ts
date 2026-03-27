export type DbClient = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

export function getDbClient(): DbClient {
  throw new Error("Database client not implemented yet.");
}
