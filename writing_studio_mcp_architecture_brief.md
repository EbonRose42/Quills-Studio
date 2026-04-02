# Writing Studio MCP Architecture Brief

## Purpose

This document is a Codex-ready implementation brief for integrating **Model Context Protocol (MCP)** into a locally run **Writing Studio** that coordinates multiple specialist models for long-form fiction production.

The target system is a desktop-first application that:

- orchestrates multiple local LLMs with distinct roles
- allows the user to move forward and backward through the writing process at will
- maintains continuity across novels and series
- exposes shared tools, retrieval, and project context in a clean, reusable way
- remains extensible without turning every internal feature into infrastructure overhead

This brief assumes the current studio concept uses three local models with rough role alignment:

- **Gemma 3**: generalist, broad reasoning, project-level outlining, summarization
- **EVA-Qwen 2.5**: character, worldbuilding, scene planning, development passes
- **Magnum**: final prose drafting and rewrite passes

These model assignments are not hardcoded truths. They are defaults. The architecture should allow reassignment later.

---

## Executive recommendation

### Core recommendation

The Writing Studio **should use MCP**, but **should not be built around MCP as the central product idea**.

MCP should serve as a **standardized capability layer** between:

- the Writing Studio host/orchestrator
- the project’s stored documents and canon
- retrieval and continuity services
- specialized planning tools
- export and packaging tools

The Writing Studio itself should remain responsible for:

- workflow logic
- user interface
- session state
- project state
- model routing
- queueing and job execution
- checkpointing and revision history
- determining which model is used for which task

### Why this is the right split

MCP is strongest when used to standardize boundaries between the host application and reusable capabilities such as:

- resources (documents, notes, summaries, canon entries)
- tools (search, validate, expand, summarize, export)
- prompts (repeatable workflow templates)

MCP is weaker when overused for:

- every internal function call
- high-frequency in-process logic that does not need standardization
- model-to-model chatter inside a single local app

Therefore:

- Use MCP where interoperability and modularity matter.
- Use ordinary local code where simplicity and performance matter.

---

## What MCP is and why it matters here

MCP is a protocol for exposing model-usable capabilities through a consistent interface. In practice, it lets a host application connect models to:

- files and document stores
- search and retrieval systems
- custom tools
- reusable prompt templates
- external or local services

For this project, MCP is useful because the same writing tools and project memory need to be accessible to multiple specialist models without rebuilding every integration three different ways.

### MCP is not

MCP is not:

- a model
- an agent framework by itself
- a RAG engine
- a replacement for your application architecture
- a substitute for project-specific workflow design

### MCP is

MCP is:

- a standard capability interface
- a way to expose project knowledge and writing tools to any MCP-capable client
- a future-proofing layer that reduces lock-in
- a useful boundary between the Writing Studio host and reusable services

---

## High-level architecture

The system should be split into five layers.

### Layer 1: User interface

The UI is where the user:

- selects projects, books, arcs, characters, and chapters
- opens agent workspaces
- reviews source documents
- invokes generation or analysis actions
- sees tool calls and their results
- approves, rejects, or iterates on outputs
- navigates backward to earlier planning stages
- compares drafts and revisions

The UI should be the human command surface.

### Layer 2: Studio host / orchestrator

This is the core application brain.

It should manage:

- current project and active working set
- session state
- selected model(s)
- workflows and pipelines
- approval gates
- versioned artifacts
- logging and audit trails
- model prompts and system context assembly
- tool invocation permissions
- task queueing

This layer decides what happens next.

### Layer 3: Agent roles

These are not necessarily separate processes. They are role definitions used by the orchestrator.

Examples:

- Outline Builder
- World Builder
- Character Builder
- Scene Planner
- Continuity Manager
- Drafting Agent
- Revision Agent
- Style Compliance Agent
- Series Memory Agent

These should usually be implemented as **orchestrator-defined workflows plus model assignments**, not as standalone distributed systems unless scaling later demands it.

### Layer 4: MCP capability servers

These expose shared resources and tools.

Initial recommended MCP servers:

1. **Project Library Server**
2. **Continuity + Retrieval Server**
3. **Planning Tools Server**
4. **Export Server** (can come slightly later)

### Layer 5: Storage and indexing

This layer includes:

- project files
- bibles
- chapter drafts
- scene cards
- continuity ledger
- vector index / keyword index
- revision history
- structured metadata store
- generated summaries

This layer may include both files and databases.

---

## Recommended first MCP servers

Do **not** begin by creating one MCP server per specialist agent. That is unnecessary complexity.

Begin with a small number of servers organized by capability domain.

## 1. Project Library Server

