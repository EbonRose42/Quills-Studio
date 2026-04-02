import type { ArtifactRecord, DraftingPacket } from '@quills/shared';
import { assertAgentCanWrite } from '../../routing/routing';
import type { ModelProvider } from '../../providers/provider';

function timestamp(): string {
  return new Date().toISOString();
}

export async function runDraftingWorkflow(
  provider: ModelProvider,
  packet: DraftingPacket,
): Promise<ArtifactRecord> {
  assertAgentCanWrite('prose-drafter', 'chapter_draft');

  const result = await provider.run('prose-drafter', {
    packet,
    prompt: [
      `Draft chapter ${packet.chapter} for project ${packet.project}.`,
      `POV: ${packet.pov}`,
      `Goal: ${packet.chapterGoal}`,
      `Must include: ${packet.mustInclude.join('; ')}`,
      `Must avoid: ${packet.mustAvoid.join('; ')}`,
      `Style reminders: ${packet.styleReminders.join('; ')}`,
    ].join('\n'),
  });

  return {
    metadata: {
      id: `book${packet.book}_ch${packet.chapter}_draft_v${Date.now()}`,
      type: 'chapter_draft',
      title: `Book ${packet.book} Chapter ${packet.chapter} Draft`,
      status: 'working',
      project: packet.project,
      book: packet.book,
      chapter: packet.chapter,
      version: 1,
      updatedBy: 'ProseDrafter',
      dependsOn: packet.sourceArtifactIds,
      tags: ['draft'],
      summary: result.summary,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    },
    body: {
      format: 'markdown',
      text: result.body,
    },
  };
}
