import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './migrations',
  // For local D1 inspection: wrangler d1 execute vanguard-security --local --file=migrations/0001_schema.sql
  // For remote D1 push: wrangler d1 execute vanguard-security --file=migrations/0001_schema.sql
} satisfies Config;