### Purpose

Expose project documents and metadata as readable resources.

### Why it should exist

Every model in the studio needs consistent access to project context. Without this, each workflow will reinvent file handling and context assembly.

### Exposed resources

Examples:

- project manifest
- series bible
- world bible
- mythology bible
- character bible
- relationship bible
- location bible
- style sheet
- voice guide
- chapter outline
- beat sheet
- scene cards
- chapter summaries
- continuity log
- unresolved thread list
- revision notes

### Exposed tools

Examples:

- `get_project_manifest(project_id)`
- `list_project_documents(project_id, folder_or_type)`
- `read_document(document_id)`
- `read_document_section(document_id, heading_or_range)`
- `search_documents(project_id, query, filters)`
- `get_active_working_set(project_id, task_type)`
- `update_metadata(document_id, metadata_patch)`
- `register_document_version(document_id, parent_version_id, note)`

### Suggested storage model

Use Markdown or plain text files as canonical human-readable content. Maintain sidecar metadata in JSON or SQLite.

Suggested folder shape:

```text
/projects/
  /{project_slug}/
    /manifest.json
    /bibles/
    /outlines/
    /chapters/
    /scenes/
    /summaries/
    /continuity/
    /style/
    /exports/
    /revisions/
```

---

## 2. Continuity + Retrieval Server

### Purpose

Provide semantic retrieval, continuity validation, contradiction detection, and unresolved-thread tracking.

### Why it should exist

Long-form fiction breaks down without memory. This server is the backbone of series coherence.

### Responsibilities

- retrieve canon-relevant passages for a query
- identify possible contradictions
- track first mentions and established facts
- maintain entity timelines
- track unresolved narrative threads
- summarize what changed between revisions
- assist the drafting model with context packs

### Exposed tools

Examples:

- `semantic_search(project_id, query, top_k, filters)`
- `keyword_search(project_id, query, filters)`
- `build_context_pack(project_id, task_type, target_id)`
- `validate_scene_continuity(scene_id)`
- `validate_chapter_continuity(chapter_id)`
- `compare_against_canon(text_or_doc_id)`
- `list_unresolved_threads(project_id)`
- `register_canon_fact(entity_type, entity_id, fact, source_doc)`
- `get_entity_timeline(entity_id)`
- `get_relationship_state(character_a, character_b)`
- `diff_versions(document_a, document_b)`

### Exposed resources

Examples:

- canon ledger
- entity registry
- timeline ledger
- unresolved threads list
- contradiction report
- retrieval index stats

### Suggested internal implementation

Use hybrid retrieval:

- embeddings/vector search for semantic recall
- keyword search for exact terms and names
- structured lookup for canonical facts

Use chunking that respects headings and scene/chapter boundaries.

Store canonical facts separately from raw chunks when possible.

### Important principle

A continuity system should not only retrieve text. It should also maintain **structured memory artifacts**.

Examples of structured memory objects:

- Character status cards
- Location state records
- Timeline events
- Relationship state transitions
- Magic system rules
- Open mystery list
- Political faction positions

These become high-value resources for the host and for later validation passes.

---

## 3. Planning Tools Server

### Purpose

Support outline expansion, decomposition, transformation, and structural planning.

### Why it should exist

Planning tasks recur constantly and benefit from standardized tool surfaces.

### Exposed tools

Examples:

- `expand_premise_to_story_frame(project_id, premise)`
- `generate_book_outline(project_id, parameters)`
- `decompose_chapter_to_beats(chapter_outline_id)`
- `expand_beat_to_scene_card(beat_id)`
- `generate_scene_sequence(chapter_id)`
- `extract_plot_threads(document_id)`
- `assign_scene_objectives(scene_id)`
- `build_character_arc_map(project_id, character_id)`
- `check_outline_balance(outline_id)`
- `propose_missing_bridge_scenes(chapter_or_arc_id)`

### Exposed prompts

Useful reusable prompt templates:

- chapter-to-beat expansion
- beat-to-scene-card expansion
- scene-goal and obstacle analysis
- emotional arc reinforcement
- hook density analysis
- subplot tracking prompt
- revision pass for pacing

### Exposed resources

- planning templates
- beat templates
- scene card schema
- arc map schema
- outline health reports

---

## 4. Export Server

### Purpose

Compile project artifacts into deliverables.

### Why it should exist

Export is a clear capability boundary that may later be reused by other clients or automation.

### Exposed tools

Examples:

- `compile_chapter_packet(chapter_id)`
- `compile_book_draft(book_id)`
- `export_markdown(document_ids)`
- `export_docx(document_ids)`
- `export_revision_diff(doc_a, doc_b)`
- `package_project_snapshot(project_id)`
- `generate_submission_packet(project_id, target_format)`

