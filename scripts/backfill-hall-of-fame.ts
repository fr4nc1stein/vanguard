/**
 * Backfill Hall of Fame
 * Awards points to all existing accepted/fixed reports
 * 
 * Usage:
 *   npm run backfill:hall-of-fame          # Dry run (no changes)
 *   npm run backfill:hall-of-fame --apply  # Apply changes
 */

import { getDb, getCfEnv } from '../lib/db';
import { reports, pointsConfig, hallOfFame } from '../lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { awardPoints } from '../lib/services/hall-of-fame';

const DRY_RUN = !process.argv.includes('--apply');

async function backfillHallOfFame() {
  console.log('🏆 Hall of Fame Backfill Script');
  console.log('================================\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Use --apply flag to apply changes\n');
  } else {
    console.log('✅ APPLY MODE - Changes will be made\n');
  }

  const db = getDb(getCfEnv().DB);

  try {
    // Get all accepted and fixed reports
    console.log('📊 Fetching reports...');
    const eligibleReports = await db
      .select()
      .from(reports)
      .where(or(
        eq(reports.status, 'accepted'),
        eq(reports.status, 'fixed')
      ))
      .all();

    console.log(`   Found ${eligibleReports.length} eligible reports\n`);

    if (eligibleReports.length === 0) {
      console.log('✨ No reports to process');
      return;
    }

    // Get points configuration
    const pointsConfigs = await db.select().from(pointsConfig).all();
    console.log('📋 Points Configuration:');
    pointsConfigs.forEach(config => {
      console.log(`   ${config.severity}: ${config.points} points`);
    });
    console.log('');

    // Check which reports already have awards
    const existingAwards = await db.select().from(hallOfFame).all();
    const awardedReportIds = new Set(existingAwards.map(a => a.reportId));
    
    const reportsToProcess = eligibleReports.filter(r => !awardedReportIds.has(r.id));
    
    console.log(`📈 Processing Summary:`);
    console.log(`   Total eligible: ${eligibleReports.length}`);
    console.log(`   Already awarded: ${awardedReportIds.size}`);
    console.log(`   To process: ${reportsToProcess.length}\n`);

    if (reportsToProcess.length === 0) {
      console.log('✨ All eligible reports already have awards');
      return;
    }

    // Process each report
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    console.log('🔄 Processing reports...\n');

    for (const report of reportsToProcess) {
      const reportInfo = `${report.refId} (${report.severity}, ${report.status})`;
      
      if (DRY_RUN) {
        // Dry run - just show what would happen
        const severityLower = report.severity.toLowerCase();
        const config = pointsConfigs.find(c => c.severity === severityLower);
        const points = config?.points || 0;
        
        console.log(`   [DRY RUN] Would award ${points} points to ${reportInfo}`);
        successCount++;
      } else {
        // Apply mode - actually award points
        try {
          const result = await awardPoints(report.id, 'system');
          
          if (result.success) {
            console.log(`   ✅ Awarded ${result.points} points to ${reportInfo}`);
            successCount++;
          } else if (result.message) {
            console.log(`   ⏭️  Skipped ${reportInfo}: ${result.message}`);
            skippedCount++;
          } else {
            console.log(`   ❌ Error ${reportInfo}: ${result.error}`);
            errorCount++;
          }
        } catch (error) {
          console.log(`   ❌ Error ${reportInfo}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
        }
      }
    }

    // Summary
    console.log('\n================================');
    console.log('📊 Backfill Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    if (skippedCount > 0) {
      console.log(`   ⏭️  Skipped: ${skippedCount}`);
    }
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount}`);
    }
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made');
      console.log('   Run with --apply flag to apply changes');
    } else {
      console.log('\n✅ Backfill complete!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
backfillHallOfFame()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
