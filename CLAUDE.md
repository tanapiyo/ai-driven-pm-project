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
1. **Requirements Agreement Gate** (Phase 1→2): Problem recognition, requirements list v1, open issues prioritized
2. **Requirements Freeze Gate** (Phase 2→3): Requirements doc v1 approved, non-functional requirements agreed, estimates/WBS approved
3. **Design Approval Gate** (Phase 3→4): Interface/DB/UI samples approved, requirements-design alignment verified
4. **Acceptance Prep Gate** (Phase 4→5): Test coverage complete, traceability verified
5. **Final Acceptance Gate** (Phase 5→Complete): Acceptance criteria met, deliverables and operational docs confirmed

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
│   │   ├── 議事録から不明点抽出.md
│   │   ├── プロジェクト計画書作成.md
│   │   ├── ペインポイント整理.md
│   │   ├── 概算マイルストーン作成.md
│   │   └── 使用システム・帳票リスト作成.md
│   └── テンプレート/
│       ├── プロジェクト計画書.md
│       └── 業務フロー作成テンプレートパック/
│           ├── 業務フロー作成ガイド.md
│           ├── 業務詳細書.md
│           └── チェックリスト.md
│
├── 02_要件定義/                      # Phase 2: Requirements Definition
│   ├── プロンプト/
│   │   ├── 00_既存システムデータヒアリング整理.md
│   │   ├── 01_要件定義書作成.md
│   │   ├── 02_機能一覧作成.md
│   │   ├── 03_ユースケース作成.md
│   │   ├── 04_画面遷移IF作成.md
│   │   ├── 05_非機能要件チェックリスト作成.md
│   │   ├── 07_見積書作成.md
│   │   └── 08_WBS作成.md
│   │   (Note: 06_ is missing - not yet created)
│   └── テンプレート/
│       ├── 00_既存システム構成整理.md
│       ├── 00_既存データ整理.md
│       ├── 00_外部IF一覧.md
│       ├── 01_要件定義書.md
│       ├── 02_機能一覧.md
│       ├── 03_ユースケース.md
│       ├── 04_画面遷移.md
│       ├── 05_非機能要件.md
│       ├── 07_見積書.md
│       └── 08_WBS.md
│
├── 03_開発工程/                      # Phase 3: Design & Development Prep
│   ├── プロンプト/
│   │   ├── システム構成図.md
│   │   ├── DB設計.md
│   │   ├── API設計.md
│   │   ├── 画面設計.md
│   │   ├── 帳票設計.md
│   │   └── 運用設計.md
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
│   │   ├── テスト計画書.md
│   │   ├── テスト観点一覧.md
│   │   ├── 機能テストケース.md
│   │   ├── 非機能テストケース.md
│   │   ├── テスト結果報告書.md
│   │   └── 検収計画書作成.md
│   └── テンプレート/
│       ├── テスト計画書.md
│       ├── テスト観点一覧.md
│       ├── 機能テストケース.md
│       ├── 非機能テストケース.md
│       ├── テスト結果報告書.md
│       ├── テストケース.md
│       ├── 受入基準書.md
│       └── 検収計画書.md
│
├── 05_進捗報告/                      # Progress Tracking
│   ├── プロンプト/
│   │   ├── 進捗報告書自動生成.md
│   │   ├── Git履歴から進捗レポート自動生成.md
│   │   ├── 遅延リスク判定.md
│   │   ├── 課題リスク分析.md
│   │   └── 次週計画生成.md
│   └── テンプレート/
│       └── 週次進捗報告書.md
│
└── 99_プロジェクト全体/              # Project-wide documents
    ├── プロンプト/                    # Cross-phase prompts
    ├── 質問管理表.md
    ├── 変更管理表.md
    ├── リスク管理表_テンプレート.md
    ├── Notion構成.md
    ├── Notion_DB構造設計.md
    └── notion-*.json                  # Notion integration configs
