#!/usr/bin/env node
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PlanningToolsService } from '../services/planning-tools';
import { arcMapTemplate, beatSheetTemplate, sceneCardTemplate } from '../templates/planning';

const workspaceRoot = process.cwd();
const service = new PlanningToolsService(workspaceRoot);
const server = new McpServer({
  name: 'quills-planning-tools',
  version: '0.1.0',
});

server.registerTool('generate_book_outline', {
  description: 'Generate a simple three-act book outline scaffold.',
  inputSchema: {
    projectSlug: z.string(),
    title: z.string(),
    premise: z.string(),
  },
}, async ({ projectSlug, title, premise }) => {
  const outline = await service.generateBookOutline(projectSlug, title, premise);
  return {
    content: [{ type: 'text', text: JSON.stringify(outline, null, 2) }],
    structuredContent: outline,
  };
});

server.registerTool('decompose_chapter_to_beats', {
  description: 'Decompose a chapter plan into beats.',
  inputSchema: {
    projectSlug: z.string(),
    chapterPlanId: z.string(),
  },
}, async ({ projectSlug, chapterPlanId }) => {
  const beats = await service.decomposeChapterToBeats(projectSlug, chapterPlanId);
  return {
    content: [{ type: 'text', text: JSON.stringify(beats, null, 2) }],
    structuredContent: { beats },
  };
});

server.registerTool('expand_beat_to_scene_card', {
  description: 'Expand a single beat into a scene-card scaffold.',
  inputSchema: {
    beatText: z.string(),
    viewpoint: z.string(),
  },
}, async ({ beatText, viewpoint }) => {
  const sceneCard = await service.expandBeatToSceneCard(beatText, viewpoint);
  return {
    content: [{ type: 'text', text: JSON.stringify(sceneCard, null, 2) }],
    structuredContent: sceneCard,
  };
});

server.registerTool('generate_scene_sequence', {
  description: 'Generate a scene sequence from the chapter plan.',
  inputSchema: {
    projectSlug: z.string(),
    chapterPlanId: z.string(),
  },
}, async ({ projectSlug, chapterPlanId }) => {
  const sequence = await service.generateSceneSequence(projectSlug, chapterPlanId);
  return {
    content: [{ type: 'text', text: JSON.stringify(sequence, null, 2) }],
    structuredContent: { sequence },
  };
});

server.registerTool('extract_plot_threads', {
  description: 'Extract likely plot threads from an artifact.',
  inputSchema: {
    projectSlug: z.string(),
    documentId: z.string(),
  },
}, async ({ projectSlug, documentId }) => {
  const threads = await service.extractPlotThreads(projectSlug, documentId);
  return {
    content: [{ type: 'text', text: JSON.stringify(threads, null, 2) }],
    structuredContent: { threads },
  };
});

server.registerTool('assign_scene_objectives', {
  description: 'Assign objective, obstacle, and reveal for a scene description.',
  inputSchema: {
    sceneDescription: z.string(),
  },
}, async ({ sceneDescription }) => {
  const objectives = await service.assignSceneObjectives(sceneDescription);
  return {
    content: [{ type: 'text', text: JSON.stringify(objectives, null, 2) }],
    structuredContent: objectives,
  };
});

server.registerTool('build_character_arc_map', {
  description: 'Build a lightweight character arc map from existing project artifacts.',
  inputSchema: {
    projectSlug: z.string(),
    characterId: z.string(),
  },
}, async ({ projectSlug, characterId }) => {
  const arcMap = await service.buildCharacterArcMap(projectSlug, characterId);
  return {
    content: [{ type: 'text', text: JSON.stringify(arcMap, null, 2) }],
    structuredContent: arcMap,
  };
});

server.registerTool('check_outline_balance', {
  description: 'Check whether a chapter plan has enough beat density.',
  inputSchema: {
    projectSlug: z.string(),
    chapterPlanId: z.string(),
  },
}, async ({ projectSlug, chapterPlanId }) => {
  const balance = await service.checkOutlineBalance(projectSlug, chapterPlanId);
  return {
    content: [{ type: 'text', text: JSON.stringify(balance, null, 2) }],
    structuredContent: balance,
  };
});

server.registerTool('propose_missing_bridge_scenes', {
  description: 'Suggest bridge scenes for thin chapter plans.',
  inputSchema: {
    projectSlug: z.string(),
    chapterPlanId: z.string(),
  },
}, async ({ projectSlug, chapterPlanId }) => {
  const suggestions = await service.proposeMissingBridgeScenes(projectSlug, chapterPlanId);
  return {
    content: [{ type: 'text', text: JSON.stringify(suggestions, null, 2) }],
    structuredContent: { suggestions },
  };
});

server.registerPrompt('chapter-to-beats', {
  description: 'Prompt template for chapter-to-beat decomposition.',
  argsSchema: {
    chapterPlanId: z.string(),
  },
}, async ({ chapterPlanId }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Break chapter plan ${chapterPlanId} into clean escalating beats with a visible turn and exit hook.`,
      },
    },
  ],
}));

server.registerPrompt('beat-to-scene-card', {
  description: 'Prompt template for beat-to-scene-card expansion.',
  argsSchema: {
    beatText: z.string(),
    viewpoint: z.string(),
  },
}, async ({ beatText, viewpoint }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Expand the beat "${beatText}" into a structured scene card for viewpoint ${viewpoint}.`,
      },
    },
  ],
}));

server.registerPrompt('pacing-revision-pass', {
  description: 'Prompt template for pacing and bridge-scene review.',
  argsSchema: {
    chapterPlanId: z.string(),
  },
}, async ({ chapterPlanId }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Review chapter plan ${chapterPlanId} for pacing problems, thin transitions, and missing bridge scenes.`,
      },
    },
  ],
}));

server.registerResource('scene-card-template', 'quills://planning/templates/scene-card', {
  title: 'Scene Card Template',
  description: 'Suggested scene card structure.',
  mimeType: 'application/json',
}, async () => ({
  contents: [{ uri: 'quills://planning/templates/scene-card', text: JSON.stringify(sceneCardTemplate, null, 2) }],
}));

server.registerResource('beat-sheet-template', 'quills://planning/templates/beat-sheet', {
  title: 'Beat Sheet Template',
  description: 'Suggested beat sheet structure.',
  mimeType: 'application/json',
}, async () => ({
  contents: [{ uri: 'quills://planning/templates/beat-sheet', text: JSON.stringify(beatSheetTemplate, null, 2) }],
}));

server.registerResource('arc-map-template', 'quills://planning/templates/arc-map', {
  title: 'Arc Map Template',
  description: 'Suggested arc map structure.',
  mimeType: 'application/json',
}, async () => ({
  contents: [{ uri: 'quills://planning/templates/arc-map', text: JSON.stringify(arcMapTemplate, null, 2) }],
}));

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Quills Planning Tools MCP server running on stdio');
}

main().catch((error) => {
  console.error('Planning Tools MCP server error:', error);
  process.exit(1);
});
