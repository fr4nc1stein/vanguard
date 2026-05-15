import { drizzle } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as schema from './schema';

export type DbClient = ReturnType<typeof getDb>;

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema, logger: process.env.NODE_ENV === 'development' });
}

export interface CfEnv {
  DB: D1Database;
}

/**
 * Extracts Cloudflare bindings from the request context.
 * Works in CF Pages/Workers runtime (deployed) and locally via setupDevPlatform (next dev).
 */
export function getCfEnv(): CfEnv {
  const { env } = getCloudflareContext();
  if (!(env as unknown as CfEnv).DB) {
    throw new Error(
      'Cloudflare D1 binding (DB) not found. ' +
      'Run: npm run dev:cf  (uses wrangler pages dev with full CF runtime)'
    );
  }
  return env as unknown as CfEnv;
}
