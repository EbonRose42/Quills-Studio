import { z } from 'zod';

export const seriesManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  projectSlugs: z.array(z.string()).default([]),
});

export type SeriesManifest = z.infer<typeof seriesManifestSchema>;
