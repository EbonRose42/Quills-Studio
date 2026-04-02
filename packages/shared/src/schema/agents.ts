import { z } from 'zod';

export const agentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryModel: z.string(),
  mission: z.string(),
  writes: z.array(z.string()),
  forbiddenActions: z.array(z.string()),
});

export const taskResultSchema = z.object({
  agentId: z.string(),
  artifactType: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  warnings: z.array(z.string()).default([]),
});

export type AgentDefinition = z.infer<typeof agentDefinitionSchema>;
export type TaskResult = z.infer<typeof taskResultSchema>;
