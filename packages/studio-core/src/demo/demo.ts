import { demoArtifacts, demoProjects, demoSeries, type ArtifactRecord } from '@quills/shared';
import { ProjectService } from '../projects/project-service';

export async function ensureDemoProject(workspaceRoot: string): Promise<void> {
  const projectService = new ProjectService(workspaceRoot);
  const existing = await projectService.listProjects();
  const series = await projectService.listSeries();

  if (
    !demoProjects.every((project) => existing.some((item) => item.slug === project.manifest.slug)) ||
    !demoSeries.every((item) => series.some((existingSeries) => existingSeries.slug === item.slug))
  ) {
    await projectService.bootstrapDemoProject();
  }
}

export function getDemoArtifacts(): ArtifactRecord[] {
  return structuredClone(demoArtifacts);
}
