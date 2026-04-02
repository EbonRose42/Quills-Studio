import type { McpPromptDefinition, McpResourceDefinition, McpToolDefinition, McpServerInfo } from '../types';

export const planningToolsServerInfo: McpServerInfo = {
  id: 'planning-tools',
  name: 'Planning Tools Server',
  description: 'Supports outline expansion, beat decomposition, scene card generation, and thread/arc planning.',
  tools: [
    'generate_book_outline',
    'decompose_chapter_to_beats',
    'expand_beat_to_scene_card',
    'generate_scene_sequence',
    'extract_plot_threads',
    'assign_scene_objectives',
    'build_character_arc_map',
    'check_outline_balance',
    'propose_missing_bridge_scenes',
  ],
  resources: [
    'quills://planning/templates/scene-card',
    'quills://planning/templates/beat-sheet',
    'quills://planning/templates/arc-map',
  ],
  prompts: [
    'chapter-to-beats',
    'beat-to-scene-card',
    'pacing-revision-pass',
  ],
};

export const planningTools: McpToolDefinition[] = planningToolsServerInfo.tools.map((name) => ({
  name,
  title: name.replaceAll('_', ' '),
  description: `Planning Tools server tool: ${name}`,
}));

export const planningResources: McpResourceDefinition[] = [
  {
    uri: 'quills://planning/templates/scene-card',
    name: 'scene-card-template',
    title: 'Scene Card Template',
    description: 'Suggested scene card structure.',
    mimeType: 'application/json',
  },
  {
    uri: 'quills://planning/templates/beat-sheet',
    name: 'beat-sheet-template',
    title: 'Beat Sheet Template',
    description: 'Suggested beat sheet structure.',
    mimeType: 'application/json',
  },
  {
    uri: 'quills://planning/templates/arc-map',
    name: 'arc-map-template',
    title: 'Arc Map Template',
    description: 'Suggested character arc map structure.',
    mimeType: 'application/json',
  },
];

export const planningPrompts: McpPromptDefinition[] = [
  {
    name: 'chapter-to-beats',
    title: 'Chapter To Beats',
    description: 'Prompt template for decomposing a chapter into beats.',
  },
  {
    name: 'beat-to-scene-card',
    title: 'Beat To Scene Card',
    description: 'Prompt template for expanding a beat into a scene card.',
  },
  {
    name: 'pacing-revision-pass',
    title: 'Pacing Revision Pass',
    description: 'Prompt template for identifying pacing issues and missing bridges.',
  },
];