### Resources

- export profiles
- formatting templates
- front matter templates
- revision packet templates

### Implementation note

This server can be deferred until after the first three are working.

---

## Agent role design

The Writing Studio should think in terms of **roles**, not rigid always-running autonomous agents.

Each role should specify:

- default model
- allowed MCP tools
- system prompt / role framing
- expected inputs
- expected outputs
- quality checks
- escalation rules
- approval requirements

## Recommended initial roles

### 1. Outline Builder

**Default model:** Gemma 3

**Responsibilities:**

- develop project-level story structure
- create book outlines
- produce chapter skeletons
- maintain macro pacing

**MCP usage:**

- reads project documents from Project Library
- uses Planning Tools for outline generation and decomposition
- consults Continuity server to avoid contradictions with established canon

### 2. World Builder

**Default model:** EVA-Qwen 2.5

**Responsibilities:**

- expand lore, locations, factions, systems, and institutions
- define constraints of setting logic
- create reusable world assets for future scenes

**MCP usage:**

- reads and updates world-related resources
- registers structured canon facts
- validates new world details against existing lore

### 3. Character Builder

**Default model:** EVA-Qwen 2.5

**Responsibilities:**

- generate and refine character bibles
- track motivations, contradictions, relationships, voice markers
- map internal arcs and interpersonal shifts

**MCP usage:**

- reads character and relationship resources
- updates structured memory cards
- uses planning tools for arc mapping

### 4. Continuity Manager

**Default model:** Gemma 3 or another reasoning-heavy model

**Responsibilities:**

- check chapters and scenes for contradictions
- track established facts and unresolved threads
- generate continuity reports
- flag risky revisions

**MCP usage:**

- heavy user of Continuity + Retrieval server
- moderate use of Project Library

### 5. Scene Planner

**Default model:** EVA-Qwen 2.5

**Responsibilities:**

- transform chapter beats into scene cards
- identify objectives, conflict, reveals, reversals, hooks
- prepare handoff packets for drafting

**MCP usage:**

- uses Planning Tools heavily
- requests retrieval packs from Continuity server

### 6. Drafting Agent

**Default model:** Magnum

**Responsibilities:**

- write prose from approved scene plans
- preserve tone and voice
- use context packs rather than raw entire bibles where practical

**MCP usage:**

- reads scene cards and context packs
- may request style guide and selected canon references
- should not have unrestricted raw write access to canon memory without host mediation

### 7. Revision Agent

**Default model:** Magnum or Gemma depending on pass type

**Responsibilities:**

- revise prose for pacing, clarity, emotional resonance, voice, and continuity fixes
- create targeted rewrite passes

**MCP usage:**

- uses diff tools
- consults style resources
- consults continuity validation before finalizing

---

## Recommended workflow design

The host should orchestrate workflows. MCP servers support them.

## Example end-to-end chapter workflow

### Step 1: Select target chapter

Host loads:

- chapter outline
- nearby chapter summaries
- active character cards
- unresolved thread list
- relevant world/location notes

### Step 2: Generate or refine beat plan

Outline Builder or Scene Planner uses:

- Project Library resources
- Planning Tools server
- Continuity retrieval pack

Output:

- approved beat plan

### Step 3: Expand beats to scene cards

Scene Planner produces structured scene cards with fields such as:

- scene purpose
- viewpoint
- location
- present characters
- objective
- obstacle
- turn/reversal
- emotional shift
- canon-sensitive facts
- required callbacks
- exit hook

### Step 4: Build drafting context pack

Continuity server assembles a compact task-specific bundle containing only the most relevant material.

This is important. Do not dump the entire project bible into every drafting prompt.

### Step 5: Draft prose

Drafting Agent uses:

- scene card
- style sheet
- voice guide
- continuity context pack
- selected recent chapter summaries

Output:

- scene or chapter draft

### Step 6: Validate continuity

Continuity Manager runs checks against draft.

Output:

- contradiction warnings
- missing callback warnings
- timeline issues
- voice consistency notes

### Step 7: Revision pass

Revision Agent resolves flagged issues and improves prose quality.

### Step 8: Commit artifacts

Host stores:

- draft version
- revision version
- chapter summary
- structured canon updates
- unresolved thread updates
- metadata tags

---

## Context assembly strategy

This is one of the most important implementation areas.

The host should not indiscriminately pass every available project document to the model. It should assemble context by policy.

## Recommended context hierarchy

### Always eligible

- active task instructions
- relevant style guide
- immediate target outline or scene card
- immediate neighboring summaries

