#!/usr/bin/env node
/**
 * @what CSV内の機密データをダミーデータに置き換える
 * @why 実際の料金や実績データを公開リポジトリに含めないため
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '../demo-data-source/master_sample.csv');

console.log('📂 Reading CSV from:', csvPath);
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

console.log(`✅ Found ${lines.length} lines`);

// Random number generators
function randomPrice(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomClicks() {
  return Math.floor(Math.random() * 10000) + 500;
}

function randomAchievements() {
  const num = Math.floor(Math.random() * 100) + 1;
  return `${num}件`;
}

function dummyRemark() {
  const templates = [
    '①20代〜30代の美容関心層に影響力あり\n②過去の案件実績多数\n③エンゲージメント率が高い',
    '①ファッション・ライフスタイル層にリーチ\n②コスメ案件で高い成果\n③フォロワーとの信頼関係が強い',
    '①若年層への訴求力が高い\n②アクティブなフォロワー多数\n③ブランド親和性が高い',
    '①幅広い年齢層にリーチ可能\n②複数ジャンルで実績あり\n③継続案件での成果実績',
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function dummyPriceRange() {
  const ranges = ['50-100万円', '100-200万円', '30-50万円', '20-30万円', '10-20万円'];
  return ranges[Math.floor(Math.random() * ranges.length)];
}

// Process lines
const processedLines = lines.map((line, index) => {
  // Skip header rows (first 2 lines)
  if (index < 2) {
    return line;
  }

  // Skip empty lines
  if (!line.trim()) {
    return line;
  }

  // Parse CSV line
  const cols = line.split(',').map(col => col.trim());

  if (cols.length < 26) {
    console.warn(`⚠️  Line ${index + 1} has only ${cols.length} columns, skipping`);
    return line;
  }

  // Replace sensitive data (0-indexed)
  // Column 11-13: 出稿費（税抜）
  cols[10] = randomPrice(500000, 3000000).toLocaleString(); // Story price
  cols[11] = randomPrice(300000, 2000000).toLocaleString(); // Feed price
  cols[12] = randomPrice(400000, 2500000).toLocaleString(); // Reel price

  // Column 17: 想定クリック数
  cols[16] = randomClicks().toLocaleString();

  // Column 18: 案件実績
  cols[17] = randomAchievements();

  // Column 21: 備考
  cols[20] = `"${dummyRemark()}"`;

  // Column 26: 獲得できたオファー価格帯
  cols[25] = dummyPriceRange();

  return cols.join(',');
});

// Write back
const outputContent = processedLines.join('\n');
fs.writeFileSync(csvPath, outputContent, 'utf-8');

console.log('✅ Anonymization complete!');
console.log(`📝 Processed ${lines.length - 2} data rows`);
console.log(`💾 Written to: ${csvPath}`);
