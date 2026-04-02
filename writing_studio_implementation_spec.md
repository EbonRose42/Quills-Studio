# Writing Studio Implementation Specification

A Codex-ready product and architecture handoff for a local multi-agent fiction pipeline.

## Purpose
Define the product structure, agent system, workflow, UI, and implementation order for a local Writing Studio.

## Primary use
Novel and series development with persistent documents, versioned canon, guided drafting, and continuity enforcement.

## Core models
- **Gemma3** for orchestration and analysis
- **EVA-qwen-2.5** for world, character, and scene development
- **Magnum** for prose drafting

## Recommended permanent agents
7 core agents, with an optional 8th editorial agent and a library of spawned utility specialists.

---

## 1. Product Vision

The Writing Studio is a local software environment that coordinates specialized LLM workflows around a shared set of project artifacts rather than around isolated chats.

The user acts as showrunner. Agents propose, draft, summarize, diagnose, and refine. Approved documents, not agent chat histories, become the source of truth.

The system must support long-running creative projects, revisions to earlier material, branchable ideas, and continuity-safe drafting across books and series.

---

## 2. Product Goals and Non-Goals

### Goals
- Persistent project memory through files and metadata
- Free movement between planning, worldbuilding, drafting, and revision
- Clear separation between brainstorming, working drafts, and canon
- Task packets that feed the right context to the right model
- A UI that lets the user both write and direct the studio

### Non-Goals
- A fully autonomous “write novels alone” machine
- A giant swarm of always-on agents chatting to each other
- A chat transcript archive pretending to be project memory
- A single prompt wrapper for one monolithic model
- A replacement for human approvals on canon decisions

---

## 3. System Architecture

The system should be built around four layers:

1. **Artifact Layer**: versioned files, metadata, canon state, summaries, timelines, indexes
2. **Agent Layer**: specialist agents with explicit contracts
3. **Packet Layer**: task-specific context packets built from approved and relevant documents
4. **UI Layer**: project browser, editor, agent console, continuity warnings, packet preview, approvals

The central technical principle is that agents do not own the project state. The artifact layer owns the project state.

---

## 4. Workflow Specification

### Phase 1: Project Initialization
Create the project manifest, project brief, initial style guide seed, and unresolved-question list. Route early work through Story Architect and Project Librarian.

### Phase 2: Foundation Building
Expand the world bible, character bible, relationship map, and initial canon snapshot. Route setting work to World Builder and cast work to Character Builder.

### Phase 3: Book Planning
Generate the book brief, act map, chapter index, and chapter plans. Story Architect owns macro structure. Scene Planner owns chapter and scene decomposition.

### Phase 4: Packet Generation
Project Librarian builds task packets for the next operation. Continuity Manager adds warning notes and relevant canon constraints.

### Phase 5: Drafting
Prose Drafter receives a chapter or scene packet and returns prose drafts only. The drafter does not silently update canon.

### Phase 6: Revision
Revision Director analyzes the chapter against goals, then utility specialists or the Prose Drafter perform targeted rewrites.

### Phase 7: Canon Update
Once the user approves a new fact or state change, Continuity Manager and Project Librarian update canon snapshot, timeline, and continuity records.

### Workflow rules
- Every major task should create or update an artifact, not just a chat response
- No draft prose becomes canon automatically
- Continuity checks should run before canon promotion and after each drafted chapter
- Agents should operate on the smallest sufficient packet instead of the whole project by default
- The user must be able to reopen and extend earlier phases at any time

---

## 5. Agent Definitions and Contracts

### Story Architect
- **Primary model:** Gemma3
- **Mission:** Own top-level structure: series arc, book outline, act map, chapter purpose
- **Writes:** series arc docs, book outlines, structural notes
- **Should not:** directly overwrite canon or act as final prose generator by default

### World Builder
- **Primary model:** EVA-qwen-2.5
- **Mission:** Develop setting logic, institutions, factions, history, geography, magic or rules systems
- **Writes:** world bible entries, lore docs, locations, system notes
- **Should not:** introduce permanent canon silently

### Character Builder
- **Primary model:** EVA-qwen-2.5
- **Mission:** Build cast psychology, motivations, relationships, voice, and emotional arcs
- **Writes:** character profiles, relationship maps, voice sheets, arc notes
- **Should not:** rewrite global structure without escalation

### Scene Planner
- **Primary model:** EVA-qwen-2.5
- **Mission:** Translate chapter goals into scene cards and beat-level plans
- **Writes:** scene cards, chapter beat sheets, scene packets
- **Should not:** behave like the final prose layer except when asked for a sketch

### Prose Drafter
- **Primary model:** Magnum
- **Mission:** Turn approved packets into prose drafts with strong tone and voice control
- **Writes:** chapter and scene drafts, alternate draft passes
- **Should not:** modify canon records or invent major facts casually

### Continuity Manager
- **Primary model:** Gemma3
- **Mission:** Enforce project memory and detect contradictions across canon and drafts
- **Writes:** continuity reports, issue logs, canon correction proposals
- **Should not:** silently revise story text

### Project Librarian
- **Primary model:** Gemma3
- **Mission:** Organize project memory and create compact task-specific packets
- **Writes:** summaries, canon snapshots, packet files, delta notes
- **Should not:** become a creative canon source unless explicitly routed

### Revision Director
- **Primary model:** Gemma3
- **Mission:** Diagnose weaknesses and assign rewrite work
- **Writes:** revision plans, rewrite priorities, quality diagnostics
- **Should not:** replace the drafting layer outright unless explicitly instructed

