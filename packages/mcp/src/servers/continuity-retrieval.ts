import type { McpPromptDefinition, McpResourceDefinition, McpToolDefinition, McpServerInfo } from '../types';

export const continuityRetrievalServerInfo: McpServerInfo = {
  id: 'continuity-retrieval',
  name: 'Continuity + Retrieval Server',
  description: 'Provides hybrid retrieval, context packs, continuity checks, canon comparison, and version diffs.',
  tools: [
    'keyword_search',
    'semantic_search',
    'build_context_pack',
    'validate_chapter_continuity',
    'compare_against_canon',
    'list_unresolved_threads',
    'get_entity_timeline',
    'diff_versions',
  ],
  resources: [
    'quills://project/{projectSlug}/canon-ledger',
    'quills://project/{projectSlug}/unresolved-threads',
    'quills://project/{projectSlug}/retrieval-stats',
  ],
  prompts: [
    'continuity-review',
    'context-pack-assembly',
  ],
};

export const continuityRetrievalTools: McpToolDefinition[] = continuityRetrievalServerInfo.tools.map((name) => ({
  name,
  title: name.replaceAll('_', ' '),
  description: `Continuity + Retrieval tool: ${name}`,
}));

export const continuityRetrievalResources: McpResourceDefinition[] = [
  {
    uri: 'quills://project/{projectSlug}/canon-ledger',
    name: 'canon-ledger',
    title: 'Canon Ledger',
    description: 'Canonical memory objects and canon snapshots for a project.',
    mimeType: 'application/json',
  },
  {
    uri: 'quills://project/{projectSlug}/unresolved-threads',
    name: 'unresolved-threads',
    title: 'Unresolved Threads',
    description: 'Open mysteries, promises, and unresolved thread records.',
    mimeType: 'application/json',
  },
  {
    uri: 'quills://project/{projectSlug}/retrieval-stats',
    name: 'retrieval-stats',
    title: 'Retrieval Stats',
    description: 'Counts and status for retrieval-facing project artifacts.',
    mimeType: 'application/json',
  },
];

export const continuityRetrievalPrompts: McpPromptDefinition[] = [
  {
    name: 'continuity-review',
    title: 'Continuity Review',
    description: 'Prompt template for reviewing a scene or chapter against canon.',
  },
  {
    name: 'context-pack-assembly',
    title: 'Context Pack Assembly',
    description: 'Prompt template for explaining why a context pack was assembled the way it was.',
  },
];
