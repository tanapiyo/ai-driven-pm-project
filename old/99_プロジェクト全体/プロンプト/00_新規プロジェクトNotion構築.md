# 新規プロジェクト Notion ページ構築プロンプト

## 目的

新規プロジェクトの開始時に、Notion上にプロジェクト管理用のページ構造を自動生成する。

---

## インプット

1. **プロジェクト基本情報**
   - プロジェクト名
   - 顧客名
   - 契約金額 (万円)
   - 契約形態 (請負/準委任/ハイブリッド)
   - 開始日 (YYYY/MM/DD)
   - 終了予定日 (YYYY/MM/DD)
   - PM、エンジニア、営業の担当者名
   - リポジトリURL (あれば)

2. **Notion構造定義ファイル** (必須)
   - `99_プロジェクト全体/notion-structure.json` - ページ階層構造
   - `99_プロジェクト全体/notion-templates-mapping.json` - テンプレート変換ルール

3. **プロジェクト計画書** (オプション)
   - `01_要求分析/テンプレート/プロジェクト計画書.md` の内容

---

## 出力指示

### 1. Notion ワークスペースに以下を作成

#### 1-1. プロジェクト基本情報DBへの新規エントリ作成

```
データベース名: プロジェクト基本情報
エントリー内容:
- プロジェクト名: {ユーザー入力}
- 顧客名: {ユーザー入力}
- 契約金額: {ユーザー入力}
- 契約形態: {ユーザー入力}
- 開始日: {ユーザー入力}
- 終了予定日: {ユーザー入力}
- フェーズ: 要求分析 (デフォルト)
- PM: {ユーザー入力}
- エンジニア: {ユーザー入力}
- 営業: {ユーザー入力}
- リポジトリURL: {ユーザー入力}
```

#### 1-2. プロジェクト専用TOPページの作成

以下の構造でページを作成する:

```
📁 {プロジェクト名}
├── 📋 基本情報
│   ├── プロジェクト名: {プロジェクト名}
│   ├── 顧客名: {顧客名}
│   ├── 契約金額: {契約金額}万円
│   ├── 契約形態: {契約形態}
│   ├── 期間: {開始日} 〜 {終了予定日}
│   ├── PM: {PM名}
│   ├── エンジニア: {エンジニア名}
│   ├── 営業: {営業名}
│   ├── リポジトリURL: {URL}
│   └── 定例日程:
│       - 週次定例: 毎週○曜日 ○時〜
│       - レビュー会: 月1回 第○週○曜日
│
├── 📂 資料一覧
│   ├── 📁 要求定義フェーズ成果物
│   │   ├── プロジェクト計画書
│   │   ├── AS-Is業務フロー
│   │   ├── To-Be業務フロー
│   │   └── 提案資料
│   └── 📁 要件定義資料
│       ├── 要件定義書
│       ├── 見積もり
│       └── WBS
│
├── 📁 定例
│   └── [議事録DBのリンクドビュー]
│       フィルタ: プロジェクト = {このプロジェクト}
│       ソート: 会議日 (降順)
│
├── 📁 開発向け資料
│   ├── 📁 詳細設計資料
│   │   ├── API設計
│   │   ├── DB設計
│   │   ├── システム構成図
│   │   ├── 運用設計
│   │   ├── 画面設計
│   │   └── 帳票設計
│   ├── 📁 テスト資料
│   │   ├── テスト計画書
│   │   ├── テスト観点一覧
│   │   ├── 機能テストケース
│   │   ├── 非機能テストケース
│   │   └── 検収計画書
│   ├── リポジトリURL: {リポジトリURL}
│   ├── APIキー、アカウント一覧
│   └── Google Driveリンク
│
└── 📊 開発フェーズ
    ├── [質問管理DBのリンクドビュー]
    │   フィルタ: プロジェクト = {このプロジェクト}
    │   デフォルトビュー: 未回答ビュー (Open/In Progress)
    │
    ├── [変更管理DBのリンクドビュー]
    │   フィルタ: プロジェクト = {このプロジェクト}
    │   デフォルトビュー: 承認待ち + 対応中
    │
    ├── [リスク管理DBのリンクドビュー]
    │   フィルタ: プロジェクト = {このプロジェクト}
    │   デフォルトビュー: リスク値降順 (高リスク優先)
    │
    └── [進捗レポートDBのリンクドビュー]
        フィルタ: プロジェクト = {このプロジェクト}
        デフォルトビュー: 報告週降順 (最新が上)
```

---

## 作成ガイドライン

### 0. 構造定義ファイルの理解

プロンプト実行前に、以下のファイルを読み込んで理解する:

#### notion-structure.json の構造

