#!/usr/bin/env python3
"""
@what CSV内の機密データをダミーデータに置き換える
@why 実際の料金や実績データを公開リポジトリに含めないため
"""

import csv
import random
import os

csv_path = os.path.join(os.path.dirname(__file__), '../demo-data-source/master_sample.csv')

print(f'📂 Reading CSV from: {csv_path}')

def random_price(min_val, max_val):
    return f'{random.randint(min_val, max_val):,}'

def random_clicks():
    return f'{random.randint(500, 10000):,}'

def random_achievements():
    num = random.randint(1, 100)
    return f'案件実績{num}件'

def dummy_remark():
    templates = [
        '①20代〜30代の美容関心層に影響力あり\n②過去の案件実績多数\n③エンゲージメント率が高い',
        '①ファッション・ライフスタイル層にリーチ\n②コスメ案件で高い成果\n③フォロワーとの信頼関係が強い',
        '①若年層への訴求力が高い\n②アクティブなフォロワー多数\n③ブランド親和性が高い',
        '①幅広い年齢層にリーチ可能\n②複数ジャンルで実績あり\n③継続案件での成果実績',
    ]
    return random.choice(templates)

def dummy_price_range():
    ranges = ['50-100万円', '100-200万円', '30-50万円', '20-30万円', '10-20万円']
    return random.choice(ranges)

# Read CSV with proper handling of multi-line fields
rows = []
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        rows.append(row)

print(f'✅ Found {len(rows)} rows')

# Process rows
processed_rows = []
for i, row in enumerate(rows):
    # Skip header rows (first 2 rows)
    if i < 2:
        processed_rows.append(row)
        continue

    # Skip if not enough columns
    if len(row) < 26:
        print(f'⚠️  Row {i + 1} has only {len(row)} columns, skipping')
        processed_rows.append(row)
        continue

    # Replace sensitive data (0-indexed)
    # Column 11-13: 出稿費（税抜）
    row[10] = random_price(500000, 3000000)
    row[11] = random_price(300000, 2000000)
    row[12] = random_price(400000, 2500000)

    # Column 17: 想定クリック数
    row[16] = random_clicks()

    # Column 18: 案件実績
    row[17] = random_achievements()

    # Column 21: 備考
    row[20] = dummy_remark()

    # Column 26: 獲得できたオファー価格帯
    row[25] = dummy_price_range()

    processed_rows.append(row)

# Write back
with open(csv_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(processed_rows)

print('✅ Anonymization complete!')
print(f'📝 Processed {len(rows) - 2} data rows')
print(f'💾 Written to: {csv_path}')
