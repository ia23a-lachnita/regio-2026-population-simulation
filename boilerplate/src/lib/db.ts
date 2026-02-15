export interface DbAPI {
  dbQuery: (sql: string, params?: any[]) => Promise<any>;
}

declare global {
  interface Window {
    electron: DbAPI;
  }
}

export const dbQuery = async (sql: string, params: any[] = []) => {
  try {
    return await window.electron.dbQuery(sql, params);
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
};