```

## Key File Path Patterns

### Within prompts, templates are referenced as:
- `{phase}/テンプレート/{template_name}.md`
- Example: `02_要件定義/テンプレート/01_要件定義書.md`

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
- Project plan: `01_要求分析/テンプレート/プロジェクト計画書.md`
- Business flows: `01_要求分析/テンプレート/業務フロー作成テンプレートパック/`
- Pain points list (generated via prompt)

**Primary prompts**:
- `01_要求分析/プロンプト/v1/議事録から不明点抽出.md`
- `01_要求分析/プロンプト/v1/ペインポイント整理.md` (pain point analysis)
- `01_要求分析/プロンプト/v1/プロジェクト計画書作成.md`

### Phase 2: Requirements Definition (1-2 months, 6 meetings)

From To-Be flows, generate:
- Feature list → `02_機能一覧.md`
- Use cases → `03_ユースケース.md`
- Screen transitions → `04_画面遷移.md`
- Non-functional requirements → `05_非機能要件.md`
- Estimate → `07_見積書.md`
- WBS → `08_WBS.md`

**Key workflow**:
1. Use `00_既存システムデータヒアリング整理.md` to gather existing system info
2. Use `01_要件定義書作成.md` to consolidate all requirements
3. Generate estimates with confidence tags (Rough/Medium/Firm)

### Phase 3: Design & Development Prep (1-2 months)

**Order of operations**:
1. System architecture → `システム構成図.md`
2. Database design → `DB設計.md`
3. API design → `API設計.md`
4. UI design → `画面設計.md`
5. Report design → `帳票設計.md`
6. Operations design → `運用設計.md`

**Important**: Each design prompt references requirements from Phase 2 and may reference other design outputs.

### Phase 4: Development & Testing (2-3 months)

**Test document generation order**:
1. Test plan → `テスト計画書.md`
2. Test perspectives → `テスト観点一覧.md`
3. Functional test cases → `機能テストケース.md`
4. Non-functional test cases → `非機能テストケース.md`
5. Test results report → `テスト結果報告書.md`

**Progress tracking**:
- Weekly reports using Git history: `Git履歴から進捗レポート自動生成.md`
- Delay risk detection: `遅延リスク判定.md`

### Phase 5: Delivery

Uses templates from Phase 4:
- `受入基準書.md`
- `検収計画書.md`

## Key Conventions

### Business Process Documentation

1. **Create markdown first**: Use business flow templates in `01_要求分析/テンプレート/業務フロー作成テンプレートパック/`
2. **Convert to UML**: Business flow templates include guidance for PlantUML/Mermaid conversion
3. **Separate As-Is and To-Be**: Always maintain both current and future state flows

### Pain Point Analysis

Use 2x2 matrix for prioritization (via `ペインポイント整理.md`):
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

### Prompt File Structure

Each prompt file follows a consistent 5-section structure:

1. **目的** (Purpose): What the document achieves and why it's needed
2. **インプット** (Inputs): Required input documents with explicit file paths
3. **出力指示** (Output instructions): Template file path to populate
4. **作成ガイドライン** (Creation guidelines): Step-by-step AI instructions
5. **チェックリスト** (Checklist): Validation criteria before completion

**Example prompt usage pattern**:
```markdown
# Input: [読み込むべきファイル]
01_要求分析/テンプレート/業務フロー作成テンプレートパック/業務詳細書.md

# Prompt: [実行するプロンプト]
02_要件定義/プロンプト/02_機能一覧作成.md

# Output: [生成先テンプレート]
02_要件定義/テンプレート/02_機能一覧.md
```

### Requirements Traceability

Critical path through documents:
```
Business Requirements (Phase 1)
  → Functional Requirements (Phase 2: 機能一覧)
    → Use Cases (Phase 2: ユースケース)
      → Screen Design (Phase 3: 画面設計)
        → Test Cases (Phase 4: テストケース)
```

## Working with This Repository

### Navigation Commands

```bash
# List all prompts in a phase
ls {phase}/プロンプト/

# Find all templates across phases
find . -name "*.md" -path "*/テンプレート/*"

# Search for specific document references
grep -r "機能一覧" --include="*.md"

# View phase README for workflow guidance
cat {phase}/README.md
```

### Common Development Tasks

#### Creating/Updating Prompt Files

When creating or modifying prompts:
1. Follow the 5-section structure (目的/インプット/出力指示/作成ガイドライン/チェックリスト)
2. Use explicit file paths relative to repository root
3. Reference the correct template in the same or downstream phase
4. Validate against [document-dependencies.md](document-dependencies.md)

#### Validating Document Dependencies

Use [document-dependencies.md](document-dependencies.md) to verify:
- **Traceability**: Requirements → Features → Design → Tests
- **Consistency**: IDs, names, and counts match across documents
- **Completeness**: All required inputs are generated before downstream documents

#### Bulk Path Corrections

When file paths need updating across multiple prompts:
```bash
# Preview changes
grep -r "old_path" {phase}/プロンプト/

