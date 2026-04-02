import { describe, expect, it } from 'vitest';
import { demoArtifacts } from '@quills/shared';
import { buildDraftingPacket } from './packet-builder';

describe('buildDraftingPacket', () => {
  it('assembles a drafting packet from approved artifacts', () => {
    const packet = buildDraftingPacket(demoArtifacts, 'book1_ch08_plan_v1');

    expect(packet.taskType).toBe('drafting');
    expect(packet.chapter).toBe(8);
    expect(packet.pov).toBe('Mira');
    expect(packet.relevantCharacterNotes.length).toBeGreaterThan(0);
    expect(packet.sourceArtifactIds).toContain('canon_snapshot_v3');
  });
});
