export type McpServerId = 'project-library' | 'continuity-retrieval' | 'planning-tools';

export interface McpServerInfo {
  id: McpServerId;
  name: string;
  description: string;
  tools: string[];
  resources: string[];
  prompts: string[];
}

export interface McpToolDefinition {
  name: string;
  title: string;
  description: string;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
}

export interface McpPromptDefinition {
  name: string;
  title: string;
  description: string;
}

export interface McpActivityEntry {
  id: string;
  timestamp: string;
  serverId: McpServerId;
  operation: 'tool' | 'resource' | 'prompt';
  name: string;
  action: 'list' | 'call' | 'read' | 'get';
  status: 'success' | 'failure';
  durationMs: number;
  summary: string;
  context: Record<string, unknown>;
}

export interface ContextPackItem {
  id: string;
  label: string;
  sourceType: string;
  reason: string;
}

export interface ContextPack {
  taskType: string;
  targetId: string;
  requiredItems: ContextPackItem[];
  retrievedItems: ContextPackItem[];
  warnings: string[];
  packet: Record<string, unknown>;
}

export interface McpHostSnapshot {
  servers: McpServerInfo[];
  recentActivity: McpActivityEntry[];
  lastContextPack: ContextPack | null;
}
