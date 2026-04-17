/**
 * Fintech HEADMAP - Google Apps Script
 * スプレッドシートへの書き込みを受け付けるWebアプリ
 *
 * 設置手順:
 * 1. スプレッドシートを開く
 * 2. 拡張機能 > Apps Script
 * 3. このコードを貼り付けて保存
 * 4. デプロイ > 新しいデプロイ > ウェブアプリ
 * 5. 「アクセスできるユーザー」を「全員」に設定
 * 6. デプロイしてURLをコピー
 * 7. Fintech HEADMAPの設定でそのURLを入力
 */

// 注: GAS WebアプリはCORSを自動的に処理するため、doOptionsは不要
// ブラウザからのfetchは自動的にリダイレクトされて処理される

// GETリクエスト: 接続テスト用
function doGet(e) {
  const output = JSON.stringify({
    success: true,
    message: 'Fintech HEADMAP GAS is running',
    timestamp: new Date().toISOString()
  });

  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

// POSTリクエスト: データ更新
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let result;

    switch (action) {
      case 'update':
        result = updateItem(data.item);
        break;
      case 'add':
        result = addItem(data.item);
        break;
      case 'delete':
        result = deleteItem(data.id);
        break;
      case 'sync':
        result = syncAllItems(data.items);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      result: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ヘッダー行からカラムインデックスを取得
function getHeaderMap() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const map = {};
  headers.forEach((h, i) => {
    const header = h.toString().trim().toLowerCase();
    if (header === 'id') map.id = i;
    else if (header === 'title' || header.includes('タイトル')) map.title = i;
    else if (header === 'shortname' || header.includes('ショート')) map.shortName = i;
    else if (header === 'layer' || header.includes('自分フラグ') || header.includes('レイヤー')) map.layer = i;
    else if (header === 'status' || header.includes('ステータス')) map.status = i;
    else if (header.includes('重要') || header === 'importance') map.importance = i;
    else if (header.includes('緊急') || header === 'urgency') map.urgency = i;
    else if (header === 'person' || header.includes('関係者') || header.includes('移譲先')) map.person = i;
    else if (header === 'memo' || header.includes('メモ') || header.includes('詳細')) map.memo = i;
    else if (header === 'category' || header.includes('カテゴリ') || header.includes('分類')) map.category = i;
    else if (header === 'updated flag' || header === 'updatedflag' || header.includes('updated flag') || header.includes('更新フラグ')) map.hasUpdate = i;
    else if (header === 'update detail' || header === 'updatedetail' || header.includes('update detail') || header.includes('相談内容') || header.includes('更新内容')) map.updateDetail = i;
  });

  return { map, headers, sheet };
}

// IDで行を検索
// HM-XXX形式のIDと数字のみのIDの両方に対応
function findRowById(sheet, idColumn, targetId) {
  const data = sheet.getDataRange().getValues();
  let targetIdStr = String(targetId).trim();

  // HM-XXX形式から数字を抽出（例: "HM-001" → "1"）
  let targetNumeric = targetIdStr;
  if (targetIdStr.startsWith('HM-')) {
    targetNumeric = String(parseInt(targetIdStr.replace('HM-', ''), 10));
  }

  for (let i = 1; i < data.length; i++) {
    const cellValue = String(data[i][idColumn]).trim();
    // 完全一致、または数字部分の一致をチェック
    if (cellValue === targetIdStr || cellValue === targetNumeric) {
      return i + 1; // 1-indexed
    }
  }
  return -1;
}

// アイテム更新
function updateItem(item) {
  const { map, sheet } = getHeaderMap();

  if (map.id === undefined) {
    throw new Error('ID column not found');
  }

  const row = findRowById(sheet, map.id, item.id);
  if (row === -1) {
    throw new Error('Item not found: ' + item.id);
  }

  // 各フィールドを更新
  if (map.title !== undefined && item.title !== undefined) {
    sheet.getRange(row, map.title + 1).setValue(item.title);
  }
  if (map.shortName !== undefined && item.shortName !== undefined) {
    sheet.getRange(row, map.shortName + 1).setValue(item.shortName);
  }
  if (map.layer !== undefined && item.layer !== undefined) {
    // layer: self -> TRUE, other -> FALSE
    const layerValue = item.layer === 'self' ? 'TRUE' : 'FALSE';
    sheet.getRange(row, map.layer + 1).setValue(layerValue);
  }
  if (map.status !== undefined && item.status !== undefined) {
    sheet.getRange(row, map.status + 1).setValue(item.status);
  }
  if (map.importance !== undefined && item.importanceScore !== undefined) {
    sheet.getRange(row, map.importance + 1).setValue(item.importanceScore);
  }
  if (map.urgency !== undefined && item.urgencyScore !== undefined) {
    sheet.getRange(row, map.urgency + 1).setValue(item.urgencyScore);
  }
  if (map.person !== undefined && item.person !== undefined) {
    sheet.getRange(row, map.person + 1).setValue(item.person);
  }
  if (map.memo !== undefined && item.memo !== undefined) {
    sheet.getRange(row, map.memo + 1).setValue(item.memo);
  }
  if (map.category !== undefined && item.category !== undefined) {
    sheet.getRange(row, map.category + 1).setValue(item.category);
  }
  if (map.hasUpdate !== undefined && item.hasUpdate !== undefined) {
    sheet.getRange(row, map.hasUpdate + 1).setValue(item.hasUpdate ? 'TRUE' : 'FALSE');
  }
  if (map.updateDetail !== undefined && item.updateDetail !== undefined) {
    sheet.getRange(row, map.updateDetail + 1).setValue(item.updateDetail);
  }

  return { updated: item.id, row: row };
}

// アイテム追加
function addItem(item) {
  const { map, sheet } = getHeaderMap();

  const newRow = sheet.getLastRow() + 1;

  // 新しいIDを生成（既存の最大ID + 1）
  let newId = item.id;
  if (!newId) {
    const data = sheet.getDataRange().getValues();
    let maxNum = 0;
    for (let i = 1; i < data.length; i++) {
      const id = data[i][map.id];
      if (id && typeof id === 'string') {
        const num = parseInt(id.replace('HM-', ''), 10);
        if (num > maxNum) maxNum = num;
      }
    }
    newId = 'HM-' + String(maxNum + 1).padStart(3, '0');
  }

  // 各フィールドを設定
  if (map.id !== undefined) sheet.getRange(newRow, map.id + 1).setValue(newId);
  if (map.title !== undefined) sheet.getRange(newRow, map.title + 1).setValue(item.title || '');
  if (map.shortName !== undefined) sheet.getRange(newRow, map.shortName + 1).setValue(item.shortName || '');
  if (map.layer !== undefined) {
    const layerValue = item.layer === 'self' ? 'TRUE' : 'FALSE';
    sheet.getRange(newRow, map.layer + 1).setValue(layerValue);
  }
  if (map.status !== undefined) sheet.getRange(newRow, map.status + 1).setValue(item.status || 'FIRE');
  if (map.importance !== undefined) sheet.getRange(newRow, map.importance + 1).setValue(item.importanceScore || 50);
  if (map.urgency !== undefined) sheet.getRange(newRow, map.urgency + 1).setValue(item.urgencyScore || 50);
  if (map.person !== undefined) sheet.getRange(newRow, map.person + 1).setValue(item.person || '');
  if (map.memo !== undefined) sheet.getRange(newRow, map.memo + 1).setValue(item.memo || '');
  if (map.category !== undefined) sheet.getRange(newRow, map.category + 1).setValue(item.category || '');
  if (map.hasUpdate !== undefined) sheet.getRange(newRow, map.hasUpdate + 1).setValue(item.hasUpdate ? 'TRUE' : 'FALSE');
  if (map.updateDetail !== undefined) sheet.getRange(newRow, map.updateDetail + 1).setValue(item.updateDetail || '');

  return { added: newId, row: newRow };
}

// アイテム削除
function deleteItem(id) {
  const { map, sheet } = getHeaderMap();

  if (map.id === undefined) {
    throw new Error('ID column not found');
  }

  const row = findRowById(sheet, map.id, id);
  if (row === -1) {
    throw new Error('Item not found: ' + id);
  }

  sheet.deleteRow(row);

  return { deleted: id };
}

// 全アイテム同期（Fintech HEADMAP → スプレッドシート）
function syncAllItems(items) {
  const { map, sheet } = getHeaderMap();

  let updated = 0;
  let added = 0;

  items.forEach(item => {
    const row = findRowById(sheet, map.id, item.id);
    if (row !== -1) {
      // 更新
      updateItem(item);
      updated++;
    } else {
      // 追加
      addItem(item);
      added++;
    }
  });

  return { updated, added };
}