### Often eligible

- involved character cards
- relevant location card
- relevant relationship card
- unresolved thread items tied to this chapter

### Conditionally eligible

- world bible excerpts
- mythology excerpts
- political history
- prior draft comparisons

### Rarely pass raw

- full project bible
- full season bible
- entire manuscript

Instead, build task-specific context packs.

## Context pack concept

A context pack should be a curated bundle generated by retrieval + rules.

Example structure:

```json
{
  "task_type": "draft_scene",
  "target_id": "scene_12_03",
  "required_items": [
    "scene_card",
    "style_guide",
    "voice_markers_pov_character"
  ],
  "retrieved_items": [
    "character_card_protagonist",
    "relationship_state_protagonist_love_interest",
    "location_card_cathedral_archive",
    "chapter_11_summary",
    "unresolved_thread_masked_priest",
    "canon_fact_magic_cost_rule_04"
  ],
  "warnings": [
    "character injured left shoulder in prior chapter",
    "rainstorm still ongoing",
    "supporting character has not yet learned the secret"
  ]
}
```

This should be constructed by host policy plus Continuity server support.

---

## Data model recommendations

The studio will work better if some project knowledge is structured rather than existing only as prose blobs.

## Essential entities

### Project

Fields:

- project_id
- title
- type (novel, series, episode set, etc.)
- status
- active_book_id
- active_style_profile

### Document

Fields:

- document_id
- project_id
- title
- type
- path
- status
- tags
- created_at
- updated_at
- version_id
- parent_version_id

### Character

Fields:

- character_id
- name
- aliases
- role
- description
- goals
- fears
- internal conflict
- external conflict
- voice notes
- arc state
- relationship_refs

### Location

Fields:

- location_id
- name
- type
- sensory profile
- political affiliation
- history
- constraints

### Plot thread

Fields:

- thread_id
- title
- type
- introduced_in
- current_status
- last_touched_in
- planned_resolution

### Canon fact

Fields:

- fact_id
- entity_type
- entity_id
- fact_text
- certainty
- source_doc
- source_range
- tags

### Scene card

Fields:

- scene_id
- chapter_id
- order
- viewpoint
- location
- characters_present
- objective
- obstacle
- turn
- reveal
- emotional_shift
- exit_hook
- required_references

---

## UI requirements for MCP-aware Studio

The UI should not expose MCP as jargon to the user unless the user wants technical detail.

Instead, UI language should describe user goals.

## Recommended interface areas

### 1. Project Navigator

Shows:

- series / books / arcs / chapters / scenes
- bibles and support documents
- summaries and continuity assets

### 2. Agent Workspace

Shows:

- selected role
- selected model
- task input
- generated output
- referenced project documents
- tool activity panel

### 3. Context Inspector

Shows what context was assembled for a task:

- documents included
- structured memory included
- retrieval hits
- warnings

This is extremely important for debugging and trust.

### 4. Continuity Console

Shows:

- contradiction reports
- unresolved threads
- timeline events
- canon facts added or changed

### 5. Revision Compare View

Shows:

- old draft vs new draft
- what changed
- continuity consequences
- notes from the Revision Agent

### 6. Workflow Board

Shows artifact progression:

- premise
- outline
- chapter plan
- scene cards
- draft
- revised draft
- validated draft
- exported draft

### 7. MCP Activity Panel

Primarily for advanced users and debugging.

Shows:

- resource reads
- tool calls
- failures
- call durations
- structured outputs

This should help you inspect system behavior without overwhelming normal writing flow.

---

## Tool access policy

Not every role should have unrestricted access to every tool.

This is important both for safety and for output quality.

## Example policy

### Drafting Agent

Allowed:

- read scene cards
- read style guide
- read context packs
- request continuity pack

Restricted:

- directly mutating canon ledger
- bulk editing project metadata

### Continuity Manager

Allowed:

- read all canon resources
- run validation tools
- register suggested canon facts

Restricted:

- directly rewriting prose drafts without host approval

### Export role

Allowed:

- compile and package outputs

Restricted:

- modifying story content

The host should be the authority enforcing these permissions.

---

## Logging and observability

This project needs very strong logs.

For every major generation or tool-assisted action, record:

- task id
- user intent
- selected role
- selected model
- prompt template id
- included resources
- tool calls made
- outputs returned
- validation results
- resulting artifact ids
- timestamps
- token counts if available

This will make debugging dramatically easier, especially when different models appear inconsistent.

---

## Versioning strategy

Every meaningful artifact should be versioned.

Version at least:

- outlines
- chapter plans
- scene cards
- prose drafts
- summaries
- canon ledgers
- style sheets

