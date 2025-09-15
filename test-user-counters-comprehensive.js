#!/usr/bin/env node

/**
 * Comprehensive Testing Script for user_counters System
 * Tests the user_counters cumulative tracking system integration with LogsService
 */

import { storage } from './server/storage.js';
import { logsService } from './server/services/logs-service.js';

// Test Configuration
const TEST_CONFIG = {
    TEST_USER_ID: 12345,
    NULL_USER_ID: null,
    TEST_ACTIONS: ['login', 'logout', 'signal_request', 'chat_message', 'error'],
    TEST_DATES: {
        daily: '2025-09-15',
        monthly: '2025-09-01'
    }
};

// Test Results Storage
const testResults = {
    passed: 0,
    failed: 0,
    errors: [],
    details: []
};

// Helper Functions
function logTest(testName, success, details = '') {
    const status = success ? '✅ PASS' : '❌ FAIL';
    const message = `${status} - ${testName}`;
    
    console.log(message);
    
    if (details) {
        console.log(`   Details: ${details}`);
    }
    
    testResults.details.push({ testName, success, details });
    
    if (success) {
        testResults.passed++;
    } else {
        testResults.failed++;
        testResults.errors.push({ testName, details });
    }
}

function logSection(sectionName) {
    console.log('\n' + '='.repeat(60));
    console.log(`🧪 ${sectionName}`);
    console.log('='.repeat(60));
}

// Test Functions

/**
 * Test 1: Basic Counter Creation for Authenticated User
 */
async function testCreateCountersAuthenticated() {
    logSection('Test 1: Create Counters for Authenticated User');
    
    try {
        // Test daily counter creation
        const dailyCounter = await storage.createOrUpdateCounter(
            TEST_CONFIG.TEST_USER_ID, 
            'login', 
            TEST_CONFIG.TEST_DATES.daily, 
            'daily'
        );
        
        logTest(
            'Daily counter creation for authenticated user',
            dailyCounter && dailyCounter.userId === TEST_CONFIG.TEST_USER_ID && dailyCounter.count === 1,
            `Counter ID: ${dailyCounter?.id}, Count: ${dailyCounter?.count}, NormalizedID: ${dailyCounter?.normalizedUserId}`
        );
        
        // Test monthly counter creation
        const monthlyCounter = await storage.createOrUpdateCounter(
            TEST_CONFIG.TEST_USER_ID, 
            'login', 
            TEST_CONFIG.TEST_DATES.monthly, 
            'monthly'
        );
        
        logTest(
            'Monthly counter creation for authenticated user',
            monthlyCounter && monthlyCounter.userId === TEST_CONFIG.TEST_USER_ID && monthlyCounter.count === 1,
            `Counter ID: ${monthlyCounter?.id}, Count: ${monthlyCounter?.count}, NormalizedID: ${monthlyCounter?.normalizedUserId}`
        );
        
    } catch (error) {
        logTest('Create counters for authenticated user', false, error.message);
    }
}

/**
 * Test 2: Counter Creation for Unauthenticated User (userId = null)
 */
async function testCreateCountersUnauthenticated() {
    logSection('Test 2: Create Counters for Unauthenticated User (userId = null)');
    
    try {
        // Test daily counter for null user
        const dailyNullCounter = await storage.createOrUpdateCounter(
            null, 
            'signal_request', 
            TEST_CONFIG.TEST_DATES.daily, 
            'daily'
        );
        
        logTest(
            'Daily counter creation for null user',
            dailyNullCounter && dailyNullCounter.userId === null && dailyNullCounter.normalizedUserId === -1,
            `Counter ID: ${dailyNullCounter?.id}, UserID: ${dailyNullCounter?.userId}, NormalizedID: ${dailyNullCounter?.normalizedUserId}`
        );
        
        // Test monthly counter for null user
        const monthlyNullCounter = await storage.createOrUpdateCounter(
            null, 
            'signal_request', 
            TEST_CONFIG.TEST_DATES.monthly, 
            'monthly'
        );
        
        logTest(
            'Monthly counter creation for null user',
            monthlyNullCounter && monthlyNullCounter.userId === null && monthlyNullCounter.normalizedUserId === -1,
            `Counter ID: ${monthlyNullCounter?.id}, UserID: ${monthlyNullCounter?.userId}, NormalizedID: ${monthlyNullCounter?.normalizedUserId}`
        );
        
    } catch (error) {
        logTest('Create counters for unauthenticated user', false, error.message);
    }
}

/**
 * Test 3: UPSERT Functionality (Insert vs Update)
 */
