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

function generateId(items) {
  const maxId = items.reduce((max, item) => {
    const num = parseInt(item.id.replace('HM-', ''), 10);
    return num > max ? num : max;
  }, 0);
  return `HM-${String(maxId + 1).padStart(3, '0')}`;
}

function getToday() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function showHelp() {
  console.log(`
HEAD MAP - Add Item

Usage:
  node add_item.js --title "タイトル" --layer self --status FIRE [options]

Required:
  --title     アイテムのタイトル
  --layer     self または other
  --status    FIRE, DESIGN, QUICK, EPOCHE, WATCH, MONITOR, DELEGATE, SEED

Optional:
  --short     ショートネーム（表示用、6文字程度）
  --importance  重要度スコア 0-100 (default: 50)
  --urgency     緊急度スコア 0-100 (default: 50)
  --person    関係者名
  --next      次のアクション
  --memo      メモ

Example:
  node add_item.js \\
    --title "USS提案の残価SaaS試算" \\
    --short "USS試算" \\
    --layer self \\
    --status FIRE \\
    --importance 90 \\
    --urgency 85 \\
    --person "辻さん" \\
    --next "壁打ちしてから山畑さんへ"
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Validate required fields
  if (!args.title) {
    console.error('Error: --title is required');
    showHelp();
    process.exit(1);
  }

  if (!args.layer || !VALID_LAYERS.includes(args.layer)) {
    console.error(`Error: --layer must be one of: ${VALID_LAYERS.join(', ')}`);
    process.exit(1);
  }

  if (!args.status || !VALID_STATUSES.includes(args.status.toUpperCase())) {
    console.error(`Error: --status must be one of: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
  }

  const status = args.status.toUpperCase();
  const importance = args.importance !== undefined ? parseInt(args.importance, 10) : 50;
  const urgency = args.urgency !== undefined ? parseInt(args.urgency, 10) : 50;

  if (isNaN(importance) || importance < 0 || importance > 100) {
    console.error('Error: --importance must be a number between 0 and 100');
    process.exit(1);
  }

  if (isNaN(urgency) || urgency < 0 || urgency > 100) {
    console.error('Error: --urgency must be a number between 0 and 100');
    process.exit(1);
  }

  // Load existing data
  let data;
  try {
    data = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8'));
  } catch (error) {
    console.error('Error reading items.json:', error.message);
    process.exit(1);
  }

  const today = getToday();
  const newId = generateId(data.items);

  const newItem = {
    id: newId,
    title: args.title,
    shortName: args.short || '',
    layer: args.layer,
    status: status,
    importanceScore: importance,
    urgencyScore: urgency,
    person: args.person || '',
    nextAction: args.next || '',
    updatedAt: today,
    memo: args.memo || '',
    createdAt: today
  };

  // Add item
  data.items.push(newItem);

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
    logData.log.push({
      timestamp: new Date().toISOString(),
      itemId: newId,
      field: 'created',
      from: null,
      to: status,
      note: `新規作成: ${args.title}`
    });
    fs.writeFileSync(LOG_PATH, JSON.stringify(logData, null, 2) + '\n');
  } catch (error) {
    console.warn('Warning: Could not update log.json:', error.message);
  }

  console.log(`✅ Added: ${newId} - ${args.title}`);
  console.log(`   Status: ${status} | Layer: ${args.layer} | 重要度: ${importance} | 緊急度: ${urgency}`);
}

main();
