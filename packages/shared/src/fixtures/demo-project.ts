import type { ArtifactRecord, ProjectManifest, SeriesManifest } from '../index';

const demoTimestamp = '2026-04-02T00:00:00.000Z';

function buildGlassMeridianArtifacts(): ArtifactRecord[] {
  return [
    {
      metadata: {
        id: 'canon_snapshot_v3',
        type: 'canon_snapshot',
        title: 'Canon Snapshot v3',
        status: 'canon',
        project: 'the-glass-meridian',
        book: 1,
        version: 3,
        updatedBy: 'ContinuityManager',
        dependsOn: [],
        tags: ['canon', 'snapshot'],
        summary: 'Current canon facts for book one.',
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      body: {
        format: 'json',
        data: {
          facts: [
            'Mira can safely channel glasslight for no more than three minutes.',
            'The Meridian Archive is hidden below the flooded observatory.',
            'Tovin lost his left eye during the river siege.',
          ],
        },
      },
    },
    {
      metadata: {
        id: 'book1_ch07_summary_v1',
        type: 'chapter_summary',
        title: 'Book 1 Chapter 7 Summary',
        status: 'approved',
        project: 'the-glass-meridian',
        book: 1,
        chapter: 7,
        version: 1,
        updatedBy: 'ProjectLibrarian',
        dependsOn: ['canon_snapshot_v3'],
        tags: ['summary'],
        summary: 'Chapter 7 summary used as prior chapter context.',
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      body: {
        format: 'markdown',
        text: 'Mira and Tovin enter the flooded observatory and confirm that the Archive entrance is below the broken tide wheel.',
      },
    },
    {
      metadata: {
        id: 'book1_ch08_plan_v1',
        type: 'chapter_plan',
        title: 'Book 1 Chapter 8 Plan',
        status: 'approved',
        project: 'the-glass-meridian',
        book: 1,
        chapter: 8,
        version: 1,
        updatedBy: 'ScenePlanner',
        dependsOn: ['canon_snapshot_v3', 'book1_ch07_summary_v1'],
        tags: ['plan'],
        summary: 'Approved plan for chapter 8.',
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      body: {
        format: 'json',
        data: {
          pov: 'Mira',
          toneTargets: ['tense', 'wonder-struck', 'precise'],
          chapterGoal: 'Reach the Archive vault and learn why the city council sealed it.',
          scenePlan: [
            'Descend through the observatory machinery chamber.',
            'Negotiate with Tovin over whether to trust the map etched into the floor.',
            'Trigger the submerged lock and reveal the Archive door.',
          ],
          mustInclude: [
            'Mira fears overusing glasslight.',
            'Tovin notices an old siege symbol on the lock.',
          ],
          mustAvoid: [
            'Do not resolve the council conspiracy.',
            'Do not heal Tovin eye.',
          ],
          styleReminders: ['Keep prose tactile and atmospheric.', 'Favor sharp sensory detail over exposition.'],
        },
      },
    },
    {
      metadata: {
        id: 'mira_profile_v2',
        type: 'character_profile',
        title: 'Mira Profile',
        status: 'approved',
        project: 'the-glass-meridian',
        version: 2,
        updatedBy: 'CharacterBuilder',
        dependsOn: ['canon_snapshot_v3'],
        tags: ['character', 'mira'],
        summary: 'Approved lead character profile.',
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      body: {
        format: 'markdown',
        text: 'Mira is brilliant, stubborn, and prone to masking fear with competence. Her voice is observant and exacting.',
      },
    },
    {
      metadata: {
        id: 'meridian_archive_v1',
        type: 'world_note',
        title: 'Meridian Archive',
        status: 'approved',
        project: 'the-glass-meridian',
        version: 1,
        updatedBy: 'WorldBuilder',
        dependsOn: ['canon_snapshot_v3'],
        tags: ['world', 'archive'],
        summary: 'Approved world note for the Archive.',
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      body: {
        format: 'markdown',
        text: 'The Meridian Archive predates the current council and is protected by tide-driven lockwork beneath the observatory.',
      },
    },
  ];
}

function buildAshHarborArtifacts(): ArtifactRecord[] {
  return [
    {
      metadata: {
        id: 'canon_snapshot_v2',
        type: 'canon_snapshot',
        title: 'Canon Snapshot v2',
        status: 'canon',
        project: 'ash-harbor',
        book: 2,
        version: 2,
        updatedBy: 'ContinuityManager',
        dependsOn: [],
        tags: ['canon', 'snapshot'],
        summary: 'Current canon facts for book two.',
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      body: {
        format: 'json',
        data: {
          facts: [
            'Mira has learned to ration glasslight into three bursts.',
            'Ash Harbor is ruled by guild alliances instead of the city council.',
            'Tovin distrusts the harbor guides after the lighthouse ambush.',
          ],
        },
      },
    },
    {
      metadata: {
        id: 'book2_ch03_summary_v1',
        type: 'chapter_summary',
        title: 'Book 2 Chapter 3 Summary',
        status: 'approved',
        project: 'ash-harbor',
        book: 2,
        chapter: 3,
        version: 1,
        updatedBy: 'ProjectLibrarian',
        dependsOn: ['canon_snapshot_v2'],
        tags: ['summary'],
        summary: 'Chapter 3 summary for book two.',
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      body: {
        format: 'markdown',
        text: 'Mira reaches Ash Harbor with the Meridian index but learns that three factions want the same map.',
      },
    },
    {
      metadata: {
        id: 'book2_ch04_plan_v1',
        type: 'chapter_plan',
        title: 'Book 2 Chapter 4 Plan',
        status: 'approved',
        project: 'ash-harbor',
        book: 2,
        chapter: 4,
        version: 1,
        updatedBy: 'ScenePlanner',
        dependsOn: ['canon_snapshot_v2', 'book2_ch03_summary_v1'],
        tags: ['plan'],
        summary: 'Approved plan for book two chapter 4.',
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      body: {
        format: 'json',
        data: {
          pov: 'Mira',
          toneTargets: ['wind-beaten', 'suspenseful', 'strategic'],
          chapterGoal: 'Secure passage through the harbor before the guilds close the tide gates.',
          scenePlan: [
            'Meet a smuggler captain in the salt market.',
            'Choose whether to trade the false map or keep it hidden.',
            'Escape the market just before the harbor bells lock down the district.',
          ],
          mustInclude: [
            'The harbor bells create panic in the crowd.',
            'Tovin spots the same siege symbol from book one.',
          ],
          mustAvoid: [
            'Do not reveal the final destination of the series map.',
            'Do not reconcile Mira with the council yet.',
          ],
          styleReminders: ['Keep pressure high.', 'Use sharp maritime detail.'],
        },
      },
    },
  ];
}

export const demoSeries: SeriesManifest[] = [
  {
    id: 'glass-meridian-cycle',
    name: 'The Glass Meridian Cycle',
    slug: 'glass-meridian-cycle',
    description: 'A multi-book fantasy series fixture spanning the Meridian Archive and Ash Harbor arcs.',
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
    projectSlugs: ['the-glass-meridian', 'ash-harbor'],
  },
];

export const demoProjects: Array<{ manifest: ProjectManifest; artifacts: ArtifactRecord[] }> = [
  {
    manifest: {
      id: 'quills-demo',
      name: 'The Glass Meridian',
      slug: 'the-glass-meridian',
      description: 'A fixture project for proving the Quills Studio drafting loop.',
      seriesSlug: 'glass-meridian-cycle',
      seriesOrder: 1,
      createdAt: demoTimestamp,
      updatedAt: demoTimestamp,
      currentCanonVersion: 3,
      activeBook: 1,
    },
    artifacts: buildGlassMeridianArtifacts(),
  },
  {
    manifest: {
      id: 'ash-harbor-demo',
      name: 'Ash Harbor',
      slug: 'ash-harbor',
      description: 'A second fixture project proving multi-project and series-aware workflows.',
      seriesSlug: 'glass-meridian-cycle',
      seriesOrder: 2,
      createdAt: demoTimestamp,
      updatedAt: demoTimestamp,
      currentCanonVersion: 2,
      activeBook: 2,
    },
    artifacts: buildAshHarborArtifacts(),
  },
];

export const demoManifest = demoProjects[0].manifest;
export const demoArtifacts = demoProjects[0].artifacts;
