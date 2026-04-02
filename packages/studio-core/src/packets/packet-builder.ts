import { draftingPacketSchema, type ArtifactRecord, type DraftingPacket } from '@quills/shared';

function artifactText(artifact?: ArtifactRecord): string {
  if (!artifact) {
    return '';
  }

  return artifact.body.text ?? JSON.stringify(artifact.body.data, null, 2);
}

export function buildDraftingPacket(artifacts: ArtifactRecord[], chapterPlanId: string): DraftingPacket {
  const chapterPlan = artifacts.find((artifact) => artifact.metadata.id === chapterPlanId);
  if (!chapterPlan) {
    throw new Error(`Chapter plan ${chapterPlanId} not found.`);
  }

  const planData = chapterPlan.body.data as {
    pov: string;
    toneTargets: string[];
    chapterGoal: string;
    scenePlan: string[];
    mustInclude: string[];
    mustAvoid: string[];
    styleReminders: string[];
  };

  const priorChapterSummary = artifacts.find(
    (artifact) =>
      artifact.metadata.type === 'chapter_summary' &&
      artifact.metadata.book === chapterPlan.metadata.book &&
      artifact.metadata.chapter === (chapterPlan.metadata.chapter ?? 1) - 1,
  );

  const worldNotes = artifacts.filter((artifact) => artifact.metadata.type === 'world_note');
  const characterNotes = artifacts.filter((artifact) => artifact.metadata.type === 'character_profile');
  const canonSnapshot = artifacts.find((artifact) => artifact.metadata.type === 'canon_snapshot' && artifact.metadata.status === 'canon');

  return draftingPacketSchema.parse({
    taskType: 'drafting',
    project: chapterPlan.metadata.project,
    book: chapterPlan.metadata.book ?? 1,
    chapter: chapterPlan.metadata.chapter ?? 1,
    pov: planData.pov,
    toneTargets: planData.toneTargets,
    chapterGoal: planData.chapterGoal,
    scenePlan: planData.scenePlan,
    mustInclude: planData.mustInclude,
    mustAvoid: planData.mustAvoid,
    relevantCharacterNotes: characterNotes.map((artifact) => artifactText(artifact)),
    relevantWorldNotes: worldNotes.map((artifact) => artifactText(artifact)),
    continuityWarnings: canonSnapshot ? ['Review canon snapshot before running prose.', 'Do not introduce facts that bypass canon review.'] : [],
    priorChapterSummary: artifactText(priorChapterSummary),
    styleReminders: planData.styleReminders,
    sourceArtifactIds: [
      chapterPlan.metadata.id,
      ...characterNotes.map((artifact) => artifact.metadata.id),
      ...worldNotes.map((artifact) => artifact.metadata.id),
      ...(canonSnapshot ? [canonSnapshot.metadata.id] : []),
      ...(priorChapterSummary ? [priorChapterSummary.metadata.id] : []),
    ],
  });
}
