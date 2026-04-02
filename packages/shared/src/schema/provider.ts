import { z } from 'zod';

export const providerModeSchema = z.enum([
  'mock',
  'ollama',
  'openai',
  'openai-compatible',
  'lmstudio',
  'jan',
  'localai',
  'vllm',
  'sglang',
  'llama.cpp',
  'mlx-lm',
  'docker-model-runner',
]);

export const providerSettingsSchema = z.object({
  provider: providerModeSchema.default('ollama'),
  baseUrl: z.string().url(),
  model: z.string().default('qwen3.5:2b'),
  apiKey: z.string().default(''),
  timeoutMs: z.number().int().positive().default(30000),
  maxRetries: z.number().int().min(0).max(5).default(2),
  fallbackToMock: z.boolean().default(true),
  thinking: z.boolean().default(false),
});

export const providerStatusSchema = z.object({
  provider: providerModeSchema,
  displayName: z.string(),
  available: z.boolean(),
  baseUrl: z.string(),
  lastCheckedAt: z.string().nullable(),
  models: z.array(z.string()),
  missingModels: z.array(z.string()),
  lastError: z.string().nullable(),
});

export const studioRuntimeConfigSchema = z.object({
  activeProjectSlug: z.string().nullable().default(null),
  providerMode: providerModeSchema.default('mock'),
  providerSettings: providerSettingsSchema,
  verboseLogging: z.boolean().default(true),
});

export const providerDisplayNames: Record<z.infer<typeof providerModeSchema>, string> = {
  mock: 'Mock',
  ollama: 'Ollama',
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-compatible',
  lmstudio: 'LM Studio',
  jan: 'Jan',
  localai: 'LocalAI',
  vllm: 'vLLM',
  sglang: 'SGLang',
  'llama.cpp': 'llama.cpp',
  'mlx-lm': 'MLX LM',
  'docker-model-runner': 'Docker Model Runner',
};

export type ProviderMode = z.infer<typeof providerModeSchema>;
export type ProviderSettings = z.infer<typeof providerSettingsSchema>;
export type ProviderStatus = z.infer<typeof providerStatusSchema>;
export type StudioRuntimeConfig = z.infer<typeof studioRuntimeConfigSchema>;

// Backward-compatible aliases for pre-refactor imports.
export const ollamaSettingsSchema = providerSettingsSchema;
export const ollamaStatusSchema = providerStatusSchema;
export type OllamaSettings = ProviderSettings;
export type OllamaStatus = ProviderStatus;
