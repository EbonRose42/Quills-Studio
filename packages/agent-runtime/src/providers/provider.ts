import type { DraftingPacket, ProviderSettings, ProviderStatus, TaskResult } from '@quills/shared';

export interface AgentTaskInput {
  packet?: DraftingPacket;
  prompt: string;
}

export interface ModelProvider {
  readonly id: string;
  run(agentId: string, input: AgentTaskInput): Promise<TaskResult>;
}

export interface ConfigurableProvider extends ModelProvider {
  inspect(): Promise<ProviderStatus>;
  updateSettings(settings: ProviderSettings): void;
}
