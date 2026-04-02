import type { ArtifactRecord, DraftingPacket } from '@quills/shared';

export interface ContinuityFinding {
  severity: 'warning' | 'error';
  message: string;
}

function bodyText(artifact: ArtifactRecord): string {
  return artifact.body.text ?? JSON.stringify(artifact.body.data, null, 2);
}

export function runContinuityCheck(packet: DraftingPacket, draftText: string, artifacts: ArtifactRecord[]): ContinuityFinding[] {
  const findings: ContinuityFinding[] = [];
  const canonSnapshot = artifacts.find((artifact) => artifact.metadata.type === 'canon_snapshot' && artifact.metadata.status === 'canon');

  for (const avoid of packet.mustAvoid) {
    if (draftText.toLowerCase().includes(avoid.toLowerCase())) {
      findings.push({
        severity: 'error',
        message: `Draft appears to violate must-avoid instruction: "${avoid}".`,
      });
    }
  }

  if (canonSnapshot) {
    const snapshot = bodyText(canonSnapshot);
    if (!snapshot.toLowerCase().includes('three minutes') && draftText.toLowerCase().includes('five minutes')) {
      findings.push({
        severity: 'warning',
        message: 'Draft may conflict with established glasslight duration limits.',
      });
    }
  }

  if (!draftText.toLowerCase().includes(packet.pov.toLowerCase())) {
    findings.push({
      severity: 'warning',
      message: `Draft may have drifted away from the selected POV (${packet.pov}).`,
    });
  }

  return findings;
}
