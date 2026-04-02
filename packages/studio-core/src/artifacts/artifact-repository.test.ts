import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { demoManifest } from '@quills/shared';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { ArtifactRepository } from './artifact-repository';
import { ProjectService } from '../projects/project-service';

describe('ArtifactRepository', () => {
  let workspaceRoot: string;
  let repository: ArtifactRepository;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'quills-artifacts-'));
    const service = new ProjectService(workspaceRoot);
    await service.createProject(demoManifest);
    repository = new ArtifactRepository(workspaceRoot, demoManifest.slug);
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('writes and lists artifacts', async () => {
    await repository.writeArtifact({
      metadata: {
        id: 'chapter_plan_v1',
        type: 'chapter_plan',
        title: 'Chapter Plan',
        status: 'approved',
        project: demoManifest.slug,
        book: 1,
        chapter: 1,
        version: 1,
        updatedBy: 'ScenePlanner',
        dependsOn: [],
        tags: [],
        summary: 'Test artifact',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      body: {
        format: 'json',
        data: {
          chapterGoal: 'Test goal',
        },
      },
    });

    const artifacts = await repository.listArtifacts();
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.metadata.id).toBe('chapter_plan_v1');
  });

  it('creates a new version instead of overwriting history', async () => {
    await repository.writeArtifact({
      metadata: {
        id: 'chapter_draft_v1',
        type: 'chapter_draft',
        title: 'Draft',
        status: 'working',
        project: demoManifest.slug,
        book: 1,
        chapter: 1,
        version: 1,
        updatedBy: 'ProseDrafter',
        dependsOn: [],
        tags: [],
        summary: 'Initial draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      body: {
        format: 'markdown',
        text: 'first version',
      },
    });

    const next = await repository.updateArtifact(
      'chapter_draft_v1',
      {
        body: {
          format: 'markdown',
          text: 'second version',
        },
      },
      'UserEditor',
    );

    const artifacts = await repository.listArtifacts();
    expect(next.metadata.id).toBe('chapter_draft_v2');
    expect(artifacts.map((artifact) => artifact.metadata.id)).toContain('chapter_draft_v1');
    expect(artifacts.map((artifact) => artifact.metadata.id)).toContain('chapter_draft_v2');
  });
});
