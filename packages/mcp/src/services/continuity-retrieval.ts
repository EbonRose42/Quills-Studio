import type { ArtifactRecord } from '@quills/shared';
import { ArtifactRepository, buildDraftingPacket, runContinuityCheck } from '@quills/studio-core';
import type { ContextPack, ContextPackItem } from '../types';

function artifactText(artifact: ArtifactRecord): string {
  return artifact.body.text ?? JSON.stringify(artifact.body.data, null, 2);
}

function tokenSet(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
}

function similarityScore(query: string, candidate: string): number {
  const queryTokens = tokenSet(query);
  const candidateTokens = tokenSet(candidate);
  let matches = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      matches += 1;
    }
  }
  return queryTokens.size === 0 ? 0 : matches / queryTokens.size;
}

function itemFromArtifact(artifact: ArtifactRecord, reason: string): ContextPackItem {
  return {
    id: artifact.metadata.id,
    label: artifact.metadata.title,
    sourceType: artifact.metadata.type,
    reason,
  };
}

export class ContinuityRetrievalService {
  constructor(private readonly workspaceRoot: string) {}

  private async artifacts(projectSlug: string): Promise<ArtifactRecord[]> {
    return new ArtifactRepository(this.workspaceRoot, projectSlug).listArtifacts();
  }

  async keywordSearch(projectSlug: string, query: string, filters?: string[]): Promise<Array<{ artifactId: string; title: string; matches: number }>> {
    const artifacts = await this.artifacts(projectSlug);
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

    return artifacts
      .filter((artifact) => !filters || filters.length === 0 || filters.includes(artifact.metadata.type))
      .map((artifact) => {
        const haystack = [artifact.metadata.title, artifact.metadata.summary, artifactText(artifact)].join('\n').toLowerCase();
        const matches = tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0);
        return {
          artifactId: artifact.metadata.id,
          title: artifact.metadata.title,
          matches,
        };
      })
      .filter((entry) => entry.matches > 0)
      .sort((left, right) => right.matches - left.matches)
      .slice(0, 15);
  }

  async semanticSearch(projectSlug: string, query: string, topK = 8, filters?: string[]): Promise<Array<{ artifactId: string; title: string; score: number }>> {
    const artifacts = await this.artifacts(projectSlug);

    return artifacts
      .filter((artifact) => !filters || filters.length === 0 || filters.includes(artifact.metadata.type))
      .map((artifact) => ({
        artifactId: artifact.metadata.id,
        title: artifact.metadata.title,
        score: similarityScore(query, [artifact.metadata.title, artifact.metadata.summary, artifactText(artifact)].join('\n')),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }

  async buildContextPack(projectSlug: string, taskType: string, targetId: string): Promise<ContextPack> {
    const artifacts = await this.artifacts(projectSlug);
    if (taskType === 'draft_scene' || taskType === 'draft_chapter') {
      const packet = buildDraftingPacket(artifacts, targetId);
      const targetArtifact = artifacts.find((artifact) => artifact.metadata.id === targetId);
      const requiredItems = targetArtifact ? [itemFromArtifact(targetArtifact, 'Active target for drafting task.')] : [];
      const retrievedItems = packet.sourceArtifactIds
        .map((id) => artifacts.find((artifact) => artifact.metadata.id === id))
        .filter((artifact): artifact is ArtifactRecord => Boolean(artifact))
        .map((artifact) => itemFromArtifact(artifact, 'Selected by continuity and drafting policy.'));

      return {
        taskType,
        targetId,
        requiredItems,
        retrievedItems,
        warnings: packet.continuityWarnings,
        packet: packet as unknown as Record<string, unknown>,
      };
    }

    return {
      taskType,
      targetId,
      requiredItems: [],
      retrievedItems: [],
      warnings: ['No specialized context policy is defined for this task yet.'],
      packet: {},
    };
  }

  async validateChapterContinuity(projectSlug: string, chapterPlanId: string, draftText?: string): Promise<{ findings: ReturnType<typeof runContinuityCheck>; contextPack: ContextPack }> {
    const artifacts = await this.artifacts(projectSlug);
    const contextPack = await this.buildContextPack(projectSlug, 'draft_chapter', chapterPlanId);
    const findings = runContinuityCheck(contextPack.packet as never, draftText ?? '', artifacts);
    return { findings, contextPack };
  }

  async compareAgainstCanon(projectSlug: string, textOrDocId: string): Promise<{ canonMatches: string[]; warnings: string[] }> {
    const artifacts = await this.artifacts(projectSlug);
    const canonArtifacts = artifacts.filter((artifact) => artifact.metadata.type === 'canon_snapshot' && artifact.metadata.status === 'canon');
    const inputArtifact = artifacts.find((artifact) => artifact.metadata.id === textOrDocId);
    const candidateText = inputArtifact ? artifactText(inputArtifact) : textOrDocId;
    const lowerCandidate = candidateText.toLowerCase();

    const canonMatches = canonArtifacts.flatMap((artifact) => {
      const facts = Array.isArray((artifact.body.data as { facts?: string[] } | undefined)?.facts)
        ? ((artifact.body.data as { facts: string[] }).facts)
        : [];
      return facts.filter((fact) => lowerCandidate.includes(fact.toLowerCase().split(' ').slice(0, 4).join(' ')));
    });

    const warnings = canonArtifacts.length === 0
      ? ['No canon snapshots were found for this project.']
      : canonMatches.length === 0
        ? ['No strong canon matches detected. Review manually before promotion.']
        : [];

    return { canonMatches, warnings };
  }

  async listUnresolvedThreads(projectSlug: string): Promise<Array<{ artifactId: string; title: string; summary: string }>> {
    const artifacts = await this.artifacts(projectSlug);
    return artifacts
      .filter((artifact) => /thread|mystery|unresolved/i.test(`${artifact.metadata.title} ${artifact.metadata.summary}`))
      .map((artifact) => ({
        artifactId: artifact.metadata.id,
        title: artifact.metadata.title,
        summary: artifact.metadata.summary,
      }));
  }

  async getEntityTimeline(projectSlug: string, entityId: string): Promise<Array<{ artifactId: string; title: string; snippet: string }>> {
    const artifacts = await this.artifacts(projectSlug);
    const needle = entityId.toLowerCase();

    return artifacts
      .filter((artifact) => artifactText(artifact).toLowerCase().includes(needle) || artifact.metadata.title.toLowerCase().includes(needle))
      .sort((left, right) => left.metadata.updatedAt.localeCompare(right.metadata.updatedAt))
      .map((artifact) => ({
        artifactId: artifact.metadata.id,
        title: artifact.metadata.title,
        snippet: artifactText(artifact).slice(0, 220),
      }));
  }

  async diffVersions(projectSlug: string, leftId: string, rightId: string): Promise<string> {
    return new ArtifactRepository(this.workspaceRoot, projectSlug).diffArtifacts(leftId, rightId);
  }

  async retrievalStats(projectSlug: string): Promise<{ artifactCount: number; canonCount: number; characterCount: number; worldCount: number }> {
    const artifacts = await this.artifacts(projectSlug);
    return {
      artifactCount: artifacts.length,
      canonCount: artifacts.filter((artifact) => artifact.metadata.type === 'canon_snapshot').length,
      characterCount: artifacts.filter((artifact) => artifact.metadata.type === 'character_profile').length,
      worldCount: artifacts.filter((artifact) => artifact.metadata.type === 'world_note').length,
    };
  }
}
