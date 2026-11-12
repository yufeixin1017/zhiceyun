import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import type { Pool, PoolOptions } from "mysql2/promise";
import * as schema from "./schema";

const globalForDatabase = globalThis as unknown as {
  zhicePool?: Pool;
  zhiceDb?: MySql2Database<typeof schema>;
};

function getPoolOptions(): PoolOptions {
  const connection = process.env.DATABASE_URL;
  if (!connection) {
    throw new Error("尚未配置 DATABASE_URL，请先连接 MySQL 数据库");
  }
  const url = new URL(connection);
  if (url.protocol !== "mysql:") throw new Error("DATABASE_URL 必须使用 mysql:// 协议");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL 中缺少数据库名称");

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60000,
    enableKeepAlive: true,
    timezone: "Z",
    charset: "utf8mb4",
    dateStrings: false,
  };
}

export function getPool(): Pool {
  if (!globalForDatabase.zhicePool) {
    globalForDatabase.zhicePool = mysql.createPool(getPoolOptions());
  }
  return globalForDatabase.zhicePool;
}

export function getDb(): MySql2Database<typeof schema> {
  if (!globalForDatabase.zhiceDb) {
    globalForDatabase.zhiceDb = drizzle(getPool(), { schema, mode: "default" });
  }
  return globalForDatabase.zhiceDb;
}

export async function checkDatabaseConnection(): Promise<void> {
  await getPool().query("SELECT 1");
}