async function testUpsertFunctionality() {
    logSection('Test 3: UPSERT Functionality - Insert vs Update');
    
    try {
        // First creation should return count = 1
        const firstInsert = await storage.createOrUpdateCounter(
            TEST_CONFIG.TEST_USER_ID, 
            'chat_message', 
            TEST_CONFIG.TEST_DATES.daily, 
            'daily'
        );
        
        logTest(
            'UPSERT - First insert (should be count = 1)',
            firstInsert && firstInsert.count === 1,
            `First insert count: ${firstInsert?.count}`
        );
        
        // Second call should increment to count = 2
        const firstUpdate = await storage.createOrUpdateCounter(
            TEST_CONFIG.TEST_USER_ID, 
            'chat_message', 
            TEST_CONFIG.TEST_DATES.daily, 
            'daily'
        );
        
        logTest(
            'UPSERT - First update (should be count = 2)',
            firstUpdate && firstUpdate.count === 2,
            `First update count: ${firstUpdate?.count}`
        );
        
        // Test custom increment
        const customIncrement = await storage.createOrUpdateCounter(
            TEST_CONFIG.TEST_USER_ID, 
            'chat_message', 
            TEST_CONFIG.TEST_DATES.daily, 
            'daily',
            5
        );
        
        logTest(
            'UPSERT - Custom increment by 5 (should be count = 7)',
            customIncrement && customIncrement.count === 7,
            `Custom increment count: ${customIncrement?.count}`
        );
        
    } catch (error) {
        logTest('UPSERT functionality test', false, error.message);
    }
}

/**
 * Test 4: Normalized User ID Functionality
 */
async function testNormalizedUserId() {
    logSection('Test 4: Normalized User ID Functionality');
    
    try {
        // Test retrieval by normalized ID for authenticated user
        const authUserCounter = await storage.getCounter(
            TEST_CONFIG.TEST_USER_ID,
            'login',
            TEST_CONFIG.TEST_DATES.daily,
            'daily'
        );
        
        logTest(
            'Retrieve counter using normalized_user_id for authenticated user',
            authUserCounter && authUserCounter.normalizedUserId === TEST_CONFIG.TEST_USER_ID,
            `NormalizedID: ${authUserCounter?.normalizedUserId}, Expected: ${TEST_CONFIG.TEST_USER_ID}`
        );
        
        // Test retrieval by normalized ID for null user
        const nullUserCounter = await storage.getCounter(
            null,
            'signal_request',
            TEST_CONFIG.TEST_DATES.daily,
            'daily'
        );
        
        logTest(
            'Retrieve counter using normalized_user_id for null user',
            nullUserCounter && nullUserCounter.normalizedUserId === -1,
            `NormalizedID: ${nullUserCounter?.normalizedUserId}, Expected: -1`
        );
        
    } catch (error) {
        logTest('Normalized User ID functionality', false, error.message);
    }
}

/**
 * Test 5: Optimized Queries - getCountersByPeriod
 */
async function testOptimizedQueriesCountersByPeriod() {
    logSection('Test 5: Optimized Queries - getCountersByPeriod');
    
    try {
        // Create some test data for filtering
        await Promise.all([
            storage.createOrUpdateCounter(TEST_CONFIG.TEST_USER_ID, 'login', '2025-09-14', 'daily'),
            storage.createOrUpdateCounter(TEST_CONFIG.TEST_USER_ID, 'logout', '2025-09-14', 'daily'),
            storage.createOrUpdateCounter(TEST_CONFIG.TEST_USER_ID, 'error', '2025-09-15', 'daily'),
            storage.createOrUpdateCounter(null, 'signal_request', '2025-09-14', 'daily'),
            storage.createOrUpdateCounter(null, 'signal_request', '2025-09-15', 'daily'),
        ]);
        
        // Test filter by userId
        const userCounters = await storage.getCountersByPeriod({
            userId: TEST_CONFIG.TEST_USER_ID,
            period: 'daily',
            limit: 10
        });
        
        logTest(
            'getCountersByPeriod - Filter by specific userId',
            userCounters.length > 0 && userCounters.every(c => c.userId === TEST_CONFIG.TEST_USER_ID),
            `Found ${userCounters.length} counters for user ${TEST_CONFIG.TEST_USER_ID}`
        );
        
        // Test filter by null userId
        const nullUserCounters = await storage.getCountersByPeriod({
            userId: null,
            period: 'daily',
            limit: 10
        });
        
        logTest(
            'getCountersByPeriod - Filter by null userId',
            nullUserCounters.length > 0 && nullUserCounters.every(c => c.userId === null),
            `Found ${nullUserCounters.length} counters for null user`
        );
        
        // Test filter by action
        const actionCounters = await storage.getCountersByPeriod({
            action: 'signal_request',
            period: 'daily',
            limit: 10
        });
        
        logTest(
            'getCountersByPeriod - Filter by action',
            actionCounters.length > 0 && actionCounters.every(c => c.action === 'signal_request'),
            `Found ${actionCounters.length} counters for action 'signal_request'`
        );
        
        // Test date range filtering
        const dateRangeCounters = await storage.getCountersByPeriod({
            period: 'daily',
            dateFrom: '2025-09-14',
            dateTo: '2025-09-15',
            limit: 20
        });
        
        logTest(
            'getCountersByPeriod - Date range filter',
            dateRangeCounters.length > 0,
            `Found ${dateRangeCounters.length} counters in date range 2025-09-14 to 2025-09-15`
        );
        
    } catch (error) {
        logTest('Optimized queries - getCountersByPeriod', false, error.message);
    }
}

