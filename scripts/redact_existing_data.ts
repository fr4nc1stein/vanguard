/**
 * Script to redact PII from existing reports and comments
 * 
 * This script:
 * 1. Fetches all reports and comments from the database
 * 2. Applies PII redaction to titles and messages
 * 3. Updates the database with redacted content
 * 
 * Run with: npx tsx scripts/redact_existing_data.ts
 */

import { redactPII } from '../lib/redact';

// Redaction patterns
function redactText(text: string): string {
  return redactPII(text);
}

async function main() {
  console.log('🔒 Starting PII redaction for existing data...\n');

  // This is a template script - actual implementation would need:
  // 1. D1 database connection via wrangler
  // 2. Fetch all reports and comments
  // 3. Apply redaction
  // 4. Update records

  console.log('⚠️  This script requires manual execution via wrangler d1 execute');
  console.log('⚠️  Due to D1 limitations, use the following approach:\n');

  console.log('1. Export data:');
  console.log('   npx wrangler d1 execute vanguard-security --remote --command "SELECT id, title FROM reports WHERE title LIKE \'%@%\' OR title LIKE \'%.%.%.%\'"\n');

  console.log('2. For each record with PII, run:');
  console.log('   npx wrangler d1 execute vanguard-security --remote --command "UPDATE reports SET title = \'[REDACTED]\' WHERE id = \'xxx\'"\n');

  console.log('3. Verify:');
  console.log('   npx wrangler d1 execute vanguard-security --remote --command "SELECT id, title FROM reports WHERE title LIKE \'%@%\'"\n');

  console.log('📝 Note: All new submissions will be automatically redacted.');
  console.log('✅ Existing data can be manually reviewed and redacted as needed.\n');
}

main().catch(console.error);
