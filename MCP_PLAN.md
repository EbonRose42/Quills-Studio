# Quills Studio MCP Execution Plan

Date: 2026-04-03
Source: `writing_studio_mcp_architecture_brief.md`
Status: completed on 2026-04-03

## Objective

Implement Quills Studio as a host-centered desktop orchestrator with MCP-backed capability domains. MCP should standardize reusable capabilities, while the app itself remains responsible for workflow logic, UI, model routing, queueing, session state, project state, and approvals.

## Constraints From The Brief

- MCP is a capability layer, not the product core.
- Do not create one server per agent.
- Start with three servers:
  - Project Library
  - Continuity + Retrieval
  - Planning Tools
- Keep canonical text human-readable.
- Build compact, inspectable context packs instead of giant prompt dumps.
- Make tool calls and context assembly decisions visible in the UI.
- Preserve strict artifact versioning and approval boundaries.

## Phase Map

### Phase 1: Shared MCP Foundation

Build:
- a new workspace package for MCP capability domains
- shared tool/resource/prompt contracts
- MCP host registry for local orchestration use
- actual stdio server entrypoints using the official MCP SDK

Success criteria:
- Quills Studio can enumerate three MCP servers locally
- each server exposes typed tools/resources
- host-side code can call MCP capabilities through one consistent interface

### Phase 2: Project Library Server

Build:
- project manifest and document resources
- document listing and search tools
- document read and section-read tools
- active working set assembly
- document version registration entrypoint

Success criteria:
- the host can inspect projects and documents through the Project Library server
- UI can display project/library data and MCP activity

### Phase 3: Continuity + Retrieval Server

Build:
- keyword search
- lightweight semantic-style retrieval
- structured continuity resources
- context pack builder
- canon comparison and chapter continuity validation tools

Success criteria:
- packet/context assembly flows through the Continuity + Retrieval server
- continuity validation results are inspectable
- retrieval decisions are visible in UI/devtools

### Phase 4: Planning Tools Server

Build:
- chapter/beat decomposition tools
- scene card expansion tools
- plot thread extraction
- arc mapping helpers
- planning prompts/templates

Success criteria:
- planning artifacts can be generated and inspected through MCP tools
- the Planning Tools server is callable locally and via stdio entrypoint

### Phase 5: Host + UI Integration

Build:
- MCP host integration into the Electron orchestrator
- MCP server catalog in app state
- Context Inspector view
- MCP Activity Panel
- reuse of MCP context pack outputs in current packet/drafting flows

Success criteria:
- app shows which MCP tools/resources were used
- app shows why context was included
- current workflows use MCP-backed services instead of direct ad hoc assembly where practical

### Phase 6: Verification, Docs, and Runtime Scripts

Build:
- tests for host registry and key MCP tools
- npm scripts for each stdio MCP server
- docs describing server responsibilities and launch methods
- re-verification and packaging sanity checks

Success criteria:
- `npm run verify` passes
- MCP server scripts are present and documented
- unpacked packaging still succeeds

## Execution Order

1. Phase 1 foundation
2. Phase 2 Project Library
3. Phase 3 Continuity + Retrieval
4. Phase 4 Planning Tools
5. Phase 5 host/UI integration
6. Phase 6 verification/docs

## Notes

- Export MCP server is explicitly deferred until after the first three servers.
- Existing devtools logging should be extended to capture MCP activity rather than replaced.
- Existing artifact/project/series/versioning systems should be reused, not rewritten.

## Execution Result

Completed in this repo:

- Added `@quills/mcp` workspace package.
- Implemented host-side MCP registry with:
  - Project Library
  - Continuity + Retrieval
  - Planning Tools
- Added stdio MCP server entrypoints for all three capability domains.
- Integrated the desktop app with the MCP host for context-pack assembly and MCP activity inspection.
- Added UI-visible MCP Inspector and MCP activity tracing through existing devtools/logging.
- Added tests, scripts, README updates, and re-verified build + packaging.