/**
 * Test 6: Optimized Queries - getUserCountersSummary
 */
async function testOptimizedQueriesUserSummary() {
    logSection('Test 6: Optimized Queries - getUserCountersSummary');
    
    try {
        // Test summary for authenticated user
        const authUserSummary = await storage.getUserCountersSummary(TEST_CONFIG.TEST_USER_ID);
        
        logTest(
            'getUserCountersSummary - Authenticated user',
            authUserSummary && typeof authUserSummary.totalActions === 'number',
            `Total actions: ${authUserSummary?.totalActions}, Daily actions: ${Object.keys(authUserSummary?.daily || {}).length}, Most active: ${authUserSummary?.mostActiveAction}`
        );
        
        // Test summary for null user
        const nullUserSummary = await storage.getUserCountersSummary(null);
        
        logTest(
            'getUserCountersSummary - Null user',
            nullUserSummary && typeof nullUserSummary.totalActions === 'number',
            `Total actions: ${nullUserSummary?.totalActions}, Daily actions: ${Object.keys(nullUserSummary?.daily || {}).length}, Most active: ${nullUserSummary?.mostActiveAction}`
        );
        
        // Test summary with specific actions filter
        const filteredSummary = await storage.getUserCountersSummary(
            TEST_CONFIG.TEST_USER_ID, 
            ['login', 'logout']
        );
        
        logTest(
            'getUserCountersSummary - With actions filter',
            filteredSummary && typeof filteredSummary.totalActions === 'number',
            `Filtered total: ${filteredSummary?.totalActions}, Actions: ${Object.keys(filteredSummary?.daily || {}).join(', ')}`
        );
        
    } catch (error) {
        logTest('Optimized queries - getUserCountersSummary', false, error.message);
    }
}

/**
 * Test 7: LogsService Integration
 */
async function testLogsServiceIntegration() {
    logSection('Test 7: LogsService Integration');
    
    try {
        // Test logging with user action that should trigger counter updates
        const testLog = await logsService.log({
            level: 'info',
            source: 'test',
            message: 'Testing counter integration',
            userId: TEST_CONFIG.TEST_USER_ID,
            action: 'test_action'
        });
        
        logTest(
            'LogsService - Create log with action',
            testLog && testLog.id && testLog.userId === TEST_CONFIG.TEST_USER_ID,
            `Log created with ID: ${testLog?.id}, Action: ${testLog?.action}`
        );
        
        // Wait a moment for counter updates to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if counters were created
        const todayDate = new Date().toISOString().split('T')[0];
        const counterCheck = await storage.getCounter(
            TEST_CONFIG.TEST_USER_ID,
            'test_action',
            todayDate,
            'daily'
        );
        
        logTest(
            'LogsService Integration - Counter auto-created',
            counterCheck && counterCheck.count > 0,
            `Counter found with count: ${counterCheck?.count} for action: test_action`
        );
        
    } catch (error) {
        logTest('LogsService integration', false, error.message);
    }
}

/**
 * Test 8: Edge Cases
 */
