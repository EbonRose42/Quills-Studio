import { z } from 'zod';

export const artifactStatuses = [
  'exploratory',
  'working',
  'approved',
  'canon',
  'superseded',
  'deprecated',
] as const;

export const artifactStatusSchema = z.enum(artifactStatuses);

export const artifactBodySchema = z.object({
  format: z.enum(['markdown', 'text', 'json']),
  text: z.string().optional(),
  data: z.unknown().optional(),
});

export const artifactMetadataSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  status: artifactStatusSchema,
  project: z.string(),
  book: z.number().int().positive().optional(),
  chapter: z.number().int().positive().optional(),
  version: z.number().int().positive(),
  updatedBy: z.string(),
  dependsOn: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  summary: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const artifactRecordSchema = z.object({
  metadata: artifactMetadataSchema,
  body: artifactBodySchema,
});

export const artifactIndexEntrySchema = z.object({
  metadata: artifactMetadataSchema,
  filePath: z.string(),
});

export type ArtifactBody = z.infer<typeof artifactBodySchema>;
export type ArtifactIndexEntry = z.infer<typeof artifactIndexEntrySchema>;
export type ArtifactMetadata = z.infer<typeof artifactMetadataSchema>;
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;
export type ArtifactStatus = z.infer<typeof artifactStatusSchema>;
