# Quills Studio

Quills Studio is an artifact-driven desktop writing studio for novels and series. It keeps project truth in files, routes work through explicit agent contracts, and supports multi-project series management instead of treating every book like an isolated chat.

## Current capabilities

- Electron + React desktop workspace with four main panes
- Multiple project catalog with load/switch support
- Series manifests that group multiple projects into an ordered series
- Artifact storage with versioning, branching, diffing, and canon promotion
- Packet builder, drafting flow, and continuity checks
- MCP capability layer with three domains: Project Library, Continuity + Retrieval, and Planning Tools
- Persisted runtime/provider configuration stored under `.quills-studio/runtime-config.json`
- Provider runtime controls for `mock`, `ollama`, and OpenAI-compatible endpoints
- Provider health probing, retries, timeout settings, model discovery, thinking toggle, and optional fallback to mock mode
- Structured devtools logging with session logs, error logs, action metrics, debug-bundle export, and distilled diagnostics
- Windows packaging scripts via `electron-builder`

## Workspace layout

```text
apps/desktop        Electron shell and React UI
packages/shared     Shared schemas and fixture data
packages/studio-core Artifact, project, packet, continuity, and review logic
packages/agent-runtime Agent registry and model providers
packages/mcp        MCP host, capability services, and stdio server entrypoints
packages/devtools   Structured logging, tracing, metrics, and debug bundle export
packages/ui         Shared UI helpers
projects/           User-created project data on disk
series/             Series manifests linking multiple projects
logs/               Runtime logs and exported debug bundles
.quills-studio/     Persisted runtime/provider config
```

## Getting started

```powershell
npm install
npm run dev
```

## Verification

```powershell
npm run verify
```

## MCP servers

Run the initial MCP capability servers locally:

```powershell
npm run mcp:project-library
npm run mcp:continuity
npm run mcp:planning
```

Execution roadmap is tracked in [MCP_PLAN.md](C:/Jane2/Quills%20Studio/MCP_PLAN.md).

## Packaging

Build unpacked desktop output:

```powershell
npm run package:dir
```

Build Windows installer artifacts:

```powershell
npm run package:win
```

## Ollama notes

Quills Studio expects these Ollama models by default:

- `gemma3:12b`
- `eva-qwen2.5`
- `magnum`

The Runtime Settings view lets you set the base URL, timeout, retry count, and whether failures should fall back to the mock provider.

## Dev tools

The Dev Tools view exposes:

- recent structured app events
- recent captured errors
- IPC action timing metrics
- distilled diagnostics summaries for provider, MCP, failures, and slow actions
- log file paths
- one-click debug bundle export

When something breaks, export a debug bundle and point directly at the generated bundle path or the session log shown in the app.

## Runtime config

Quills Studio now persists runtime configuration to:

```text
.quills-studio/runtime-config.json
```

This includes:

- active project slug
- selected runtime provider mode
- provider settings such as host, model, api key, timeout, retries, fallback policy, and thinking toggle
- verbose logging preference

## GitHub readiness

The repo is set up for source control with:

- root `README.md`
- reproducible `npm run verify`
- GitHub Actions CI under `.github/workflows/ci.yml`
- packaging scripts for installed-app output
