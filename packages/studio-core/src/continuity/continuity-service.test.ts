import { describe, expect, it } from 'vitest';
import { demoArtifacts } from '@quills/shared';
import { buildDraftingPacket } from '../packets/packet-builder';
import { runContinuityCheck } from './continuity-service';

describe('runContinuityCheck', () => {
  it('flags must-avoid violations', () => {
    const packet = buildDraftingPacket(demoArtifacts, 'book1_ch08_plan_v1');
    const findings = runContinuityCheck(packet, 'Do not heal Tovin eye. Mira still presses forward.', demoArtifacts);

    expect(findings.some((finding) => finding.severity === 'error')).toBe(true);
  });
});
