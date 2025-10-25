# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an **AI-driven Project Management toolkit** for IT consulting projects, specifically designed for small-to-medium BPR (Business Process Re-engineering) projects (¥5-10M, 3-6 months). The repository contains templates, prompts, and workflow guides to help project managers conduct requirements gathering, analysis, design, and delivery with AI assistance.

### Project Methodology

- **Contract type**: Direct with end clients
- **Development approach**: Waterfall-based
- **Team size**: PM (1) + Engineer (1) + Sales (1), all using AI
- **Target**: B2B business systems focused on operational improvement and cost reduction

### Key Gate Reviews

The project workflow includes 5 major approval gates:
1. **Requirements Agreement Gate**: Problem recognition, requirements list v1, open issues prioritized
2. **Requirements Freeze Gate**: Requirements doc v1 approved, non-functional requirements agreed, estimates/WBS approved
3. **Design Approval Gate**: Interface/DB/UI samples approved, requirements-design alignment verified
4. **Acceptance Prep Gate**: Test coverage complete, traceability verified
5. **Final Acceptance Gate**: Acceptance criteria met, deliverables and operational docs confirmed

## Actual Repository Structure

The repository is organized by **project phase**, not by document type:

```
ai-driven-pm-project/
├── 00_docs/                          # Project methodology guides
│   ├── ヒアリングマイルストーン_プロジェクト立ち上げフェーズ.md
│   └── 要件定義フェーズ_顧客コミュニケーションマイルストーン.md
│
├── 01_要求分析/                      # Phase 1: Requirements Analysis
│   ├── プロンプト/v1/
│   │   ├── 議事録から不明点抽出プロンプト.md
│   │   ├── プロジェクト計画書作成プロンプト.md
│   │   ├── 課題整理プロンプト.md
│   │   ├── 概算マイルストーン作成プロンプト.md
│   │   └── 使用システム・帳票リスト作成プロンプト.md
│   └── テンプレート/
│       ├── プロジェクト計画書テンプレート.md
│       └── 業務フロー作成テンプレートパック/
│           ├── 業務フロー作成ガイド.md
│           ├── 業務詳細書テンプレート.md
│           └── チェックリストテンプレート.md
│
├── 02_要件定義/                      # Phase 2: Requirements Definition
│   ├── プロンプト/
│   │   ├── 00_既存システムデータヒアリング整理プロンプト.md
│   │   ├── 01_要件定義書作成プロンプト.md
│   │   ├── 02_機能一覧作成プロンプト.md
│   │   ├── 03_ユースケース作成プロンプト.md
│   │   ├── 04_画面遷移IF作成プロンプト.md
│   │   ├── 05_非機能要件チェックリスト作成プロンプト.md
│   │   ├── 07_見積書作成プロンプト.md
│   │   └── 08_WBS作成プロンプト.md
│   │   (Note: 06_ is missing - not yet created)
│   └── テンプレート/
│       ├── 00_既存システム構成整理テンプレート.md
│       ├── 00_既存データ整理テンプレート.md
│       ├── 00_外部IF一覧テンプレート.md
│       ├── 01_要件定義書テンプレート.md
│       ├── 02_機能一覧テンプレート.md
│       ├── 03_ユースケーステンプレート.md
│       ├── 04_画面遷移テンプレート.md
│       ├── 05_非機能要件テンプレート.md
│       ├── 07_見積書テンプレート.md
│       └── 08_WBSテンプレート.md
│
├── 03_開発工程/                      # Phase 3: Design & Development Prep
│   ├── プロンプト/
│   │   ├── システム構成図_プロンプト.md
│   │   ├── DB設計_プロンプト.md
│   │   ├── API設計_プロンプト.md
│   │   ├── 画面設計_プロンプト.md
│   │   ├── 帳票設計_プロンプト.md
│   │   └── 運用設計_プロンプト.md
│   └── テンプレート/
│       ├── システム構成図.md
│       ├── DB設計.md
│       ├── API設計.md
│       ├── 画面設計.md
│       ├── 帳票設計.md
│       └── 運用設計.md
│
├── 04_テスト/                        # Phase 4: Testing
│   ├── プロンプト/
│   │   ├── テスト計画書_プロンプト.md
│   │   ├── テスト観点一覧_プロンプト.md
│   │   ├── 機能テストケース_プロンプト.md
│   │   ├── 非機能テストケース_プロンプト.md
│   │   └── テスト結果報告書_プロンプト.md
│   └── テンプレート/
│       ├── テスト計画書.md
│       ├── テスト観点一覧.md
│       ├── 機能テストケース.md
│       ├── 非機能テストケース.md
│       ├── テスト結果報告書.md
│       ├── テストケース_テンプレート.md
│       ├── 受入基準書_テンプレート.md
│       └── 検収計画書_テンプレート.md
│
├── 05_進捗報告/                      # Progress Tracking
│   ├── プロンプト/
│   │   ├── 進捗報告書自動生成プロンプト.md
│   │   ├── Git履歴から進捗レポート自動生成プロンプト.md
│   │   ├── 遅延リスク判定プロンプト.md
│   │   ├── 課題リスク分析プロンプト.md
│   │   └── 次週計画生成プロンプト.md
│   └── テンプレート/
│       └── 週次進捗報告書_テンプレート.md
│
└── 99_プロジェクト全体/              # Project-wide documents
    ├── 質問管理表_テンプレート.md
    └── Notion構成.md
```

