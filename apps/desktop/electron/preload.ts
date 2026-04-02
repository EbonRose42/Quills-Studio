import { contextBridge, ipcRenderer } from 'electron';
import type { ProviderMode, ProviderSettings } from '@quills/shared';
import type { DevLogLevel } from '@quills/devtools';
import type { StudioApi } from '../src/types';

const api: StudioApi = {
  loadStudio: () => ipcRenderer.invoke('studio:load'),
  createProject: (input) => ipcRenderer.invoke('studio:create-project', input),
  loadProject: (projectSlug) => ipcRenderer.invoke('studio:load-project', projectSlug),
  createSeries: (input) => ipcRenderer.invoke('studio:create-series', input),
  assignProjectToSeries: (input) => ipcRenderer.invoke('studio:assign-project-to-series', input),
  setProviderMode: (mode: ProviderMode) => ipcRenderer.invoke('studio:set-provider-mode', mode),
  saveProviderSettings: (settings: ProviderSettings) => ipcRenderer.invoke('studio:save-provider-settings', settings),
  refreshProviderStatus: () => ipcRenderer.invoke('studio:refresh-provider-status'),
  selectArtifact: (artifactId) => ipcRenderer.invoke('studio:select-artifact', artifactId),
  buildPacket: (chapterPlanId) => ipcRenderer.invoke('studio:build-packet', chapterPlanId),
  runDrafting: (chapterPlanId) => ipcRenderer.invoke('studio:run-drafting', chapterPlanId),
  runContinuity: (draftId) => ipcRenderer.invoke('studio:run-continuity', draftId),
  saveArtifactText: (artifactId, text) => ipcRenderer.invoke('studio:save-artifact', { artifactId, text }),
  promoteToCanon: (artifactId) => ipcRenderer.invoke('studio:promote-canon', artifactId),
  branchArtifact: (artifactId, branchTitle) => ipcRenderer.invoke('studio:branch-artifact', { artifactId, branchTitle }),
  diffArtifacts: (leftId, rightId) => ipcRenderer.invoke('studio:diff-artifacts', { leftId, rightId }),
  exportDebugBundle: () => ipcRenderer.invoke('studio:export-debug-bundle'),
  setVerboseLogging: (enabled) => ipcRenderer.invoke('studio:set-verbose-logging', enabled),
  recordRendererEvent: (input: { level: DevLogLevel; message: string; context?: Record<string, unknown> }) =>
    ipcRenderer.invoke('studio:record-renderer-event', input),
};

contextBridge.exposeInMainWorld('studioApi', api);
