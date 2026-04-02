import { app, BrowserWindow, ipcMain } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  providerDisplayNames,
  providerSettingsSchema,
  providerStatusSchema,
  studioRuntimeConfigSchema,
  type ArtifactRecord,
  type ProjectManifest,
  type ProviderMode,
  type ProviderSettings,
  type ProviderStatus,
  type SeriesManifest,
  type StudioRuntimeConfig,
} from '@quills/shared';
import {
  buildCanonPromotionSummary,
  ensureDemoProject,
  ArtifactRepository,
  ProjectService,
} from '@quills/studio-core';
import {
  agentRegistry,
  MockProvider,
  OllamaProvider,
  OpenAiCompatibleProvider,
  runDraftingWorkflow,
} from '@quills/agent-runtime';
import { DevToolsService } from '@quills/devtools';
import { WritingStudioMcpHost, type McpActivityEntry } from '@quills/mcp';
import type { StudioSnapshot } from '../src/types';

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDir, '../../..');
const devTools = new DevToolsService({ rootDirectory: workspaceRoot, verboseLogging: true });
const runtimeConfigPath = join(workspaceRoot, '.quills-studio', 'runtime-config.json');

let activeProjectSlug = 'the-glass-meridian';
let providerMode: ProviderMode = 'mock';
let providerSettings: ProviderSettings = providerSettingsSchema.parse({
  provider: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  model: 'qwen3.5:2b',
  apiKey: '',
  timeoutMs: 30000,
  maxRetries: 2,
  fallbackToMock: true,
  thinking: false,
});

function createProvider(settings: ProviderSettings) {
  const onEvent = async (type: string, context: Record<string, unknown>) => {
    await devTools.logProviderEvent(type, context);
  };

  if (settings.provider === 'ollama') {
    return new OllamaProvider(settings, { onEvent });
  }

  return new OpenAiCompatibleProvider(settings, { onEvent });
}

let provider = createProvider(providerSettings);
const mcpHost = new WritingStudioMcpHost({
  workspaceRoot,
  onActivity: async (entry: McpActivityEntry) => {
    await devTools.log('info', 'mcp', entry.summary, entry.context);
  },
});

const uiState = {
  packetPreview: null as StudioSnapshot['packetPreview'],
  selectedArtifactId: null as string | null,
  continuityFindings: [] as StudioSnapshot['continuityFindings'],
  lastDiff: null as string | null,
  canonReviewSummary: null as string | null,
  providerStatus: {
    provider: providerSettings.provider,
    displayName: providerDisplayNames[providerSettings.provider],
    available: false,
    baseUrl: providerSettings.baseUrl,
    lastCheckedAt: null,
    models: [],
    missingModels: [],
    lastError: 'Not checked yet.',
  } as StudioSnapshot['providerStatus'],
};

async function readRuntimeConfig(): Promise<StudioRuntimeConfig> {
  try {
    const raw = await readFile(runtimeConfigPath, 'utf8');
    return studioRuntimeConfigSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return studioRuntimeConfigSchema.parse({
        activeProjectSlug: activeProjectSlug,
        providerMode,
        providerSettings,
        verboseLogging: true,
      });
    }
    throw error;
  }
}