# Use Edit tool to update each file individually
# Avoid sed/awk - use Edit tool for precise replacements
```

## Common Workflows

### Phase 1: Creating a Project Plan
```text
Input:  Meeting minutes (Week 1-4 interviews)
Prompt: 01_要求分析/プロンプト/v1/プロジェクト計画書作成.md
Output: 01_要求分析/テンプレート/プロジェクト計画書.md (populated)
```

### Phase 2: Converting Business Flows to Features
```text
Input:  01_要求分析/テンプレート/業務フロー作成テンプレートパック/業務詳細書.md (To-Be)
Prompt: 02_要件定義/プロンプト/02_機能一覧作成.md
Output: 02_要件定義/テンプレート/02_機能一覧.md
```

### Phase 3: Generating Database Design
```text
Input:  02_要件定義/テンプレート/01_要件定義書.md
        02_要件定義/テンプレート/00_既存データ整理.md
Prompt: 03_開発工程/プロンプト/DB設計.md
Output: 03_開発工程/テンプレート/DB設計.md
```

### Phase 4: Creating Test Cases
```text
Input:  02_要件定義/テンプレート/02_機能一覧.md
        03_開発工程/テンプレート/画面設計.md
        03_開発工程/テンプレート/API設計.md
Prompt: 04_テスト/プロンプト/機能テストケース.md
Output: 04_テスト/テンプレート/機能テストケース.md
```

### Cross-Phase: Weekly Progress Report
```text
Input:  Git commit history, WBS progress
Prompt: 05_進捗報告/プロンプト/Git履歴から進捗レポート自動生成.md
Output: 05_進捗報告/テンプレート/週次進捗報告書.md (updated)
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

## Repository-Specific Conventions

### Language and Format

- **All documents in Japanese**: Templates, prompts, and outputs match client communication language
- **Markdown-first**: All documents use `.md` format for version control and AI processing
- **UML flexibility**: Support both PlantUML (standard) and Mermaid (GitHub-friendly) for diagrams

### File Naming and Numbering

- **Number prefixes (00_, 01_, 02_)**: Indicate execution order within each phase
- **Prompt-template matching**: Prompts and templates use matching numbers for correlation
  - Example: `02_機能一覧作成.md` (prompt) → `02_機能一覧.md` (template)
- **Phase prefixes**: `01_`, `02_`, `03_`, etc. indicate project phase
- **v1/ subdirectory**: Phase 1 prompts are versioned in `プロンプト/v1/` subdirectory

### Document Identifiers

All documents use consistent ID patterns for traceability:
- **P-XXX**: Process IDs in business flows
- **機能-XXX** or **F-XXX**: Feature IDs
- **UC-XXX**: Use case IDs
- **画面-XXX** or **SCR-XXX**: Screen IDs
- **API-XXX**: API endpoint IDs
- **TBL-XXX**: Table/Database IDs
- **TC-XXX**: Test case IDs

### Metrics and Estimation

- **Rough**: ±50% precision, early phase estimates
- **Medium**: ±30% precision, after initial analysis
- **Firm**: ±10% precision, detailed understanding
- **Quantitative focus**: Always use %, days, ¥ over qualitative descriptions

### Client Deliverables

- **Options not questions**: Provide Plan A/B/C with tradeoffs, not open-ended questions
- **Plain language**: Avoid technical jargon (e.g., "業務の流れを図にする" not "UMLアクティビティ図")
- **Visual aids**: Recommend Miro/FigJam for collaboration, Figma for UI mockups

## Key Reference Documents

- **[README.md](README.md)**: Project overview, quick start, phase summaries
- **[document-dependencies.md](document-dependencies.md)**: Complete document dependency map and traceability matrix
- **Phase READMEs**: Each `{phase}/README.md` contains detailed phase workflow
- **[00_docs/](00_docs/)**: Methodology guides and milestone definitions

## Known Gaps (Future Development)

The following items are referenced in documentation but not yet created:
- `06_システム導入後業務フロー整理` prompt and template (Phase 2)
- `合意事項・未決事項管理表` template (referenced in prompts)
- Top-level `/テンプレート/` and `/プロンプト/` (legacy structure, replaced by phase-based organization)