```json
{
  "title": "TOP",
  "type": "page",
  "icon": "🏢",
  "children": [
    {
      "title": "基本情報",
      "type": "page",
      "icon": "📋",
      "children": [
        {
          "title": "案件概要",
          "type": "page",
          "icon": "📝",
          "template": "project-overview-inline-table"
        }
      ]
    }
  ]
}
```

- **title**: Notionページのタイトル
- **type**: `page` (通常ページ) または `database` (データベースページ)
- **icon**: ページアイコン (絵文字)
- **template**: `notion-templates-mapping.json` で定義されたテンプレート名
- **children**: 子ページの配列 (再帰構造)

#### notion-templates-mapping.json の構造

```json
{
  "templates": {
    "project-overview-inline-table": {
      "type": "static_page",
      "content_type": "inline_table",
      "blocks": [
        { "type": "heading_1", "content": "案件概要" },
        { "type": "table", "headers": ["項目", "内容"], "rows": [...] }
      ]
    },
    "meeting-minutes-database": {
      "type": "database",
      "database_type": "table",
      "properties": {
        "会議名": { "type": "title" },
        "日付": { "type": "date" }
      }
    }
  }
}
```

- **static_page**: 固定コンテンツのページ (テーブル、テキストなど)
- **database**: データベースページ (プロパティ定義を含む)
- **blocks**: Notionブロックの配列
- **properties**: データベースのプロパティ定義

### 1. プロジェクト基本情報の確認

ユーザーから以下の情報を収集する:

```
【プロジェクト基本情報】
プロジェクト名:
顧客名:
契約金額: 万円
契約形態: (請負/準委任/ハイブリッド)
開始日: YYYY/MM/DD
終了予定日: YYYY/MM/DD
PM:
エンジニア:
営業:
リポジトリURL: (あれば)
```

### 2. Notion MCPでの操作手順

#### Step 1: 構造定義ファイルの読み込み

```javascript
// notion-structure.json を読み込んでページ階層を把握
const structure = JSON.parse(readFile("99_プロジェクト全体/notion-structure.json"));

// notion-templates-mapping.json を読み込んでテンプレート変換ルールを把握
const templateMappings = JSON.parse(readFile("99_プロジェクト全体/notion-templates-mapping.json"));
```

#### Step 2: プロジェクト基本情報DBにエントリ作成

```javascript
// Notion MCP の create_page ツールを使用
{
  "parent": { "database_id": "{プロジェクト基本情報DB ID}" },
  "properties": {
    "プロジェクト名": { "title": [{ "text": { "content": "{プロジェクト名}" } }] },
    "顧客名": { "rich_text": [{ "text": { "content": "{顧客名}" } }] },
    "契約金額": { "number": {契約金額} },
    "契約形態": { "select": { "name": "{契約形態}" } },
    "開始日": { "date": { "start": "{開始日}" } },
    "終了予定日": { "date": { "start": "{終了予定日}" } },
    "フェーズ": { "status": { "name": "要求分析" } }
  }
}
```

#### Step 3: プロジェクトTOPページの作成

`notion-structure.json` の構造に従ってページツリーを再帰的に作成する。

##### 3-1. TOPページ作成

```javascript
// Notion MCP の create_page ツールを使用
{
  "parent": { "page_id": "{親ページID または workspace}" },
  "properties": {
    "title": { "title": [{ "text": { "content": "{プロジェクト名}" } }] }
  },
  "icon": { "emoji": "🏢" }
}
```

##### 3-2. 子ページの再帰的作成

`notion-structure.json` の `children` 配列を走査し、各ページを作成:

```javascript
function createPageRecursively(parentId, nodeData) {
  // ページの種類に応じて処理を分岐
  if (nodeData.type === "page") {
    // 通常ページの作成
    const pageId = createPage({
      parent: { page_id: parentId },
      icon: { emoji: nodeData.icon },
      properties: {
        title: { title: [{ text: { content: nodeData.title } }] }
      },
      children: convertTemplate(nodeData.template, templateMappings)
    });

    // 子ページがあれば再帰的に作成
    if (nodeData.children) {
      nodeData.children.forEach(child => {
        createPageRecursively(pageId, child);
      });
    }

  } else if (nodeData.type === "database") {
    // データベースページの作成
    const dbId = createDatabase({
      parent: { page_id: parentId },
      title: [{ text: { content: nodeData.title } }],
      icon: { emoji: nodeData.icon },
      properties: getDatabaseProperties(nodeData.template, templateMappings)
    });
  }
}

// TOPページの全子要素を作成
structure.children.forEach(child => {
  createPageRecursively(topPageId, child);
});
```

##### 3-3. テンプレート変換処理

`notion-templates-mapping.json` のルールに従ってMarkdownをNotionブロックに変換:

