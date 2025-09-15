#!/usr/bin/env node

/**
 * Migration script to fix userCounters table issues
 * This script fixes:
 * 1. UNIQUE constraint for NULL userId using COALESCE
 * 2. Remove duplicate indexes
 * 3. Standardize date format (daily: YYYY-MM-DD, monthly: YYYY-MM-01)
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbDir = path.resolve(process.cwd(), "data");
const DB_PATH = path.resolve(dbDir, "database.sqlite");

console.log('🔧 Starting userCounters table migration...');
console.log('📁 Database path:', DB_PATH);

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database file not found:', DB_PATH);
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH);

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

async function migrateuserCounters() {
  try {
    console.log('📊 Checking current userCounters table...');
    
    // Check if table exists
    const tableExists = await getQuery(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='user_counters'
    `);
    
    if (!tableExists) {
      console.log('⚠️  userCounters table does not exist, skipping migration');
      return;
    }

    // Get current data count
    const currentData = await getQuery('SELECT COUNT(*) as count FROM user_counters');
    console.log(`📈 Current records in user_counters: ${currentData.count}`);

    // Step 1: Backup existing data
    console.log('💾 Creating backup of user_counters data...');
    const existingData = await getAllQuery('SELECT * FROM user_counters');
    
    // Step 2: Drop existing problematic indexes
    console.log('🗑️  Removing old indexes...');
    const indexesToDrop = [
      'idx_user_counters_composite',
      'idx_user_counters_date', 
      'idx_user_counters_user_action',
      'idx_user_counters_action_date',
      'idx_user_counters_period_date',
      'idx_user_counters_unique'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await runQuery(`DROP INDEX IF EXISTS ${indexName}`);
        console.log(`  ✓ Dropped index: ${indexName}`);
      } catch (err) {
        console.warn(`  ⚠️  Could not drop index ${indexName}:`, err.message);
      }
    }

    // Step 3: Create new table with correct constraints
    console.log('🔨 Creating new user_counters table with fixed schema...');
    await runQuery(`
      CREATE TABLE user_counters_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        date TEXT NOT NULL,
        period TEXT NOT NULL CHECK (period IN ('daily', 'monthly')),
        count INTEGER NOT NULL DEFAULT 1,
        last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Step 4: Create the correct UNIQUE index with COALESCE for NULL handling
    console.log('🔗 Creating UNIQUE constraint with COALESCE for NULL userId...');
    await runQuery(`
      CREATE UNIQUE INDEX idx_user_counters_unique_coalesce 
      ON user_counters_new(COALESCE(user_id, -1), action, date, period)
    `);

    // Step 5: Create performance indexes (fewer and more targeted)
    console.log('⚡ Creating optimized performance indexes...');
    await runQuery(`
      CREATE INDEX idx_user_counters_user_period 
      ON user_counters_new(user_id, period, date DESC)
    `);
    
    await runQuery(`
      CREATE INDEX idx_user_counters_action_period 
      ON user_counters_new(action, period, date DESC)
    `);

    // Step 6: Function to normalize date format
    function normalizeDateFormat(date, period) {
      if (!date) return new Date().toISOString().split('T')[0];
      
      // Parse date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        // If parsing fails, use current date
        const now = new Date();
        if (period === 'monthly') {
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        }
        return now.toISOString().split('T')[0];
      }
      
      // Format based on period
      if (period === 'monthly') {
        return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-01`;
      } else {
        return parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }

    // Step 7: Migrate data with date format standardization
    console.log('📋 Migrating existing data with standardized date formats...');
    
    for (const row of existingData) {
      const normalizedDate = normalizeDateFormat(row.date, row.period);
      
      try {
        await runQuery(`
          INSERT INTO user_counters_new (
            user_id, action, date, period, count, 
            last_updated, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row.user_id,
          row.action,
          normalizedDate,
          row.period,
          row.count,
          row.last_updated,
          row.created_at,
          row.updated_at
        ]);
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          // Handle duplicates by summing counts
          console.log(`  🔄 Merging duplicate counter: ${row.action} for user ${row.user_id} on ${normalizedDate}`);
          await runQuery(`
            UPDATE user_counters_new 
            SET count = count + ?, 
                last_updated = ?,
                updated_at = ?
            WHERE COALESCE(user_id, -1) = COALESCE(?, -1) 
              AND action = ? 
              AND date = ? 
              AND period = ?
          `, [
            row.count,
            row.last_updated,
            row.updated_at,
            row.user_id,
            row.action,
            normalizedDate,
            row.period
          ]);
        } else {
          throw err;
        }
      }
    }

    // Step 8: Replace old table with new one
    console.log('🔄 Replacing old table with new one...');
    await runQuery('DROP TABLE user_counters');
    await runQuery('ALTER TABLE user_counters_new RENAME TO user_counters');

    // Step 9: Verify migration
    const newCount = await getQuery('SELECT COUNT(*) as count FROM user_counters');
    console.log(`✅ Migration completed! New record count: ${newCount.count}`);

    // Step 10: Show sample of migrated data
    console.log('📋 Sample of migrated data:');
    const sampleData = await getAllQuery(`
      SELECT user_id, action, date, period, count 
      FROM user_counters 
      ORDER BY date DESC 
      LIMIT 5
    `);
    
    console.table(sampleData);

    console.log('🎉 userCounters table migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateuserCounters();
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
main();