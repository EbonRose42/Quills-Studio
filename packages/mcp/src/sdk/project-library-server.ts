#!/usr/bin/env node
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ProjectLibraryService } from '../services/project-library';

const workspaceRoot = process.cwd();
const service = new ProjectLibraryService(workspaceRoot);
const server = new McpServer({
  name: 'quills-project-library',
  version: '0.1.0',
});

server.registerTool('get_project_manifest', {
  description: 'Get the manifest for a Quills Studio project.',
  inputSchema: {
    projectSlug: z.string(),
  },
}, async ({ projectSlug }) => {
  const manifest = await service.getProjectManifest(projectSlug);
  return {
    content: [{ type: 'text', text: JSON.stringify(manifest, null, 2) }],
    structuredContent: manifest,
  };
});

server.registerTool('list_project_documents', {
  description: 'List project documents by optional artifact type.',
  inputSchema: {
    projectSlug: z.string(),
    folderOrType: z.string().optional(),
  },
}, async ({ projectSlug, folderOrType }) => {
  const artifacts = await service.listProjectDocuments(projectSlug, folderOrType);
  return {
    content: [{ type: 'text', text: JSON.stringify(artifacts, null, 2) }],
    structuredContent: { count: artifacts.length, artifacts },
  };
});

server.registerTool('read_document', {
  description: 'Read a Quills Studio document by id.',
  inputSchema: {
    projectSlug: z.string(),
    documentId: z.string(),
  },
}, async ({ projectSlug, documentId }) => {
  const artifact = await service.readDocument(projectSlug, documentId);
  return {
    content: [{ type: 'text', text: JSON.stringify(artifact, null, 2) }],
    structuredContent: artifact,
  };
});

server.registerTool('read_document_section', {
  description: 'Read a document section by heading or lines:start-end selector.',
  inputSchema: {
    projectSlug: z.string(),
    documentId: z.string(),
    selector: z.string(),
  },
}, async ({ projectSlug, documentId, selector }) => {
  const section = await service.readDocumentSection(projectSlug, documentId, selector);
  return {
    content: [{ type: 'text', text: section }],
  };
});

server.registerTool('search_documents', {
  description: 'Keyword-search Quills Studio documents.',
  inputSchema: {
    projectSlug: z.string(),
    query: z.string(),
    filters: z.array(z.string()).optional(),
  },
}, async ({ projectSlug, query, filters }) => {
  const results = await service.searchDocuments(projectSlug, query, filters);
  return {
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    structuredContent: { results },
  };
});

server.registerTool('get_active_working_set', {
  description: 'Return the active working set for a task type.',
  inputSchema: {
    projectSlug: z.string(),
    taskType: z.string(),
  },
}, async ({ projectSlug, taskType }) => {
  const workingSet = await service.getActiveWorkingSet(projectSlug, taskType);
  return {
    content: [{ type: 'text', text: JSON.stringify(workingSet, null, 2) }],
    structuredContent: { workingSet },
  };
});

server.registerTool('register_document_version', {
  description: 'Create a new version of a document with updated text.',
  inputSchema: {
    projectSlug: z.string(),
    documentId: z.string(),
    text: z.string(),
    note: z.string(),
  },
}, async ({ projectSlug, documentId, text, note }) => {
  const artifact = await service.registerDocumentVersion(projectSlug, documentId, text, note);
  return {
    content: [{ type: 'text', text: JSON.stringify(artifact, null, 2) }],
    structuredContent: artifact,
  };
});

server.registerPrompt('project-working-set-review', {
  description: 'Review a project working set before planning or drafting.',
  argsSchema: {
    projectSlug: z.string(),
  },
}, async ({ projectSlug }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Review the active working set for project ${projectSlug}. Summarize missing context, stale artifacts, and immediate risks before further generation.`,
      },
    },
  ],
}));

server.registerPrompt('chapter-context-request', {
  description: 'Request chapter-specific project context.',
  argsSchema: {
    projectSlug: z.string(),
    targetId: z.string(),
  },
}, async ({ projectSlug, targetId }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Assemble the most relevant project-library context for ${targetId} in project ${projectSlug}. Explain why each document matters.`,
      },
    },
  ],
}));

server.registerResource('project-catalog', 'quills://projects', {
  title: 'Project Catalog',
  description: 'All known Quills Studio projects.',
  mimeType: 'application/json',
}, async () => {
  const projects = await service.listProjects();
  return {
    contents: [{ uri: 'quills://projects', text: JSON.stringify(projects, null, 2) }],
  };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Quills Project Library MCP server running on stdio');
}

main().catch((error) => {
  console.error('Project Library MCP server error:', error);
  process.exit(1);
});