async function testEdgeCases() {
    logSection('Test 8: Edge Cases');
    
    try {
        // Test invalid date handling
        const invalidDateCounter = await storage.createOrUpdateCounter(
            TEST_CONFIG.TEST_USER_ID,
            'edge_test',
            'invalid-date',
            'daily'
        );
        
        logTest(
            'Edge case - Invalid date handling',
            invalidDateCounter && invalidDateCounter.date,
            `Handled invalid date, result date: ${invalidDateCounter?.date}`
        );
        
        // Test very large increment
        const largeIncrementCounter = await storage.createOrUpdateCounter(
            TEST_CONFIG.TEST_USER_ID,
            'large_increment_test',
            TEST_CONFIG.TEST_DATES.daily,
            'daily',
            1000000
        );
        
        logTest(
            'Edge case - Large increment value',
            largeIncrementCounter && largeIncrementCounter.count === 1000000,
            `Large increment handled, count: ${largeIncrementCounter?.count}`
        );
        
        // Test empty action string (should fail gracefully)
        try {
            await storage.createOrUpdateCounter(
                TEST_CONFIG.TEST_USER_ID,
                '',
                TEST_CONFIG.TEST_DATES.daily,
                'daily'
            );
            logTest('Edge case - Empty action string', false, 'Should have failed but did not');
        } catch (emptyActionError) {
            logTest('Edge case - Empty action string', true, 'Correctly rejected empty action');
        }
        
    } catch (error) {
        logTest('Edge cases testing', false, error.message);
    }
}

/**
 * Test 9: Performance and Index Utilization Test
 */
async function testPerformanceAndIndexes() {
    logSection('Test 9: Performance and Index Utilization');
    
    try {
        // Create multiple counters to test performance
        const startTime = Date.now();
        
        const batchPromises = [];
        for (let i = 0; i < 100; i++) {
            const userId = i % 10 === 0 ? null : (i % 5) + 1; // Mix of null and various user IDs
            const action = TEST_CONFIG.TEST_ACTIONS[i % TEST_CONFIG.TEST_ACTIONS.length];
            const date = new Date(2025, 8, 15 + (i % 5)).toISOString().split('T')[0]; // Spread across 5 days
            
            batchPromises.push(
                storage.createOrUpdateCounter(userId, action, date, 'daily')
            );
        }
        
        await Promise.all(batchPromises);
        
        const creationTime = Date.now() - startTime;
        
        logTest(
            'Performance - Batch counter creation',
            creationTime < 5000, // Should complete within 5 seconds
            `Created 100 counters in ${creationTime}ms`
        );
        
        // Test query performance
        const queryStartTime = Date.now();
        
        const queryPromises = [
            storage.getCountersByPeriod({ period: 'daily', limit: 50 }),
            storage.getCountersByPeriod({ userId: 1, period: 'daily', limit: 20 }),
            storage.getCountersByPeriod({ action: 'login', period: 'daily', limit: 20 }),
            storage.getUserCountersSummary(1),
            storage.getUserCountersSummary(null)
        ];
        
        const queryResults = await Promise.all(queryPromises);
        const queryTime = Date.now() - queryStartTime;
        
        logTest(
            'Performance - Optimized queries',
            queryTime < 2000 && queryResults.every(result => result !== null),
            `Executed 5 complex queries in ${queryTime}ms`
        );
        
    } catch (error) {
        logTest('Performance and indexes testing', false, error.message);
    }
}

/**
 * Main Test Runner
 */
async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive Testing of user_counters System');
    console.log('📅 Date:', new Date().toISOString());
    console.log('🔍 Testing SQLite database with normalized_user_id implementation\n');
    
    const startTime = Date.now();
    
    try {
        // Run all tests sequentially
        await testCreateCountersAuthenticated();
        await testCreateCountersUnauthenticated();
        await testUpsertFunctionality();
        await testNormalizedUserId();
        await testOptimizedQueriesCountersByPeriod();
        await testOptimizedQueriesUserSummary();
        await testLogsServiceIntegration();
        await testEdgeCases();
        await testPerformanceAndIndexes();
        
    } catch (error) {
        console.error('\n❌ Critical error during testing:', error);
        testResults.failed++;
        testResults.errors.push({ testName: 'Critical Error', details: error.message });
    }
    
    const totalTime = Date.now() - startTime;
    
    // Print comprehensive results
    logSection('📊 COMPREHENSIVE TEST RESULTS');
    
    console.log(`📈 Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`🎯 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
        console.log('\n🔍 FAILED TESTS SUMMARY:');
        testResults.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error.testName}: ${error.details}`);
        });
    }
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! user_counters system is working correctly.');
    } else {
        console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the issues above.`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Testing Complete');
    console.log('='.repeat(60));
    
    // Return results for programmatic use
    return testResults;
}

// Execute tests if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runComprehensiveTests()
        .then(results => {
            process.exit(results.failed === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { runComprehensiveTests, testResults };