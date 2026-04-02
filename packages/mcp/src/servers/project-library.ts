import type { McpPromptDefinition, McpResourceDefinition, McpToolDefinition, McpServerInfo } from '../types';

export const projectLibraryServerInfo: McpServerInfo = {
  id: 'project-library',
  name: 'Project Library Server',
  description: 'Exposes project manifests, documents, searches, working sets, and version registration.',
  tools: [
    'get_project_manifest',
    'list_project_documents',
    'read_document',
    'read_document_section',
    'search_documents',
    'get_active_working_set',
    'register_document_version',
  ],
  resources: [
    'quills://projects',
    'quills://project/{projectSlug}/manifest',
    'quills://project/{projectSlug}/documents',
  ],
  prompts: [
    'project-working-set-review',
    'chapter-context-request',
  ],
};

export const projectLibraryTools: McpToolDefinition[] = projectLibraryServerInfo.tools.map((name) => ({
  name,
  title: name.replaceAll('_', ' '),
  description: `Project Library tool: ${name}`,
}));

export const projectLibraryResources: McpResourceDefinition[] = [
  {
    uri: 'quills://projects',
    name: 'projects',
    title: 'Project Catalog',
    description: 'Lists every project known to the Writing Studio.',
    mimeType: 'application/json',
  },
  {
    uri: 'quills://project/{projectSlug}/manifest',
    name: 'project-manifest',
    title: 'Project Manifest',
    description: 'Project manifest metadata for a specific project.',
    mimeType: 'application/json',
  },
  {
    uri: 'quills://project/{projectSlug}/documents',
    name: 'project-documents',
    title: 'Project Documents',
    description: 'Artifact catalog for a specific project.',
    mimeType: 'application/json',
  },
];

export const projectLibraryPrompts: McpPromptDefinition[] = [
  {
    name: 'project-working-set-review',
    title: 'Project Working Set Review',
    description: 'Prompt template for reviewing the current working set before planning or drafting.',
  },
  {
    name: 'chapter-context-request',
    title: 'Chapter Context Request',
    description: 'Prompt template for requesting chapter-specific context from the library.',
  },
];
