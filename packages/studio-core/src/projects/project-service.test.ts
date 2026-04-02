import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { ProjectService } from './project-service';

describe('ProjectService', () => {
  let workspaceRoot: string;
  let service: ProjectService;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'quills-projects-'));
    service = new ProjectService(workspaceRoot);
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('creates and lists series', async () => {
    await service.createSeries({
      id: 'series-one',
      name: 'Series One',
      slug: 'series-one',
      description: 'Test series',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectSlugs: [],
    });

    const series = await service.listSeries();
    expect(series).toHaveLength(1);
    expect(series[0]?.slug).toBe('series-one');
  });

  it('assigns a project to a series', async () => {
    const timestamp = new Date().toISOString();
    await service.createSeries({
      id: 'series-one',
      name: 'Series One',
      slug: 'series-one',
      description: 'Test series',
      createdAt: timestamp,
      updatedAt: timestamp,
      projectSlugs: [],
    });
    await service.createProject({
      id: 'book-one',
      name: 'Book One',
      slug: 'book-one',
      description: 'Test project',
      seriesSlug: null,
      seriesOrder: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      currentCanonVersion: 0,
      activeBook: 1,
    });

    const manifest = await service.assignProjectToSeries('book-one', 'series-one', 1);
    const series = await service.loadSeries('series-one');

    expect(manifest.seriesSlug).toBe('series-one');
    expect(manifest.seriesOrder).toBe(1);
    expect(series.projectSlugs).toContain('book-one');
  });
});
