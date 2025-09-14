#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const I18N_FILE = 'client/src/lib/i18n.ts';

function findEnglishSection(content) {
  const lines = content.split('\n');
  let enStart = -1;
  let enEnd = -1;
  let braceCount = 0;
  let foundStart = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('en: {') && !foundStart) {
      enStart = i;
      foundStart = true;
      braceCount = 1;
      continue;
    }
    
    if (foundStart) {
      // Count braces to find the end of the en section
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        
        if (braceCount === 0) {
          enEnd = i;
          break;
        }
      }
      
      if (braceCount === 0) break;
    }
  }
  
  return { start: enStart, end: enEnd, lines };
}

function parseEnglishKeys(lines, start, end) {
  const keyOccurrences = new Map(); // key -> array of {line, value}
  
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('//') || trimmed === '' || trimmed === ',') {
      continue;
    }
    
    // Match key: value patterns
    const keyMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:\s*['"`]([^'"`]*?)['"`]\s*,?$/);
    if (keyMatch) {
      const [, key, value] = keyMatch;
      
      if (!keyOccurrences.has(key)) {
        keyOccurrences.set(key, []);
      }
      
      keyOccurrences.get(key).push({
        lineNumber: i + 1, // 1-indexed
        lineIndex: i,      // 0-indexed
        value: value,
        originalLine: line
      });
    }
  }
  
  return keyOccurrences;
}

function findDuplicates(keyOccurrences) {
  const duplicates = new Map();
  
  for (const [key, occurrences] of keyOccurrences) {
    if (occurrences.length > 1) {
      duplicates.set(key, occurrences);
    }
  }
  
  return duplicates;
}

function generateDeduplicatedSection(lines, start, end, keyOccurrences, policy = 'keepLast') {
  const deduplicatedLines = [];
  const usedKeys = new Set();
  
  // Add the opening line
  deduplicatedLines.push(lines[start]);
  
  // Process each line in the English section
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Keep comments and empty lines
    if (trimmed.startsWith('//') || trimmed === '' || trimmed === ',') {
      deduplicatedLines.push(line);
      continue;
    }
    
    // Check if this is a key: value line
    const keyMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      const occurrences = keyOccurrences.get(key);
      
      if (occurrences && occurrences.length > 1) {
        // This is a duplicate key
        if (policy === 'keepLast') {
          // Only include if this is the last occurrence
          const lastOccurrence = occurrences[occurrences.length - 1];
          if (i === lastOccurrence.lineIndex) {
            deduplicatedLines.push(line);
            usedKeys.add(key);
          }
          // Skip other occurrences
        } else if (policy === 'keepFirst') {
          // Only include if this is the first occurrence and we haven't used it yet
          if (!usedKeys.has(key)) {
            deduplicatedLines.push(line);
            usedKeys.add(key);
          }
          // Skip other occurrences
        }
      } else {
        // Not a duplicate, keep it
        deduplicatedLines.push(line);
      }
    } else {
      // Not a key: value line, keep it
      deduplicatedLines.push(line);
    }
  }
  
  // Add the closing line
  deduplicatedLines.push(lines[end]);
  
  return deduplicatedLines;
}

function main() {
  try {
    console.log('🔍 Checking for duplicate keys in', I18N_FILE);
    
    const content = fs.readFileSync(I18N_FILE, 'utf8');
    const { start, end, lines } = findEnglishSection(content);
    
    if (start === -1 || end === -1) {
      console.error('❌ Could not find English section in i18n file');
      process.exit(1);
    }
    
    console.log(`📍 Found English section: lines ${start + 1} to ${end + 1}`);
    
    const keyOccurrences = parseEnglishKeys(lines, start, end);
    const duplicates = findDuplicates(keyOccurrences);
    
    if (duplicates.size === 0) {
      console.log('✅ No duplicate keys found!');
      return;
    }
    
    console.log(`\n🚨 Found ${duplicates.size} duplicate keys:\n`);
    
    for (const [key, occurrences] of duplicates) {
      console.log(`Key: "${key}"`);
      occurrences.forEach((occ, index) => {
        const marker = index === occurrences.length - 1 ? '🔒 KEEP' : '❌ REMOVE';
        console.log(`  Line ${occ.lineNumber}: "${occ.value}" ${marker}`);
      });
      console.log('');
    }
    
    // Generate deduplicated version
    console.log('🔧 Generating deduplicated version...\n');
    
    const deduplicatedLines = generateDeduplicatedSection(lines, start, end, keyOccurrences, 'keepLast');
    
    // Create backup
    const backupPath = I18N_FILE + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, content);
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Replace the English section
    const newContent = [
      ...lines.slice(0, start),
      ...deduplicatedLines,
      ...lines.slice(end + 1)
    ].join('\n');
    
    fs.writeFileSync(I18N_FILE, newContent);
    console.log(`✅ Fixed ${duplicates.size} duplicate keys in ${I18N_FILE}`);
    console.log('🔄 Please restart your development server to see the changes');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();