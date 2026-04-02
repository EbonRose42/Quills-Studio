import { getAgentDefinition } from '../registry/agents';

export function assertAgentCanWrite(agentId: string, artifactType: string): void {
  const agent = getAgentDefinition(agentId);

  if (!agent.writes.includes(artifactType)) {
    throw new Error(`${agent.name} is not allowed to write artifact type "${artifactType}".`);
  }
}
