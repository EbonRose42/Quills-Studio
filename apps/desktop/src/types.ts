import type {
  AgentDefinition,
  ArtifactRecord,
  DraftingPacket,
  ProjectManifest,
  ProviderSettings,
  ProviderStatus,
  ProviderMode,
  SeriesManifest,
} from '@quills/shared';
import type { DevLogLevel, DevToolsSnapshot } from '@quills/devtools';
import type { McpHostSnapshot } from '@quills/mcp';

export interface ContinuityFinding {
  severity: 'warning' | 'error';
  message: string;
}

export interface StudioSnapshot {
  workspaceRoot: string;
  projects: ProjectManifest[];
  series: SeriesManifest[];
  activeProject: ProjectManifest | null;
  artifacts: ArtifactRecord[];
  agents: AgentDefinition[];
  providerMode: ProviderMode;
  providerSettings: ProviderSettings;
  providerStatus: ProviderStatus;
  packetPreview: DraftingPacket | null;
  selectedArtifactId: string | null;
  continuityFindings: ContinuityFinding[];
  lastDiff: string | null;
  canonReviewSummary: string | null;
  devTools: DevToolsSnapshot;
  mcp: McpHostSnapshot;
}

export interface StudioApi {
  loadStudio(): Promise<StudioSnapshot>;
  createProject(input: { name: string; description: string; seriesSlug?: string | null; seriesOrder?: number | null }): Promise<StudioSnapshot>;
  loadProject(projectSlug: string): Promise<StudioSnapshot>;
  createSeries(input: { name: string; description: string }): Promise<StudioSnapshot>;
  assignProjectToSeries(input: { projectSlug: string; seriesSlug: string; seriesOrder: number | null }): Promise<StudioSnapshot>;
  setProviderMode(mode: ProviderMode): Promise<StudioSnapshot>;
  saveProviderSettings(settings: ProviderSettings): Promise<StudioSnapshot>;
  refreshProviderStatus(): Promise<StudioSnapshot>;
  selectArtifact(artifactId: string): Promise<StudioSnapshot>;
  buildPacket(chapterPlanId: string): Promise<StudioSnapshot>;
  runDrafting(chapterPlanId: string): Promise<StudioSnapshot>;
  runContinuity(draftId: string): Promise<StudioSnapshot>;
  saveArtifactText(artifactId: string, text: string): Promise<StudioSnapshot>;
  promoteToCanon(artifactId: string): Promise<StudioSnapshot>;
  branchArtifact(artifactId: string, branchTitle: string): Promise<StudioSnapshot>;
  diffArtifacts(leftId: string, rightId: string): Promise<StudioSnapshot>;
  exportDebugBundle(): Promise<StudioSnapshot>;
  setVerboseLogging(enabled: boolean): Promise<StudioSnapshot>;
  recordRendererEvent(input: { level: DevLogLevel; message: string; context?: Record<string, unknown> }): Promise<StudioSnapshot>;
}

declare global {
  interface Window {
    studioApi: StudioApi;
  }
}
