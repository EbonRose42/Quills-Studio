import { providerDisplayNames, providerSettingsSchema, type ProviderSettings, type ProviderStatus, type TaskResult } from '@quills/shared';
import { MockProvider } from './mock-provider';
import type { AgentTaskInput, ConfigurableProvider } from './provider';

const modelMap: Record<string, string> = {
  'story-architect': 'gemma3:12b',
  'world-builder': 'eva-qwen2.5',
  'character-builder': 'eva-qwen2.5',
  'scene-planner': 'eva-qwen2.5',
  'prose-drafter': 'magnum',
  'continuity-manager': 'gemma3:12b',
  'project-librarian': 'gemma3:12b',
  'revision-director': 'gemma3:12b',
};

const defaultSettings: ProviderSettings = {
  provider: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  model: 'qwen3.5:2b',
  apiKey: '',
  timeoutMs: 30000,
  maxRetries: 2,
  fallbackToMock: true,
  thinking: false,
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

function buildPrompt(agentId: string, input: AgentTaskInput): string {
  if (!input.packet) {
    return input.prompt;
  }

  const packet = input.packet;
  return [
    `You are ${agentId} in Quills Studio.`,
    'Work from the packet only. Preserve continuity and avoid inventing unapproved canon.',
    `Project: ${packet.project}`,
    `Book: ${packet.book}`,
    `Chapter: ${packet.chapter}`,
    `POV: ${packet.pov}`,
    `Tone targets: ${packet.toneTargets.join(', ')}`,
    `Chapter goal: ${packet.chapterGoal}`,
    `Scene plan: ${packet.scenePlan.join(' | ')}`,
    `Must include: ${packet.mustInclude.join(' | ')}`,
    `Must avoid: ${packet.mustAvoid.join(' | ')}`,
    `Character notes: ${packet.relevantCharacterNotes.join(' | ')}`,
    `World notes: ${packet.relevantWorldNotes.join(' | ')}`,
    `Continuity warnings: ${packet.continuityWarnings.join(' | ')}`,
    `Prior chapter summary: ${packet.priorChapterSummary}`,
    `Style reminders: ${packet.styleReminders.join(' | ')}`,
    '',
    input.prompt,
  ].join('\n');
}

export class OllamaProvider implements ConfigurableProvider {
  readonly id = 'ollama';
  private settings: ProviderSettings;
  private readonly onEvent?: (type: string, context: Record<string, unknown>) => void | Promise<void>;
  private cachedStatus: ProviderStatus = {
    provider: 'ollama',
    displayName: providerDisplayNames.ollama,
    available: false,
    baseUrl: defaultSettings.baseUrl,
    lastCheckedAt: null,
    models: [],
    missingModels: Object.values(modelMap),
    lastError: 'Not checked yet.',
  };

  constructor(
    settings: Partial<ProviderSettings> = {},
    options: { onEvent?: (type: string, context: Record<string, unknown>) => void | Promise<void> } = {},
  ) {
    this.settings = providerSettingsSchema.parse({ ...defaultSettings, ...settings, provider: 'ollama' });
    this.onEvent = options.onEvent;
    this.cachedStatus.baseUrl = this.settings.baseUrl;
  }

  updateSettings(settings: ProviderSettings): void {
    this.settings = providerSettingsSchema.parse({ ...settings, provider: 'ollama' });
    this.cachedStatus = {
      ...this.cachedStatus,
      baseUrl: this.settings.baseUrl,
    };
  }

  async inspect(): Promise<ProviderStatus> {
    await this.emit('inspect.started', { baseUrl: this.settings.baseUrl });
    try {
      const response = await fetchJson(this.settings.baseUrl, '/api/tags', this.settings.timeoutMs, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Ollama tags request failed with ${response.status}.`);
      }

      const payload = (await response.json()) as { models?: Array<{ name: string }> };
      const models = (payload.models ?? []).map((model) => model.name);
      const requiredModels = Array.from(new Set(Object.values(modelMap)));
      this.cachedStatus = {
        provider: 'ollama',
        displayName: providerDisplayNames.ollama,
        available: true,
        baseUrl: this.settings.baseUrl,
        lastCheckedAt: new Date().toISOString(),
        models,
        missingModels: requiredModels.filter((model) => !models.includes(model)),
        lastError: null,
      };
      await this.emit('inspect.succeeded', {
        baseUrl: this.settings.baseUrl,
        models,
        missingModels: this.cachedStatus.missingModels,
      });
    } catch (error) {
      this.cachedStatus = {
        provider: 'ollama',
        displayName: providerDisplayNames.ollama,
        available: false,
        baseUrl: this.settings.baseUrl,
        lastCheckedAt: new Date().toISOString(),
        models: [],
        missingModels: Array.from(new Set(Object.values(modelMap))),
        lastError: error instanceof Error ? error.message : 'Failed to contact Ollama.',
      };
      await this.emit('inspect.failed', {
        baseUrl: this.settings.baseUrl,
        error: this.cachedStatus.lastError,
      });
    }

    return this.cachedStatus;
  }

  async run(agentId: string, input: AgentTaskInput): Promise<TaskResult> {
    const model = modelMap[agentId];
    if (!model) {
      throw new Error(`No Ollama model configured for agent ${agentId}.`);
    }

    const status = await this.inspect();
    if (!status.available) {
      if (this.settings.fallbackToMock) {
        await this.emit('generate.fallback', {
          agentId,
          model,
          reason: status.lastError ?? 'Ollama unavailable.',
        });
        const result = await new MockProvider().run(agentId, input);
        return {
          ...result,
          summary: `Ollama unavailable, fell back to mock provider. ${result.summary}`,
          warnings: [...result.warnings, status.lastError ?? 'Ollama is unavailable.'],
        };
      }
      throw new Error(status.lastError ?? 'Ollama is unavailable.');
    }

    if (status.missingModels.includes(model)) {
      if (this.settings.fallbackToMock) {
        await this.emit('generate.fallback', {
          agentId,
          model,
          reason: `Missing Ollama model: ${model}`,
        });
        const result = await new MockProvider().run(agentId, input);
        return {
          ...result,
          summary: `Required model ${model} is missing in Ollama, so Quills Studio used the mock provider.`,
          warnings: [...result.warnings, `Missing Ollama model: ${model}`],
        };
      }
      throw new Error(`Required Ollama model is missing: ${model}`);
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.settings.maxRetries; attempt += 1) {
      try {
        await this.emit('generate.attempt', {
          agentId,
          model,
          attempt,
          maxRetries: this.settings.maxRetries,
        });
        const response = await fetchJson(this.settings.baseUrl, '/api/generate', this.settings.timeoutMs, {
          method: 'POST',
          body: JSON.stringify({
            model,
            prompt: buildPrompt(agentId, input),
            stream: false,
            think: this.settings.thinking,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama request failed with ${response.status}.`);
        }

        const payload = (await response.json()) as { response?: string; error?: string };
        if (payload.error) {
          throw new Error(payload.error);
        }

        return {
          agentId,
          artifactType: agentId === 'prose-drafter' ? 'chapter_draft' : 'agent_output',
          title: `${agentId} result`,
          summary: `Live provider result returned from Ollama model ${model}.`,
          body: payload.response ?? '',
          warnings: attempt > 0 ? [`Recovered after ${attempt} retry attempt(s).`] : [],
        };
      } catch (error) {
        lastError = error;
        await this.emit('generate.failed', {
          agentId,
          model,
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (attempt < this.settings.maxRetries) {
          await sleep(300 * (attempt + 1));
          continue;
        }
      }
    }

    if (this.settings.fallbackToMock) {
      await this.emit('generate.fallback', {
        agentId,
        model,
        reason: lastError instanceof Error ? lastError.message : 'Unknown Ollama failure.',
      });
      const result = await new MockProvider().run(agentId, input);
      return {
        ...result,
        summary: `Ollama failed after retries, so Quills Studio used the mock provider.`,
        warnings: [...result.warnings, lastError instanceof Error ? lastError.message : 'Unknown Ollama failure.'],
      };
    }

    throw lastError instanceof Error ? lastError : new Error('Ollama failed after all retry attempts.');
  }

  private async emit(type: string, context: Record<string, unknown>): Promise<void> {
    await this.onEvent?.(type, context);
  }
}