### Spawned utility specialists
These should exist as reusable templates rather than as always-on permanent agents:
- Dialogue Doctor
- Theme Analyst
- Pacing Doctor
- Sensory Detail Expander
- Romance Pass
- Mystery/Clue Tracker
- Villain Strategist
- Magic Rule Auditor
- Fight Scene Coach
- Humor Punch-Up
- Line Editor
- Stakes Escalator

---

## 6. Data Model and Artifact Contracts

Every artifact should have:
- a type
- a status
- a version number
- dependency metadata

### Recommended statuses
- exploratory
- working
- approved
- canon
- superseded
- deprecated

Only approved canon artifacts should be treated as hard truth by Continuity Manager.

### Artifact metadata example
```json
{
  "id": "book1_ch03_plan_v2",
  "type": "chapter_plan",
  "status": "approved",
  "project": "ProjectName",
  "book": 1,
  "chapter": 3,
  "version": 2,
  "updated_by": "ScenePlanner",
  "depends_on": ["book1_outline_v4", "canon_snapshot_v7"]
}
```

### Recommended project tree
```text
WritingStudio/
  projects/
    ProjectName/
      00_meta/
      01_series/
      02_world/
      03_characters/
      04_continuity/
      05_books/
      06_summaries/
      07_agent_outputs/
      08_archive/
```

---

## 7. Task Packets

Task packets are the mechanism that makes local multi-agent work practical. They let the studio feed the smallest useful context bundle to each model.

A drafting packet should generally include:
- chapter goal
- scene plan
- must-include details
- must-avoid notes
- relevant character notes
- relevant world notes
- continuity warnings
- recent chapter summary
- style reminders

Packets should be inspectable by the user before execution.

### Drafting packet fields
```text
- task_type
- project
- book
- chapter
- pov
- tone_targets
- chapter_goal
- scene_plan
- must_include
- must_avoid
- relevant_character_notes
- relevant_world_notes
- continuity_warnings
- prior_chapter_summary
- style_reminders
```

---

## 8. UI Specification

The interface should feel like a hybrid of an IDE, a writer’s binder, and a production control room. It should not feel like a generic chatbot with a document pasted beside it.

The UI should be document-first and agent-second. The manuscript and project artifacts are the center of gravity. Agents are specialist operators the user brings to the material.

A desktop layout is the primary target. Mobile support can exist later, but the main product should assume a wide multi-pane workspace.

### Main workspace layout
- **Far left:** project navigator for projects, books, folders, artifacts, filters, and search
- **Center-left:** primary artifact editor/viewer for chapter draft, outline, world note, or character file
- **Center-right:** active agent workspace for task setup, agent chat, execution controls, and result review
- **Far right:** reference stack for packet preview, canon snapshot, continuity warnings, related artifacts, and task metadata

### Core screens
- Studio Dashboard
- Project Workspace
- Artifact Diff View
- Packet Builder View
- Canon Review View
- Agent Library View

### Top action bar
- New task
- Run agent
- Create packet
- Check continuity
- Compare versions
- Promote to canon
- Spawn specialist
- Branch artifact

### Interaction rules
- The user should be able to stay with one agent indefinitely without losing the document-centered workflow
- Any agent output that matters should be saveable as an artifact or attached note
- Canon promotion should always be an explicit action
- Version comparison should be easy and visible, not hidden in menus
- Continuity warnings should appear in context beside the active artifact, not buried in a separate report

### Example user flow
1. Open Book 1, Chapter 8 draft in the artifact editor
2. Switch active agent to Scene Planner and ask for a stronger scene breakdown
3. Review the updated scene packet in the right sidebar
4. Run Prose Drafter on the approved packet
5. Inspect the returned draft in the editor and save it as a new version
6. Run Continuity Manager and review any contradiction flags
7. Promote any approved fact changes to canon through Canon Review

---

## 9. Implementation Roadmap

### Milestone 1
Artifact system, project tree, metadata schema, versioning, and manifest handling.

### Milestone 2
Agent registry, agent contracts, routing rules, and per-agent workspace state.

### Milestone 3
Packet builder and packet preview UI.

### Milestone 4
Project workspace UI with navigator, editor, agent panel, and reference stack.

### Milestone 5
Drafting pipeline and continuity pipeline.

### Milestone 6
Canon review, artifact diff, approvals, branching, and utility-agent spawn framework.

---

## 10. Technical Guidance for Codex

- Build the product as an artifact-driven desktop app first
- Do not begin by over-optimizing autonomous agent chatter
- Treat agent definitions as data
- Implement packet generation as a first-class subsystem
- Separate exploratory ideas from approved canon in the storage model from the beginning
- Optimize for inspectability and control so the user can see what context an agent is using and what file it is about to update

---

## 11. Acceptance Criteria for the First Serious Build

- **Project memory:** versioned artifacts with statuses and project organization
- **Agent work:** at least 6 core agents with stable contracts and routing
- **Drafting:** packet-based prose drafting rather than full-project dumping
- **Continuity:** continuity checks and issue logging around each drafted chapter
- **UI:** multi-pane project workspace with editor, agent panel, and reference panel
- **Approvals:** explicit promotion of facts and revisions into canon
- **Iteration:** ability to revisit old outlines, old chapters, and prior versions without loss

---

## 12. Final Recommendations

- Start with 6 to 8 permanent agents, not dozens
- Make the project files the truth and the chats the workspace
- Invest heavily in packet generation and continuity enforcement early
- Design the UI around active documents, not around agent personalities
- Keep the user in command of approvals, canon, and branching
