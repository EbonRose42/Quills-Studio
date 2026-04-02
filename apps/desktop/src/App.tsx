import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ArtifactRecord } from '@quills/shared';
import { formatArtifactBody } from '@quills/ui';
import type { StudioSnapshot } from './types';

type ViewMode = 'workspace' | 'packet' | 'diff' | 'canon' | 'agents' | 'series' | 'settings' | 'devtools' | 'mcp';

const emptySnapshot: StudioSnapshot = {
  workspaceRoot: '',
  projects: [],
  series: [],
  activeProject: null,
  artifacts: [],
  agents: [],
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
    missingModels: [],
    lastError: 'Not checked yet.',
  },
  packetPreview: null,
  selectedArtifactId: null,
  continuityFindings: [],
  lastDiff: null,
  canonReviewSummary: null,
  devTools: {
    verboseLogging: true,
    logDirectory: '',
    appLogPath: '',
    errorLogPath: '',
    sessionLogPath: '',
    lastBundlePath: null,
    recentEntries: [],
    recentErrors: [],
    actionMetrics: [],
    distilledDiagnostics: {
      summary: [],
      failures: [],
      provider: [],
      mcp: [],
      performance: [],
    },
  },
  mcp: {
    servers: [],
    recentActivity: [],
    lastContextPack: null,
  },
};

function preferredChapterPlan(snapshot: StudioSnapshot): ArtifactRecord | undefined {
  const selected = snapshot.artifacts.find((artifact) => artifact.metadata.id === snapshot.selectedArtifactId);
  if (selected?.metadata.type === 'chapter_plan') {
    return selected;
  }

  return snapshot.artifacts.find((artifact) => artifact.metadata.type === 'chapter_plan');
}

function orderedProjectsForSeries(snapshot: StudioSnapshot, seriesSlug: string) {
  return snapshot.projects
    .filter((project) => project.seriesSlug === seriesSlug)
    .sort((left, right) => (left.seriesOrder ?? 999) - (right.seriesOrder ?? 999));
}

