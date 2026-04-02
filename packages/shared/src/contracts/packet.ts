import { z } from 'zod';

export const draftingPacketSchema = z.object({
  taskType: z.literal('drafting'),
  project: z.string(),
  book: z.number().int().positive(),
  chapter: z.number().int().positive(),
  pov: z.string(),
  toneTargets: z.array(z.string()),
  chapterGoal: z.string(),
  scenePlan: z.array(z.string()),
  mustInclude: z.array(z.string()),
  mustAvoid: z.array(z.string()),
  relevantCharacterNotes: z.array(z.string()),
  relevantWorldNotes: z.array(z.string()),
  continuityWarnings: z.array(z.string()),
  priorChapterSummary: z.string(),
  styleReminders: z.array(z.string()),
  sourceArtifactIds: z.array(z.string()),
});

export type DraftingPacket = z.infer<typeof draftingPacketSchema>;
