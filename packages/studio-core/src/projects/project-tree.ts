export const projectDirectories = [
  '00_meta',
  '01_series',
  '02_world',
  '03_characters',
  '04_continuity',
  '05_books',
  '06_summaries',
  '07_agent_outputs',
  '08_archive',
] as const;

export const artifactTypeDirectoryMap: Record<string, string> = {
  manifest: '00_meta',
  project_brief: '00_meta',
  style_guide: '00_meta',
  unresolved_questions: '00_meta',
  series_arc: '01_series',
  book_outline: '01_series',
  act_map: '01_series',
  world_note: '02_world',
  character_profile: '03_characters',
  relationship_map: '03_characters',
  canon_snapshot: '04_continuity',
  continuity_report: '04_continuity',
  continuity_issue_log: '04_continuity',
  chapter_plan: '05_books',
  chapter_draft: '05_books',
  chapter_summary: '06_summaries',
  packet: '07_agent_outputs',
  revision_plan: '07_agent_outputs',
  agent_output: '07_agent_outputs',
};

export function directoryForArtifactType(type: string): string {
  return artifactTypeDirectoryMap[type] ?? '07_agent_outputs';
}