Each version should capture:

- version id
- parent version
- timestamp
- responsible role
- model used
- reason for change
- validation result summary

This allows rollback and comparison.

---

## Suggested implementation phases

## Phase 1: Core host and Project Library

Build:

- project file system conventions
- metadata layer
- basic project manifest
- UI project navigator
- Project Library MCP server
- ability to read documents and sections cleanly

Success criteria:

- the host can select a project and consistently assemble working sets
- any supported model can access project documents through one clean interface

## Phase 2: Retrieval and continuity

Build:

- chunking pipeline
- embedding or hybrid retrieval layer
- structured canon ledger
- unresolved thread tracker
- continuity validation tools
- Continuity + Retrieval MCP server

Success criteria:

- host can build compact context packs for a given chapter or scene
- continuity checks can flag basic contradictions reliably

## Phase 3: Planning tools

Build:

- scene card schema
- beat decomposition tools
- chapter expansion tools
- arc mapping utilities
- Planning Tools MCP server

Success criteria:

- outlines can be transformed into reusable structured planning artifacts
- scene planning becomes standardized across workflows

## Phase 4: Drafting and revision workflows

Build:

- agent role definitions
- host workflow engine
- drafting and revision pipelines
- validation gates
- revision compare UI

Success criteria:

- chapter production can move from plan to draft to validated revision in one traceable flow

## Phase 5: Export and packaging

Build:

- Export MCP server
- docx/markdown compilation
- snapshot packaging
- revision packet output

Success criteria:

- deliverables can be produced from structured studio artifacts without manual copy/paste chaos

---

## Technical recommendations for Codex

### 1. Prefer simple transports first

Start with local MCP servers over `stdio` for development where practical. Keep deployment simple.

### 2. Use typed schemas everywhere possible

Tools should accept and return explicit JSON schemas. Do not rely on mushy freeform strings when structured outputs are feasible.

### 3. Keep canonical content human-readable

Markdown as canonical text is a major advantage for a writing tool. Do not bury everything in opaque storage.

### 4. Separate raw text retrieval from structured canon memory

Do both. Do not choose one exclusively.

### 5. Build compact context packs, not giant prompt dumps

This is essential for quality, cost, and model stability.

### 6. Make every important system decision inspectable in the UI

Especially:

- why a given resource was included
- why a contradiction was flagged
- which role performed a change
- what changed between versions

### 7. Start with a small number of servers

Recommended first build:

- Project Library Server
- Continuity + Retrieval Server
- Planning Tools Server

Everything else can remain internal application code at first.

---

## What not to do

- Do not create ten microservers before the core host works.
- Do not let drafting models mutate canon memory freely.
- Do not pass the whole project bible into every prompt.
- Do not treat agent personas as architecture boundaries by default.
- Do not assume semantic search alone is enough for continuity.
- Do not skip versioning.
- Do not hide retrieval and tool behavior from the UI.

---

## Practical first milestone

A realistic first milestone for Codex is:

### Milestone 1

Build a desktop Writing Studio shell with:

- project navigator
- document viewer
- active working set panel
- one configurable model runner
- Project Library MCP server
- simple ability to select a chapter and assemble its required documents

### Milestone 2

Add:

- retrieval index
- context pack builder
- continuity reports
- Continuity + Retrieval MCP server

### Milestone 3

Add:

- scene cards
- beat decomposition
- planning prompts/templates
- Planning Tools MCP server

At that point, the system becomes meaningfully studio-like rather than just a chat wrapper.

---

## Condensed build instruction for Codex

Implement the Writing Studio as a **desktop host/orchestrator** that coordinates local LLM workflows for long-form fiction. Use MCP only for reusable capability domains, not for every internal function. Build three initial MCP servers: **Project Library**, **Continuity + Retrieval**, and **Planning Tools**. Keep all project text in human-readable Markdown with metadata sidecars or SQLite. The host should manage workflows, model routing, session state, tool permissions, versioning, and UI. The UI should expose project navigation, agent workspaces, context inspection, continuity reporting, revision comparison, and workflow progression. The retrieval system should combine semantic search, keyword search, and structured canon memory. Drafting should rely on compact context packs rather than raw full-bible prompt dumps. Every artifact should be versioned. Every tool call and context assembly decision should be inspectable.

---

## Final recommendation

For this Writing Studio, MCP is worth adopting because it gives all specialist models a shared, standardized way to access project context and tools. The right design is **host-centered orchestration with MCP-backed services**, not “everything is an autonomous MCP agent.” This keeps the system powerful, modular, and future-proof without drowning the project in avoidable complexity.
