#!/usr/bin/env node
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ContinuityRetrievalService } from '../services/continuity-retrieval';

const workspaceRoot = process.cwd();
const service = new ContinuityRetrievalService(workspaceRoot);
const server = new McpServer({
  name: 'quills-continuity-retrieval',
  version: '0.1.0',
});

server.registerTool('keyword_search', {
  description: 'Keyword-search project artifacts.',
  inputSchema: {
    projectSlug: z.string(),
    query: z.string(),
    filters: z.array(z.string()).optional(),
  },
}, async ({ projectSlug, query, filters }) => {
  const results = await service.keywordSearch(projectSlug, query, filters);
  return {
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    structuredContent: { results },
  };
});

server.registerTool('semantic_search', {
  description: 'Run lightweight semantic-style retrieval across project artifacts.',
  inputSchema: {
    projectSlug: z.string(),
    query: z.string(),
    topK: z.number().optional(),
    filters: z.array(z.string()).optional(),
  },
}, async ({ projectSlug, query, topK, filters }) => {
  const results = await service.semanticSearch(projectSlug, query, topK, filters);
  return {
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    structuredContent: { results },
  };
});

server.registerTool('build_context_pack', {
  description: 'Build a compact context pack for a drafting or planning task.',
  inputSchema: {
    projectSlug: z.string(),
    taskType: z.string(),
    targetId: z.string(),
  },
}, async ({ projectSlug, taskType, targetId }) => {
  const contextPack = await service.buildContextPack(projectSlug, taskType, targetId);
  return {
    content: [{ type: 'text', text: JSON.stringify(contextPack, null, 2) }],
    structuredContent: contextPack as unknown as Record<string, unknown>,
  };
});

server.registerTool('validate_chapter_continuity', {
  description: 'Validate a chapter plan and optional draft text against canon.',
  inputSchema: {
    projectSlug: z.string(),
    chapterPlanId: z.string(),
    draftText: z.string().optional(),
  },
}, async ({ projectSlug, chapterPlanId, draftText }) => {
  const result = await service.validateChapterContinuity(projectSlug, chapterPlanId, draftText);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
});

server.registerTool('compare_against_canon', {
  description: 'Compare a text blob or document id against project canon.',
  inputSchema: {
    projectSlug: z.string(),
    textOrDocId: z.string(),
  },
}, async ({ projectSlug, textOrDocId }) => {
  const result = await service.compareAgainstCanon(projectSlug, textOrDocId);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
});

server.registerTool('list_unresolved_threads', {
  description: 'List unresolved threads discovered in project artifacts.',
  inputSchema: {
    projectSlug: z.string(),
  },
}, async ({ projectSlug }) => {
  const threads = await service.listUnresolvedThreads(projectSlug);
  return {
    content: [{ type: 'text', text: JSON.stringify(threads, null, 2) }],
    structuredContent: { threads },
  };
});

server.registerTool('get_entity_timeline', {
  description: 'Get a timeline of references for a character, location, or entity.',
  inputSchema: {
    projectSlug: z.string(),
    entityId: z.string(),
  },
}, async ({ projectSlug, entityId }) => {
  const timeline = await service.getEntityTimeline(projectSlug, entityId);
  return {
    content: [{ type: 'text', text: JSON.stringify(timeline, null, 2) }],
    structuredContent: { timeline },
  };
});

server.registerTool('diff_versions', {
  description: 'Diff two artifact versions.',
  inputSchema: {
    projectSlug: z.string(),
    leftId: z.string(),
    rightId: z.string(),
  },
}, async ({ projectSlug, leftId, rightId }) => {
  const diff = await service.diffVersions(projectSlug, leftId, rightId);
  return {
    content: [{ type: 'text', text: diff }],
  };
});

server.registerPrompt('continuity-review', {
  description: 'Review a target chapter or scene against canon and unresolved threads.',
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
        text: `Review ${targetId} in project ${projectSlug} against canon, unresolved threads, and recent continuity-sensitive facts.`,
      },
    },
  ],
}));

server.registerPrompt('context-pack-assembly', {
  description: 'Explain why a context pack was built the way it was.',
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
        text: `Explain the context pack that should be assembled for ${targetId} in project ${projectSlug}, including why each retrieved item belongs there.`,
      },
    },
  ],
}));

server.registerResource('retrieval-stats', 'quills://continuity/stats', {
  title: 'Retrieval Stats',
  description: 'Summarized retrieval counts for the active project set.',
  mimeType: 'application/json',
}, async () => ({
  contents: [{ uri: 'quills://continuity/stats', text: JSON.stringify({ note: 'Use retrieval-stats resource via host input context for a specific project.' }, null, 2) }],
}));

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Quills Continuity + Retrieval MCP server running on stdio');
}

main().catch((error) => {
  console.error('Continuity MCP server error:', error);
  process.exit(1);
});
