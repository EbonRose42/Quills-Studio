import type { AgentDefinition } from '@quills/shared';

export const agentRegistry: AgentDefinition[] = [
  {
    id: 'story-architect',
    name: 'Story Architect',
    primaryModel: 'Gemma3',
    mission: 'Own top-level structure: series arc, book outline, act map, chapter purpose.',
    writes: ['series_arc', 'book_outline', 'act_map', 'chapter_plan'],
    forbiddenActions: ['promote canon automatically', 'final prose drafting by default'],
  },
  {
    id: 'world-builder',
    name: 'World Builder',
    primaryModel: 'EVA-qwen-2.5',
    mission: 'Develop setting logic, institutions, history, geography, and rules systems.',
    writes: ['world_note'],
    forbiddenActions: ['introduce permanent canon silently'],
  },
  {
    id: 'character-builder',
    name: 'Character Builder',
    primaryModel: 'EVA-qwen-2.5',
    mission: 'Build cast psychology, motivations, relationships, and voice.',
    writes: ['character_profile', 'relationship_map'],
    forbiddenActions: ['rewrite global structure without escalation'],
  },
  {
    id: 'scene-planner',
    name: 'Scene Planner',
    primaryModel: 'EVA-qwen-2.5',
    mission: 'Translate chapter goals into scene cards and beat-level plans.',
    writes: ['chapter_plan', 'packet'],
    forbiddenActions: ['act as the final prose layer unless explicitly requested'],
  },
  {
    id: 'prose-drafter',
    name: 'Prose Drafter',
    primaryModel: 'Magnum',
    mission: 'Turn approved packets into prose drafts with strong tone and voice control.',
    writes: ['chapter_draft'],
    forbiddenActions: ['modify canon records', 'invent major facts casually'],
  },
  {
    id: 'continuity-manager',
    name: 'Continuity Manager',
    primaryModel: 'Gemma3',
    mission: 'Enforce project memory and detect contradictions across canon and drafts.',
    writes: ['continuity_report', 'continuity_issue_log'],
    forbiddenActions: ['silently revise story text'],
  },
  {
    id: 'project-librarian',
    name: 'Project Librarian',
    primaryModel: 'Gemma3',
    mission: 'Organize project memory and create compact task-specific packets.',
    writes: ['chapter_summary', 'packet', 'canon_snapshot'],
    forbiddenActions: ['become a creative canon source unless explicitly routed'],
  },
  {
    id: 'revision-director',
    name: 'Revision Director',
    primaryModel: 'Gemma3',
    mission: 'Diagnose weaknesses and assign rewrite work.',
    writes: ['revision_plan'],
    forbiddenActions: ['replace the drafting layer outright unless instructed'],
  },
];

export function getAgentDefinition(agentId: string): AgentDefinition {
  const agent = agentRegistry.find((candidate) => candidate.id === agentId);
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  return agent;
}