## Key File Path Patterns

### Within prompts, templates are referenced as:
- `{phase}/テンプレート/{template_name}.md`
- Example: `02_要件定義/テンプレート/01_要件定義書テンプレート.md`

### Cross-phase references:
- Requirements prompts → `01_要求分析/テンプレート/` for business flows
- Design prompts → `02_要件定義/テンプレート/` for requirements
- Test prompts → `03_開発工程/テンプレート/` for design specs

### Important: Template Naming Convention
- Templates use numbering (00_, 01_, 02_, etc.) to indicate workflow order
- Prompts match template numbers for easy correlation
- Note: 06_ series is intentionally missing in requirements phase

## Workflow Phases

### Phase 1: Requirements Gathering & Analysis (1 month, 4 meetings)

**Week 1**: Project background, goals, expected impact → Draft project plan
**Week 2**: Current processes and pain points → As-Is flow + issue list
**Week 3**: Improved process design + KPIs → To-Be flow + KPI list
**Week 4**: Final review and approval → All deliverables approved

**Key artifacts**:
- Project plan: `01_要求分析/テンプレート/プロジェクト計画書テンプレート.md`
- Business flows: `01_要求分析/テンプレート/業務フロー作成テンプレートパック/`
- Pain points list (generated via prompt)

**Primary prompts**:
- `01_要求分析/プロンプト/v1/議事録から不明点抽出プロンプト.md`
- `01_要求分析/プロンプト/v1/課題整理プロンプト.md` (pain point analysis)
- `01_要求分析/プロンプト/v1/プロジェクト計画書作成プロンプト.md`

### Phase 2: Requirements Definition (1-2 months, 6 meetings)

From To-Be flows, generate:
- Feature list → `02_機能一覧テンプレート.md`
- Use cases → `03_ユースケーステンプレート.md`
- Screen transitions → `04_画面遷移テンプレート.md`
- Non-functional requirements → `05_非機能要件テンプレート.md`
- Estimate → `07_見積書テンプレート.md`
- WBS → `08_WBSテンプレート.md`

**Key workflow**:
1. Use `00_既存システムデータヒアリング整理プロンプト.md` to gather existing system info
2. Use `01_要件定義書作成プロンプト.md` to consolidate all requirements
3. Generate estimates with confidence tags (Rough/Medium/Firm)

### Phase 3: Design & Development Prep (1-2 months)

**Order of operations**:
1. System architecture → `システム構成図_プロンプト.md`
2. Database design → `DB設計_プロンプト.md`
3. API design → `API設計_プロンプト.md`
4. UI design → `画面設計_プロンプト.md`
5. Report design → `帳票設計_プロンプト.md`
6. Operations design → `運用設計_プロンプト.md`

**Important**: Each design prompt references requirements from Phase 2 and may reference other design outputs.

### Phase 4: Development & Testing (2-3 months)

**Test document generation order**:
1. Test plan → `テスト計画書_プロンプト.md`
2. Test perspectives → `テスト観点一覧_プロンプト.md`
3. Functional test cases → `機能テストケース_プロンプト.md`
4. Non-functional test cases → `非機能テストケース_プロンプト.md`
5. Test results report → `テスト結果報告書_プロンプト.md`

**Progress tracking**:
- Weekly reports using Git history: `Git履歴から進捗レポート自動生成プロンプト.md`
- Delay risk detection: `遅延リスク判定プロンプト.md`

### Phase 5: Delivery

