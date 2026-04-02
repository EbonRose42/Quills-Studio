import { z } from 'zod';

export const projectManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  seriesSlug: z.string().nullable().default(null),
  seriesOrder: z.number().int().positive().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentCanonVersion: z.number().int().nonnegative().default(0),
  activeBook: z.number().int().positive().nullable().default(null),
});

export type ProjectManifest = z.infer<typeof projectManifestSchema>;
