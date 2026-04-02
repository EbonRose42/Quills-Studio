import { ProjectLibraryService } from './services/project-library';
import { ContinuityRetrievalService } from './services/continuity-retrieval';
import { PlanningToolsService } from './services/planning-tools';
import {
  projectLibraryPrompts,
  projectLibraryResources,
  projectLibraryServerInfo,
  projectLibraryTools,
} from './servers/project-library';
import {
  continuityRetrievalPrompts,
  continuityRetrievalResources,
  continuityRetrievalServerInfo,
  continuityRetrievalTools,
} from './servers/continuity-retrieval';
import {
  planningPrompts,
  planningResources,
  planningTools,
  planningToolsServerInfo,
} from './servers/planning-tools';
import { arcMapTemplate, beatSheetTemplate, sceneCardTemplate } from './templates/planning';
import type {
  ContextPack,
  McpActivityEntry,
  McpHostSnapshot,
  McpPromptDefinition,
  McpResourceDefinition,
  McpServerId,
  McpToolDefinition,
} from './types';

interface HostOptions {
  workspaceRoot: string;
  onActivity?: (entry: McpActivityEntry) => void | Promise<void>;
}

function now(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class WritingStudioMcpHost {
  private readonly projectLibrary: ProjectLibraryService;
  private readonly continuity: ContinuityRetrievalService;
  private readonly planning: PlanningToolsService;
  private readonly recentActivity: McpActivityEntry[] = [];
  private lastContextPack: ContextPack | null = null;
  private readonly onActivity?: HostOptions['onActivity'];

  constructor(options: HostOptions) {
    this.projectLibrary = new ProjectLibraryService(options.workspaceRoot);
    this.continuity = new ContinuityRetrievalService(options.workspaceRoot);
    this.planning = new PlanningToolsService(options.workspaceRoot);
    this.onActivity = options.onActivity;
  }

  getSnapshot(): McpHostSnapshot {
    return {
      servers: [projectLibraryServerInfo, continuityRetrievalServerInfo, planningToolsServerInfo],
      recentActivity: [...this.recentActivity],
      lastContextPack: this.lastContextPack,
    };
  }

  listTools(serverId: McpServerId): McpToolDefinition[] {
    if (serverId === 'project-library') return projectLibraryTools;
    if (serverId === 'continuity-retrieval') return continuityRetrievalTools;
    return planningTools;
  }

  listResources(serverId: McpServerId): McpResourceDefinition[] {
    if (serverId === 'project-library') return projectLibraryResources;
    if (serverId === 'continuity-retrieval') return continuityRetrievalResources;
    return planningResources;
  }

  listPrompts(serverId: McpServerId): McpPromptDefinition[] {
    if (serverId === 'project-library') return projectLibraryPrompts;
    if (serverId === 'continuity-retrieval') return continuityRetrievalPrompts;
    return planningPrompts;
  }

  async callTool(serverId: McpServerId, toolName: string, input: Record<string, unknown>): Promise<unknown> {
    const startedAt = Date.now();
    try {
      let result: unknown;
      if (serverId === 'project-library') {
        result = await this.callProjectLibraryTool(toolName, input);
      } else if (serverId === 'continuity-retrieval') {
        result = await this.callContinuityTool(toolName, input);
      } else {
        result = await this.callPlanningTool(toolName, input);
      }
      await this.recordActivity(serverId, 'tool', toolName, 'call', 'success', Date.now() - startedAt, { input });
      return result;
    } catch (error) {
      await this.recordActivity(serverId, 'tool', toolName, 'call', 'failure', Date.now() - startedAt, {
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async readResource(serverId: McpServerId, uri: string, input: Record<string, unknown>): Promise<unknown> {
    const startedAt = Date.now();
    try {
      let result: unknown;
      if (serverId === 'project-library') result = await this.readProjectLibraryResource(uri, input);
      else if (serverId === 'continuity-retrieval') result = await this.readContinuityResource(uri, input);
      else result = this.readPlanningResource(uri);
      await this.recordActivity(serverId, 'resource', uri, 'read', 'success', Date.now() - startedAt, { input });
      return result;
    } catch (error) {
      await this.recordActivity(serverId, 'resource', uri, 'read', 'failure', Date.now() - startedAt, {
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getPrompt(serverId: McpServerId, promptName: string, input: Record<string, unknown>): Promise<{ description: string; messages: string[] }> {
    const startedAt = Date.now();
    try {
      const result = this.buildPrompt(serverId, promptName, input);
      await this.recordActivity(serverId, 'prompt', promptName, 'get', 'success', Date.now() - startedAt, { input });
      return result;
    } catch (error) {
      await this.recordActivity(serverId, 'prompt', promptName, 'get', 'failure', Date.now() - startedAt, {
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async callProjectLibraryTool(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    const projectSlug = String(input.projectSlug ?? '');
    switch (toolName) {
      case 'get_project_manifest': return this.projectLibrary.getProjectManifest(projectSlug);
      case 'list_project_documents': return this.projectLibrary.listProjectDocuments(projectSlug, input.folderOrType ? String(input.folderOrType) : undefined);
      case 'read_document': return this.projectLibrary.readDocument(projectSlug, String(input.documentId));
      case 'read_document_section': return this.projectLibrary.readDocumentSection(projectSlug, String(input.documentId), String(input.selector));
      case 'search_documents': return this.projectLibrary.searchDocuments(projectSlug, String(input.query), Array.isArray(input.filters) ? input.filters.map(String) : undefined);
      case 'get_active_working_set': return this.projectLibrary.getActiveWorkingSet(projectSlug, String(input.taskType));
      case 'register_document_version': return this.projectLibrary.registerDocumentVersion(projectSlug, String(input.documentId), String(input.text), String(input.note ?? 'Registered via MCP Project Library tool.'));
      default: throw new Error(`Unknown Project Library tool: ${toolName}`);
    }
  }

  private async callContinuityTool(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    const projectSlug = String(input.projectSlug ?? '');
    switch (toolName) {
      case 'keyword_search': return this.continuity.keywordSearch(projectSlug, String(input.query), Array.isArray(input.filters) ? input.filters.map(String) : undefined);
      case 'semantic_search': return this.continuity.semanticSearch(projectSlug, String(input.query), Number(input.topK ?? 8), Array.isArray(input.filters) ? input.filters.map(String) : undefined);
      case 'build_context_pack': {
        const contextPack = await this.continuity.buildContextPack(projectSlug, String(input.taskType), String(input.targetId));
        this.lastContextPack = contextPack;
        return contextPack;
      }
      case 'validate_chapter_continuity': {
        const result = await this.continuity.validateChapterContinuity(projectSlug, String(input.chapterPlanId), input.draftText ? String(input.draftText) : undefined);
        this.lastContextPack = result.contextPack;
        return result;
      }
      case 'compare_against_canon': return this.continuity.compareAgainstCanon(projectSlug, String(input.textOrDocId));
      case 'list_unresolved_threads': return this.continuity.listUnresolvedThreads(projectSlug);
      case 'get_entity_timeline': return this.continuity.getEntityTimeline(projectSlug, String(input.entityId));
      case 'diff_versions': return this.continuity.diffVersions(projectSlug, String(input.leftId), String(input.rightId));
      default: throw new Error(`Unknown Continuity + Retrieval tool: ${toolName}`);
    }
  }

  private async callPlanningTool(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    const projectSlug = String(input.projectSlug ?? '');
    switch (toolName) {
      case 'generate_book_outline': return this.planning.generateBookOutline(projectSlug, String(input.title), String(input.premise));
      case 'decompose_chapter_to_beats': return this.planning.decomposeChapterToBeats(projectSlug, String(input.chapterPlanId));
      case 'expand_beat_to_scene_card': return this.planning.expandBeatToSceneCard(String(input.beatText), String(input.viewpoint));
      case 'generate_scene_sequence': return this.planning.generateSceneSequence(projectSlug, String(input.chapterPlanId));
      case 'extract_plot_threads': return this.planning.extractPlotThreads(projectSlug, String(input.documentId));
      case 'assign_scene_objectives': return this.planning.assignSceneObjectives(String(input.sceneDescription));
      case 'build_character_arc_map': return this.planning.buildCharacterArcMap(projectSlug, String(input.characterId));
      case 'check_outline_balance': return this.planning.checkOutlineBalance(projectSlug, String(input.chapterPlanId));
      case 'propose_missing_bridge_scenes': return this.planning.proposeMissingBridgeScenes(projectSlug, String(input.chapterPlanId));
      default: throw new Error(`Unknown Planning Tools tool: ${toolName}`);
    }
  }

  private async readProjectLibraryResource(uri: string, input: Record<string, unknown>): Promise<unknown> {
    if (uri === 'quills://projects') return this.projectLibrary.listProjects();
    if (uri.endsWith('/manifest')) return this.projectLibrary.getProjectManifest(String(input.projectSlug));
    if (uri.endsWith('/documents')) return this.projectLibrary.listProjectDocuments(String(input.projectSlug));
    throw new Error(`Unknown Project Library resource: ${uri}`);
  }

  private async readContinuityResource(uri: string, input: Record<string, unknown>): Promise<unknown> {
    const projectSlug = String(input.projectSlug ?? '');
    if (uri.endsWith('/canon-ledger')) return this.projectLibrary.listProjectDocuments(projectSlug, 'canon_snapshot');
    if (uri.endsWith('/unresolved-threads')) return this.continuity.listUnresolvedThreads(projectSlug);
    if (uri.endsWith('/retrieval-stats')) return this.continuity.retrievalStats(projectSlug);
    throw new Error(`Unknown Continuity + Retrieval resource: ${uri}`);
  }

  private readPlanningResource(uri: string): unknown {
    if (uri.endsWith('/scene-card')) return sceneCardTemplate;
    if (uri.endsWith('/beat-sheet')) return beatSheetTemplate;
    if (uri.endsWith('/arc-map')) return arcMapTemplate;
    throw new Error(`Unknown Planning Tools resource: ${uri}`);
  }

  private buildPrompt(serverId: McpServerId, promptName: string, input: Record<string, unknown>): { description: string; messages: string[] } {
    if (serverId === 'project-library') {
      if (promptName === 'project-working-set-review') {
        return { description: 'Review the active working set before moving into planning or drafting.', messages: [`Review project ${String(input.projectSlug)}.`, 'Summarize the active working set, identify missing context, and note stale artifacts before work begins.'] };
      }
      return { description: 'Request chapter-specific library context.', messages: [`Assemble the most relevant documents for ${String(input.targetId)} in project ${String(input.projectSlug)}.`, 'Explain why each document belongs in the working set.'] };
    }
    if (serverId === 'continuity-retrieval') {
      if (promptName === 'continuity-review') {
        return { description: 'Run a continuity review against canon.', messages: [`Review ${String(input.targetId)} for contradictions against current canon.`, 'List continuity risks, missing callbacks, and unresolved thread impacts.'] };
      }
      return { description: 'Explain context pack assembly.', messages: [`Explain the context pack built for ${String(input.targetId)} in project ${String(input.projectSlug)}.`, 'Justify each included resource and each warning.'] };
    }
    if (promptName === 'chapter-to-beats') {
      return { description: 'Turn a chapter plan into beats.', messages: [`Decompose chapter plan ${String(input.chapterPlanId)} into beats.`, 'Preserve escalation, reveal, and exit hook.'] };
    }
    if (promptName === 'beat-to-scene-card') {
      return { description: 'Expand a beat into a scene card.', messages: [`Expand the beat "${String(input.beatText)}" into a scene card.`, 'Include objective, obstacle, turn, emotional shift, and exit hook.'] };
    }
    return { description: 'Review pacing and bridge-scene needs.', messages: [`Review chapter plan ${String(input.chapterPlanId)} for pacing and bridge-scene needs.`, 'Flag thin transitions and missing connective tissue.'] };
  }

  private async recordActivity(serverId: McpServerId, operation: McpActivityEntry['operation'], name: string, action: McpActivityEntry['action'], status: McpActivityEntry['status'], durationMs: number, context: Record<string, unknown>): Promise<void> {
    const entry: McpActivityEntry = {
      id: makeId('mcp'),
      timestamp: now(),
      serverId,
      operation,
      name,
      action,
      status,
      durationMs,
      summary: `${serverId} ${operation} ${action} ${status}`,
      context,
    };
    this.recentActivity.unshift(entry);
    if (this.recentActivity.length > 200) this.recentActivity.length = 200;
    await this.onActivity?.(entry);
  }
}
