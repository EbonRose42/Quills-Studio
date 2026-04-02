import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTwoFilesPatch } from 'diff';
import { artifactRecordSchema, type ArtifactRecord, type ArtifactStatus } from '@quills/shared';
import { directoryForArtifactType } from '../projects/project-tree';

function timestamp(): string {
  return new Date().toISOString();
}

function nextVersionId(currentId: string, nextVersion: number): string {
  if (/_v\d+$/.test(currentId)) {
    return currentId.replace(/_v\d+$/, `_v${nextVersion}`);
  }

  return `${currentId}_v${nextVersion}`;
}

export class ArtifactRepository {
  constructor(
    private readonly workspaceRoot: string,
    private readonly projectSlug: string,
  ) {}

  private get projectRoot(): string {
    return join(this.workspaceRoot, 'projects', this.projectSlug);
  }

  private artifactPath(artifact: ArtifactRecord): string {
    return join(this.projectRoot, directoryForArtifactType(artifact.metadata.type), `${artifact.metadata.id}.json`);
  }

  async writeArtifact(artifact: ArtifactRecord): Promise<ArtifactRecord> {
    const parsed = artifactRecordSchema.parse(artifact);
    const filePath = this.artifactPath(parsed);
    await mkdir(join(this.projectRoot, directoryForArtifactType(parsed.metadata.type)), { recursive: true });
    await writeFile(filePath, JSON.stringify(parsed, null, 2), 'utf8');
    return parsed;
  }

  async listArtifacts(): Promise<ArtifactRecord[]> {
    const results: ArtifactRecord[] = [];

    const directories = [
      '00_meta',
      '01_series',
      '02_world',
      '03_characters',
      '04_continuity',
      '05_books',
      '06_summaries',
      '07_agent_outputs',
      '08_archive',
    ];

    for (const directory of directories) {
      const target = join(this.projectRoot, directory);
      let files: string[] = [];

      try {
        files = await readdir(target);
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.endsWith('.json') || file === 'manifest.json') {
          continue;
        }

        const raw = await readFile(join(target, file), 'utf8');
        results.push(artifactRecordSchema.parse(JSON.parse(raw)));
      }
    }

    return results.sort((left, right) => left.metadata.title.localeCompare(right.metadata.title));
  }

  async getArtifact(artifactId: string): Promise<ArtifactRecord | undefined> {
    const artifacts = await this.listArtifacts();
    return artifacts.find((artifact) => artifact.metadata.id === artifactId);
  }

  async updateArtifact(
    artifactId: string,
    updates: {
      metadata?: Partial<ArtifactRecord['metadata']>;
      body?: ArtifactRecord['body'];
    },
    updatedBy: string,
  ): Promise<ArtifactRecord> {
    const current = await this.getArtifact(artifactId);
    if (!current) {
      throw new Error(`Artifact ${artifactId} not found.`);
    }

    const nextVersion = current.metadata.version + 1;
    const next: ArtifactRecord = {
      ...current,
      ...updates,
      metadata: {
        ...current.metadata,
        ...updates.metadata,
        id: nextVersionId(current.metadata.id, nextVersion),
        version: nextVersion,
        updatedBy,
        updatedAt: timestamp(),
        createdAt: current.metadata.createdAt,
      },
    };

    if (current.metadata.status !== 'superseded') {
      await this.writeArtifact({
        ...current,
        metadata: {
          ...current.metadata,
          status: 'superseded',
          updatedAt: timestamp(),
        },
      });
    }

    return this.writeArtifact(next);
  }

  async branchArtifact(artifactId: string, branchTitle: string, updatedBy: string): Promise<ArtifactRecord> {
    const current = await this.getArtifact(artifactId);
    if (!current) {
      throw new Error(`Artifact ${artifactId} not found.`);
    }

    const branchId = `${artifactId}_branch_${Date.now()}`;
    return this.writeArtifact({
      ...current,
      metadata: {
        ...current.metadata,
        id: branchId,
        title: branchTitle,
        status: 'working',
        version: 1,
        updatedBy,
        dependsOn: [...current.metadata.dependsOn, current.metadata.id],
        createdAt: timestamp(),
        updatedAt: timestamp(),
      },
    });
  }

  async promoteToCanon(artifactId: string, updatedBy: string): Promise<ArtifactRecord> {
    return this.updateArtifact(
      artifactId,
      {
        metadata: {
          status: 'canon',
        },
      },
      updatedBy,
    );
  }

  async diffArtifacts(leftId: string, rightId: string): Promise<string> {
    const [left, right] = await Promise.all([this.getArtifact(leftId), this.getArtifact(rightId)]);
    if (!left || !right) {
      throw new Error('Both artifacts must exist to build a diff.');
    }

    const leftContent = left.body.text ?? JSON.stringify(left.body.data, null, 2);
    const rightContent = right.body.text ?? JSON.stringify(right.body.data, null, 2);

    return createTwoFilesPatch(left.metadata.title, right.metadata.title, leftContent, rightContent);
  }

  async listArtifactsByStatus(status: ArtifactStatus): Promise<ArtifactRecord[]> {
    const artifacts = await this.listArtifacts();
    return artifacts.filter((artifact) => artifact.metadata.status === status);
  }
}
