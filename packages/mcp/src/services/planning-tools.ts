import type { ArtifactRecord } from '@quills/shared';
import { ArtifactRepository } from '@quills/studio-core';

function artifactText(artifact?: ArtifactRecord): string {
  if (!artifact) {
    return '';
  }
  return artifact.body.text ?? JSON.stringify(artifact.body.data, null, 2);
}

export class PlanningToolsService {
  constructor(private readonly workspaceRoot: string) {}

  private async artifacts(projectSlug: string): Promise<ArtifactRecord[]> {
    return new ArtifactRepository(this.workspaceRoot, projectSlug).listArtifacts();
  }

  async generateBookOutline(projectSlug: string, title: string, premise: string): Promise<{ title: string; acts: string[] }> {
    const artifacts = await this.artifacts(projectSlug);
    const canon = artifacts.find((artifact) => artifact.metadata.type === 'canon_snapshot');
    return {
      title,
      acts: [
        `Act I: Establish ${premise} while grounding the reader in ${canon ? canon.metadata.title : 'project canon'}.`,
        'Act II: Escalate pressure through reversals, uncovered secrets, and thread collisions.',
        'Act III: Force a decisive emotional and external reckoning without collapsing unresolved sequel hooks.',
      ],
    };
  }

  async decomposeChapterToBeats(projectSlug: string, chapterPlanId: string): Promise<Array<{ beat: number; purpose: string }>> {
    const artifacts = await this.artifacts(projectSlug);
    const chapterPlan = artifacts.find((artifact) => artifact.metadata.id === chapterPlanId);
    const scenePlan = ((chapterPlan?.body.data as { scenePlan?: string[] } | undefined)?.scenePlan) ?? [];
    return scenePlan.map((purpose, index) => ({
      beat: index + 1,
      purpose,
    }));
  }

  async expandBeatToSceneCard(beatText: string, viewpoint: string): Promise<Record<string, unknown>> {
    return {
      viewpoint,
      objective: beatText,
      obstacle: 'Escalating resistance tied to continuity-sensitive constraints.',
      turn: 'A reveal or reversal that complicates the immediate objective.',
      emotionalShift: `${viewpoint} moves from certainty to pressure.`,
      exitHook: 'End on a decision that forces the next scene forward.',
    };
  }

  async generateSceneSequence(projectSlug: string, chapterPlanId: string): Promise<string[]> {
    const beats = await this.decomposeChapterToBeats(projectSlug, chapterPlanId);
    return beats.map((beat) => `Scene ${beat.beat}: ${beat.purpose}`);
  }

  async extractPlotThreads(projectSlug: string, documentId: string): Promise<string[]> {
    const artifacts = await this.artifacts(projectSlug);
    const artifact = artifacts.find((item) => item.metadata.id === documentId);
    const text = artifactText(artifact);
    return text
      .split(/[.!?]\s+/)
      .filter((sentence) => /secret|thread|mystery|risk|debt|promise|siege|map/i.test(sentence))
      .slice(0, 8);
  }

  async assignSceneObjectives(sceneDescription: string): Promise<{ objective: string; obstacle: string; reveal: string }> {
    return {
      objective: `Advance: ${sceneDescription}`,
      obstacle: 'Conflicting character goals and continuity constraints.',
      reveal: 'A hidden implication that raises the next scene’s stakes.',
    };
  }

  async buildCharacterArcMap(projectSlug: string, characterId: string): Promise<{ characterId: string; milestones: string[] }> {
    const artifacts = await this.artifacts(projectSlug);
    const related = artifacts.filter((artifact) => artifactText(artifact).toLowerCase().includes(characterId.toLowerCase()));
    return {
      characterId,
      milestones: related.slice(0, 6).map((artifact) => `${artifact.metadata.title}: ${artifact.metadata.summary || artifactText(artifact).slice(0, 100)}`),
    };
  }

  async checkOutlineBalance(projectSlug: string, chapterPlanId: string): Promise<{ balance: 'healthy' | 'thin'; notes: string[] }> {
    const beats = await this.decomposeChapterToBeats(projectSlug, chapterPlanId);
    if (beats.length >= 3) {
      return {
        balance: 'healthy',
        notes: ['Chapter has enough beat density for escalation, turn, and exit hook.'],
      };
    }

    return {
      balance: 'thin',
      notes: ['Chapter plan is sparse. Add a bridge beat or reversal before drafting.'],
    };
  }

  async proposeMissingBridgeScenes(projectSlug: string, chapterPlanId: string): Promise<string[]> {
    const balance = await this.checkOutlineBalance(projectSlug, chapterPlanId);
    if (balance.balance === 'healthy') {
      return ['No mandatory bridge scene detected.'];
    }
    return [
      'Add a bridge scene that re-anchors the viewpoint character’s objective.',
      'Add a bridge scene that pays off or reframes the prior chapter summary.',
    ];
  }
}
