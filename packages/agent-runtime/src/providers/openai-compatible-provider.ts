import {
  providerDisplayNames,
  providerSettingsSchema,
  type ProviderMode,
  type ProviderSettings,
  type ProviderStatus,
  type TaskResult,
} from '@quills/shared';
import { MockProvider } from './mock-provider';
import type { AgentTaskInput, ConfigurableProvider } from './provider';

const modelMap: Record<string, string> = {
  'story-architect': 'gpt-4o-mini',
  'world-builder': 'gpt-4o-mini',
  'character-builder': 'gpt-4o-mini',
  'scene-planner': 'gpt-4o-mini',
  'prose-drafter': 'gpt-4o-mini',
  'continuity-manager': 'gpt-4o-mini',
  'project-librarian': 'gpt-4o-mini',
  'revision-director': 'gpt-4o-mini',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(baseUrl: string, path: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export class OpenAiCompatibleProvider implements ConfigurableProvider {
  readonly id = 'openai-compatible';
  private settings: ProviderSettings;
  private readonly onEvent?: (type: string, context: Record<string, unknown>) => void | Promise<void>;
  private cachedStatus: ProviderStatus;

  constructor(
    settings: Partial<ProviderSettings> = {},
    options: { onEvent?: (type: string, context: Record<string, unknown>) => void | Promise<void> } = {},
  ) {
    this.settings = providerSettingsSchema.parse({
      provider: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:1234/v1',
      model: 'gpt-4o-mini',
      apiKey: '',
      timeoutMs: 30000,
      maxRetries: 2,
      fallbackToMock: true,
      thinking: false,
      ...settings,
    });
    this.onEvent = options.onEvent;
    this.cachedStatus = {
      provider: this.settings.provider,
      displayName: providerDisplayNames[this.settings.provider],
      available: false,
      baseUrl: this.settings.baseUrl,
      lastCheckedAt: null,
      models: [],
      missingModels: [],
      lastError: 'Not checked yet.',
    };
  }

  updateSettings(settings: ProviderSettings): void {
    this.settings = providerSettingsSchema.parse(settings);
    this.cachedStatus = {
      ...this.cachedStatus,
      provider: this.settings.provider,
      displayName: providerDisplayNames[this.settings.provider],
      baseUrl: this.settings.baseUrl,
    };
  }

  async inspect(): Promise<ProviderStatus> {
    await this.emit('inspect.started', { baseUrl: this.settings.baseUrl, provider: this.settings.provider });
    const modelsPath = this.settings.provider === 'docker-model-runner' ? '/models' : '/models';
    try {
      const response = await fetchJson(normalizeBaseUrl(this.settings.baseUrl), modelsPath, this.settings.timeoutMs, {
        method: 'GET',
        headers: this.settings.apiKey ? { Authorization: `Bearer ${this.settings.apiKey}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(`${providerDisplayNames[this.settings.provider]} models request failed with ${response.status}.`);
      }
      const payload = (await response.json()) as { data?: Array<{ id?: string }> };
      const models = (payload.data ?? []).map((item) => item.id).filter((value): value is string => Boolean(value));
      const requiredModel = this.settings.model;
      this.cachedStatus = {
        provider: this.settings.provider,
        displayName: providerDisplayNames[this.settings.provider],
        available: true,
        baseUrl: this.settings.baseUrl,
        lastCheckedAt: new Date().toISOString(),
        models,
        missingModels: models.includes(requiredModel) ? [] : [requiredModel],
        lastError: null,
      };
      await this.emit('inspect.succeeded', { provider: this.settings.provider, models, missingModels: this.cachedStatus.missingModels });
    } catch (error) {
      this.cachedStatus = {
        provider: this.settings.provider,
        displayName: providerDisplayNames[this.settings.provider],
        available: false,
        baseUrl: this.settings.baseUrl,
        lastCheckedAt: new Date().toISOString(),
        models: [],
        missingModels: [this.settings.model],
        lastError: error instanceof Error ? error.message : 'Failed to contact provider.',
      };
      await this.emit('inspect.failed', { provider: this.settings.provider, error: this.cachedStatus.lastError });
    }
    return this.cachedStatus;
  }

  async run(agentId: string, input: AgentTaskInput): Promise<TaskResult> {
    const model = modelMap[agentId] ?? this.settings.model;
    const status = await this.inspect();
    if (!status.available) {
      if (this.settings.fallbackToMock) {
        await this.emit('generate.fallback', { provider: this.settings.provider, reason: status.lastError ?? 'Provider unavailable.' });
        const result = await new MockProvider().run(agentId, input);
        return {
          ...result,
          summary: `${providerDisplayNames[this.settings.provider]} unavailable, fell back to mock provider. ${result.summary}`,
          warnings: [...result.warnings, status.lastError ?? `${providerDisplayNames[this.settings.provider]} unavailable.`],
        };
      }
      throw new Error(status.lastError ?? `${providerDisplayNames[this.settings.provider]} is unavailable.`);
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.settings.maxRetries; attempt += 1) {
      try {
        await this.emit('generate.attempt', { provider: this.settings.provider, attempt, model, agentId });
        const response = await fetchJson(normalizeBaseUrl(this.settings.baseUrl), '/chat/completions', this.settings.timeoutMs, {
          method: 'POST',
          headers: this.settings.apiKey ? { Authorization: `Bearer ${this.settings.apiKey}` } : undefined,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: input.prompt }],
            temperature: 0.1,
            max_tokens: 800,
          }),
        });
        if (!response.ok) {
          throw new Error(`${providerDisplayNames[this.settings.provider]} request failed with ${response.status}.`);
        }
        const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const body = payload.choices?.[0]?.message?.content?.trim();
        if (!body) {
          throw new Error(`${providerDisplayNames[this.settings.provider]} returned an empty response.`);
        }
        return {
          agentId,
          artifactType: agentId === 'prose-drafter' ? 'chapter_draft' : 'agent_output',
          title: `${agentId} result`,
          summary: `Live provider result returned from ${providerDisplayNames[this.settings.provider]}.`,
          body,
          warnings: attempt > 0 ? [`Recovered after ${attempt} retry attempt(s).`] : [],
        };
      } catch (error) {
        lastError = error;
        await this.emit('generate.failed', { provider: this.settings.provider, attempt, error: error instanceof Error ? error.message : 'Unknown error' });
        if (attempt < this.settings.maxRetries) {
          await sleep(300 * (attempt + 1));
          continue;
        }
      }
    }

    if (this.settings.fallbackToMock) {
      const result = await new MockProvider().run(agentId, input);
      return {
        ...result,
        summary: `${providerDisplayNames[this.settings.provider]} failed after retries, so Quills Studio used the mock provider.`,
        warnings: [...result.warnings, lastError instanceof Error ? lastError.message : 'Unknown provider failure.'],
      };
    }

    throw lastError instanceof Error ? lastError : new Error('Provider failed after all retry attempts.');
  }

  private async emit(type: string, context: Record<string, unknown>): Promise<void> {
    await this.onEvent?.(type, context);
  }
}