async function writeRuntimeConfig(): Promise<void> {
  const config = studioRuntimeConfigSchema.parse({
    activeProjectSlug,
    providerMode,
    providerSettings,
    verboseLogging: devTools.getSnapshot().verboseLogging,
  });
  await mkdir(join(workspaceRoot, '.quills-studio'), { recursive: true });
  await writeFile(runtimeConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function summarizePayload(payload: unknown): Record<string, unknown> {
  if (payload === null || payload === undefined) {
    return { payload: null };
  }
  if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') {
    return { payload };
  }
  if (Array.isArray(payload)) {
    return { kind: 'array', length: payload.length };
  }
  if (typeof payload === 'object') {
    return { kind: 'object', keys: Object.keys(payload as Record<string, unknown>) };
  }
  return { payloadType: typeof payload };
}

async function getCatalog(): Promise<{ projects: ProjectManifest[]; series: SeriesManifest[] }> {
  await ensureDemoProject(workspaceRoot);
  const service = new ProjectService(workspaceRoot);
  const [projects, series] = await Promise.all([service.listProjects(), service.listSeries()]);
  return { projects, series };
}

async function getActiveProject(projects?: ProjectManifest[]): Promise<ProjectManifest | null> {
  const catalog = projects ? { projects } : await getCatalog();
  return catalog.projects.find((project) => project.slug === activeProjectSlug) ?? catalog.projects[0] ?? null;
}

async function getRepository(projectSlug?: string): Promise<ArtifactRepository> {
  const project = projectSlug ? await new ProjectService(workspaceRoot).loadManifest(projectSlug) : await getActiveProject();
  if (!project) {
    throw new Error('No active project available.');
  }

  return new ArtifactRepository(workspaceRoot, project.slug);
}

async function refreshProviderStatus(): Promise<void> {
  uiState.providerStatus = providerStatusSchema.parse(await provider.inspect());
}

async function buildSnapshot(): Promise<StudioSnapshot> {
  const { projects, series } = await getCatalog();
  const project = await getActiveProject(projects);
  const repository = project ? new ArtifactRepository(workspaceRoot, project.slug) : null;
  const artifacts = repository ? await repository.listArtifacts() : [];

  if (!project) {
    activeProjectSlug = 'the-glass-meridian';
  } else if (project.slug !== activeProjectSlug) {
    activeProjectSlug = project.slug;
  }

  if (!uiState.selectedArtifactId && artifacts.length > 0) {
    uiState.selectedArtifactId = artifacts[0].metadata.id;
  }

  return {
    workspaceRoot,
    projects,
    series,
    activeProject: project,
    artifacts,
    agents: agentRegistry,
    providerMode,
    providerSettings,
    providerStatus: uiState.providerStatus,
    packetPreview: uiState.packetPreview,
    selectedArtifactId: uiState.selectedArtifactId,
    continuityFindings: uiState.continuityFindings,
    lastDiff: uiState.lastDiff,
    canonReviewSummary: uiState.canonReviewSummary,
    devTools: {
      ...devTools.getSnapshot(),
      distilledDiagnostics: devTools.buildDistilledDiagnostics({
        providerMode,
        providerStatus: uiState.providerStatus,
        mcp: mcpHost.getSnapshot(),
      }),
    },
    mcp: mcpHost.getSnapshot(),
  };
}

function resetArtifactScopedState(): void {
  uiState.packetPreview = null;
  uiState.selectedArtifactId = null;
  uiState.continuityFindings = [];
  uiState.lastDiff = null;
  uiState.canonReviewSummary = null;
}

async function saveContinuityReport(repository: ArtifactRepository, draft: ArtifactRecord, findings: StudioSnapshot['continuityFindings']): Promise<void> {
  await repository.writeArtifact({
    metadata: {
      id: `${draft.metadata.id}_continuity_v1`,
      type: 'continuity_report',
      title: `${draft.metadata.title} Continuity Report`,
      status: findings.some((finding) => finding.severity === 'error') ? 'working' : 'approved',
      project: draft.metadata.project,
      book: draft.metadata.book,
      chapter: draft.metadata.chapter,
      version: 1,
      updatedBy: 'ContinuityManager',
      dependsOn: [draft.metadata.id],
      tags: ['continuity'],
      summary: 'Continuity findings generated from the current draft.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    body: {
      format: 'json',
      data: findings,
    },
  });
  await devTools.log('info', 'artifact', 'Saved continuity report artifact.', {
    draftId: draft.metadata.id,
    project: draft.metadata.project,
    findingCount: findings.length,
  });
}

function registerHandler<TInput>(
  channel: string,
  action: (input: TInput) => Promise<StudioSnapshot>,
): void {
  ipcMain.handle(channel, async (_event, input: TInput) => {
    const result = await devTools.traceAction(channel, {
      activeProjectSlug,
      selectedArtifactId: uiState.selectedArtifactId,
      providerMode,
      ...summarizePayload(input),
    }, async () => action(input));

    return {
      ...result,
      devTools: devTools.getSnapshot(),
      mcp: mcpHost.getSnapshot(),
    };
  });
}

registerHandler('studio:load', async () => {
  await refreshProviderStatus();
  return buildSnapshot();
});

registerHandler('studio:create-project', async (input: { name: string; description: string; seriesSlug?: string | null; seriesOrder?: number | null }) => {
  const service = new ProjectService(workspaceRoot);
  const timestamp = new Date().toISOString();
  const slug = slugify(input.name);
  await service.createProject({
    id: slug,
    name: input.name,
    slug,
    description: input.description,
    seriesSlug: input.seriesSlug ?? null,
    seriesOrder: input.seriesOrder ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    currentCanonVersion: 0,
    activeBook: 1,
  });

  if (input.seriesSlug) {
    await service.assignProjectToSeries(slug, input.seriesSlug, input.seriesOrder ?? null);
  }

  activeProjectSlug = slug;
  resetArtifactScopedState();
  await writeRuntimeConfig();
  await devTools.log('info', 'project', 'Created project.', { slug, seriesSlug: input.seriesSlug ?? null });
  return buildSnapshot();
});

registerHandler('studio:load-project', async (projectSlug: string) => {
  activeProjectSlug = projectSlug;
  resetArtifactScopedState();
  await writeRuntimeConfig();
  await devTools.log('info', 'project', 'Loaded project.', { projectSlug });
  return buildSnapshot();
});

registerHandler('studio:create-series', async (input: { name: string; description: string }) => {
  const service = new ProjectService(workspaceRoot);
  const timestamp = new Date().toISOString();
  const slug = slugify(input.name);
  await service.createSeries({
    id: slug,
    name: input.name,
    slug,
    description: input.description,
    createdAt: timestamp,
    updatedAt: timestamp,
    projectSlugs: [],
  });
  await devTools.log('info', 'series', 'Created series.', { slug });
  return buildSnapshot();
});

registerHandler('studio:assign-project-to-series', async (input: { projectSlug: string; seriesSlug: string; seriesOrder: number | null }) => {
  const service = new ProjectService(workspaceRoot);
  await service.assignProjectToSeries(input.projectSlug, input.seriesSlug, input.seriesOrder);
  if (input.projectSlug === activeProjectSlug) {
    resetArtifactScopedState();
  }
  await devTools.log('info', 'series', 'Assigned project to series.', input);
  return buildSnapshot();
});

registerHandler('studio:set-provider-mode', async (mode: ProviderMode) => {
  providerMode = mode;
  providerSettings = providerSettingsSchema.parse({
    ...providerSettings,
    provider: providerMode === 'mock' ? providerSettings.provider : mode,
  });
  if (providerMode !== 'mock') {
    provider = createProvider(providerSettings);
    await refreshProviderStatus();
  }
  await writeRuntimeConfig();
  await devTools.log('info', 'provider', 'Provider mode changed.', { providerMode });
  return buildSnapshot();
});

registerHandler('studio:save-provider-settings', async (settings: ProviderSettings) => {
  providerSettings = providerSettingsSchema.parse(settings);
  provider = createProvider(providerSettings);
  if (providerMode !== 'mock') {
    await refreshProviderStatus();
  }
  await writeRuntimeConfig();
  await devTools.log('info', 'provider', 'Updated provider settings.', {
    provider: providerSettings.provider,
    baseUrl: providerSettings.baseUrl,
    timeoutMs: providerSettings.timeoutMs,
    maxRetries: providerSettings.maxRetries,
    fallbackToMock: providerSettings.fallbackToMock,
    thinking: providerSettings.thinking,
  });
  return buildSnapshot();
});

registerHandler('studio:refresh-provider-status', async () => {
  if (providerMode !== 'mock') {
    await refreshProviderStatus();
  }
  return buildSnapshot();
});

registerHandler('studio:select-artifact', async (artifactId: string) => {
  uiState.selectedArtifactId = artifactId;
  uiState.lastDiff = null;
  return buildSnapshot();
});

registerHandler('studio:build-packet', async (chapterPlanId: string) => {
  const activeProject = await getActiveProject();
  if (!activeProject) {
    throw new Error('No active project available for packet building.');
  }
  const contextPack = await mcpHost.callTool('continuity-retrieval', 'build_context_pack', {
    projectSlug: activeProject.slug,
    taskType: 'draft_chapter',
    targetId: chapterPlanId,
  }) as { packet: StudioSnapshot['packetPreview'] };
  uiState.packetPreview = contextPack.packet;
  uiState.selectedArtifactId = chapterPlanId;
  uiState.lastDiff = null;
  uiState.canonReviewSummary = null;
  await devTools.log('info', 'packet', 'Built drafting packet.', {
    chapterPlanId,
    sourceArtifactCount: uiState.packetPreview?.sourceArtifactIds.length ?? 0,
  });
  return buildSnapshot();
});

registerHandler('studio:run-drafting', async (chapterPlanId: string) => {
  const repository = await getRepository();
  const activeProject = await getActiveProject();
  if (!activeProject) {
    throw new Error('No active project available for drafting.');
  }
  const contextPack = await mcpHost.callTool('continuity-retrieval', 'build_context_pack', {
    projectSlug: activeProject.slug,
    taskType: 'draft_chapter',
    targetId: chapterPlanId,
  }) as { packet: StudioSnapshot['packetPreview'] };
  const packet = contextPack.packet;
  if (!packet) {
    throw new Error('MCP context pack did not produce a drafting packet.');
  }
  const runtimeProvider = providerMode === 'mock' ? new MockProvider() : provider;
  const draft = await runDraftingWorkflow(runtimeProvider, packet);
  await repository.writeArtifact(draft);
  uiState.packetPreview = packet;
  uiState.selectedArtifactId = draft.metadata.id;
  uiState.lastDiff = null;
  uiState.canonReviewSummary = null;
  await devTools.log('info', 'drafting', 'Draft created.', {
    draftId: draft.metadata.id,
    project: draft.metadata.project,
    providerMode,
    warningCount: draft.body.text ? 0 : 1,
  });
  return buildSnapshot();
});

registerHandler('studio:run-continuity', async (draftId: string) => {
  const repository = await getRepository();
  const artifacts = await repository.listArtifacts();
  const draft = artifacts.find((artifact) => artifact.metadata.id === draftId);
  if (!draft) {
    throw new Error(`Draft ${draftId} not found.`);
  }
  if (!uiState.packetPreview) {
    throw new Error('Build a packet before running continuity.');
  }
  const activeProject = await getActiveProject();
  if (!activeProject) {
    throw new Error('No active project available for continuity validation.');
  }
  const validation = await mcpHost.callTool('continuity-retrieval', 'validate_chapter_continuity', {
    projectSlug: activeProject.slug,
    chapterPlanId: uiState.packetPreview.sourceArtifactIds[0],
    draftText: draft.body.text ?? '',
  }) as { findings: StudioSnapshot['continuityFindings'] };
  uiState.continuityFindings = validation.findings;
  await saveContinuityReport(repository, draft, uiState.continuityFindings);
  uiState.selectedArtifactId = draftId;
  uiState.lastDiff = null;
  uiState.canonReviewSummary = null;
  return buildSnapshot();
});

registerHandler('studio:save-artifact', async (input: { artifactId: string; text: string } | [string, string]) => {
  const artifactId = Array.isArray(input) ? input[0] : input.artifactId;
  const text = Array.isArray(input) ? input[1] : input.text;
  const repository = await getRepository();
  const next = await repository.updateArtifact(
    artifactId,
    {
      body: {
        format: 'markdown',
        text,
      },
    },
    'UserEditor',
  );
  uiState.selectedArtifactId = next.metadata.id;
  uiState.lastDiff = null;
  uiState.canonReviewSummary = null;
  await devTools.log('info', 'artifact', 'Saved artifact version.', {
    artifactId,
    nextArtifactId: next.metadata.id,
    version: next.metadata.version,
  });
  return buildSnapshot();
});

registerHandler('studio:promote-canon', async (artifactId: string) => {
  const repository = await getRepository();
  const artifact = await repository.getArtifact(artifactId);
  if (!artifact) {
    throw new Error(`Artifact ${artifactId} not found.`);
  }

  uiState.canonReviewSummary = buildCanonPromotionSummary(artifact);
  const next = await repository.promoteToCanon(artifactId, 'UserApproval');
  uiState.selectedArtifactId = next.metadata.id;
  uiState.lastDiff = null;
  await devTools.log('info', 'canon', 'Promoted artifact to canon.', {
    artifactId,
    nextArtifactId: next.metadata.id,
  });
  return buildSnapshot();
});

registerHandler('studio:branch-artifact', async (input: { artifactId: string; branchTitle: string } | [string, string]) => {
  const artifactId = Array.isArray(input) ? input[0] : input.artifactId;
  const branchTitle = Array.isArray(input) ? input[1] : input.branchTitle;
  const repository = await getRepository();
  const branch = await repository.branchArtifact(artifactId, branchTitle, 'UserBranch');
  uiState.selectedArtifactId = branch.metadata.id;
  uiState.lastDiff = null;
  uiState.canonReviewSummary = null;
  await devTools.log('info', 'artifact', 'Branched artifact.', {
    artifactId,
    branchArtifactId: branch.metadata.id,
    branchTitle,
  });
  return buildSnapshot();
});

registerHandler('studio:diff-artifacts', async (input: { leftId: string; rightId: string } | [string, string]) => {
  const leftId = Array.isArray(input) ? input[0] : input.leftId;
  const rightId = Array.isArray(input) ? input[1] : input.rightId;
  const repository = await getRepository();
  uiState.lastDiff = await repository.diffArtifacts(leftId, rightId);
  uiState.canonReviewSummary = null;
  await devTools.log('info', 'artifact', 'Generated artifact diff.', { leftId, rightId });
  return buildSnapshot();
});

registerHandler('studio:export-debug-bundle', async () => {
  const snapshot = await buildSnapshot();
  const bundlePath = await devTools.exportDebugBundle('quills-studio-debug', {
    activeProjectSlug,
    providerMode,
    selectedArtifactId: uiState.selectedArtifactId,
    snapshot,
  });
  await devTools.log('info', 'devtools', 'Debug bundle requested from UI.', { bundlePath });
  return buildSnapshot();
});

registerHandler('studio:set-verbose-logging', async (enabled: boolean) => {
  devTools.setVerboseLogging(enabled);
  await devTools.log('info', 'devtools', 'Verbose logging changed.', { enabled });
  return buildSnapshot();
});

registerHandler('studio:record-renderer-event', async (input: { level: 'debug' | 'info' | 'warn' | 'error'; message: string; context?: Record<string, unknown> }) => {
  await devTools.log(input.level, 'renderer', input.message, input.context ?? {});
  return buildSnapshot();
});

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1680,
    height: 1000,
    minWidth: 1280,
    minHeight: 780,
    backgroundColor: '#efe7d7',
    webPreferences: {
      preload: join(currentDir, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.on('render-process-gone', async (_event, details) => {
    await devTools.log('error', 'renderer', 'Renderer process exited unexpectedly.', {
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(join(currentDir, '../dist/index.html'));
  }
}

process.on('uncaughtException', async (error) => {
  await devTools.logError('process', error, { type: 'uncaughtException' });
});

process.on('unhandledRejection', async (reason) => {
  await devTools.logError('process', reason, { type: 'unhandledRejection' });
});

app.whenReady().then(async () => {
  await devTools.init();
  const runtimeConfig = await readRuntimeConfig();
  activeProjectSlug = runtimeConfig.activeProjectSlug ?? activeProjectSlug;
  providerSettings = runtimeConfig.providerSettings;
  providerMode = runtimeConfig.providerMode;
  provider = createProvider(providerSettings);
  devTools.setVerboseLogging(runtimeConfig.verboseLogging);
  await ensureDemoProject(workspaceRoot);
  if (providerMode !== 'mock') {
    await refreshProviderStatus();
  }
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
