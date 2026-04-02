import type { ArtifactRecord, ProjectManifest } from '@quills/shared';
import { ArtifactRepository, ProjectService } from '@quills/studio-core';

function artifactText(artifact: ArtifactRecord): string {
  return artifact.body.text ?? JSON.stringify(artifact.body.data, null, 2);
}

export class ProjectLibraryService {
  constructor(private readonly workspaceRoot: string) {}

  private projectService(): ProjectService {
    return new ProjectService(this.workspaceRoot);
  }

  async listProjects(): Promise<ProjectManifest[]> {
    return this.projectService().listProjects();
  }

  async getProjectManifest(projectSlug: string): Promise<ProjectManifest> {
    return this.projectService().loadManifest(projectSlug);
  }

  async listProjectDocuments(projectSlug: string, folderOrType?: string): Promise<ArtifactRecord[]> {
    const repository = new ArtifactRepository(this.workspaceRoot, projectSlug);
    const artifacts = await repository.listArtifacts();
    if (!folderOrType) {
      return artifacts;
    }

    return artifacts.filter((artifact) => artifact.metadata.type === folderOrType || artifact.metadata.tags.includes(folderOrType));
  }

  async readDocument(projectSlug: string, documentId: string): Promise<ArtifactRecord> {
    const repository = new ArtifactRepository(this.workspaceRoot, projectSlug);
    const artifact = await repository.getArtifact(documentId);
    if (!artifact) {
      throw new Error(`Document ${documentId} not found in project ${projectSlug}.`);
    }
    return artifact;
  }

  async readDocumentSection(projectSlug: string, documentId: string, selector: string): Promise<string> {
    const artifact = await this.readDocument(projectSlug, documentId);
    const text = artifactText(artifact);

    if (selector.startsWith('lines:')) {
      const [startRaw, endRaw] = selector.replace('lines:', '').split('-');
      const start = Math.max(1, Number(startRaw || '1'));
      const end = Math.max(start, Number(endRaw || startRaw || '1'));
      const lines = text.split(/\r?\n/).slice(start - 1, end);
      return lines.join('\n');
    }

    const headingPattern = new RegExp(`^#+\\s+${selector}\\s*$`, 'im');
    const match = headingPattern.exec(text);
    if (!match || match.index === undefined) {
      return text;
    }

    const startIndex = match.index;
    const remaining = text.slice(startIndex);
    const nextHeading = /\n#+\s+/m.exec(remaining.slice(match[0].length));
    if (!nextHeading || nextHeading.index === undefined) {
      return remaining.trim();
    }

    return remaining.slice(0, match[0].length + nextHeading.index).trim();
  }

  async searchDocuments(projectSlug: string, query: string, filters?: string[]): Promise<Array<{ artifact: ArtifactRecord; score: number }>> {
    const repository = new ArtifactRepository(this.workspaceRoot, projectSlug);
    const artifacts = await repository.listArtifacts();
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

    return artifacts
      .filter((artifact) => !filters || filters.length === 0 || filters.includes(artifact.metadata.type))
      .map((artifact) => {
        const haystack = [artifact.metadata.title, artifact.metadata.summary, artifactText(artifact)].join('\n').toLowerCase();
        const score = tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0);
        return { artifact, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 20);
  }

  async getActiveWorkingSet(projectSlug: string, taskType: string): Promise<ArtifactRecord[]> {
    const repository = new ArtifactRepository(this.workspaceRoot, projectSlug);
    const artifacts = await repository.listArtifacts();

    const approved = artifacts.filter((artifact) => ['approved', 'canon', 'working'].includes(artifact.metadata.status));
    if (taskType === 'draft_scene' || taskType === 'draft_chapter') {
      return approved.filter((artifact) =>
        ['chapter_plan', 'chapter_summary', 'character_profile', 'world_note', 'canon_snapshot'].includes(artifact.metadata.type),
      );
    }

    return approved.slice(0, 20);
  }

  async registerDocumentVersion(projectSlug: string, documentId: string, text: string, note: string): Promise<ArtifactRecord> {
    const repository = new ArtifactRepository(this.workspaceRoot, projectSlug);
    return repository.updateArtifact(
      documentId,
      {
        body: {
          format: 'markdown',
          text,
        },
        metadata: {
          summary: note,
        },
      },
      'ProjectLibraryServer',
    );
  }
}
