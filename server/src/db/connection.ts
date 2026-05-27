import fs from 'fs';
import path from 'path';
import { ENV, logger } from '../config';

interface TableData {
  [key: string]: any[];
}

let data: TableData = {};
let dbPath: string;

export function initDb(): void {
  dbPath = path.resolve(ENV.DATABASE_URL);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(dbPath)) {
    try {
      data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch {
      data = {};
    }
  }

  logger.info(`Database initialized: ${dbPath}`);
}

function save(): void {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function table(name: string): any[] {
  if (!data[name]) data[name] = [];
  return data[name]!;
}

// Query helper that mimics SQL-like operations
export const db = {
  get table() {
    return {
      create: (name: string, ifNotExists?: boolean) => {
        if (ifNotExists && data[name]) return;
        data[name] = [];
        save();
      },
    };
  },

  insert: (tbl: string, record: any) => {
    const t = table(tbl);
    t.push(record);
    save();
    return record;
  },

  select: (tbl: string, where?: (row: any) => boolean): any[] => {
    const t = table(tbl);
    if (!where) return [...t];
    return t.filter(where);
  },

  selectOne: (tbl: string, where: (row: any) => boolean): any | undefined => {
    return table(tbl).find(where);
  },

  update: (tbl: string, where: (row: any) => boolean, updates: Partial<any>): number => {
    let count = 0;
    const t = table(tbl);
    for (let i = 0; i < t.length; i++) {
      if (where(t[i]!)) {
        t[i] = { ...t[i], ...updates };
        count++;
      }
    }
    if (count > 0) save();
    return count;
  },

  delete: (tbl: string, where: (row: any) => boolean): number => {
    const before = table(tbl).length;
    data[tbl] = table(tbl).filter((r) => !where(r));
    const count = before - data[tbl]!.length;
    if (count > 0) save();
    return count;
  },

  count: (tbl: string, where?: (row: any) => boolean): number => {
    if (!where) return table(tbl).length;
    return table(tbl).filter(where).length;
  },
};

export function getTable(name: string): any[] {
  return table(name);
}

export function saveDb(): void {
  save();
}

export function closeDb(): void {
  save();
  logger.info('Database closed');
}
