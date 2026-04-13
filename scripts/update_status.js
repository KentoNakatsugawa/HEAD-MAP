#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ITEMS_PATH = path.join(__dirname, '..', 'data', 'items.json');
const LOG_PATH = path.join(__dirname, '..', 'data', 'log.json');

const VALID_STATUSES = ['FIRE', 'DESIGN', 'QUICK', 'EPOCHE', 'WATCH', 'MONITOR', 'DELEGATE', 'SEED'];
const VALID_LAYERS = ['self', 'other'];

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      }
    }
  }
  return parsed;
}

function getToday() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function showHelp() {
  console.log(`
HEAD MAP - Update Item

Usage:
  node update_status.js --id HM-001 --status DESIGN [options]

Required:
  --id        アイテムID (例: HM-001)

Update options (at least one required):
  --status      FIRE, DESIGN, QUICK, EPOCHE, WATCH, MONITOR, DELEGATE, SEED
  --layer       self, other
  --importance  重要度スコア 0-100
  --urgency     緊急度スコア 0-100
  --short       ショートネーム
  --person      関係者名
  --next        次のアクション
  --memo        メモ
  --title       タイトル

Optional:
  --note      変更理由（ログに記録）

Examples:
  node update_status.js --id HM-001 --status DESIGN --note "山畑さんへの提出完了"
  node update_status.js --id HM-002 --importance 80 --urgency 30 --next "明日中に対応"
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Validate ID
  if (!args.id) {
    console.error('Error: --id is required');
    showHelp();
    process.exit(1);
  }

  // Check if at least one update field is provided
  const updateFields = ['status', 'layer', 'importance', 'urgency', 'short', 'person', 'next', 'memo', 'title'];
  const hasUpdate = updateFields.some(field => args[field] !== undefined);

  if (!hasUpdate) {
    console.error('Error: At least one update field is required');
    showHelp();
    process.exit(1);
  }

  // Validate values
  if (args.status && !VALID_STATUSES.includes(args.status.toUpperCase())) {
    console.error(`Error: --status must be one of: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
  }

  if (args.layer && !VALID_LAYERS.includes(args.layer)) {
    console.error(`Error: --layer must be one of: ${VALID_LAYERS.join(', ')}`);
    process.exit(1);
  }

  if (args.importance !== undefined) {
    const importance = parseInt(args.importance, 10);
    if (isNaN(importance) || importance < 0 || importance > 100) {
      console.error('Error: --importance must be a number between 0 and 100');
      process.exit(1);
    }
  }

  if (args.urgency !== undefined) {
    const urgency = parseInt(args.urgency, 10);
    if (isNaN(urgency) || urgency < 0 || urgency > 100) {
      console.error('Error: --urgency must be a number between 0 and 100');
      process.exit(1);
    }
  }

  // Load existing data
  let data;
  try {
    data = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8'));
  } catch (error) {
    console.error('Error reading items.json:', error.message);
    process.exit(1);
  }

  // Find item
  const itemIndex = data.items.findIndex(item => item.id === args.id);
  if (itemIndex === -1) {
    console.error(`Error: Item not found: ${args.id}`);
    process.exit(1);
  }

  const item = data.items[itemIndex];
  const changes = [];
  const today = getToday();

  // Apply updates
  if (args.status) {
    const newStatus = args.status.toUpperCase();
    if (item.status !== newStatus) {
      changes.push({ field: 'status', from: item.status, to: newStatus });
      item.status = newStatus;
    }
  }

  if (args.layer && item.layer !== args.layer) {
    changes.push({ field: 'layer', from: item.layer, to: args.layer });
    item.layer = args.layer;
  }

  if (args.importance !== undefined) {
    const newImportance = parseInt(args.importance, 10);
    if (item.importanceScore !== newImportance) {
      changes.push({ field: 'importanceScore', from: item.importanceScore, to: newImportance });
      item.importanceScore = newImportance;
    }
  }

  if (args.urgency !== undefined) {
    const newUrgency = parseInt(args.urgency, 10);
    if (item.urgencyScore !== newUrgency) {
      changes.push({ field: 'urgencyScore', from: item.urgencyScore, to: newUrgency });
      item.urgencyScore = newUrgency;
    }
  }

  if (args.short !== undefined && item.shortName !== args.short) {
    changes.push({ field: 'shortName', from: item.shortName, to: args.short });
    item.shortName = args.short;
  }

  if (args.person !== undefined && item.person !== args.person) {
    changes.push({ field: 'person', from: item.person, to: args.person });
    item.person = args.person;
  }

  if (args.next !== undefined && item.nextAction !== args.next) {
    changes.push({ field: 'nextAction', from: item.nextAction, to: args.next });
    item.nextAction = args.next;
  }

  if (args.memo !== undefined && item.memo !== args.memo) {
    changes.push({ field: 'memo', from: item.memo, to: args.memo });
    item.memo = args.memo;
  }

  if (args.title && item.title !== args.title) {
    changes.push({ field: 'title', from: item.title, to: args.title });
    item.title = args.title;
  }

  if (changes.length === 0) {
    console.log('No changes to apply.');
    process.exit(0);
  }

  // Update timestamp
  item.updatedAt = today;

  // Save items.json
  try {
    fs.writeFileSync(ITEMS_PATH, JSON.stringify(data, null, 2) + '\n');
  } catch (error) {
    console.error('Error writing items.json:', error.message);
    process.exit(1);
  }

  // Add to log
  try {
    const logData = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    const timestamp = new Date().toISOString();

    changes.forEach(change => {
      logData.log.push({
        timestamp: timestamp,
        itemId: args.id,
        field: change.field,
        from: change.from,
        to: change.to,
        note: args.note || ''
      });
    });

    fs.writeFileSync(LOG_PATH, JSON.stringify(logData, null, 2) + '\n');
  } catch (error) {
    console.warn('Warning: Could not update log.json:', error.message);
  }

  console.log(`✅ Updated: ${args.id} - ${item.title}`);
  changes.forEach(change => {
    console.log(`   ${change.field}: ${change.from || '(empty)'} → ${change.to}`);
  });
  if (args.note) {
    console.log(`   Note: ${args.note}`);
  }
}

main();