export default function App() {
  const [snapshot, setSnapshot] = useState<StudioSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('workspace');
  const [search, setSearch] = useState('');
  const [draftText, setDraftText] = useState('');
  const [newProjectName, setNewProjectName] = useState('Quills Prototype');
  const [newProjectDescription, setNewProjectDescription] = useState('A fresh writing studio project.');
  const [newProjectSeriesSlug, setNewProjectSeriesSlug] = useState<string>('');
  const [newProjectSeriesOrder, setNewProjectSeriesOrder] = useState('1');
  const [newSeriesName, setNewSeriesName] = useState('New Series');
  const [newSeriesDescription, setNewSeriesDescription] = useState('A connected set of novel projects.');
  const [seriesAssignmentSlug, setSeriesAssignmentSlug] = useState('');
  const [seriesAssignmentOrder, setSeriesAssignmentOrder] = useState('1');
  const [providerChoice, setProviderChoice] = useState(emptySnapshot.providerSettings.provider);
  const [providerBaseUrl, setProviderBaseUrl] = useState(emptySnapshot.providerSettings.baseUrl);
  const [providerModel, setProviderModel] = useState(emptySnapshot.providerSettings.model);
  const [providerApiKey, setProviderApiKey] = useState(emptySnapshot.providerSettings.apiKey);
  const [providerTimeoutMs, setProviderTimeoutMs] = useState(String(emptySnapshot.providerSettings.timeoutMs));
  const [providerMaxRetries, setProviderMaxRetries] = useState(String(emptySnapshot.providerSettings.maxRetries));
  const [providerFallbackToMock, setProviderFallbackToMock] = useState(emptySnapshot.providerSettings.fallbackToMock);
  const [providerThinking, setProviderThinking] = useState(emptySnapshot.providerSettings.thinking);
  const [verboseLogging, setVerboseLogging] = useState(emptySnapshot.devTools.verboseLogging);

  const deferredSearch = useDeferredValue(search);

  const selectedArtifact = useMemo(
    () => snapshot.artifacts.find((artifact) => artifact.metadata.id === snapshot.selectedArtifactId) ?? null,
    [snapshot.artifacts, snapshot.selectedArtifactId],
  );

  const activeSeries = useMemo(
    () => snapshot.series.find((series) => series.slug === snapshot.activeProject?.seriesSlug) ?? null,
    [snapshot.activeProject?.seriesSlug, snapshot.series],
  );

  const filteredArtifacts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return snapshot.artifacts;
    }

    return snapshot.artifacts.filter((artifact) => {
      const haystack = [
        artifact.metadata.title,
        artifact.metadata.type,
        artifact.metadata.status,
        artifact.metadata.summary,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch, snapshot.artifacts]);

  useEffect(() => {
    void loadSnapshot();
  }, []);

  useEffect(() => {
    const body = formatArtifactBody(selectedArtifact?.body.text, selectedArtifact?.body.data);
    setDraftText(body);
  }, [selectedArtifact]);

  useEffect(() => {
    setSeriesAssignmentSlug(snapshot.activeProject?.seriesSlug ?? '');
    setSeriesAssignmentOrder(String(snapshot.activeProject?.seriesOrder ?? 1));
  }, [snapshot.activeProject?.seriesOrder, snapshot.activeProject?.seriesSlug]);

  useEffect(() => {
    setProviderChoice(snapshot.providerSettings.provider);
    setProviderBaseUrl(snapshot.providerSettings.baseUrl);
    setProviderModel(snapshot.providerSettings.model);
    setProviderApiKey(snapshot.providerSettings.apiKey);
    setProviderTimeoutMs(String(snapshot.providerSettings.timeoutMs));
    setProviderMaxRetries(String(snapshot.providerSettings.maxRetries));
    setProviderFallbackToMock(snapshot.providerSettings.fallbackToMock);
    setProviderThinking(snapshot.providerSettings.thinking);
  }, [snapshot.providerSettings]);

  useEffect(() => {
    setVerboseLogging(snapshot.devTools.verboseLogging);
  }, [snapshot.devTools.verboseLogging]);

  async function loadSnapshot() {
    setIsLoading(true);
    setError(null);

    try {
      const next = await window.studioApi.loadStudio();
      setSnapshot(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load studio state.');
      void window.studioApi.recordRendererEvent({
        level: 'error',
        message: 'loadSnapshot failed in renderer.',
        context: {
          error: loadError instanceof Error ? loadError.message : 'Unknown load error',
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function runAction(action: () => Promise<StudioSnapshot>, nextView?: ViewMode) {
    setError(null);
    setIsLoading(true);

    try {
      const next = await action();
      startTransition(() => {
        setSnapshot(next);
        if (nextView) {
          setActiveView(nextView);
        }
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The action failed.');
      void window.studioApi.recordRendererEvent({
        level: 'error',
        message: 'runAction failed in renderer.',
        context: {
          view: activeView,
          error: actionError instanceof Error ? actionError.message : 'Unknown action error',
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  const chapterPlan = preferredChapterPlan(snapshot);
  const relatedVersions = selectedArtifact
    ? snapshot.artifacts
        .filter((artifact) => artifact.metadata.type === selectedArtifact.metadata.type && artifact.metadata.id !== selectedArtifact.metadata.id)
        .sort((left, right) => right.metadata.version - left.metadata.version)
    : [];

  const providerSummary = snapshot.providerMode === 'mock'
    ? 'Mock provider active'
    : snapshot.providerStatus.available
      ? `${snapshot.providerStatus.displayName} ready at ${snapshot.providerStatus.baseUrl}`
      : `${snapshot.providerStatus.displayName} unavailable`;

  return (
    <div className="studio-shell">
      <div className="studio-backdrop" />
      <header className="topbar">
        <div>
          <p className="eyebrow">Quills Studio</p>
          <h1>Artifact-first fiction control room</h1>
          <p className="subtitle">
            Manage many novels, group them into series, and run local agents against inspectable packets instead of opaque chats.
          </p>
        </div>
        <div className="status-card">
          <span>{snapshot.activeProject?.name ?? 'No project loaded'}</span>
          <strong>{snapshot.activeProject ? `${snapshot.artifacts.length} artifacts in the active project` : 'Create or load a project'}</strong>
          <small>{activeSeries ? `Series: ${activeSeries.name}` : 'Standalone project'}</small>
          <small>{providerSummary}</small>
        </div>
      </header>

      <section className="action-bar">
        <button onClick={() => setActiveView('workspace')}>Project Workspace</button>
        <button onClick={() => setActiveView('series')}>Series Tracker</button>
        <button onClick={() => setActiveView('packet')}>Packet Builder</button>
        <button onClick={() => setActiveView('diff')}>Artifact Diff</button>
        <button onClick={() => setActiveView('canon')}>Canon Review</button>
        <button onClick={() => setActiveView('agents')}>Agent Library</button>
        <button onClick={() => setActiveView('mcp')}>MCP Inspector</button>
        <button onClick={() => setActiveView('settings')}>Runtime Settings</button>
        <button onClick={() => setActiveView('devtools')}>Dev Tools</button>
        <button onClick={() => runAction(() => window.studioApi.setProviderMode(snapshot.providerMode === 'mock' ? snapshot.providerSettings.provider : 'mock'))}>
          Provider: {snapshot.providerMode === 'mock' ? `Use ${snapshot.providerSettings.provider}` : 'Switch to Mock'}
        </button>
        <button onClick={() => runAction(() => window.studioApi.refreshProviderStatus(), 'settings')}>Refresh Provider</button>
        <button
          disabled={!chapterPlan}
          onClick={() => chapterPlan && runAction(() => window.studioApi.buildPacket(chapterPlan.metadata.id), 'packet')}
        >
          Create packet
        </button>
        <button
          disabled={!chapterPlan}
          onClick={() => chapterPlan && runAction(() => window.studioApi.runDrafting(chapterPlan.metadata.id), 'workspace')}
        >
          Run agent
        </button>
        <button
          disabled={!selectedArtifact || selectedArtifact.metadata.type !== 'chapter_draft'}
          onClick={() => selectedArtifact && runAction(() => window.studioApi.runContinuity(selectedArtifact.metadata.id), 'canon')}
        >
          Check continuity
        </button>
        <button
          disabled={!selectedArtifact}
          onClick={() => selectedArtifact && runAction(() => window.studioApi.saveArtifactText(selectedArtifact.metadata.id, draftText))}
        >
          Save version
        </button>
        <button
          disabled={!selectedArtifact}
          onClick={() => selectedArtifact && runAction(() => window.studioApi.promoteToCanon(selectedArtifact.metadata.id), 'canon')}
        >
          Promote to canon
        </button>
        <button
          disabled={!selectedArtifact}
          onClick={() =>
            selectedArtifact &&
            runAction(() => window.studioApi.branchArtifact(selectedArtifact.metadata.id, `${selectedArtifact.metadata.title} Branch`))
          }
        >
          Branch artifact
        </button>
        <button
          disabled={!selectedArtifact || relatedVersions.length === 0}
          onClick={() =>
            selectedArtifact &&
            relatedVersions[0] &&
            runAction(() => window.studioApi.diffArtifacts(relatedVersions[0].metadata.id, selectedArtifact.metadata.id), 'diff')
          }
        >
          Compare versions
        </button>
      </section>

      <section className="toolbar-row toolbar-grid">
        <div className="stack-card">
          <p className="eyebrow">New Project</p>
          <div className="project-create">
            <input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Project name" />
            <input
              value={newProjectDescription}
              onChange={(event) => setNewProjectDescription(event.target.value)}
              placeholder="Short project description"
            />
            <select value={newProjectSeriesSlug} onChange={(event) => setNewProjectSeriesSlug(event.target.value)}>
              <option value="">Standalone project</option>
              {snapshot.series.map((series) => (
                <option key={series.slug} value={series.slug}>
                  {series.name}
                </option>
              ))}
            </select>
            <input value={newProjectSeriesOrder} onChange={(event) => setNewProjectSeriesOrder(event.target.value)} placeholder="Series order" />
            <button
              onClick={() =>
                runAction(() =>
                  window.studioApi.createProject({
                    name: newProjectName,
                    description: newProjectDescription,
                    seriesSlug: newProjectSeriesSlug || null,
                    seriesOrder: newProjectSeriesSlug ? Number(newProjectSeriesOrder || '1') : null,
                  }),
                )
              }
            >
              Create project
            </button>
          </div>
        </div>

        <div className="stack-card">
          <p className="eyebrow">New Series</p>
          <div className="project-create">
            <input value={newSeriesName} onChange={(event) => setNewSeriesName(event.target.value)} placeholder="Series name" />
            <input
              value={newSeriesDescription}
              onChange={(event) => setNewSeriesDescription(event.target.value)}
              placeholder="Series description"
            />
            <button onClick={() => runAction(() => window.studioApi.createSeries({ name: newSeriesName, description: newSeriesDescription }), 'series')}>
              Create series
            </button>
          </div>
        </div>

        <div className="stack-card">
          <p className="eyebrow">Search</p>
          <div className="search-wrap">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search artifacts, statuses, or summaries" />
          </div>
        </div>
      </section>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {isLoading ? <div className="banner">Working...</div> : null}

      <main className={`workspace-grid view-${activeView}`}>
        <aside className="panel navigator">
          <div className="panel-header">
            <p className="eyebrow">Navigator</p>
            <h2>Series, projects, and artifacts</h2>
          </div>
          <div className="manifest-card">
            <strong>{snapshot.activeProject?.name ?? 'No project selected'}</strong>
            <span>{snapshot.activeProject?.description ?? 'Bootstrap or create a project to begin.'}</span>
            <small>{snapshot.workspaceRoot}</small>
          </div>

          <div className="catalog-group">
            <h3>Series</h3>
            <div className="catalog-list">
              {snapshot.series.map((series) => (
                <article key={series.slug} className={series.slug === snapshot.activeProject?.seriesSlug ? 'catalog-card selected' : 'catalog-card'}>
                  <strong>{series.name}</strong>
                  <span>{series.description}</span>
                  <small>{orderedProjectsForSeries(snapshot, series.slug).length} project(s)</small>
                </article>
              ))}
            </div>
          </div>

          <div className="catalog-group">
            <h3>Projects</h3>
            <div className="catalog-list">
              {snapshot.projects.map((project) => (
                <button
                  key={project.slug}
                  className={project.slug === snapshot.activeProject?.slug ? 'catalog-card selected' : 'catalog-card'}
                  onClick={() => runAction(() => window.studioApi.loadProject(project.slug), 'workspace')}
                >
                  <strong>{project.name}</strong>
                  <span>{project.description}</span>
                  <small>
                    {project.seriesSlug ? `Series ${project.seriesOrder ?? '?'} in ${project.seriesSlug}` : 'Standalone'}
                  </small>
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-group">
            <h3>Artifacts</h3>
            <div className="artifact-list">
              {filteredArtifacts.map((artifact) => (
                <button
                  key={artifact.metadata.id}
                  className={artifact.metadata.id === snapshot.selectedArtifactId ? 'artifact-row selected' : 'artifact-row'}
                  onClick={() => runAction(() => window.studioApi.selectArtifact(artifact.metadata.id), 'workspace')}
                >
                  <span>{artifact.metadata.title}</span>
                  <small>
                    {artifact.metadata.type} | {artifact.metadata.status} | v{artifact.metadata.version}
                  </small>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel editor">
          <div className="panel-header">
            <p className="eyebrow">Editor</p>
            <h2>{selectedArtifact?.metadata.title ?? 'Select an artifact'}</h2>
          </div>
          {selectedArtifact ? (
            <>
              <div className="meta-row">
                <span>{selectedArtifact.metadata.type}</span>
                <span>{selectedArtifact.metadata.status}</span>
                <span>Updated by {selectedArtifact.metadata.updatedBy}</span>
              </div>
              <textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} spellCheck={false} />
            </>
          ) : (
            <div className="empty-state">Choose an artifact to inspect or edit.</div>
          )}
        </section>

        <section className="panel agent-console">
          <div className="panel-header">
            <p className="eyebrow">Agent Console</p>
            <h2>Specialist operators</h2>
          </div>
          <div className="agent-stack">
            {snapshot.agents.map((agent) => (
              <article key={agent.id} className="agent-card">
                <header>
                  <strong>{agent.name}</strong>
                  <span>{agent.primaryModel}</span>
                </header>
                <p>{agent.mission}</p>
                <small>Writes: {agent.writes.join(', ')}</small>
              </article>
            ))}
          </div>
          <div className="agent-actions">
            <p className="provider-note">
              Provider mode is <strong>{snapshot.providerMode}</strong>. Provider availability: {snapshot.providerStatus.available ? 'ready' : 'not ready'}.
            </p>
            <button
              disabled={!chapterPlan}
              onClick={() => chapterPlan && runAction(() => window.studioApi.buildPacket(chapterPlan.metadata.id), 'packet')}
            >
              Preview packet
            </button>
            <button
              disabled={!chapterPlan}
              onClick={() => chapterPlan && runAction(() => window.studioApi.runDrafting(chapterPlan.metadata.id))}
            >
              Draft from packet
            </button>
            <button
              disabled={!selectedArtifact || selectedArtifact.metadata.type !== 'chapter_draft'}
              onClick={() => selectedArtifact && runAction(() => window.studioApi.runContinuity(selectedArtifact.metadata.id), 'canon')}
            >
              Review continuity
            </button>
          </div>
        </section>

        <aside className="panel reference-stack">
          <div className="panel-header">
            <p className="eyebrow">Reference Stack</p>
            <h2>Packets, runtime, canon, and series state</h2>
          </div>

          {activeView === 'packet' && snapshot.packetPreview ? (
            <div className="reference-section">
              <h3>Packet preview</h3>
              <pre>{JSON.stringify(snapshot.packetPreview, null, 2)}</pre>
            </div>
          ) : null}

          {activeView === 'diff' ? (
            <div className="reference-section">
              <h3>Artifact diff</h3>
              <pre>{snapshot.lastDiff ?? 'Select an artifact with an earlier version to compare.'}</pre>
            </div>
          ) : null}

          {activeView === 'canon' ? (
            <div className="reference-section">
              <h3>Canon review</h3>
              <p>{snapshot.canonReviewSummary ?? 'Promote an approved artifact to canon to generate a review summary.'}</p>
              <ul>
                {snapshot.continuityFindings.map((finding) => (
                  <li key={`${finding.severity}-${finding.message}`} className={finding.severity === 'error' ? 'finding-error' : 'finding-warning'}>
                    {finding.severity.toUpperCase()}: {finding.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {activeView === 'agents' ? (
            <div className="reference-section">
              <h3>Agent library</h3>
              <p>Eight permanent agents are defined, with their write scopes and forbidden actions visible in the workspace.</p>
              <ul>
                {snapshot.agents.map((agent) => (
                  <li key={agent.id}>
                    <strong>{agent.name}:</strong> {agent.forbiddenActions.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {activeView === 'series' ? (
            <div className="reference-section">
              <h3>Series tracker</h3>
              <p>{activeSeries ? activeSeries.description : 'Assign the active project to a series or keep it standalone.'}</p>
              <div className="assignment-form">
                <select value={seriesAssignmentSlug} onChange={(event) => setSeriesAssignmentSlug(event.target.value)}>
                  <option value="">No series</option>
                  {snapshot.series.map((series) => (
                    <option key={series.slug} value={series.slug}>
                      {series.name}
                    </option>
                  ))}
                </select>
                <input value={seriesAssignmentOrder} onChange={(event) => setSeriesAssignmentOrder(event.target.value)} placeholder="Series order" />
                <button
                  disabled={!snapshot.activeProject || !seriesAssignmentSlug}
                  onClick={() =>
                    snapshot.activeProject
                      ? runAction(
                          () =>
                            window.studioApi.assignProjectToSeries({
                              projectSlug: snapshot.activeProject!.slug,
                              seriesSlug: seriesAssignmentSlug,
                              seriesOrder: Number(seriesAssignmentOrder || '1'),
                            }),
                          'series',
                        )
                      : undefined
                  }
                >
                  Assign project
                </button>
              </div>
              <div className="series-list">
                {snapshot.series.map((series) => (
                  <article key={series.slug} className="reference-section nested-section">
                    <h3>{series.name}</h3>
                    <p>{series.description}</p>
                    <ul>
                      {orderedProjectsForSeries(snapshot, series.slug).map((project) => (
                        <li key={project.slug}>
                          Book {project.seriesOrder ?? '?'}: {project.name}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeView === 'settings' ? (
            <div className="reference-section">
              <h3>Provider runtime</h3>
              <div className="settings-form">
                <label>
                  Provider
                  <select value={providerChoice} onChange={(event) => setProviderChoice(event.target.value as typeof providerChoice)}>
                    <option value="ollama">Ollama</option>
                    <option value="openai-compatible">OpenAI-compatible</option>
                    <option value="lmstudio">LM Studio</option>
                    <option value="jan">Jan</option>
                    <option value="localai">LocalAI</option>
                    <option value="vllm">vLLM</option>
                    <option value="sglang">SGLang</option>
                    <option value="llama.cpp">llama.cpp</option>
                    <option value="mlx-lm">MLX LM</option>
                    <option value="docker-model-runner">Docker Model Runner</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </label>
                <label>
                  Base URL
                  <input value={providerBaseUrl} onChange={(event) => setProviderBaseUrl(event.target.value)} />
                </label>
                <label>
                  Model
                  <input value={providerModel} onChange={(event) => setProviderModel(event.target.value)} />
                </label>
                <label>
                  API key
                  <input value={providerApiKey} onChange={(event) => setProviderApiKey(event.target.value)} />
                </label>
                <label>
                  Timeout (ms)
                  <input value={providerTimeoutMs} onChange={(event) => setProviderTimeoutMs(event.target.value)} />
                </label>
                <label>
                  Max retries
                  <input value={providerMaxRetries} onChange={(event) => setProviderMaxRetries(event.target.value)} />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={providerFallbackToMock} onChange={(event) => setProviderFallbackToMock(event.target.checked)} />
                  Fallback to mock provider when the runtime provider is unavailable
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={providerThinking} onChange={(event) => setProviderThinking(event.target.checked)} />
                  Enable provider thinking when supported
                </label>
                <div className="inline-actions">
                  <button
                    onClick={() =>
                      runAction(
                        () =>
                          window.studioApi.saveProviderSettings({
                            provider: providerChoice,
                            baseUrl: providerBaseUrl,
                            model: providerModel,
                            apiKey: providerApiKey,
                            timeoutMs: Number(providerTimeoutMs || '30000'),
                            maxRetries: Number(providerMaxRetries || '2'),
                            fallbackToMock: providerFallbackToMock,
                            thinking: providerThinking,
                          }),
                        'settings',
                      )
                    }
                  >
                    Save runtime settings
                  </button>
                  <button onClick={() => runAction(() => window.studioApi.refreshProviderStatus(), 'settings')}>Probe provider</button>
                </div>
              </div>
              <ul>
                <li>Status: {snapshot.providerStatus.available ? 'available' : 'unavailable'}</li>
                <li>Provider: {snapshot.providerStatus.displayName}</li>
                <li>Last checked: {snapshot.providerStatus.lastCheckedAt ?? 'Never'}</li>
                <li>Models found: {snapshot.providerStatus.models.join(', ') || 'none detected'}</li>
                <li>Missing required models: {snapshot.providerStatus.missingModels.join(', ') || 'none'}</li>
                <li>Last error: {snapshot.providerStatus.lastError ?? 'none'}</li>
              </ul>
            </div>
          ) : null}

          {activeView === 'mcp' ? (
            <div className="reference-section">
              <h3>MCP Inspector</h3>
              <p>The app remains host-centered, but these MCP capability domains now back project library, retrieval, and planning flows.</p>
              <div className="series-list">
                <article className="reference-section nested-section">
                  <h3>Servers</h3>
                  {snapshot.mcp.servers.length > 0 ? (
                    <pre>{JSON.stringify(snapshot.mcp.servers, null, 2)}</pre>
                  ) : (
                    <p>No MCP servers registered.</p>
                  )}
                </article>
                <article className="reference-section nested-section">
                  <h3>Last Context Pack</h3>
                  {snapshot.mcp.lastContextPack ? (
                    <pre>{JSON.stringify(snapshot.mcp.lastContextPack, null, 2)}</pre>
                  ) : (
                    <p>No context pack has been assembled through MCP yet.</p>
                  )}
                </article>
                <article className="reference-section nested-section">
                  <h3>Recent MCP Activity</h3>
                  {snapshot.mcp.recentActivity.length > 0 ? (
                    <pre>{JSON.stringify(snapshot.mcp.recentActivity.slice(0, 30), null, 2)}</pre>
                  ) : (
                    <p>No MCP activity recorded yet.</p>
                  )}
                </article>
              </div>
            </div>
          ) : null}

          {activeView === 'devtools' ? (
            <div className="reference-section">
              <h3>Dev Tools</h3>
              <div className="settings-form">
                <label className="checkbox-row">
                  <input type="checkbox" checked={verboseLogging} onChange={(event) => setVerboseLogging(event.target.checked)} />
                  Verbose logging
                </label>
                <div className="inline-actions">
                  <button onClick={() => runAction(() => window.studioApi.setVerboseLogging(verboseLogging), 'devtools')}>
                    Save logging mode
                  </button>
                  <button onClick={() => runAction(() => window.studioApi.exportDebugBundle(), 'devtools')}>
                    Export debug bundle
                  </button>
                </div>
              </div>
              <ul>
                <li>Log directory: {snapshot.devTools.logDirectory || 'Unavailable'}</li>
                <li>App log: {snapshot.devTools.appLogPath || 'Unavailable'}</li>
                <li>Error log: {snapshot.devTools.errorLogPath || 'Unavailable'}</li>
                <li>Session log: {snapshot.devTools.sessionLogPath || 'Unavailable'}</li>
                <li>Last bundle: {snapshot.devTools.lastBundlePath ?? 'No bundle exported yet'}</li>
              </ul>
              <div className="series-list">
                <article className="reference-section nested-section">
                  <h3>Distilled Diagnostics</h3>
                  <pre>{JSON.stringify(snapshot.devTools.distilledDiagnostics, null, 2)}</pre>
                </article>
                <article className="reference-section nested-section">
                  <h3>Recent Errors</h3>
                  {snapshot.devTools.recentErrors.length > 0 ? (
                    <pre>{JSON.stringify(snapshot.devTools.recentErrors.slice(0, 20), null, 2)}</pre>
                  ) : (
                    <p>No recent errors captured.</p>
                  )}
                </article>
                <article className="reference-section nested-section">
                  <h3>Recent Events</h3>
                  {snapshot.devTools.recentEntries.length > 0 ? (
                    <pre>{JSON.stringify(snapshot.devTools.recentEntries.slice(0, 30), null, 2)}</pre>
                  ) : (
                    <p>No events captured yet.</p>
                  )}
                </article>
                <article className="reference-section nested-section">
                  <h3>Action Metrics</h3>
                  {snapshot.devTools.actionMetrics.length > 0 ? (
                    <pre>{JSON.stringify(snapshot.devTools.actionMetrics, null, 2)}</pre>
                  ) : (
                    <p>No action metrics recorded yet.</p>
                  )}
                </article>
              </div>
            </div>
          ) : null}

          {activeView === 'workspace' ? (
            <div className="reference-section">
              <h3>In-context guidance</h3>
              <p>Packet preview, series context, and continuity warnings stay visible while the artifact remains center stage.</p>
              {snapshot.packetPreview ? <pre>{JSON.stringify(snapshot.packetPreview, null, 2)}</pre> : <p>No packet has been built yet.</p>}
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
