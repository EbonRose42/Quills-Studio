import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StudioSnapshot } from './types';
import App from './App';

const snapshot: StudioSnapshot = {
  workspaceRoot: 'C:/Jane2/Quills Studio',
  projects: [
    {
      id: 'quills-demo',
      name: 'The Glass Meridian',
      slug: 'the-glass-meridian',
      description: 'Fixture project',
      seriesSlug: 'glass-meridian-cycle',
      seriesOrder: 1,
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      currentCanonVersion: 3,
      activeBook: 1,
    },
  ],
  series: [
    {
      id: 'glass-meridian-cycle',
      name: 'The Glass Meridian Cycle',
      slug: 'glass-meridian-cycle',
      description: 'Fixture series',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      projectSlugs: ['the-glass-meridian'],
    },
  ],
  activeProject: {
    id: 'quills-demo',
    name: 'The Glass Meridian',
    slug: 'the-glass-meridian',
    description: 'Fixture project',
    seriesSlug: 'glass-meridian-cycle',
    seriesOrder: 1,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z',
    currentCanonVersion: 3,
    activeBook: 1,
  },
  artifacts: [],
  agents: [
    {
      id: 'story-architect',
      name: 'Story Architect',
      primaryModel: 'Gemma3',
      mission: 'Own top-level structure.',
      writes: ['series_arc'],
      forbiddenActions: ['promote canon automatically'],
    },
  ],
  providerMode: 'mock',
  providerSettings: {
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen3.5:2b',
    apiKey: '',
    timeoutMs: 30000,
    maxRetries: 2,
    fallbackToMock: true,
    thinking: false,
  },
  providerStatus: {
    provider: 'ollama',
    displayName: 'Ollama',
    available: false,
    baseUrl: 'http://127.0.0.1:11434',
    lastCheckedAt: null,
    models: [],
    missingModels: ['magnum'],
    lastError: 'offline',
  },
  packetPreview: null,
  selectedArtifactId: null,
  continuityFindings: [],
  lastDiff: null,
  canonReviewSummary: null,
  devTools: {
    verboseLogging: true,
    logDirectory: 'C:/Jane2/Quills Studio/logs',
    appLogPath: 'C:/Jane2/Quills Studio/logs/app.log',
    errorLogPath: 'C:/Jane2/Quills Studio/logs/error.log',
    sessionLogPath: 'C:/Jane2/Quills Studio/logs/sessions/test.jsonl',
    lastBundlePath: null,
    recentEntries: [],
    recentErrors: [],
    actionMetrics: [],
    distilledDiagnostics: {
      summary: ['No recent error patterns captured.'],
      failures: [],
      provider: ['Provider mode: mock.'],
      mcp: ['No MCP activity recorded.'],
      performance: ['No slow action metrics detected.'],
    },
  },
  mcp: {
    servers: [
      {
        id: 'project-library',
        name: 'Project Library Server',
        description: 'Fixture MCP server',
        tools: ['get_project_manifest'],
        resources: ['quills://projects'],
        prompts: ['project-working-set-review'],
      },
    ],
    recentActivity: [],
    lastContextPack: null,
  },
};

describe('App', () => {
  it('renders the workspace header and agent library', async () => {
    window.studioApi = {
      loadStudio: vi.fn().mockResolvedValue(snapshot),
      createProject: vi.fn(),
      loadProject: vi.fn(),
      createSeries: vi.fn(),
      assignProjectToSeries: vi.fn(),
      setProviderMode: vi.fn(),
      saveProviderSettings: vi.fn(),
      refreshProviderStatus: vi.fn(),
      selectArtifact: vi.fn(),
      buildPacket: vi.fn(),
      runDrafting: vi.fn(),
      runContinuity: vi.fn(),
      saveArtifactText: vi.fn(),
      promoteToCanon: vi.fn(),
      branchArtifact: vi.fn(),
      diffArtifacts: vi.fn(),
      exportDebugBundle: vi.fn(),
      setVerboseLogging: vi.fn(),
      recordRendererEvent: vi.fn(),
    };

    render(<App />);

    await waitFor(() => expect(screen.getByText('Artifact-first fiction control room')).toBeInTheDocument());
    expect(screen.getByText('Story Architect')).toBeInTheDocument();
    expect(screen.getAllByText('The Glass Meridian Cycle').length).toBeGreaterThan(0);
  });
});
