export const dbQuery = async (sql: string, params: any[] = []) => {
  try {
    if (!window.electron || !window.electron.dbQuery) {
      throw new Error('Electron API not available. Make sure the app is running in Electron.');
    }
    return await window.electron.dbQuery(sql, params);
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
};
