import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureDemoProject } from '@quills/studio-core';
import { WritingStudioMcpHost } from './host';

describe('WritingStudioMcpHost', () => {
  let workspaceRoot: string;
  let host: WritingStudioMcpHost;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'quills-mcp-'));
    await ensureDemoProject(workspaceRoot);
    host = new WritingStudioMcpHost({ workspaceRoot });
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('exposes the expected MCP servers', () => {
    const snapshot = host.getSnapshot();
    expect(snapshot.servers.map((server) => server.id)).toEqual([
      'project-library',
      'continuity-retrieval',
      'planning-tools',
    ]);
  });

  it('builds a context pack through the continuity server', async () => {
    const result = await host.callTool('continuity-retrieval', 'build_context_pack', {
      projectSlug: 'the-glass-meridian',
      taskType: 'draft_chapter',
      targetId: 'book1_ch08_plan_v1',
    }) as { packet: { pov: string } };

    expect(result.packet.pov).toBe('Mira');
    expect(host.getSnapshot().lastContextPack?.targetId).toBe('book1_ch08_plan_v1');
  });
});