```javascript
function convertTemplate(templateName, mappings) {
  if (!templateName) return [];

  const mapping = mappings.templates[templateName];
  if (!mapping) return [];

  if (mapping.type === "static_page") {
    // 静的ページテンプレート (例: project-overview-inline-table)
    return mapping.blocks.map(block => convertBlock(block));

  } else if (mapping.type === "database") {
    // データベーステンプレート (例: meeting-minutes-database)
    // プロパティ定義を返す
    return null; // データベースは別処理
  }
}

function convertBlock(blockData) {
  switch (blockData.type) {
    case "heading_1":
      return { heading_1: { rich_text: [{ text: { content: blockData.content } }] } };
    case "heading_2":
      return { heading_2: { rich_text: [{ text: { content: blockData.content } }] } };
    case "table":
      return { table: {
        table_width: blockData.headers.length,
        has_column_header: true,
        children: [
          // ヘッダー行
          { table_row: { cells: blockData.headers.map(h => [{ text: { content: h } }]) } },
          // データ行
          ...blockData.rows.map(row => ({
            table_row: { cells: row.map(cell => [{ text: { content: cell } }]) }
          }))
        ]
      } };
    case "paragraph":
      return { paragraph: { rich_text: [{ text: { content: blockData.content } }] } };
    case "bulleted_list_item":
      return { bulleted_list_item: { rich_text: [{ text: { content: blockData.content } }] } };
    case "callout":
      return { callout: { rich_text: [{ text: { content: blockData.content } }] } };
    default:
      return null;
  }
}

function getDatabaseProperties(templateName, mappings) {
  const dbMapping = mappings.templates[templateName];
  if (!dbMapping || dbMapping.type !== "database") return {};

  return dbMapping.properties;
}
```

### 3. リンクドビューのフィルタ設定

各リンクドビューには、プロジェクトでフィルタを設定:

- **質問管理DB**: `プロジェクト = {このプロジェクト}` かつ `ステータス ≠ Closed`
- **変更管理DB**: `プロジェクト = {このプロジェクト}` かつ `ステータス ≠ 完了`
- **リスク管理DB**: `プロジェクト = {このプロジェクト}` かつ `ステータス ≠ 解決済み`
- **進捗報告DB**: `プロジェクト = {このプロジェクト}`

### 4. 初期設定の確認事項

- [ ] プロジェクト基本情報DBにエントリが作成されたか
- [ ] プロジェクトTOPページが作成されたか
- [ ] 基本情報セクションに必要な情報が入力されているか
- [ ] 資料一覧のフォルダ構造が作成されたか
- [ ] 各管理DBのリンクドビューが正しく表示されているか
- [ ] リンクドビューのフィルタが適用されているか

---

## チェックリスト

### 実行前チェック

- [ ] プロジェクト名が決まっているか
- [ ] 顧客名が確定しているか
- [ ] 契約情報(金額、形態、期間)が明確か
- [ ] PM、エンジニア、営業の担当者が決まっているか
- [ ] Notion ワークスペースへのアクセス権があるか
- [ ] 必要なデータベース(プロジェクト基本情報、質問管理、変更管理、リスク管理、議事録、進捗報告)が存在するか
- [ ] `notion-structure.json` を読み込んでページ階層構造を理解したか
- [ ] `notion-templates-mapping.json` を読み込んでテンプレート変換ルールを理解したか

### 実行後チェック

- [ ] プロジェクト基本情報DBに新規エントリが作成された
- [ ] プロジェクトTOPページが作成され、正しい構造になっている
- [ ] 基本情報セクションに全情報が入力されている
- [ ] 資料一覧のフォルダが作成されている
- [ ] 質問管理DBのリンクドビューが表示され、フィルタが動作している
- [ ] 変更管理DBのリンクドビューが表示され、フィルタが動作している
- [ ] リスク管理DBのリンクドビューが表示され、フィルタが動作している
- [ ] 進捗報告DBのリンクドビューが表示され、フィルタが動作している
- [ ] 議事録DBのリンクドビューが表示され、フィルタが動作している

---

## 補足事項

### Notion API 制限への対応

- ページ作成は一度に最大100ブロックまで
- 複雑な構造の場合は、段階的に作成する
- リンクドビューは手動でフィルタ調整が必要な場合がある

### テンプレート化の推奨

- このプロンプトで生成した構造をNotionテンプレートとして保存しておくと、次回以降は手動でも素早く作成可能
- Notion MCPが利用できない環境でも対応できる

---

## 関連ドキュメント

- [Notion DB構造設計](../Notion_DB構造設計.md) - データベースのプロパティ定義
- [Notion構造定義JSON](../notion-structure.json) - **ページ階層構造の定義**
- [Notionテンプレートマッピング JSON](../notion-templates-mapping.json) - **Markdown→Notion変換ルール**
- [プロジェクト計画書テンプレート](../../01_要求分析/テンプレート/プロジェクト計画書.md)
- [Notion構成](../Notion構成.md) - 構成の概要説明

---

**作成日:** 2025/10/26
**最終更新日:** 2025/10/26
