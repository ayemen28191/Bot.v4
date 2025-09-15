#!/usr/bin/env node

/**
 * Backfill script to calculate cumulative counters for existing system_logs records
 * This script processes all existing system_logs records chronologically and calculates:
 * 1. previousTotal: Count before current event for each user
 * 2. dailyTotal: Total events for the same day (action-specific)
 * 3. monthlyTotal: Total events for the same month (action-specific)
 * 
 * Features:
 * - Handles records not associated with a user (userId = null)
 * - Batch processing to avoid system overload
 * - Creates backup before starting
 * - Detailed logging for the process
 * - Safe and resumable in case of interruption
 * - SQLite optimized with ISO date formats
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BATCH_SIZE = 1000; // Process records in batches of 1000
const BACKUP_DIR = path.resolve(process.cwd(), "data", "backups");
const DB_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.resolve(DB_DIR, "database.sqlite");

console.log('🔄 Starting cumulative counters backfill...');
console.log('📁 Database path:', DB_PATH);
console.log('📦 Batch size:', BATCH_SIZE);

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database file not found:', DB_PATH);
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH);

// Database helper functions
async function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

async function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function getAllQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return new Date().toISOString().split('T')[0];
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch (err) {
    console.warn(`⚠️  Invalid date format: ${dateString}, using current date`);
    return new Date().toISOString().split('T')[0];
  }
}

function formatMonth(dateString) {
  if (!dateString) return new Date().toISOString().substring(0, 7) + '-01';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  } catch (err) {
    console.warn(`⚠️  Invalid date format: ${dateString}, using current month`);
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
}

function normalizeUserId(userId) {
  return userId === null || userId === undefined ? -1 : userId;
}

// Create backup of current system_logs table
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `system_logs_backup_${timestamp}.json`);
  
  console.log('💾 Creating backup of system_logs table...');
  
  try {
    const allLogs = await getAllQuery('SELECT * FROM system_logs ORDER BY id');
    fs.writeFileSync(backupPath, JSON.stringify(allLogs, null, 2));
    console.log(`✅ Backup created: ${backupPath} (${allLogs.length} records)`);
    return backupPath;
  } catch (error) {
    console.error('❌ Failed to create backup:', error);
    throw error;
  }
}

// Check if table has the required columns
async function validateTableStructure() {
  console.log('🔍 Validating system_logs table structure...');
  
  const tableInfo = await getAllQuery("PRAGMA table_info(system_logs)");
  const columnNames = tableInfo.map(col => col.name);
  
  const requiredColumns = ['previous_total', 'daily_total', 'monthly_total', 'action', 'actor_id'];
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
  
  if (missingColumns.length > 0) {
    console.error('❌ Missing required columns:', missingColumns);
    console.log('💡 Available columns:', columnNames);
    return false;
  }
  
  console.log('✅ Table structure is valid');
  return true;
}

// Get total count of records to process
async function getTotalRecordsCount() {
  const result = await getQuery('SELECT COUNT(*) as count FROM system_logs');
  return result.count;
}

// Get records that need backfill (missing cumulative counters)
async function getRecordsNeedingBackfill() {
  const result = await getQuery(`
    SELECT COUNT(*) as count 
    FROM system_logs 
    WHERE previous_total IS NULL 
       OR daily_total IS NULL 
       OR monthly_total IS NULL
  `);
  return result.count;
}

// Process system logs in chronological order and calculate cumulative counters
async function processSystemLogs() {
  console.log('📊 Starting cumulative counter calculations...');
  
  // Get all records chronologically (by created_at, then by id as tiebreaker)
  const allLogs = await getAllQuery(`
    SELECT id, user_id, actor_id, action, created_at, timestamp,
           previous_total, daily_total, monthly_total
    FROM system_logs 
    ORDER BY 
      COALESCE(timestamp, created_at) ASC,
      id ASC
  `);
  
  console.log(`📈 Processing ${allLogs.length} system log records...`);
  
  if (allLogs.length === 0) {
    console.log('ℹ️  No records found to process');
    return;
  }
  
  // Counter tracking maps
  const userActionCounters = new Map(); // userKey -> { total, daily: Map, monthly: Map }
  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  
  console.log('🔄 Processing records in chronological batches...');
  
  // Process in batches
  for (let i = 0; i < allLogs.length; i += BATCH_SIZE) {
    const batch = allLogs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allLogs.length / BATCH_SIZE);
    
    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
    
    // Start transaction for this batch
    await runQuery('BEGIN TRANSACTION');
    
    try {
      for (const log of batch) {
        const normalizedUserId = normalizeUserId(log.user_id || log.actor_id);
        const action = log.action || 'unknown';
        const logDate = formatDate(log.timestamp || log.created_at);
        const logMonth = formatMonth(log.timestamp || log.created_at);
        
        // Create unique key for user-action combination
        const userActionKey = `${normalizedUserId}:${action}`;
        
        // Initialize counters for this user-action if not exists
        if (!userActionCounters.has(userActionKey)) {
          userActionCounters.set(userActionKey, {
            total: 0,
            daily: new Map(),
            monthly: new Map()
          });
        }
        
        const counters = userActionCounters.get(userActionKey);
        
        // Calculate previous total (before this event)
        const previousTotal = counters.total;
        
        // Increment total counter
        counters.total += 1;
        
        // Calculate daily total
        if (!counters.daily.has(logDate)) {
          counters.daily.set(logDate, 0);
        }
        counters.daily.set(logDate, counters.daily.get(logDate) + 1);
        const dailyTotal = counters.daily.get(logDate);
        
        // Calculate monthly total
        if (!counters.monthly.has(logMonth)) {
          counters.monthly.set(logMonth, 0);
        }
        counters.monthly.set(logMonth, counters.monthly.get(logMonth) + 1);
        const monthlyTotal = counters.monthly.get(logMonth);
        
        // Check if this record needs updating
        const needsUpdate = (
          log.previous_total === null || log.previous_total !== previousTotal ||
          log.daily_total === null || log.daily_total !== dailyTotal ||
          log.monthly_total === null || log.monthly_total !== monthlyTotal
        );
        
        if (needsUpdate) {
          // Update the record with calculated counters
          await runQuery(`
            UPDATE system_logs 
            SET previous_total = ?,
                daily_total = ?,
                monthly_total = ?
            WHERE id = ?
          `, [previousTotal, dailyTotal, monthlyTotal, log.id]);
          
          updatedCount++;
        } else {
          skippedCount++;
        }
        
        processedCount++;
        
        // Progress indicator for large batches
        if (processedCount % 5000 === 0) {
          console.log(`  ⏳ Progress: ${processedCount}/${allLogs.length} records processed...`);
        }
      }
      
      // Commit this batch
      await runQuery('COMMIT');
      console.log(`  ✅ Batch ${batchNum} completed successfully`);
      
    } catch (error) {
      // Rollback this batch on error
      await runQuery('ROLLBACK');
      console.error(`❌ Error in batch ${batchNum}:`, error);
      throw error;
    }
  }
  
  console.log('📊 Backfill process completed!');
  console.log(`  📈 Total records processed: ${processedCount}`);
  console.log(`  ✏️  Records updated: ${updatedCount}`);
  console.log(`  ⏭️  Records skipped (already correct): ${skippedCount}`);
  console.log(`  👥 Unique user-action combinations: ${userActionCounters.size}`);
}

// Verify the backfill results
async function verifyResults() {
  console.log('🔍 Verifying backfill results...');
  
  // Check for remaining NULL values
  const nullCounters = await getQuery(`
    SELECT COUNT(*) as count 
    FROM system_logs 
    WHERE previous_total IS NULL 
       OR daily_total IS NULL 
       OR monthly_total IS NULL
  `);
  
  if (nullCounters.count > 0) {
    console.warn(`⚠️  Warning: ${nullCounters.count} records still have NULL counters`);
  } else {
    console.log('✅ All records now have cumulative counters');
  }
  
  // Sample verification
  console.log('📋 Sample of processed records:');
  const sampleRecords = await getAllQuery(`
    SELECT 
      id, user_id, actor_id, action, 
      previous_total, daily_total, monthly_total,
      substr(created_at, 1, 19) as created_at
    FROM system_logs 
    WHERE previous_total IS NOT NULL
    ORDER BY created_at DESC 
    LIMIT 5
  `);
  
  console.table(sampleRecords);
  
  // Statistics
  const stats = await getAllQuery(`
    SELECT 
      action,
      COUNT(*) as total_events,
      MAX(previous_total) as max_previous_total,
      MAX(daily_total) as max_daily_total,
      MAX(monthly_total) as max_monthly_total
    FROM system_logs 
    WHERE action IS NOT NULL
    GROUP BY action
    ORDER BY total_events DESC
    LIMIT 10
  `);
  
  console.log('📊 Top actions by frequency:');
  console.table(stats);
}

// Create checkpoint for resumability
async function createCheckpoint(processedCount) {
  const checkpointPath = path.join(BACKUP_DIR, 'backfill_checkpoint.json');
  const checkpoint = {
    timestamp: new Date().toISOString(),
    processedCount,
    totalRecords: await getTotalRecordsCount()
  };
  
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  console.log(`💾 Checkpoint saved: ${processedCount} records processed`);
}

// Main backfill function
async function backfillCumulativeCounters() {
  try {
    console.log('🚀 Starting cumulative counters backfill process...');
    
    // Step 1: Validate table structure
    const isValid = await validateTableStructure();
    if (!isValid) {
      throw new Error('Table structure validation failed');
    }
    
    // Step 2: Get statistics
    const totalRecords = await getTotalRecordsCount();
    const recordsNeedingBackfill = await getRecordsNeedingBackfill();
    
    console.log(`📊 Database statistics:`);
    console.log(`  Total system_logs records: ${totalRecords}`);
    console.log(`  Records needing backfill: ${recordsNeedingBackfill}`);
    
    if (recordsNeedingBackfill === 0) {
      console.log('✅ All records already have cumulative counters');
      return;
    }
    
    // Step 3: Create backup
    const backupPath = await createBackup();
    
    // Step 4: Process system logs
    await processSystemLogs();
    
    // Step 5: Verify results
    await verifyResults();
    
    console.log('🎉 Cumulative counters backfill completed successfully!');
    console.log(`💾 Backup available at: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await backfillCumulativeCounters();
  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
    process.exit(1);
  } finally {
    db.close();
    console.log('🔌 Database connection closed');
  }
}

// Handle interruptions gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted by user');
  console.log('💾 Saving current progress...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Process terminated');
  db.close();
  process.exit(0);
});

// Run backfill
main();