Uses templates from Phase 4:
- `受入基準書_テンプレート.md`
- `検収計画書_テンプレート.md`

## Key Conventions

### Business Process Documentation

1. **Create markdown first**: Use business flow templates in `01_要求分析/テンプレート/業務フロー作成テンプレートパック/`
2. **Convert to UML**: Business flow templates include guidance for PlantUML/Mermaid conversion
3. **Separate As-Is and To-Be**: Always maintain both current and future state flows

### Pain Point Analysis

Use 2x2 matrix for prioritization (via `課題整理プロンプト.md`):
- **Impact** (High/Medium/Low) × **Ease of improvement** (Easy/Medium/Hard)
- Results in 4 quadrants: S (top priority), A (phased approach), B (quick wins), C (defer)

### Estimate Confidence Tags

Estimates use precision tags:
- **Rough**: ±50%, early assumptions
- **Medium**: ±30%, after initial analysis
- **Firm**: ±10%, detailed understanding

### Client Communication Philosophy

- **Avoid technical jargon**: All prompts emphasize "生活者向けの言葉" (everyday language)
- **Provide options**: Always offer 2-3 alternatives (Plan A/B/C with cost/scope/timeline tradeoffs)
- **Visual aids**: Prompts recommend Miro/FigJam for collaboration, Figma for UI mockups
- **Decision proposals**: Don't ask open-ended questions; provide structured choices

### Document Generation Workflow

Each prompt file contains:
1. **目的** (Purpose): What the document achieves
2. **インプット** (Inputs): Required documents with file paths
3. **出力指示** (Output instructions): Template to use
4. **作成ガイドライン** (Creation guidelines): Step-by-step instructions
5. **チェックリスト** (Checklist): Validation criteria

### Requirements Traceability

Critical path through documents:
```
Business Requirements (Phase 1)
  → Functional Requirements (Phase 2: 機能一覧)
    → Use Cases (Phase 2: ユースケース)
      → Screen Design (Phase 3: 画面設計)
        → Test Cases (Phase 4: テストケース)
```

## Common Workflows

### Creating a New Project Plan
```bash
# Input: Meeting minutes from Week 1-4
# Use: 01_要求分析/プロンプト/v1/プロジェクト計画書作成プロンプト.md
# Output: Populated プロジェクト計画書テンプレート.md
```

### Converting Business Flow to Requirements
```bash
# Input: To-Be business flow from Phase 1
# Use: 02_要件定義/プロンプト/02_機能一覧作成プロンプト.md
# Output: 02_機能一覧テンプレート.md with features extracted
```

### Generating Design from Requirements
```bash
# Input: 01_要件定義書テンプレート.md (from Phase 2)
# Use: 03_開発工程/プロンプト/DB設計_プロンプト.md
# Output: 03_開発工程/テンプレート/DB設計.md
```

### Creating Test Cases from Design
```bash
# Input: Design docs from 03_開発工程/テンプレート/
# Use: 04_テスト/プロンプト/機能テストケース_プロンプト.md
# Output: 04_テスト/テンプレート/機能テストケース.md
```

## File Path Corrections

When updating prompts to reference templates or other documents:

1. **Phase-based paths**: Always use `{phase_number}_{phase_name}/` format
2. **Template references**: Use `テンプレート/{filename}` within the same phase
3. **Cross-phase references**: Use full relative path from repository root
4. **Output destinations**: Match the template location, not a temporary folder

**Incorrect patterns to avoid**:
- `詳細設計tmp/` (old structure, no longer exists)
- `testtmp/` (old structure, no longer exists)
- `/テンプレート/` (flat structure, no longer used)
- `/プロンプト/` (flat structure, no longer used)

## Important Notes

- All templates and prompts are in **Japanese** to match client communication
- Templates use **markdown format** for easy version control and AI processing
- UML diagrams support both **PlantUML** (standard UML) and **Mermaid** (GitHub-friendly)
- Progress tracking emphasizes **quantitative metrics** (%, days, ¥) over qualitative assessments
- File numbering (00_, 01_, etc.) indicates execution order within each phase

## Missing Components (Reference for Future Development)

The following are referenced in documentation but not yet implemented:
- `06_システム導入後業務フロー整理` prompt and template (Phase 2)
- `合意事項・未決事項管理表` template (referenced in multiple prompts)
- `テンプレート準備チェックリスト.md` in `00_docs/`
- Top-level `/テンプレート/` and `/プロンプト/` directories (replaced by phase-based structure)
