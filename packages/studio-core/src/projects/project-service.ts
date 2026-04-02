import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  demoProjects,
  demoSeries,
  projectManifestSchema,
  seriesManifestSchema,
  type ArtifactRecord,
  type ProjectManifest,
  type SeriesManifest,
} from '@quills/shared';
import { ArtifactRepository } from '../artifacts/artifact-repository';
import { projectDirectories } from './project-tree';

export class ProjectService {
  constructor(private readonly workspaceRoot: string) {}

  get projectsRoot(): string {
    return join(this.workspaceRoot, 'projects');
  }

  get seriesRoot(): string {
    return join(this.workspaceRoot, 'series');
  }

  async createProject(manifest: ProjectManifest): Promise<ProjectManifest> {
    const parsed = projectManifestSchema.parse(manifest);
    const projectRoot = join(this.projectsRoot, parsed.slug);

    await mkdir(projectRoot, { recursive: true });
    await Promise.all(projectDirectories.map((dir) => mkdir(join(projectRoot, dir), { recursive: true })));
    await writeFile(join(projectRoot, '00_meta', 'manifest.json'), JSON.stringify(parsed, null, 2), 'utf8');

    return parsed;
  }

  async loadManifest(projectSlug: string): Promise<ProjectManifest> {
    const raw = await readFile(join(this.projectsRoot, projectSlug, '00_meta', 'manifest.json'), 'utf8');
    return projectManifestSchema.parse(JSON.parse(raw));
  }

  async bootstrapDemoProject(): Promise<ProjectManifest> {
    for (const series of demoSeries) {
      await this.createSeries(series);
    }

    for (const project of demoProjects) {
      await this.createProject(project.manifest);
      const repository = new ArtifactRepository(this.workspaceRoot, project.manifest.slug);
      for (const artifact of project.artifacts) {
        await repository.writeArtifact(artifact);
      }
    }

    return demoProjects[0].manifest;
  }

  async listProjects(): Promise<ProjectManifest[]> {
    let entries: string[] = [];

    try {
      entries = await readdir(this.projectsRoot);
    } catch {
      return [];
    }

    const manifests = await Promise.all(
      entries.map(async (entry) => {
        try {
          return await this.loadManifest(entry);
        } catch {
          return null;
        }
      }),
    );

    return manifests.filter((manifest): manifest is ProjectManifest => manifest !== null);
  }

  async seedProject(projectSlug: string, artifacts: ArtifactRecord[]): Promise<void> {
    const repository = new ArtifactRepository(this.workspaceRoot, projectSlug);
    for (const artifact of artifacts) {
      await repository.writeArtifact(artifact);
    }
  }

  async createSeries(series: SeriesManifest): Promise<SeriesManifest> {
    const parsed = seriesManifestSchema.parse(series);
    await mkdir(join(this.seriesRoot, parsed.slug), { recursive: true });
    await writeFile(join(this.seriesRoot, parsed.slug, 'series.json'), JSON.stringify(parsed, null, 2), 'utf8');
    return parsed;
  }

  async loadSeries(seriesSlug: string): Promise<SeriesManifest> {
    const raw = await readFile(join(this.seriesRoot, seriesSlug, 'series.json'), 'utf8');
    return seriesManifestSchema.parse(JSON.parse(raw));
  }

  async listSeries(): Promise<SeriesManifest[]> {
    let entries: string[] = [];

    try {
      entries = await readdir(this.seriesRoot);
    } catch {
      return [];
    }

    const series = await Promise.all(
      entries.map(async (entry) => {
        try {
          return await this.loadSeries(entry);
        } catch {
          return null;
        }
      }),
    );

    return series.filter((item): item is SeriesManifest => item !== null);
  }

  async assignProjectToSeries(projectSlug: string, seriesSlug: string, seriesOrder: number | null): Promise<ProjectManifest> {
    const manifest = await this.loadManifest(projectSlug);
    const updatedManifest = projectManifestSchema.parse({
      ...manifest,
      seriesSlug,
      seriesOrder,
      updatedAt: new Date().toISOString(),
    });
    await writeFile(join(this.projectsRoot, projectSlug, '00_meta', 'manifest.json'), JSON.stringify(updatedManifest, null, 2), 'utf8');

    const series = await this.loadSeries(seriesSlug);
    const projectSlugs = Array.from(new Set([...series.projectSlugs, projectSlug]));
    await this.createSeries({
      ...series,
      projectSlugs,
      updatedAt: new Date().toISOString(),
    });

    return updatedManifest;
  }
}
