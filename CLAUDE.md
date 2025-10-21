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

## Repository Structure

### `/テンプレート/` - Document Templates

Markdown templates for all project deliverables:
- `プロジェクト計画書.md` - Project plan (goals, ROI, team, milestones, KPIs, QCDS constraints, governance)
- `業務記述書_テンプレート.md` - Business process description (used to generate UML diagrams)
- `要件定義書_テンプレート.md` - Requirements specification (15-chapter structure)
- `WBS_テンプレート.md` - Work breakdown structure
- `見積書_テンプレート.md` - Cost estimate
- `テストケース_テンプレート.md` - Test case specification
- `受入基準書_テンプレート.md` - Acceptance criteria and procedures
- `進捗報告書_テンプレート.md` - Progress report
- `質問管理表_テンプレート.md` - Question tracking
- `合意事項・未決事項管理表.md` - Agreements and open issues tracker

### `/プロンプト/` - AI Prompts

Prompts for generating project artifacts from meeting notes and other inputs:
- `議事録から要点抽出プロンプト.md` - Extract key points from meeting minutes (problems, goals, constraints)
- `議事録から不明点抽出プロンプト.md` - Identify open questions and contradictions
- `業務記述書作成プロンプト.md` - Generate business process descriptions from interviews
- `業務フロー図作成プロンプト.md` - Convert markdown process descriptions to UML (PlantUML/Mermaid)
- `ペインポイント整理プロンプト.md` - Categorize and prioritize pain points with impact/effort matrix
- `プロジェクト計画書作成プロンプト.md` - Generate project plan from all gathered information
- `機能一覧作成プロンプト.md` - Extract feature list from To-Be process flows

### `/00_docs/` - Project Guides

- `ヒアリングマイルストーン_プロジェクト立ち上げフェーズ.md` - 4-week interview plan (weekly meetings) to gather all information for project plan and As-Is/To-Be flows
- `テンプレート準備チェックリスト.md` - Checklist of all templates and tools to prepare before project kickoff

### `/10_ヒアリング/`, `/11_現行業務分析/`, `/12_課題と要求整理/`

Folders for storing actual project artifacts during execution (empty templates).

## Workflow Overview

### Phase 1: Requirements Gathering & Analysis (1 month, 4 meetings)

**Week 1**: Project background, goals, expected impact → Draft project plan
**Week 2**: Current processes and pain points → As-Is flow + issue list
**Week 3**: Improved process design + KPIs → To-Be flow + KPI list
**Week 4**: Final review and approval → All deliverables approved

**Key artifacts**:
- Project plan (goals, ROI, team, milestones, KPIs, governance)
- As-Is business process description (markdown) → UML diagram
- To-Be business process description (markdown) → UML diagram
- Pain points list with priorities

### Phase 2: Requirements Definition

From To-Be flows, generate:
- Feature list
- Use cases
- Screen transitions & interfaces
- Non-functional requirements checklist
- Post-implementation business flows
- Agreements/open issues tracker

Deliverables:
- Requirements specification document
- Cost breakdown (features × tasks × assumptions) with confidence tags
- WBS with critical path and buffers
- Estimate document

### Phase 3: Design & Development Prep

- System architecture diagram
- UI samples (using v0 and Figma)
- Database design
- API design
- Progress tracking templates
- KPI/metrics definitions
- Question management table

### Phase 4: Development & Testing

- Task breakdown
- Test case generation from requirements
- Weekly progress tracking (using Git commits + task completion)
- Risk detection (remaining tasks vs. remaining time)
- Client progress reports (auto-generated)

### Phase 5: Delivery

- Acceptance criteria document
- Acceptance test procedures
- Deliverables inventory
- Operational documentation

## Key Conventions

### Business Process Documentation

1. **Create markdown first**: Use `業務記述書_テンプレート.md` to capture processes in structured markdown
2. **Convert to UML**: Use prompts in `業務フロー図作成プロンプト.md` to generate PlantUML or Mermaid diagrams
3. **Separate As-Is and To-Be**: Always maintain both current and future state flows

### Pain Point Analysis

Use 2x2 matrix for prioritization:
- **Impact** (High/Medium/Low) × **Ease of improvement** (Easy/Medium/Hard)
- Results in 4 quadrants: S (top priority), A (phased approach), B (quick wins), C (defer)

### Client Communication

- **Avoid technical jargon**: Translate all technical terms to business language (see examples in interview milestone guide)
- **Provide options**: Always offer 2-3 alternatives (e.g., Plan A/B/C with different cost/scope/timeline)
- **Visual aids**: Use Miro/FigJam for real-time collaboration, Figma for UI mockups
- **Propose decisions**: Don't ask open-ended questions; provide structured choices based on best practices

### Document Generation Workflow

1. Conduct interview → Record in meeting minutes template
2. Use AI prompts to extract: key points, open questions, pain points
3. Generate business process descriptions (As-Is then To-Be)
4. Convert to UML diagrams
5. Compile everything into project plan
6. Review with client → Iterate based on feedback

## Important Notes

- All templates and prompts are in **Japanese** to match client communication
- Templates use **markdown format** for easy version control and AI processing
- UML diagrams support both **PlantUML** (standard UML) and **Mermaid** (GitHub-friendly)
- Progress tracking emphasizes **quantitative metrics** (%, days, ¥) over qualitative assessments
- Requirements traceability is critical: maintain links from business requirements → functional requirements → design → test cases
