import type { ArtifactRecord } from '@quills/shared';

export function buildCanonPromotionSummary(artifact: ArtifactRecord): string {
  return `Promote "${artifact.metadata.title}" to canon. This will make version ${artifact.metadata.version} part of hard project truth for continuity checks.`;
}
